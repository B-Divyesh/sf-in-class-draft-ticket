use std::{
    fs::{File, OpenOptions},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use fs2::FileExt;
use sqlx_core::{query::query, query_scalar::query_scalar};
use sqlx_sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};
use tracing::warn;

const SQLITE_BUSY_TIMEOUT: Duration = Duration::from_secs(3);
const STARTUP_ATTEMPTS: u32 = 30;
const STARTUP_RETRY_DELAY: Duration = Duration::from_millis(250);

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
    gate: Arc<FileGate>,
}

pub(crate) struct FileGate {
    path: PathBuf,
}

pub struct DatabaseGuard(File);

impl FileGate {
    async fn lock(&self) -> anyhow::Result<DatabaseGuard> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let file = OpenOptions::new()
                .create(true)
                .read(true)
                .write(true)
                .truncate(false)
                .open(path)?;
            FileExt::lock_exclusive(&file)?;
            Ok(DatabaseGuard(file))
        })
        .await?
    }
}

impl Database {
    pub fn storage_backend(&self) -> &'static str {
        "sqlite"
    }

    pub async fn lock(&self) -> anyhow::Result<DatabaseGuard> {
        self.gate.lock().await
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    #[cfg(test)]
    pub async fn close(&self) {
        self.pool.close().await;
    }
}

impl Drop for DatabaseGuard {
    fn drop(&mut self) {
        let _ = FileExt::unlock(&self.0);
    }
}

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx_core::Error> {
    for statement in [
        "CREATE TABLE IF NOT EXISTS sessions (code TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL, teacher_token TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, session_code TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE, pseudonym TEXT NOT NULL, claim TEXT NOT NULL, evidence TEXT NOT NULL, revision TEXT NOT NULL, reflection TEXT NOT NULL, created_at TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS tickets_session_idx ON tickets(session_code, created_at)",
        "CREATE TABLE IF NOT EXISTS api_rate_limits (client_key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, request_count INTEGER NOT NULL)",
        "CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON api_rate_limits(window_start)",
        "CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    ] {
        query(statement).execute(pool).await?;
    }
    let columns = query_scalar::<_, String>("SELECT name FROM pragma_table_info('sessions')")
        .fetch_all(pool)
        .await?;
    if !columns.iter().any(|column| column == "teacher_token_hash") {
        query("ALTER TABLE sessions ADD COLUMN teacher_token_hash TEXT NOT NULL DEFAULT ''")
            .execute(pool)
            .await?;
    }
    Ok(())
}

fn retryable_startup_error(error: &sqlx_core::Error) -> bool {
    match error {
        sqlx_core::Error::Database(database) => {
            retryable_lock_values(database.code().as_deref(), database.message())
        }
        _ => false,
    }
}

fn retryable_lock_values(code: Option<&str>, message: &str) -> bool {
    matches!(code, Some("5") | Some("6"))
        || message.contains("database is locked")
        || message.contains("database is busy")
}

pub async fn connect(data_dir: &Path) -> anyhow::Result<Database> {
    tokio::fs::create_dir_all(data_dir).await?;
    let database_path = data_dir.join("tickets.db");
    let gate = Arc::new(FileGate {
        path: data_dir.join("tickets.db.app-lock"),
    });
    // A single durable mount and one deployed replica are the production
    // contract. The lock also keeps development restarts and test processes
    // from racing SQLite migration history.
    let _guard = gate.lock().await?;
    let options = SqliteConnectOptions::new()
        .filename(&database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        // Azure Files is mounted over SMB, where SQLite's default POSIX byte
        // locks remain permanently busy after a container handoff. Dotfile
        // locking uses atomic directory creation on the shared filesystem.
        // Every database operation also holds FileGate, so readers and writers
        // remain serialized across a rolling one-replica deployment.
        .vfs("unix-dotfile")
        // WAL assumes local shared memory and is not safe on a network mount.
        .journal_mode(SqliteJournalMode::Delete)
        .busy_timeout(SQLITE_BUSY_TIMEOUT);
    for attempt in 1..=STARTUP_ATTEMPTS {
        match SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options.clone())
            .await
        {
            Ok(pool) => match migrate(&pool).await {
                Ok(()) => return Ok(Database { pool, gate }),
                Err(error) if retryable_startup_error(&error) && attempt < STARTUP_ATTEMPTS => {
                    pool.close().await;
                    warn!(attempt, error = %error, "SQLite startup lock is busy; retrying");
                }
                Err(error) => return Err(error.into()),
            },
            Err(error) if retryable_startup_error(&error) && attempt < STARTUP_ATTEMPTS => {
                warn!(attempt, error = %error, "SQLite connection lock is busy; retrying");
            }
            Err(error) => return Err(error.into()),
        }
        tokio::time::sleep(STARTUP_RETRY_DELAY).await;
    }
    unreachable!("the final SQLite startup attempt always returns")
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn only_sqlite_lock_codes_are_retryable() {
        assert!(retryable_lock_values(Some("5"), "database is locked"));
        assert!(retryable_lock_values(Some("6"), "database table is locked"));
        assert!(retryable_lock_values(None, "database is busy"));
        assert!(!retryable_lock_values(
            Some("1555"),
            "unique constraint failed"
        ));
    }

    #[tokio::test]
    async fn startup_waits_for_mounted_database_lock_instead_of_exiting() {
        let data_dir =
            std::env::temp_dir().join(format!("draft-ticket-startup-lock-{}", Uuid::new_v4()));
        let seeded = connect(&data_dir).await.unwrap();
        seeded.close().await;

        let blocker_options = SqliteConnectOptions::new()
            .filename(data_dir.join("tickets.db"))
            .foreign_keys(true)
            .vfs("unix-dotfile")
            .busy_timeout(SQLITE_BUSY_TIMEOUT);
        let blocker = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(blocker_options)
            .await
            .unwrap();
        query("BEGIN EXCLUSIVE").execute(&blocker).await.unwrap();

        let retry_dir = data_dir.clone();
        let startup = tokio::spawn(async move { connect(&retry_dir).await });
        // The candidate exited after this busy timeout. A repaired startup is
        // still waiting for the mounted database to become writable.
        tokio::time::sleep(SQLITE_BUSY_TIMEOUT + Duration::from_millis(300)).await;
        assert!(
            !startup.is_finished(),
            "startup exited on transient SQLITE_BUSY"
        );

        query("ROLLBACK").execute(&blocker).await.unwrap();
        blocker.close().await;
        let database = tokio::time::timeout(Duration::from_secs(10), startup)
            .await
            .expect("startup did not recover after the mounted lock cleared")
            .expect("startup task panicked")
            .expect("startup returned a database error after the lock cleared");
        let table_count: i64 = query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'sessions'",
        )
        .fetch_one(database.pool())
        .await
        .unwrap();
        assert_eq!(table_count, 1);

        database.close().await;
        tokio::fs::remove_dir_all(data_dir).await.unwrap();
    }
}
