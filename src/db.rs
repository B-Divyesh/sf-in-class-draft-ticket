use std::{path::Path, time::Duration};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    SqlitePool,
};

pub async fn migrate(pool: &SqlitePool) -> anyhow::Result<()> {
    for attempt in 0..30 {
        match sqlx::migrate!("./migrations").run(pool).await {
            Ok(()) => return Ok(()),
            Err(error) if error.to_string().contains("database is locked") && attempt < 29 => {
                // A revision starts its replicas together. Let the replica
                // holding SQLite's schema lock finish instead of crash-looping.
                tokio::time::sleep(Duration::from_millis(250)).await;
            }
            Err(error) => return Err(error.into()),
        }
    }
    unreachable!("the bounded migration retry always returns")
}

pub async fn connect(data_dir: &Path) -> anyhow::Result<SqlitePool> {
    tokio::fs::create_dir_all(data_dir).await?;
    let database_path = data_dir.join("tickets.db");
    // Every replica opens the *same* durable database on the mounted share.
    // Keeping per-process copies made a successful POST invisible to another
    // replica until it happened to restart. DELETE journaling keeps all state in
    // the single database file (rather than a replica-local WAL sidecar) and
    // SQLite's file locks serialize writers across the mounted share.
    let options = SqliteConnectOptions::new()
        .filename(&database_path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Delete)
        .synchronous(SqliteSynchronous::Full)
        .busy_timeout(Duration::from_secs(15));
    let pool = {
        let mut connected = None;
        for attempt in 0..30 {
            match SqlitePoolOptions::new()
                .max_connections(5)
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
    Ok(pool)
}
