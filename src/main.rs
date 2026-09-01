use std::{
    net::{IpAddr, SocketAddr},
    path::{Path as FsPath, PathBuf},
    time::Duration,
};

use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{header, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, Row};
use sqlx_sqlite::SqliteRow;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing::{info, warn};
use uuid::Uuid;

mod db;

mod sqlx {
    pub use sqlx_core::{error::Error, from_row::FromRow, row::Row};
    pub use sqlx_core::{query::query, query_as::query_as, query_scalar::query_scalar};
}

#[derive(Clone)]
struct AppState {
    db: db::Database,
    build_sha: &'static str,
    replica_id: String,
    rate_limit_secret: String,
    test_clock_enabled: bool,
}

#[derive(Debug, Serialize)]
struct Session {
    code: String,
    title: String,
    prompt: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    is_demo: bool,
}

#[derive(Debug, Serialize)]
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

impl<'r> FromRow<'r, SqliteRow> for Session {
    fn from_row(row: &'r SqliteRow) -> Result<Self, sqlx_core::Error> {
        Ok(Self {
            code: row.try_get("code")?,
            title: row.try_get("title")?,
            prompt: row.try_get("prompt")?,
            created_at: row.try_get("created_at")?,
            expires_at: row.try_get("expires_at")?,
            is_demo: row.try_get("is_demo")?,
        })
    }
}

impl<'r> FromRow<'r, SqliteRow> for Ticket {
    fn from_row(row: &'r SqliteRow) -> Result<Self, sqlx_core::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            session_code: row.try_get("session_code")?,
            pseudonym: row.try_get("pseudonym")?,
            claim: row.try_get("claim")?,
            evidence: row.try_get("evidence")?,
            revision: row.try_get("revision")?,
            reflection: row.try_get("reflection")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Deserialize)]
struct NewSession {
    title: String,
    prompt: String,
    retention_days: Option<i64>,
    #[serde(default)]
    test_retention_seconds: Option<i64>,
}

#[derive(Deserialize)]
struct NewTicket {
    pseudonym: String,
    claim: String,
    evidence: String,
    revision: String,
    reflection: String,
}

#[derive(Serialize)]
struct CreatedSession {
    session: Session,
    teacher_token: String,
}

#[derive(Serialize)]
struct TeacherSession {
    session: Session,
    tickets: Vec<Ticket>,
}

#[derive(Serialize)]
struct ApiErrorBody {
    error: String,
}

#[derive(Debug)]
struct ApiError(StatusCode, String);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(ApiErrorBody { error: self.1 })).into_response()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("in_class_draft_ticket=info".parse()?),
        )
        .init();
    let port = configured_port(std::env::var("PORT").ok().as_deref());
    let supplied_data_dir = std::env::var("DATA_DIR")
        .ok()
        .filter(|value| !value.trim().is_empty());
    // The fleet mounts this product's durable data share at /data. A normal
    // local checkout does not have that path, so it remains zero-config and
    // writes beside the binary instead.
    let data_dir = configured_data_dir(supplied_data_dir.as_deref(), FsPath::new("/data"));
    let db = db::connect(&data_dir).await?;
    let (rate_limit_secret, security_material_source) = initialize_security_material(&db).await?;
    // A short clock is available only in debug builds so the browser suite can
    // observe automatic expiry. Release binaries always use calendar days.
    let test_clock_enabled =
        cfg!(debug_assertions) && std::env::var("ALLOW_TEST_CLOCK").as_deref() == Ok("1");
    let state = AppState {
        db,
        build_sha: env!("BUILD_SHA"),
        // This is an opaque process identifier, not a host name. It lets the
        // release gate prove that a write and its authenticated reads reached
        // every ready replica rather than one sticky upstream connection.
        replica_id: Uuid::new_v4().simple().to_string(),
        rate_limit_secret,
        test_clock_enabled,
    };
    let cleanup_state = state.clone();
    tokio::spawn(async move {
        let cleanup_period = if cleanup_state.test_clock_enabled {
            Duration::from_millis(100)
        } else {
            Duration::from_secs(1)
        };
        let mut interval = tokio::time::interval(cleanup_period);
        loop {
            interval.tick().await;
            match cleanup_database(&cleanup_state.db, Utc::now()).await {
                Ok(deleted) if deleted > 0 => info!(deleted, "expired sessions deleted"),
                Ok(_) => {}
                Err(error) => warn!(%error, "database cleanup failed"),
            }
        }
    });
    info!(port, data_dir = %data_dir.display(), data_dir_source = if supplied_data_dir.is_some() { "supplied" } else if data_dir == FsPath::new("/data") { "durable_mount" } else { "working_directory" }, security_material_source, database = state.db.storage_backend(), build_sha = state.build_sha, "configuration loaded; durable database and privacy-preserving rate counters enabled");

    let api = Router::new()
        .route("/sessions", post(create_session))
        .route("/sessions/{code}", get(get_session))
        .route("/sessions/{code}/tickets", post(create_ticket))
        .route(
            "/teacher/{code}",
            get(get_teacher_session).delete(delete_session),
        )
        .route("/teacher/{code}/export", get(export_csv))
        .route("/demo", post(create_demo))
        .layer(middleware::from_fn_with_state(state.clone(), rate_limit));

    let app = Router::new()
        .route("/health", get(health))
        // Serve the shell as a successful document for every public app route.
        // ServeDir's not-found response retains a 404 status, which breaks direct
        // links and makes cache.addAll reject the offline shell.
        .route("/", get(spa_shell))
        .route("/demo", get(spa_shell))
        .route("/join", get(spa_shell))
        .route("/start", get(spa_shell))
        .route("/privacy", get(spa_shell))
        .route("/terms", get(spa_shell))
        .route("/session/{code}", get(spa_shell))
        .route("/teacher/{code}", get(spa_shell))
        .nest("/api", api)
        .fallback_service(ServeDir::new("dist").not_found_service(ServeFile::new("dist/404.html")))
        .layer(middleware::from_fn(cache_headers))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(SetResponseHeaderLayer::if_not_present(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff")))
        .layer(SetResponseHeaderLayer::if_not_present(header::REFERRER_POLICY, HeaderValue::from_static("strict-origin-when-cross-origin")))
        .layer(SetResponseHeaderLayer::if_not_present(header::CONTENT_SECURITY_POLICY, HeaderValue::from_static("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")))
        .layer(middleware::from_fn_with_state(state.clone(), replica_identity))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

fn configured_port(value: Option<&str>) -> u16 {
    value.and_then(|value| value.parse().ok()).unwrap_or(8080)
}

fn configured_data_dir(supplied: Option<&str>, durable_data_dir: &FsPath) -> PathBuf {
    if let Some(supplied) = supplied.map(str::trim).filter(|value| !value.is_empty()) {
        return PathBuf::from(supplied);
    }
    if durable_data_dir.is_dir() {
        return durable_data_dir.to_path_buf();
    }
    PathBuf::from("./data")
}

async fn shutdown() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler") };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("signal handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    info!("graceful shutdown started");
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status":"ok",
        "build_sha": state.build_sha,
        "storage_backend": state.db.storage_backend(),
        "replica_id": state.replica_id,
    }))
}

async fn replica_identity(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let mut response = next.run(req).await;
    // The random value has no routing or authentication meaning. It is a
    // diagnostic response header used by the deployment gate to reject a
    // false pass caused by connection affinity at the ingress.
    if let Ok(value) = HeaderValue::from_str(&state.replica_id) {
        response
            .headers_mut()
            .insert("x-draft-ticket-replica", value);
    }
    response
}

async fn spa_shell() -> Result<Html<String>, StatusCode> {
    tokio::fs::read_to_string("dist/index.html")
        .await
        .map(Html)
        .map_err(|error| {
            warn!(%error, "could not read SPA shell");
            StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn rate_limit(State(state): State<AppState>, req: Request, next: Next) -> Response {
    let ip = client_ip(&req);
    let window_start = Utc::now().timestamp();
    let client_key = rate_limit_key(&state.rate_limit_secret, &ip, window_start);
    // This counter lives beside sessions, not in a process-local map. The
    // UPSERT is one SQLite write and remains atomic with the single replica.
    let _guard = match state.db.lock().await {
        Ok(guard) => guard,
        Err(error) => return storage_error(error).into_response(),
    };
    let count = sqlx::query_scalar::<_, i64>(
        "INSERT INTO api_rate_limits(client_key, window_start, request_count) VALUES(?, ?, 1) \
         ON CONFLICT(client_key) DO UPDATE SET \
           request_count = CASE WHEN api_rate_limits.window_start = excluded.window_start \
             THEN api_rate_limits.request_count + 1 ELSE 1 END, \
           window_start = excluded.window_start \
         RETURNING request_count",
    )
    .bind(&client_key)
    .bind(window_start)
    .fetch_one(state.db.pool())
    .await;
    let count = match count {
        Ok(count) => count,
        Err(error) => return internal(error).into_response(),
    };
    drop(_guard);
    if count > 40 {
        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(ApiErrorBody {
                error: "Too many requests. Wait one second, then try again.".into(),
            }),
        )
            .into_response();
        response
            .headers_mut()
            .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        return response;
    }
    next.run(req).await
}

fn client_ip(req: &Request) -> String {
    // Azure's trusted ingress appends the address it observed to
    // X-Forwarded-For. A caller can supply earlier values, so the right-most
    // valid hop is the only value a public request cannot rotate itself.
    req.headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|chain| {
            chain
                .split(',')
                .rev()
                .find_map(|part| part.trim().parse::<IpAddr>().ok())
        })
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "unidentified".to_string())
}

fn digest(value: &str) -> String {
    Sha256::digest(value.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn rate_limit_key(secret: &str, ip: &str, timestamp: i64) -> String {
    let day = timestamp.div_euclid(86_400);
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(format!("{day}:{ip}").as_bytes());
    mac.finalize()
        .into_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

async fn initialize_security_material(db: &db::Database) -> anyhow::Result<(String, &'static str)> {
    let generated = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let _guard = db.lock().await?;
    let pool = db.pool();
    let inserted =
        sqlx::query("INSERT OR IGNORE INTO app_config(key,value) VALUES('rate_limit_secret', ?)")
            .bind(&generated)
            .execute(pool)
            .await?
            .rows_affected()
            == 1;
    let secret = sqlx::query_scalar::<_, String>(
        "SELECT value FROM app_config WHERE key = 'rate_limit_secret'",
    )
    .fetch_one(pool)
    .await?;
    let columns = sqlx::query_scalar::<_, String>("SELECT name FROM pragma_table_info('sessions')")
        .fetch_all(pool)
        .await?;
    if columns.iter().any(|column| column == "teacher_token") {
        let rows = sqlx::query_as::<_, (String, String)>(
            "SELECT code,teacher_token FROM sessions WHERE teacher_token <> ''",
        )
        .fetch_all(pool)
        .await?;
        for (code, token) in rows {
            sqlx::query("UPDATE sessions SET teacher_token_hash = ? WHERE code = ?")
                .bind(digest(&token))
                .bind(code)
                .execute(pool)
                .await?;
        }
        sqlx::query("ALTER TABLE sessions DROP COLUMN teacher_token")
            .execute(pool)
            .await?;
    }
    Ok((secret, if inserted { "generated" } else { "persisted" }))
}

async fn cleanup_database(db: &db::Database, now: DateTime<Utc>) -> anyhow::Result<u64> {
    let _guard = db.lock().await?;
    let deleted = sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(now)
        .execute(db.pool())
        .await?
        .rows_affected();
    sqlx::query("DELETE FROM api_rate_limits WHERE window_start < ?")
        .bind(now.timestamp() - 2)
        .execute(db.pool())
        .await?;
    Ok(deleted)
}

async fn cache_headers(req: Request, next: Next) -> Response {
    let cache_control = response_cache_control(req.uri().path());
    let mut response = next.run(req).await;
    if let Some(value) = cache_control {
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static(value));
    }
    response
}

fn response_cache_control(path: &str) -> Option<&'static str> {
    if path == "/health" {
        // Deployment identity and the storage backend must always describe the
        // process that served this request.
        Some("no-store, max-age=0")
    } else if path.starts_with("/api/") {
        // Session prompts, tickets, authorization errors, and CSV downloads
        // are private even when an intermediary would otherwise cache them.
        Some("private, no-store")
    } else if path.starts_with("/assets/") || path.starts_with("/fonts/") {
        Some("public, max-age=31536000, immutable")
    } else {
        None
    }
}

fn clean(value: &str, label: &str, min: usize, max: usize) -> Result<String, ApiError> {
    let value = value.trim();
    let count = value.chars().count();
    if count < min || count > max {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            format!("{label} must be {min}–{max} characters."),
        ));
    }
    Ok(value.to_string())
}

fn new_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let bytes = Uuid::new_v4().into_bytes();
    (0..6)
        .map(|i| ALPHABET[(bytes[i] as usize) % ALPHABET.len()] as char)
        .collect()
}

async fn insert_session(
    state: &AppState,
    title: &str,
    prompt: &str,
    days: i64,
    test_retention_seconds: Option<i64>,
    demo: bool,
) -> Result<CreatedSession, ApiError> {
    let code = new_code();
    let teacher_token = format!("dt_{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let teacher_token_hash = digest(&teacher_token);
    let created_at = Utc::now();
    let retention = test_retention_seconds
        .filter(|seconds| state.test_clock_enabled && (1..=10).contains(seconds))
        .map(ChronoDuration::seconds)
        .unwrap_or_else(|| ChronoDuration::days(days));
    let expires_at = created_at + retention;
    let _guard = state.db.lock().await.map_err(storage_error)?;
    sqlx::query("INSERT INTO sessions(code,title,prompt,teacher_token_hash,created_at,expires_at,is_demo) VALUES(?,?,?,?,?,?,?)")
        .bind(&code)
        .bind(title)
        .bind(prompt)
        .bind(&teacher_token_hash)
        .bind(created_at)
        .bind(expires_at)
        .bind(demo)
        .execute(state.db.pool())
        .await
        .map_err(internal)?;
    Ok(CreatedSession {
        session: Session {
            code,
            title: title.into(),
            prompt: prompt.into(),
            created_at,
            expires_at,
            is_demo: demo,
        },
        teacher_token,
    })
}

async fn create_session(
    State(state): State<AppState>,
    Json(body): Json<NewSession>,
) -> Result<(StatusCode, Json<CreatedSession>), ApiError> {
    let title = clean(&body.title, "Class name", 2, 80)?;
    let prompt = clean(&body.prompt, "Writing prompt", 4, 240)?;
    let days = body.retention_days.unwrap_or(7);
    if ![1, 7, 30].contains(&days) {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            "Retention must be 1, 7, or 30 days.".into(),
        ));
    }
    let created = insert_session(
        &state,
        &title,
        &prompt,
        days,
        body.test_retention_seconds,
        false,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(created)))
}

async fn active_session(state: &AppState, code: &str) -> Result<Session, ApiError> {
    let code = code.trim().to_uppercase();
    let _guard = state.db.lock().await.map_err(storage_error)?;
    let row = sqlx::query_as::<_, Session>(
        "SELECT code,title,prompt,created_at,expires_at,is_demo FROM sessions WHERE code = ?",
    )
    .bind(&code)
    .fetch_optional(state.db.pool())
    .await
    .map_err(internal)?
    .ok_or_else(|| {
        ApiError(
            StatusCode::NOT_FOUND,
            "That session code was not found. Check the six characters and try again.".into(),
        )
    })?;
    if row.expires_at <= Utc::now() {
        return Err(ApiError(
            StatusCode::GONE,
            "This session has expired. Ask your teacher for a new code.".into(),
        ));
    }
    Ok(row)
}

async fn get_session(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<Session>, ApiError> {
    Ok(Json(active_session(&state, &code).await?))
}

async fn create_ticket(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(body): Json<NewTicket>,
) -> Result<(StatusCode, Json<Ticket>), ApiError> {
    let pseudonym = clean(&body.pseudonym, "Class nickname", 2, 40)?;
    let claim = clean(&body.claim, "Claim", 3, 280)?;
    let evidence = clean(&body.evidence, "Evidence location", 3, 280)?;
    let revision = clean(&body.revision, "Revision choice", 3, 280)?;
    let reflection = clean(&body.reflection, "Exit reflection", 3, 500)?;
    let session = active_session(&state, &code).await?;
    let ticket = Ticket {
        id: Uuid::new_v4().to_string(),
        session_code: session.code,
        pseudonym,
        claim,
        evidence,
        revision,
        reflection,
        created_at: Utc::now(),
    };
    // Capacity and insertion are deliberately one SQLite write statement. SQLite
    // serializes writers, so concurrent requests cannot share a stale ticket count.
    let _guard = state.db.lock().await.map_err(storage_error)?;
    let inserted = sqlx::query("INSERT INTO tickets(id,session_code,pseudonym,claim,evidence,revision,reflection,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE code = ?) AND ((SELECT is_demo FROM sessions WHERE code = ?) = 1 OR (SELECT COUNT(*) FROM tickets WHERE session_code = ?) < 40)")
        .bind(&ticket.id).bind(&ticket.session_code).bind(&ticket.pseudonym).bind(&ticket.claim).bind(&ticket.evidence).bind(&ticket.revision).bind(&ticket.reflection).bind(ticket.created_at)
        .bind(&ticket.session_code).bind(&ticket.session_code).bind(&ticket.session_code)
        .execute(state.db.pool()).await.map_err(internal)?.rows_affected();
    if inserted == 0 && !session.is_demo {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "This session has reached 40 tickets. Ask your teacher to open another session.".into(),
        ));
    }
    Ok((StatusCode::CREATED, Json(ticket)))
}

fn bearer(req: &Request<Body>) -> Option<&str> {
    req.headers()
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
}

async fn authorized_session(
    state: &AppState,
    code: &str,
    token: Option<&str>,
) -> Result<Session, ApiError> {
    let token = token.ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "Teacher access is missing. Open the private teacher link from this device.".into(),
        )
    })?;
    let code = code.trim().to_uppercase();
    let token_hash = digest(token);
    let _guard = state.db.lock().await.map_err(storage_error)?;
    let session = sqlx::query_as::<_, Session>("SELECT code,title,prompt,created_at,expires_at,is_demo FROM sessions WHERE code = ? AND teacher_token_hash = ?")
        .bind(&code)
        .bind(&token_hash)
        .fetch_optional(state.db.pool())
        .await
        .map_err(internal)?;
    session.ok_or_else(|| {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "This teacher link is not valid. Use the link saved when the session was created."
                .into(),
        )
    })
}

async fn tickets_for_session(state: &AppState, code: &str) -> Result<Vec<Ticket>, ApiError> {
    let _guard = state.db.lock().await.map_err(storage_error)?;
    sqlx::query_as::<_, Ticket>("SELECT id,session_code,pseudonym,claim,evidence,revision,reflection,created_at FROM tickets WHERE session_code = ? ORDER BY created_at")
        .bind(code)
        .fetch_all(state.db.pool())
        .await
        .map_err(internal)
}

async fn get_teacher_session(
    State(state): State<AppState>,
    Path(code): Path<String>,
    req: Request<Body>,
) -> Result<Json<TeacherSession>, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    let tickets = tickets_for_session(&state, &session.code).await?;
    Ok(Json(TeacherSession { session, tickets }))
}

async fn export_csv(
    State(state): State<AppState>,
    Path(code): Path<String>,
    req: Request<Body>,
) -> Result<Response, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    let tickets = tickets_for_session(&state, &session.code).await?;
    let mut out = String::from(
        "class_nickname,claim,evidence_location,revision_choice,exit_reflection,submitted_at\n",
    );
    for t in tickets {
        out.push_str(
            &[
                t.pseudonym,
                t.claim,
                t.evidence,
                t.revision,
                t.reflection,
                t.created_at.to_rfc3339(),
            ]
            .iter()
            .map(|v| csv_cell(v))
            .collect::<Vec<_>>()
            .join(","),
        );
        out.push('\n');
    }
    let mut response = out.into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!(
            "attachment; filename=\"draft-tickets-{}.csv\"",
            session.code
        ))
        .unwrap(),
    );
    Ok(response)
}

async fn delete_session(
    State(state): State<AppState>,
    Path(code): Path<String>,
    req: Request<Body>,
) -> Result<StatusCode, ApiError> {
    let session = authorized_session(&state, &code, bearer(&req)).await?;
    let _guard = state.db.lock().await.map_err(storage_error)?;
    sqlx::query("DELETE FROM sessions WHERE code = ?")
        .bind(&session.code)
        .execute(state.db.pool())
        .await
        .map_err(internal)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn create_demo(
    State(state): State<AppState>,
) -> Result<(StatusCode, Json<CreatedSession>), ApiError> {
    let created = insert_session(
        &state,
        "Room 204 · Beloved seminar",
        "How does Morrison use memory to shape Sethe's choices?",
        1,
        None,
        true,
    )
    .await?;
    let samples = [
        (
            "Blue Finch",
            "Memory acts like a second setting that keeps the past present.",
            "Page 43, the description after Sethe sees the dress.",
            "I moved the scene before my explanation so readers see the image first.",
            "My next step is to connect the image to Sethe's decision in the next paragraph.",
        ),
        (
            "Copper Kite",
            "The repeated colors show how memory interrupts the present.",
            "Pages 38–39, especially the red light detail.",
            "I replaced a broad theme sentence with a claim about the color pattern.",
            "I still need a quotation that shows the interruption, not only the color.",
        ),
        (
            "Quiet Maple",
            "Sethe protects herself by reshaping what she remembers.",
            "Notebook paragraph 2 and the scene on page 54.",
            "I cut my opening summary and added the page 54 contrast.",
            "My claim is clearer, but I need to explain why the contrast matters.",
        ),
    ];
    let _guard = state.db.lock().await.map_err(storage_error)?;
    for (p, c, e, r, x) in samples {
        sqlx::query("INSERT INTO tickets(id,session_code,pseudonym,claim,evidence,revision,reflection,created_at) VALUES(?,?,?,?,?,?,?,?)")
            .bind(Uuid::new_v4().to_string())
            .bind(&created.session.code)
            .bind(p)
            .bind(c)
            .bind(e)
            .bind(r)
            .bind(x)
            .bind(Utc::now())
            .execute(state.db.pool())
            .await
            .map_err(internal)?;
    }
    Ok((StatusCode::CREATED, Json(created)))
}

fn csv_cell(value: &str) -> String {
    // Spreadsheet programs can evaluate quoted CSV cells that begin with a
    // formula marker. An apostrophe makes the cell text while keeping the
    // student's original value readable in the sheet.
    let safe = if value.starts_with(['=', '+', '-', '@', '\t', '\r']) {
        format!("'{value}")
    } else {
        value.to_string()
    };
    format!("\"{}\"", safe.replace('"', "\"\""))
}
fn internal(err: sqlx::Error) -> ApiError {
    warn!(error = %err, "database request failed");
    ApiError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "The session could not be saved. Wait a moment, then try again.".into(),
    )
}

fn storage_error(err: anyhow::Error) -> ApiError {
    warn!(error = %err, "shared database lock failed");
    ApiError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "The session could not be saved. Wait a moment, then try again.".into(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    #[test]
    fn session_codes_are_six_safe_characters() {
        let code = new_code();
        assert_eq!(code.len(), 6);
        assert!(code
            .chars()
            .all(|c| "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".contains(c)));
    }

    // @claim:runtime-defaults
    #[test]
    fn claim_runtime_defaults_prefer_the_durable_mount_and_remain_zero_config_locally() {
        let durable_dir =
            std::env::temp_dir().join(format!("draft-ticket-data-dir-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&durable_dir).unwrap();

        assert_eq!(configured_port(None), 8080);
        assert_eq!(configured_port(Some("not-a-port")), 8080);
        assert_eq!(configured_port(Some("18080")), 18080);
        assert_eq!(configured_data_dir(None, &durable_dir), durable_dir);
        assert_eq!(
            configured_data_dir(Some(" /tmp/draft-ticket-override "), &durable_dir),
            PathBuf::from("/tmp/draft-ticket-override")
        );
        assert_eq!(
            configured_data_dir(None, FsPath::new("/a-path-that-does-not-exist")),
            PathBuf::from("./data")
        );
        std::fs::remove_dir_all(durable_dir).unwrap();
    }

    #[test]
    fn csv_cells_escape_quotes() {
        assert_eq!(csv_cell("A \"clear\" claim"), "\"A \"\"clear\"\" claim\"");
    }

    #[test]
    fn csv_cells_neutralize_every_formula_prefix() {
        for value in ["=1+1", "+2+2", "-1+1", "@SUM(1,1)", "\t=1+1", "\r=1+1"] {
            assert_eq!(csv_cell(value), format!("\"'{value}\""));
        }
        assert_eq!(csv_cell("ordinary text"), "\"ordinary text\"");
    }

    #[test]
    fn forwarded_client_uses_ingress_appended_address() {
        let request = Request::builder()
            .header(
                "x-forwarded-for",
                "198.51.100.44, not-an-address, 203.0.113.9",
            )
            .body(Body::empty())
            .unwrap();
        assert_eq!(client_ip(&request), "203.0.113.9");
    }

    #[test]
    fn private_api_responses_are_never_cached() {
        assert_eq!(
            response_cache_control("/api/teacher/ABC234"),
            Some("private, no-store")
        );
        assert_eq!(
            response_cache_control("/api/teacher/ABC234/export"),
            Some("private, no-store")
        );
        assert_eq!(
            response_cache_control("/api/sessions/ABC234"),
            Some("private, no-store")
        );
        assert_eq!(
            response_cache_control("/health"),
            Some("no-store, max-age=0")
        );
    }

    #[tokio::test]
    async fn durable_database_restores_after_restart() {
        let data_dir = std::env::temp_dir().join(format!("draft-ticket-test-{}", Uuid::new_v4()));
        let database = db::connect(&data_dir).await.unwrap();
        let guard = database.lock().await.unwrap();
        sqlx::query("INSERT INTO sessions(code,title,prompt,teacher_token,created_at,expires_at,is_demo) VALUES(?,?,?,?,?,?,?)")
            .bind("ABC234")
            .bind("Restart test")
            .bind("Where did the draft change?")
            .bind("private-test-token")
            .bind(Utc::now())
            .bind(Utc::now() + ChronoDuration::days(1))
            .bind(false)
            .execute(database.pool())
            .await
            .unwrap();
        drop(guard);
        database.close().await;

        let restored = db::connect(&data_dir).await.unwrap();
        let guard = restored.lock().await.unwrap();
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE code = ?")
            .bind("ABC234")
            .fetch_one(restored.pool())
            .await
            .unwrap();
        assert_eq!(count, 1);
        drop(guard);
        restored.close().await;
        tokio::fs::remove_dir_all(data_dir).await.unwrap();
    }

    // @claim:data-storage-minimization
    #[tokio::test]
    async fn claim_data_storage_minimization_inventory_hashes_and_deletion() {
        let data_dir =
            std::env::temp_dir().join(format!("draft-ticket-storage-claim-{}", Uuid::new_v4()));
        let database = db::connect(&data_dir).await.unwrap();

        // Prove a credential from the pre-hash schema is migrated without
        // changing the private teacher link held by its owner.
        let legacy_token = "dt_legacy-private-token";
        let ticket_created = Utc::now();
        let rate_window = Utc::now().timestamp();
        let stored_rate_key;
        {
            let _guard = database.lock().await.unwrap();
            sqlx::query("INSERT INTO sessions(code,title,prompt,teacher_token,created_at,expires_at,is_demo) VALUES(?,?,?,?,?,?,?)")
                .bind("OLD234").bind("Legacy class").bind("What changed?").bind(legacy_token)
                .bind(Utc::now()).bind(Utc::now() + ChronoDuration::days(1)).bind(false)
                .execute(database.pool()).await.unwrap();
        }
        let (secret, _) = initialize_security_material(&database).await.unwrap();
        let state = AppState {
            db: database.clone(),
            build_sha: "test",
            replica_id: "test-replica".into(),
            rate_limit_secret: secret.clone(),
            test_clock_enabled: true,
        };

        let legacy: String =
            sqlx::query_scalar("SELECT teacher_token_hash FROM sessions WHERE code = 'OLD234'")
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(legacy, digest(legacy_token));

        let real = insert_session(
            &state,
            "Period 3",
            "How did the draft change?",
            1,
            Some(1),
            false,
        )
        .await
        .unwrap();
        let demo = insert_session(
            &state,
            "Sample session",
            "Where does memory change the scene?",
            1,
            None,
            true,
        )
        .await
        .unwrap();
        let demo_lifetime = demo.session.expires_at - demo.session.created_at;
        assert_eq!(demo_lifetime, ChronoDuration::days(1));

        {
            let _guard = database.lock().await.unwrap();
            sqlx::query("INSERT INTO tickets(id,session_code,pseudonym,claim,evidence,revision,reflection,created_at) VALUES(?,?,?,?,?,?,?,?)")
                .bind("ticket-record-id").bind(&real.session.code).bind("Green Comet")
                .bind("The doorway marks a choice.").bind("Page 12.")
                .bind("I moved the quotation.").bind("Explain the final image next.").bind(ticket_created)
                .execute(database.pool()).await.unwrap();
            let raw_ip = "203.0.113.81";
            let client_key = rate_limit_key(&secret, raw_ip, rate_window);
            assert_eq!(client_key.len(), 64);
            assert!(!client_key.contains(raw_ip));
            sqlx::query(
                "INSERT INTO api_rate_limits(client_key,window_start,request_count) VALUES(?,?,?)",
            )
            .bind(&client_key)
            .bind(rate_window)
            .bind(1_i64)
            .execute(database.pool())
            .await
            .unwrap();
            stored_rate_key = client_key;
        }

        let session_columns = sqlx::query("PRAGMA table_info(sessions)")
            .fetch_all(database.pool())
            .await
            .unwrap()
            .into_iter()
            .map(|row| row.get::<String, _>("name"))
            .collect::<Vec<_>>();
        assert_eq!(
            session_columns,
            [
                "code",
                "title",
                "prompt",
                "created_at",
                "expires_at",
                "is_demo",
                "teacher_token_hash"
            ]
        );
        let ticket_columns = sqlx::query("PRAGMA table_info(tickets)")
            .fetch_all(database.pool())
            .await
            .unwrap()
            .into_iter()
            .map(|row| row.get::<String, _>("name"))
            .collect::<Vec<_>>();
        assert_eq!(
            ticket_columns,
            [
                "id",
                "session_code",
                "pseudonym",
                "claim",
                "evidence",
                "revision",
                "reflection",
                "created_at"
            ]
        );
        let rate_columns = sqlx::query("PRAGMA table_info(api_rate_limits)")
            .fetch_all(database.pool())
            .await
            .unwrap()
            .into_iter()
            .map(|row| row.get::<String, _>("name"))
            .collect::<Vec<_>>();
        assert_eq!(
            rate_columns,
            ["client_key", "window_start", "request_count"]
        );
        let config_columns = sqlx::query("PRAGMA table_info(app_config)")
            .fetch_all(database.pool())
            .await
            .unwrap()
            .into_iter()
            .map(|row| row.get::<String, _>("name"))
            .collect::<Vec<_>>();
        assert_eq!(config_columns, ["key", "value"]);

        let stored: (String, String, String, String, DateTime<Utc>, DateTime<Utc>, bool) = sqlx::query_as(
            "SELECT code,title,prompt,teacher_token_hash,created_at,expires_at,is_demo FROM sessions WHERE code = ?",
        )
        .bind(&real.session.code)
        .fetch_one(database.pool())
        .await
        .unwrap();
        assert_eq!(stored.0, real.session.code);
        assert_eq!(stored.1, "Period 3");
        assert_eq!(stored.2, "How did the draft change?");
        assert_eq!(stored.3, digest(&real.teacher_token));
        assert_eq!(stored.4, real.session.created_at);
        assert_eq!(stored.5, real.session.expires_at);
        assert!(!stored.6);
        assert_ne!(stored.3, real.teacher_token);

        let ticket: (String, String, String, String, String, String, String, DateTime<Utc>) = sqlx::query_as(
            "SELECT id,session_code,pseudonym,claim,evidence,revision,reflection,created_at FROM tickets WHERE id = 'ticket-record-id'",
        ).fetch_one(database.pool()).await.unwrap();
        assert_eq!(
            ticket,
            (
                "ticket-record-id".into(),
                real.session.code.clone(),
                "Green Comet".into(),
                "The doorway marks a choice.".into(),
                "Page 12.".into(),
                "I moved the quotation.".into(),
                "Explain the final image next.".into(),
                ticket_created
            )
        );
        let config: (String, String) = sqlx::query_as("SELECT key,value FROM app_config")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!(config, ("rate_limit_secret".into(), secret.clone()));
        let rate: (String, i64, i64) =
            sqlx::query_as("SELECT client_key,window_start,request_count FROM api_rate_limits")
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(rate, (stored_rate_key, rate_window, 1));

        cleanup_database(&database, Utc::now() + ChronoDuration::seconds(4))
            .await
            .unwrap();
        let real_sessions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE code = ?")
            .bind(&real.session.code)
            .fetch_one(database.pool())
            .await
            .unwrap();
        let real_tickets: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM tickets WHERE session_code = ?")
                .bind(&real.session.code)
                .fetch_one(database.pool())
                .await
                .unwrap();
        let rate_rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM api_rate_limits")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!((real_sessions, real_tickets, rate_rows), (0, 0, 0));
        let demo_sessions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE code = ?")
            .bind(&demo.session.code)
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!(demo_sessions, 1);

        database.close().await;
        tokio::fs::remove_dir_all(data_dir).await.unwrap();
    }
}
