use std::{collections::VecDeque, net::SocketAddr, path::PathBuf, sync::Arc, time::{Duration, Instant}};

use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{header, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tower_http::{compression::CompressionLayer, services::{ServeDir, ServeFile}, set_header::SetResponseHeaderLayer, trace::TraceLayer};
use tracing::{info, warn};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    build_sha: &'static str,
    rates: Arc<DashMap<String, VecDeque<Instant>>>,
}

#[derive(Debug, Serialize, FromRow)]
struct Session {
    code: String,
    title: String,
    prompt: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    is_demo: bool,
}

#[derive(Debug, Serialize, FromRow)]
struct Ticket {
    id: String,
    session_code: String,
    pseudonym: String,
    claim: String,
    evidence: String,
    revision: String,
    reflection: String,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct NewSession { title: String, prompt: String, retention_days: Option<i64> }

#[derive(Deserialize)]
struct NewTicket { pseudonym: String, claim: String, evidence: String, revision: String, reflection: String }

#[derive(Serialize)]
struct CreatedSession { session: Session, teacher_token: String }

#[derive(Serialize)]
struct TeacherSession { session: Session, tickets: Vec<Ticket> }

#[derive(Serialize)]
struct ApiErrorBody { error: String }

struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response { (self.0, Json(ApiErrorBody { error: self.1 })).into_response() }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().json().with_env_filter(tracing_subscriber::EnvFilter::from_default_env().add_directive("in_class_draft_ticket=info".parse()?)).init();
    let port: u16 = std::env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8080);
    let data_dir = PathBuf::from(std::env::var("DATA_DIR").unwrap_or_else(|_| "./data".into()));
    tokio::fs::create_dir_all(&data_dir).await?;
    let db_url = format!("sqlite://{}/tickets.db?mode=rwc", data_dir.display());
    let db = SqlitePool::connect(&db_url).await?;
    migrate(&db).await?;
    let state = AppState { db, build_sha: env!("BUILD_SHA"), rates: Arc::new(DashMap::new()) };
    let cleanup_db = state.db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(3600));
        loop {
            interval.tick().await;
            if let Err(error) = sqlx::query("DELETE FROM sessions WHERE expires_at <= ?").bind(Utc::now()).execute(&cleanup_db).await {
                warn!(%error, "expired-session cleanup failed");
            }
        }
    });
    info!(port, data_dir = %data_dir.display(), build_sha = state.build_sha, "configuration loaded; storage path defaulted or supplied, no secrets required");

    let api = Router::new()
        .route("/sessions", post(create_session))
        .route("/sessions/{code}", get(get_session))
        .route("/sessions/{code}/tickets", post(create_ticket))
        .route("/teacher/{code}", get(get_teacher_session).delete(delete_session))
        .route("/teacher/{code}/export", get(export_csv))
        .route("/demo", post(create_demo))
        .layer(middleware::from_fn_with_state(state.clone(), rate_limit));

    let app = Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .fallback_service(ServeDir::new("dist").not_found_service(ServeFile::new("dist/index.html")))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(SetResponseHeaderLayer::if_not_present(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff")))
        .layer(SetResponseHeaderLayer::if_not_present(header::REFERRER_POLICY, HeaderValue::from_static("strict-origin-when-cross-origin")))
        .layer(SetResponseHeaderLayer::if_not_present(header::CONTENT_SECURITY_POLICY, HeaderValue::from_static("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https://api.sociobot.in; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.sociobot.in; frame-ancestors 'none'")))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await?;
    axum::serve(listener, app).with_graceful_shutdown(shutdown()).await?;
    Ok(())
}

async fn migrate(db: &SqlitePool) -> anyhow::Result<()> {
    sqlx::query("PRAGMA foreign_keys = ON").execute(db).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS sessions (code TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL, teacher_token TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0)").execute(db).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, session_code TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE, pseudonym TEXT NOT NULL, claim TEXT NOT NULL, evidence TEXT NOT NULL, revision TEXT NOT NULL, reflection TEXT NOT NULL, created_at TEXT NOT NULL)").execute(db).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS tickets_session_idx ON tickets(session_code, created_at)").execute(db).await?;
    Ok(())
}

async fn shutdown() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler") };
    #[cfg(unix)]
    let terminate = async { tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("signal handler").recv().await; };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    info!("graceful shutdown started");
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({"status":"ok", "build_sha": state.build_sha}))
}

async fn rate_limit(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let ip = req.headers().get("x-forwarded-for").and_then(|v| v.to_str().ok()).and_then(|s| s.split(',').next()).map(str::trim).unwrap_or("local").to_string();
    let now = Instant::now();
    let mut times = state.rates.entry(ip).or_default();
    while times.front().is_some_and(|t| now.duration_since(*t) > Duration::from_secs(1)) { times.pop_front(); }
    if times.len() >= 40 {
        drop(times);
        let mut response = (StatusCode::TOO_MANY_REQUESTS, Json(ApiErrorBody { error: "Too many requests. Wait one second, then try again.".into() })).into_response();
        response.headers_mut().insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        return response;
    }
    times.push_back(now);
    drop(times);
    next.run(req).await
}

fn clean(value: &str, label: &str, min: usize, max: usize) -> Result<String, ApiError> {
    let value = value.trim();
    let count = value.chars().count();
    if count < min || count > max { return Err(ApiError(StatusCode::BAD_REQUEST, format!("{label} must be {min}–{max} characters."))); }
    Ok(value.to_string())
}

fn new_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let bytes = Uuid::new_v4().into_bytes();
    (0..6).map(|i| ALPHABET[(bytes[i] as usize) % ALPHABET.len()] as char).collect()
}

async fn insert_session(state: &AppState, title: &str, prompt: &str, days: i64, demo: bool) -> Result<CreatedSession, ApiError> {
    let code = new_code();
    let teacher_token = format!("dt_{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let created_at = Utc::now();
    let expires_at = created_at + ChronoDuration::days(days);
    sqlx::query("INSERT INTO sessions(code,title,prompt,teacher_token,created_at,expires_at,is_demo) VALUES(?,?,?,?,?,?,?)")
        .bind(&code).bind(title).bind(prompt).bind(&teacher_token).bind(created_at).bind(expires_at).bind(demo).execute(&state.db).await
        .map_err(internal)?;
    Ok(CreatedSession { session: Session { code, title: title.into(), prompt: prompt.into(), created_at, expires_at, is_demo: demo }, teacher_token })
}

async fn create_session(State(state): State<AppState>, Json(body): Json<NewSession>) -> Result<(StatusCode, Json<CreatedSession>), ApiError> {
    let title = clean(&body.title, "Class name", 2, 80)?;
    let prompt = clean(&body.prompt, "Writing prompt", 4, 240)?;
    let days = body.retention_days.unwrap_or(7);
    if ![1, 7, 30].contains(&days) { return Err(ApiError(StatusCode::BAD_REQUEST, "Retention must be 1, 7, or 30 days.".into())); }
    Ok((StatusCode::CREATED, Json(insert_session(&state, &title, &prompt, days, false).await?)))
}

async fn active_session(state: &AppState, code: &str) -> Result<Session, ApiError> {
    let code = code.trim().to_uppercase();
    let row = sqlx::query_as::<_, Session>("SELECT code,title,prompt,created_at,expires_at,is_demo FROM sessions WHERE code = ?")
        .bind(&code).fetch_optional(&state.db).await.map_err(internal)?
        .ok_or_else(|| ApiError(StatusCode::NOT_FOUND, "That session code was not found. Check the six characters and try again.".into()))?;
    if row.expires_at <= Utc::now() { return Err(ApiError(StatusCode::GONE, "This session has expired. Ask your teacher for a new code.".into())); }
    Ok(row)
}

async fn get_session(State(state): State<AppState>, Path(code): Path<String>) -> Result<Json<Session>, ApiError> {
    Ok(Json(active_session(&state, &code).await?))
}

async fn create_ticket(State(state): State<AppState>, Path(code): Path<String>, Json(body): Json<NewTicket>) -> Result<(StatusCode, Json<Ticket>), ApiError> {
    let session = active_session(&state, &code).await?;
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tickets WHERE session_code = ?").bind(&session.code).fetch_one(&state.db).await.map_err(internal)?;
    if !session.is_demo && count >= 40 { return Err(ApiError(StatusCode::CONFLICT, "This session has reached 40 tickets. Ask your teacher to open another session.".into())); }
    let ticket = Ticket {
        id: Uuid::new_v4().to_string(), session_code: session.code,
        pseudonym: clean(&body.pseudonym, "Class nickname", 2, 40)?,
        claim: clean(&body.claim, "Claim", 3, 280)?,
        evidence: clean(&body.evidence, "Evidence location", 3, 280)?,
        revision: clean(&body.revision, "Revision choice", 3, 280)?,
        reflection: clean(&body.reflection, "Exit reflection", 3, 500)?,
        created_at: Utc::now(),
    };
    sqlx::query("INSERT INTO tickets(id,session_code,pseudonym,claim,evidence,revision,reflection,created_at) VALUES(?,?,?,?,?,?,?,?)")
        .bind(&ticket.id).bind(&ticket.session_code).bind(&ticket.pseudonym).bind(&ticket.claim).bind(&ticket.evidence).bind(&ticket.revision).bind(&ticket.reflection).bind(ticket.created_at).execute(&state.db).await.map_err(internal)?;
    Ok((StatusCode::CREATED, Json(ticket)))
}

fn bearer(req: &Request<Body>) -> Option<&str> {
    req.headers().get(header::AUTHORIZATION)?.to_str().ok()?.strip_prefix("Bearer ")
}

async fn authorized_session(state: &AppState, code: &str, token: Option<&str>) -> Result<Session, ApiError> {
    let token = token.ok_or_else(|| ApiError(StatusCode::UNAUTHORIZED, "Teacher access is missing. Open the private teacher link from this device.".into()))?;
    let code = code.trim().to_uppercase();
    sqlx::query_as::<_, Session>("SELECT code,title,prompt,created_at,expires_at,is_demo FROM sessions WHERE code = ? AND teacher_token = ?")
        .bind(&code).bind(token).fetch_optional(&state.db).await.map_err(internal)?
        .ok_or_else(|| ApiError(StatusCode::UNAUTHORIZED, "This teacher link is not valid. Use the link saved when the session was created.".into()))
}

async fn get_teacher_session(State(state): State<AppState>, Path(code): Path<String>, req: Request<Body>) -> Result<Json<TeacherSession>, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    let tickets = sqlx::query_as::<_, Ticket>("SELECT id,session_code,pseudonym,claim,evidence,revision,reflection,created_at FROM tickets WHERE session_code = ? ORDER BY created_at")
        .bind(&session.code).fetch_all(&state.db).await.map_err(internal)?;
    Ok(Json(TeacherSession { session, tickets }))
}

async fn export_csv(State(state): State<AppState>, Path(code): Path<String>, req: Request<Body>) -> Result<Response, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    let tickets = sqlx::query_as::<_, Ticket>("SELECT id,session_code,pseudonym,claim,evidence,revision,reflection,created_at FROM tickets WHERE session_code = ? ORDER BY created_at")
        .bind(&session.code).fetch_all(&state.db).await.map_err(internal)?;
    let mut out = String::from("class_nickname,claim,evidence_location,revision_choice,exit_reflection,submitted_at\n");
    for t in tickets { out.push_str(&[t.pseudonym, t.claim, t.evidence, t.revision, t.reflection, t.created_at.to_rfc3339()].iter().map(|v| csv_cell(v)).collect::<Vec<_>>().join(",")); out.push('\n'); }
    let mut response = out.into_response();
    response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_static("text/csv; charset=utf-8"));
    response.headers_mut().insert(header::CONTENT_DISPOSITION, HeaderValue::from_str(&format!("attachment; filename=\"draft-tickets-{}.csv\"", session.code)).unwrap());
    Ok(response)
}

async fn delete_session(State(state): State<AppState>, Path(code): Path<String>, req: Request<Body>) -> Result<StatusCode, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    sqlx::query("DELETE FROM sessions WHERE code = ?").bind(&session.code).execute(&state.db).await.map_err(internal)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn create_demo(State(state): State<AppState>) -> Result<(StatusCode, Json<CreatedSession>), ApiError> {
    let created = insert_session(&state, "Room 204 · Beloved seminar", "How does Morrison use memory to shape Sethe's choices?", 1, true).await?;
    let samples = [
        ("Blue Finch", "Memory acts like a second setting that keeps the past present.", "Page 43, the description after Sethe sees the dress.", "I moved the scene before my explanation so readers see the image first.", "My next step is to connect the image to Sethe's decision in the next paragraph."),
        ("Copper Kite", "The repeated colors show how memory interrupts the present.", "Pages 38–39, especially the red light detail.", "I replaced a broad theme sentence with a claim about the color pattern.", "I still need a quotation that shows the interruption, not only the color."),
        ("Quiet Maple", "Sethe protects herself by reshaping what she remembers.", "Notebook paragraph 2 and the scene on page 54.", "I cut my opening summary and added the page 54 contrast.", "My claim is clearer, but I need to explain why the contrast matters.")
    ];
    for (p,c,e,r,x) in samples {
        sqlx::query("INSERT INTO tickets(id,session_code,pseudonym,claim,evidence,revision,reflection,created_at) VALUES(?,?,?,?,?,?,?,?)")
            .bind(Uuid::new_v4().to_string()).bind(&created.session.code).bind(p).bind(c).bind(e).bind(r).bind(x).bind(Utc::now()).execute(&state.db).await.map_err(internal)?;
    }
    Ok((StatusCode::CREATED, Json(created)))
}

fn csv_cell(value: &str) -> String { format!("\"{}\"", value.replace('"', "\"\"")) }
fn internal(err: sqlx::Error) -> ApiError { warn!(error = %err, "database request failed"); ApiError(StatusCode::INTERNAL_SERVER_ERROR, "The session could not be saved. Wait a moment, then try again.".into()) }
