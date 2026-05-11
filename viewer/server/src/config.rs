use anyhow::{Context, Result};
use clap::Parser;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Parser, Debug, Clone)]
#[command(name = "booth-license-viewer", version, about)]
pub struct Args {
    #[arg(long, env = "BLV_PORT", default_value_t = 38274)]
    pub port: u16,

    #[arg(long, env = "BLV_DATA_DIR", default_value = "./data")]
    pub data_dir: PathBuf,

    #[arg(long, env = "BLV_BIND", default_value = "127.0.0.1")]
    pub bind: String,
}

pub struct Config {
    pub args: Args,
    pub api_key: String,
    pub db_path: PathBuf,
}

impl Config {
    pub async fn load(args: Args) -> Result<Self> {
        tokio::fs::create_dir_all(&args.data_dir)
            .await
            .with_context(|| format!("create data dir: {}", args.data_dir.display()))?;

        let key_path = args.data_dir.join("api-key.txt");
        let api_key = match tokio::fs::read_to_string(&key_path).await {
            Ok(s) => s.trim().to_string(),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                let new_key = Uuid::new_v4().to_string();
                tokio::fs::write(&key_path, &new_key)
                    .await
                    .with_context(|| format!("write api-key.txt to {}", key_path.display()))?;
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let perms = std::fs::Permissions::from_mode(0o600);
                    let _ = std::fs::set_permissions(&key_path, perms);
                }
                println!("================================================================");
                println!(" Generated new API key (saved to {}):", key_path.display());
                println!("   {}", new_key);
                println!(" Paste this into the extension's options page → Viewer settings.");
                println!("================================================================");
                new_key
            }
            Err(e) => return Err(e).context("read api-key.txt"),
        };

        let db_path = args.data_dir.join("db.sqlite");
        Ok(Self {
            args,
            api_key,
            db_path,
        })
    }

    pub fn db_url(&self) -> String {
        format!("sqlite://{}?mode=rwc", self.db_path.display())
    }
}
