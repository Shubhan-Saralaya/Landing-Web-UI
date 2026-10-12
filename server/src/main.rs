mod auth;
mod config;

use std::sync::Arc;

use axum::{
    extract::{FromRef, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use axum_extra::extract::cookie::{Key, PrivateCookieJar};
use serde_json::Value;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<config::Config>,
    pub http: reqwest::Client,
    key: Key,
}

impl FromRef<AppState> for Key {
    fn from_ref(state: &AppState) -> Key {
        state.key.clone()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Searches the working directory and its parents, so the repo-root .env is found from server/.
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=info".into()),
        )
        .init();

    let config = config::Config::from_env()?;
    let state = AppState {
        key: config.cookie_key(),
        http: reqwest::Client::builder().user_agent("station-server").build()?,
        config: Arc::new(config),
    };

    // SPA: unknown paths fall back to index.html (200) so client-side hashes/routes work.
    let static_dir = &state.config.static_dir;
    let spa = ServeDir::new(static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    let app = Router::new()
        .route("/auth/login", get(auth::login))
        .route("/auth/callback", get(auth::callback))
        .route("/auth/logout", post(auth::logout))
        .route("/api/me", get(auth::me))
        .route("/api/homeserver", get(homeserver))
        .route("/api/homeserver/public", get(homeserver_public))
        .fallback_service(spa)
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let listener = tokio::net::TcpListener::bind(state.config.bind_addr).await?;
    tracing::info!(
        "listening on {} (public url {})",
        state.config.bind_addr,
        state.config.public_url
    );
    axum::serve(listener, app).await?;
    Ok(())
}

/// Full homeserver map, including every `url` — only for allowlisted sessions.
async fn homeserver(State(state): State<AppState>, jar: PrivateCookieJar) -> Response {
    if auth::session_email(&jar).is_none() {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    match read_map(&state).await {
        Some(map) => no_store(map),
        None => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Same map with every `url` removed, so visitors can see what runs but have nothing to open.
async fn homeserver_public(State(state): State<AppState>) -> Response {
    match read_map(&state).await {
        Some(mut map) => {
            strip_urls(&mut map);
            no_store(map)
        }
        None => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// Read per request so edits to the JSON need no restart.
async fn read_map(state: &AppState) -> Option<Value> {
    let path = &state.config.homeserver_data;
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|err| tracing::error!("reading {path:?}: {err}"))
        .ok()?;
    serde_json::from_slice(&bytes)
        .map_err(|err| tracing::error!("parsing {path:?}: {err}"))
        .ok()
}

fn strip_urls(value: &mut Value) {
    match value {
        Value::Object(map) => {
            map.remove("url");
            map.values_mut().for_each(strip_urls);
        }
        Value::Array(items) => items.iter_mut().for_each(strip_urls),
        _ => {}
    }
}

fn no_store(value: Value) -> Response {
    ([(header::CACHE_CONTROL, "no-store")], Json(value)).into_response()
}
