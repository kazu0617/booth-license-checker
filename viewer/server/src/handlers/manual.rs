use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;

use crate::{
    handlers::analyses::store_analysis,
    models::{AnalysisInput, AnalysisStoreResult},
    AppState,
};

pub async fn create(
    State(state): State<AppState>,
    Json(mut input): Json<AnalysisInput>,
) -> Result<Json<AnalysisStoreResult>, (StatusCode, Json<serde_json::Value>)> {
    let source = input.source.take().unwrap_or_else(|| "manual_form".to_string());
    let allowed = matches!(source.as_str(), "manual_pdf" | "manual_form");
    let source = if allowed { source } else { "manual_form".to_string() };

    store_analysis(&state, input, &source)
        .await
        .map(Json)
        .map_err(|e| {
            tracing::warn!(error = %e, "manual store_analysis failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e.to_string() })),
            )
        })
}
