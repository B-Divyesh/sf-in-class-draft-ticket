use std::{
    fs::{File, OpenOptions},
    path::{Path, PathBuf},
    str::FromStr,
    sync::Arc,
    time::Duration,
};

use fs2::FileExt;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    PgPool, SqlitePool,
};

#[derive(Clone)]
pub enum Database {
    Sqlite {
        pool: SqlitePool,
        gate: Arc<FileGate>,
    },
    Postgres(PgPool),
}

pub(crate) struct FileGate {
    path: PathBuf,
}

pub enum DatabaseGuard {
    Sqlite(File),
    Postgres,
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
            Ok(DatabaseGuard::Sqlite(file))
        })
        .await?
    }
}

impl Database {
    pub fn storage_backend(&self) -> &'static str {
        match self {
            Self::Sqlite { .. } => "sqlite",
            Self::Postgres(_) => "postgres",
        }
    }

    pub async fn lock(&self) -> anyhow::Result<DatabaseGuard> {
        match self {
            Self::Sqlite { gate, .. } => gate.lock().await,
            Self::Postgres(_) => Ok(DatabaseGuard::Postgres),
        }
    }

    pub fn sqlite(&self) -> Option<&SqlitePool> {
        match self {
            Self::Sqlite { pool, .. } => Some(pool),
            Self::Postgres(_) => None,
        }
    }

    pub fn postgres(&self) -> Option<&PgPool> {
        match self {
            Self::Postgres(pool) => Some(pool),
            Self::Sqlite { .. } => None,
        }
    }

    #[cfg(test)]
    pub async fn close(&self) {
        match self {
            Self::Sqlite { pool, .. } => pool.close().await,
            Self::Postgres(pool) => pool.close().await,
        }
    }
}

impl Drop for DatabaseGuard {
    fn drop(&mut self) {
        if let Self::Sqlite(file) = self {
            let _ = FileExt::unlock(file);
        }
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

async fn connect_postgres(database_url: &str) -> anyhow::Result<Database> {
    let options = PgConnectOptions::from_str(database_url)?
        .options([("application_name", "in-class-draft-ticket")]);
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(10))
        .connect_with(options)
        .await?;
    let mut transaction = pool.begin().await?;
    // Serialize idempotent schema setup when a revision starts all replicas
    // together. A transaction-scoped advisory lock cannot leak if setup fails.
    // raw_sql avoids sqlx's shared public migration-history table, which the
    // least-privilege runtime role must not be able to alter.
    sqlx::query("SELECT pg_advisory_xact_lock(2026082901)")
        .execute(&mut *transaction)
        .await?;
    sqlx::raw_sql(include_str!("../migrations-postgres/202608290001_init.sql"))
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;
    Ok(Database::Postgres(pool))
}

async fn connect_sqlite(data_dir: &Path) -> anyhow::Result<Database> {
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
    Ok(Database::Sqlite { pool, gate })
}

pub async fn connect(data_dir: &Path) -> anyhow::Result<Database> {
    let database_url = std::env::var("DATABASE_URL").ok();
    // Build workers can expose a replica marker without being the deployed
    // product. The app and revision markers identify an actual Container App
    // revision while keeping local/CI zero-configuration startup intact.
    let managed_container_app = ["CONTAINER_APP_NAME", "CONTAINER_APP_REVISION"]
        .iter()
        .any(|name| std::env::var(name).is_ok_and(|value| !value.trim().is_empty()));

    match storage_configuration(database_url.as_deref(), managed_container_app)? {
        Some(database_url) => connect_postgres(&database_url).await,
        None => connect_sqlite(data_dir).await,
    }
}

pub(crate) fn storage_configuration(
    database_url: Option<&str>,
    managed_container_app: bool,
) -> anyhow::Result<Option<String>> {
    if let Some(database_url) = database_url.map(str::trim).filter(|url| !url.is_empty()) {
        return Ok(Some(database_url.to_owned()));
    }
    if managed_container_app {
        anyhow::bail!(
            "DATABASE_URL is required in Azure Container Apps; refusing replica-local SQLite"
        );
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::{retryable_migration_error, storage_configuration};

    #[test]
    fn concurrent_migration_conflicts_are_retryable() {
        assert!(retryable_migration_error(
            "(code: 1555) UNIQUE constraint failed: _sqlx_migrations.version"
        ));
        assert!(retryable_migration_error("database is locked"));
        assert!(!retryable_migration_error("migration checksum changed"));
    }

    #[test]
    fn managed_container_app_never_falls_back_to_replica_local_sqlite() {
        let error = storage_configuration(None, true).unwrap_err();
        assert!(error
            .to_string()
            .contains("DATABASE_URL is required in Azure Container Apps"));
        assert!(storage_configuration(Some("   "), true).is_err());
        assert_eq!(
            storage_configuration(Some(" postgres://shared "), true).unwrap(),
            Some("postgres://shared".to_owned())
        );
    }

    #[test]
    fn unconfigured_local_runtime_keeps_the_sqlite_default() {
        assert_eq!(storage_configuration(None, false).unwrap(), None);
    }
}
