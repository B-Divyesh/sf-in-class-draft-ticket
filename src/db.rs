use std::{
    path::{Path, PathBuf},
    str::FromStr,
    time::Duration,
};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};

pub async fn migrate(pool: &SqlitePool) -> anyhow::Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}

pub async fn connect(data_dir: &Path) -> anyhow::Result<(SqlitePool, PathBuf)> {
    tokio::fs::create_dir_all(data_dir).await?;
    let snapshot_path = data_dir.join("tickets.db");
    let runtime_dir =
        std::env::temp_dir().join(format!("in-class-draft-ticket-{}", std::process::id()));
    tokio::fs::create_dir_all(&runtime_dir).await?;
    let runtime_path = runtime_dir.join("tickets.db");

    if tokio::fs::metadata(&snapshot_path)
        .await
        .is_ok_and(|metadata| metadata.len() > 0)
    {
        tokio::fs::copy(&snapshot_path, &runtime_path).await?;
    }

    let options =
        SqliteConnectOptions::from_str(&format!("sqlite://{}?mode=rwc", runtime_path.display()))?
            .foreign_keys(true)
            .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    migrate(&pool).await?;
    checkpoint(&pool, &snapshot_path).await?;
    Ok((pool, snapshot_path))
}

pub async fn checkpoint(pool: &SqlitePool, snapshot_path: &Path) -> anyhow::Result<()> {
    // SQLite's byte-range locks are not portable to every network filesystem.
    // Build a consistent snapshot locally, then copy only raw bytes to the
    // durable mount and atomically replace the previous checkpoint there.
    let local_path = std::env::temp_dir().join(format!(
        "in-class-draft-ticket-checkpoint-{}.db",
        std::process::id()
    ));
    let durable_path = snapshot_path.with_extension(format!("db.{}.tmp", std::process::id()));
    if tokio::fs::try_exists(&local_path).await? {
        tokio::fs::remove_file(&local_path).await?;
    }
    if tokio::fs::try_exists(&durable_path).await? {
        tokio::fs::remove_file(&durable_path).await?;
    }
    sqlx::query("VACUUM INTO ?")
        .bind(local_path.to_string_lossy().as_ref())
        .execute(pool)
        .await?;
    let local_file = tokio::fs::File::open(&local_path).await?;
    local_file.sync_all().await?;
    tokio::fs::copy(&local_path, &durable_path).await?;
    let durable_file = tokio::fs::File::open(&durable_path).await?;
    durable_file.sync_all().await?;
    tokio::fs::rename(&durable_path, snapshot_path).await?;
    tokio::fs::remove_file(local_path).await?;
    Ok(())
}
