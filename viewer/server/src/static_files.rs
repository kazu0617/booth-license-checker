use axum::{
    body::Body,
    http::{header, Request, StatusCode},
    response::{IntoResponse, Response},
};
use std::path::PathBuf;
use tower::ServiceExt;
use tower_http::services::ServeDir;

pub async fn serve(req: Request<Body>) -> Response {
    let path = req.uri().path().to_string();

    let static_dir = PathBuf::from("./static");
    if !static_dir.exists() {
        return (
            StatusCode::NOT_FOUND,
            "Static files not found. Run `npm run build:web` to build the React app.",
        )
            .into_response();
    }

    let serve = ServeDir::new(&static_dir);
    let response = match serve.oneshot(req).await {
        Ok(r) => r,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    if response.status() != StatusCode::NOT_FOUND {
        return response.into_response();
    }

    // SPA フォールバック: index.html を返して React Router に処理させる
    if path.starts_with("/api") {
        return StatusCode::NOT_FOUND.into_response();
    }
    let index_path = static_dir.join("index.html");
    match tokio::fs::read(&index_path).await {
        Ok(bytes) => Response::builder()
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .body(Body::from(bytes))
            .unwrap(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}
