use std::{
    fs::{File, OpenOptions},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use fs2::FileExt;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
    gate: Arc<FileGate>,
}

struct FileGate {
    path: PathBuf,
}

pub struct DatabaseGuard {
    _file: File,
}

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
            Ok(DatabaseGuard { _file: file })
        })
        .await?
    }
}

impl Database {
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

pub async fn migrate(pool: &SqlitePool) -> anyhow::Result<()> {
    for attempt in 0..60 {
        match sqlx::migrate!("./migrations").run(pool).await {
            Ok(()) => return Ok(()),
            Err(error) if retryable_migration_error(&error.to_string()) && attempt < 59 => {
                // Container App starts a revision's replicas together. Two
                // migrators can both observe a pending migration before one
                // records it in `_sqlx_migrations`; the loser then sees either
                // SQLite's lock or the history-table uniqueness constraint.
                // Rerunning is safe because sqlx migrations are transactional.
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            Err(error) => return Err(error.into()),
        }
    }
    unreachable!("the bounded migration retry always returns")
}

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
    // SQLite's own journal locks can deadlock when two containers recover the
    // same file over SMB at once. One crash-safe byte-range lock around all DB
    // work ensures only one replica enters SQLite. The OS releases it if a
    // container exits, unlike a sentinel file.
    let _guard = gate.lock().await?;
    // Every replica opens the *same* durable database on the mounted share.
    // Keeping per-process copies made a successful POST invisible to another
    // replica until it happened to restart. DELETE journaling keeps all state in
    // the single database file. Keep one connection per replica and SQLite's
    // default rollback journal: configuring journal pragmas concurrently over
    // SMB can itself require an exclusive lock before the service is ready.
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
