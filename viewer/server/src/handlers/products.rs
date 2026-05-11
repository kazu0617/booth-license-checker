use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    models::{AnalysisRow, ProductDetailResponse, ProductListItem, ProductRow},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub shop: Option<String>,
    #[serde(default)]
    pub compliant: Option<String>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> Result<Json<Vec<ProductListItem>>, (StatusCode, Json<serde_json::Value>)> {
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let offset = q.offset.unwrap_or(0).max(0);

    let mut where_parts: Vec<String> = Vec::new();
    let mut binds: Vec<String> = Vec::new();
    if let Some(text) = q.q.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        where_parts.push(
            "(p.product_name LIKE ? OR p.shop_name LIKE ? OR p.product_url LIKE ?)".into(),
        );
        let pattern = format!("%{}%", text);
        binds.push(pattern.clone());
        binds.push(pattern.clone());
        binds.push(pattern);
    }
    if let Some(shop) = q.shop.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        where_parts.push("p.shop_name = ?".into());
        binds.push(shop.to_string());
    }
    let compliance_filter = match q.compliant.as_deref() {
        Some("yes") | Some("true") | Some("1") => Some(1_i64),
        Some("no") | Some("false") | Some("0") => Some(0_i64),
        _ => None,
    };

    let where_sql = if where_parts.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_parts.join(" AND "))
    };
    let compliance_having = match compliance_filter {
        Some(v) => format!("HAVING latest_is_compliant = {}", v),
        None => String::new(),
    };

    let sql = format!(
        r#"
        SELECT
            p.id,
            p.product_url,
            p.product_name,
            p.shop_name,
            p.first_seen_at,
            p.last_seen_at,
            (SELECT a.id FROM analyses a WHERE a.product_id = p.id ORDER BY a.analyzed_at DESC, a.id DESC LIMIT 1) AS latest_analysis_id,
            (SELECT a.analyzed_at FROM analyses a WHERE a.product_id = p.id ORDER BY a.analyzed_at DESC, a.id DESC LIMIT 1) AS latest_analyzed_at,
            (SELECT a.is_compliant FROM analyses a WHERE a.product_id = p.id ORDER BY a.analyzed_at DESC, a.id DESC LIMIT 1) AS latest_is_compliant,
            (SELECT COUNT(*) FROM analyses a WHERE a.product_id = p.id) AS analysis_count
        FROM products p
        {where_sql}
        {compliance_having}
        ORDER BY p.last_seen_at DESC
        LIMIT ? OFFSET ?
        "#
    );

    let mut query = sqlx::query_as::<_, (i64, String, Option<String>, Option<String>, String, String, Option<i64>, Option<String>, Option<i64>, i64)>(&sql);
    for b in &binds {
        query = query.bind(b);
    }
    query = query.bind(limit).bind(offset);

    let rows = query.fetch_all(&state.db).await.map_err(internal_err)?;

    let items = rows
        .into_iter()
        .map(|(id, product_url, product_name, shop_name, first_seen_at, last_seen_at,
               latest_analysis_id, latest_analyzed_at, latest_is_compliant, analysis_count)| {
            ProductListItem {
                product: ProductRow {
                    id,
                    product_url,
                    product_name,
                    shop_name,
                    first_seen_at,
                    last_seen_at,
                },
                latest_analysis_id,
                latest_analyzed_at,
                latest_is_compliant: latest_is_compliant.map(|v| v != 0),
                analysis_count,
            }
        })
        .collect();

    Ok(Json(items))
}

pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ProductDetailResponse>, (StatusCode, Json<serde_json::Value>)> {
    let product: Option<ProductRow> =
        sqlx::query_as("SELECT id, product_url, product_name, shop_name, first_seen_at, last_seen_at FROM products WHERE id = ?")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(internal_err)?;

    let Some(product) = product else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "product not found" })),
        ));
    };

    let analyses: Vec<AnalysisRow> = sqlx::query_as(
        r#"
        SELECT
          id, product_id, analyzed_at, source, license_url, license_text_id,
          conditions_json, special_notes, is_generator_doc,
          enabled_conditions_snapshot, accepted_choices_snapshot, is_compliant
        FROM analyses
        WHERE product_id = ?
        ORDER BY analyzed_at DESC, id DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(internal_err)?;

    Ok(Json(ProductDetailResponse { product, analyses }))
}

pub async fn shops(
    State(state): State<AppState>,
) -> Result<Json<Vec<String>>, (StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(Option<String>,)> = sqlx::query_as(
        "SELECT DISTINCT shop_name FROM products WHERE shop_name IS NOT NULL AND shop_name != '' ORDER BY shop_name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_err)?;
    Ok(Json(rows.into_iter().filter_map(|(n,)| n).collect()))
}

fn internal_err<E: std::fmt::Display>(e: E) -> (StatusCode, Json<serde_json::Value>) {
    tracing::warn!(error = %e, "products handler error");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": e.to_string() })),
    )
}
