mod auth;
mod config;
mod db;
mod handlers;
mod models;
mod static_files;

use std::sync::Arc;

use anyhow::Result;
use axum::{
    extract::DefaultBodyLimit,
    http::{HeaderName, HeaderValue, Method},
    middleware,
    routing::{get, post},
    Json, Router,
};
use clap::Parser;
use serde_json::json;
use sqlx::SqlitePool;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use crate::config::{Args, Config};

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub api_key: Arc<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(fmt::layer())
        .init();

    let args = Args::parse();
    let cfg = Config::load(args).await?;
    let db = db::init(&cfg.db_url()).await?;

    let state = AppState {
        db,
        api_key: Arc::new(cfg.api_key.clone()),
    };

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin: &HeaderValue, _| {
            let Ok(s) = origin.to_str() else { return false };
            s.starts_with("chrome-extension://")
                || s.starts_with("moz-extension://")
                || s.starts_with("http://localhost")
                || s.starts_with("http://127.0.0.1")
        }))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
        ]);

    // Authenticated POST routes
    let auth_routes = Router::new()
        .route("/api/analyses", post(handlers::analyses::create))
        .route("/api/analyses/manual", post(handlers::manual::create))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_api_key,
        ));

    // Public GET routes
    let public_routes = Router::new()
        .route("/api/health", get(health))
        .route("/api/products", get(handlers::products::list))
        .route("/api/products/{id}", get(handlers::products::detail))
        .route("/api/analyses/{id}", get(handlers::analyses::detail))
        .route("/api/shops", get(handlers::products::shops))
        .route("/api/export.json", get(handlers::export::export_json))
        .route("/api/export.csv", get(handlers::export::export_csv));

    let api = Router::new().merge(auth_routes).merge(public_routes);

    let app = Router::new()
        .merge(api)
        .fallback(static_files::serve)
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(8 * 1024 * 1024));

    let addr = format!("{}:{}", cfg.args.bind, cfg.args.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("BOOTH License Viewer listening on http://{}", addr);
    println!("BOOTH License Viewer listening on http://{}", addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "ok": true, "service": "booth-license-viewer", "version": env!("CARGO_PKG_VERSION") }))
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("shutting down");
}
