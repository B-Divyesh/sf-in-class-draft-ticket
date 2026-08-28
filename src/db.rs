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
    let temporary_path = snapshot_path.with_extension(format!("db.{}.tmp", std::process::id()));
    if tokio::fs::try_exists(&temporary_path).await? {
        tokio::fs::remove_file(&temporary_path).await?;
    }
    sqlx::query("VACUUM INTO ?")
        .bind(temporary_path.to_string_lossy().as_ref())
        .execute(pool)
        .await?;
    let file = tokio::fs::File::open(&temporary_path).await?;
    file.sync_all().await?;
    tokio::fs::rename(&temporary_path, snapshot_path).await?;
    Ok(())
}
