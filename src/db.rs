use std::{
    fs::{File, OpenOptions},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use fs2::FileExt;
use sqlx_core::{query::query, query_scalar::query_scalar};
use sqlx_sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};

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

pub async fn migrate(pool: &SqlitePool) -> anyhow::Result<()> {
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

#[cfg(test)]
fn retryable_migration_error(message: &str) -> bool {
    message.contains("database is locked")
        || message.contains("database is busy")
        || message.contains("UNIQUE constraint failed: _sqlx_migrations.version")
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
        .busy_timeout(Duration::from_secs(3));
    let pool = {
        let mut connected = None;
        for attempt in 0..30 {
            match SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(options.clone())
                .await
            {
                Ok(pool) => {
                    connected = Some(pool);
                    break;
                }
                Err(error) if error.to_string().contains("database is locked") && attempt < 29 => {
                    tokio::time::sleep(Duration::from_millis(250)).await;
                }
                Err(error) => return Err(error.into()),
            }
        }
        connected.expect("the bounded database connection retry always returns")
    };
    migrate(&pool).await?;
    Ok(Database { pool, gate })
}

#[cfg(test)]
mod tests {
    use super::retryable_migration_error;

    #[test]
    fn concurrent_migration_conflicts_are_retryable() {
        assert!(retryable_migration_error(
            "(code: 1555) UNIQUE constraint failed: _sqlx_migrations.version"
        ));
        assert!(retryable_migration_error("database is locked"));
        assert!(!retryable_migration_error("migration checksum changed"));
    }
}
