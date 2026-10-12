use std::{env, net::SocketAddr, path::PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use axum_extra::extract::cookie::Key;
use sha2::{Digest, Sha512};

pub struct Config {
    pub google_client_id: String,
    pub google_client_secret: String,
    pub public_url: String,
    pub allowed_emails: Vec<String>,
    session_secret: String,
    pub bind_addr: SocketAddr,
    pub static_dir: PathBuf,
    pub homeserver_data: PathBuf,
}

fn required(name: &str) -> Result<String> {
    match env::var(name) {
        Ok(v) if !v.trim().is_empty() => Ok(v.trim().to_string()),
        _ => Err(anyhow!("missing required env var {name} (see .env.example)")),
    }
}

fn optional(name: &str, default: &str) -> String {
    env::var(name)
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| default.to_string())
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let session_secret = required("SESSION_SECRET")?;
        if session_secret.len() < 32 {
            bail!("SESSION_SECRET must be at least 32 characters");
        }

        let allowed_emails: Vec<String> = required("ALLOWED_EMAILS")?
            .split(',')
            .map(|e| e.trim().to_lowercase())
            .filter(|e| !e.is_empty())
            .collect();
        if allowed_emails.is_empty() {
            bail!("ALLOWED_EMAILS must list at least one address");
        }

        Ok(Self {
            google_client_id: required("GOOGLE_CLIENT_ID")?,
            google_client_secret: required("GOOGLE_CLIENT_SECRET")?,
            public_url: required("PUBLIC_URL")?.trim_end_matches('/').to_string(),
            allowed_emails,
            session_secret,
            bind_addr: optional("BIND_ADDR", "0.0.0.0:8080")
                .parse()
                .context("BIND_ADDR is not a valid socket address")?,
            static_dir: optional("STATIC_DIR", "../web/dist").into(),
            homeserver_data: optional("HOMESERVER_DATA", "data/homeserver.json").into(),
        })
    }

    pub fn redirect_uri(&self) -> String {
        format!("{}/auth/callback", self.public_url)
    }

    pub fn secure_cookies(&self) -> bool {
        self.public_url.starts_with("https://")
    }

    pub fn is_allowed(&self, email: &str) -> bool {
        let email = email.to_lowercase();
        self.allowed_emails.iter().any(|a| *a == email)
    }

    /// Cookie encryption key derived from SESSION_SECRET (SHA-512 gives the 64 bytes `Key` needs).
    pub fn cookie_key(&self) -> Key {
        Key::from(&Sha512::digest(self.session_secret.as_bytes()))
    }
}
