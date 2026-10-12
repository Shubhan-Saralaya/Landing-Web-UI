//! Google OAuth (authorization code flow) with an email allowlist.
//! Sessions live in an encrypted, HttpOnly cookie — no server-side store.

use anyhow::{bail, Result};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect, Response},
    Json,
};
use axum_extra::extract::cookie::{Cookie, PrivateCookieJar, SameSite};
use serde::{Deserialize, Serialize};
use time::{Duration, OffsetDateTime};

use crate::AppState;

const STATE_COOKIE: &str = "oauth_state";
const SESSION_COOKIE: &str = "session";
const SESSION_DAYS: i64 = 7;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://openidconnect.googleapis.com/v1/userinfo";

#[derive(Serialize, Deserialize)]
struct Session {
    email: String,
    exp: i64,
}

/// Email of a valid, unexpired session, if any.
pub fn session_email(jar: &PrivateCookieJar) -> Option<String> {
    let cookie = jar.get(SESSION_COOKIE)?;
    let session: Session = serde_json::from_str(cookie.value()).ok()?;
    (session.exp > OffsetDateTime::now_utc().unix_timestamp()).then_some(session.email)
}

fn cookie(state: &AppState, name: &'static str, value: String, max_age: Duration) -> Cookie<'static> {
    Cookie::build((name, value))
        .path("/")
        .http_only(true)
        .secure(state.config.secure_cookies())
        .same_site(SameSite::Lax)
        .max_age(max_age)
        .build()
}

fn removal(name: &'static str) -> Cookie<'static> {
    Cookie::build(name).path("/").build()
}

pub async fn login(State(state): State<AppState>, jar: PrivateCookieJar) -> Response {
    if state.config.test_login.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }
    let csrf = hex::encode(rand::random::<[u8; 32]>());

    let mut url = reqwest::Url::parse(GOOGLE_AUTH_URL).expect("static URL");
    url.query_pairs_mut()
        .append_pair("client_id", &state.config.google_client_id)
        .append_pair("redirect_uri", &state.config.redirect_uri())
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email")
        .append_pair("state", &csrf)
        .append_pair("prompt", "select_account");

    let jar = jar.add(cookie(&state, STATE_COOKIE, csrf, Duration::minutes(10)));
    (jar, Redirect::to(url.as_str())).into_response()
}

#[derive(Deserialize)]
pub struct TestLogin {
    username: String,
    password: String,
}

/// TEST ONLY: username/password login, available only while TEST_LOGIN_USER/PASSWORD are set.
pub async fn test_login(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Json(body): Json<TestLogin>,
) -> Response {
    let Some((user, pass)) = &state.config.test_login else {
        return StatusCode::NOT_FOUND.into_response();
    };
    // Constant-time compare; both checks always run.
    let ok = ct_eq(body.username.as_bytes(), user.as_bytes()) & ct_eq(body.password.as_bytes(), pass.as_bytes());
    if !ok {
        tracing::warn!("test login denied");
        return StatusCode::UNAUTHORIZED.into_response();
    }
    tracing::warn!(%user, "homeserver unlocked via TEST login");
    let exp = OffsetDateTime::now_utc() + Duration::days(SESSION_DAYS);
    let session = Session { email: user.clone(), exp: exp.unix_timestamp() };
    let value = serde_json::to_string(&session).expect("serializable");
    (jar.add(cookie(&state, SESSION_COOKIE, value, Duration::days(SESSION_DAYS))), StatusCode::NO_CONTENT)
        .into_response()
}

fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[derive(Deserialize)]
pub struct CallbackParams {
    code: Option<String>,
    state: Option<String>,
}

pub async fn callback(
    State(state): State<AppState>,
    jar: PrivateCookieJar,
    Query(params): Query<CallbackParams>,
) -> Response {
    if state.config.test_login.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }
    let expected = jar.get(STATE_COOKIE).map(|c| c.value().to_owned());
    let jar = jar.remove(removal(STATE_COOKIE));

    let (Some(code), Some(got)) = (params.code, params.state) else {
        // User backed out of the Google consent screen.
        return (jar, Redirect::to("/?auth=cancelled#homeserver")).into_response();
    };
    if expected.as_deref() != Some(got.as_str()) {
        tracing::warn!("oauth state mismatch");
        return (jar, Redirect::to("/?auth=error#homeserver")).into_response();
    }

    match fetch_verified_email(&state, &code).await {
        Ok(email) if state.config.is_allowed(&email) => {
            tracing::info!(%email, "homeserver unlocked");
            let exp = OffsetDateTime::now_utc() + Duration::days(SESSION_DAYS);
            let session = Session { email, exp: exp.unix_timestamp() };
            let value = serde_json::to_string(&session).expect("serializable");
            let jar = jar.add(cookie(&state, SESSION_COOKIE, value, Duration::days(SESSION_DAYS)));
            (jar, Redirect::to("/?auth=ok#homeserver")).into_response()
        }
        Ok(email) => {
            tracing::warn!(%email, "login denied: not on allowlist");
            (jar, Redirect::to("/?auth=denied#homeserver")).into_response()
        }
        Err(err) => {
            tracing::error!("oauth exchange failed: {err:#}");
            (jar, Redirect::to("/?auth=error#homeserver")).into_response()
        }
    }
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct UserInfo {
    email: Option<String>,
    email_verified: Option<bool>,
}

async fn fetch_verified_email(state: &AppState, code: &str) -> Result<String> {
    let redirect_uri = state.config.redirect_uri();
    let token: TokenResponse = state
        .http
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", state.config.google_client_id.as_str()),
            ("client_secret", state.config.google_client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    let info: UserInfo = state
        .http
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(&token.access_token)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    match (info.email, info.email_verified) {
        (Some(email), Some(true)) => Ok(email.to_lowercase()),
        _ => bail!("Google account has no verified email"),
    }
}

pub async fn logout(jar: PrivateCookieJar) -> (PrivateCookieJar, StatusCode) {
    (jar.remove(removal(SESSION_COOKIE)), StatusCode::NO_CONTENT)
}

#[derive(Serialize)]
pub struct Me {
    authenticated: bool,
    email: Option<String>,
    /// "password" while the TEST login replaces Google, else "google".
    mode: &'static str,
}

pub async fn me(State(state): State<AppState>, jar: PrivateCookieJar) -> Json<Me> {
    let email = session_email(&jar);
    let mode = if state.config.test_login.is_some() { "password" } else { "google" };
    Json(Me { authenticated: email.is_some(), email, mode })
}
