use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

use crate::{
    models::{AnalysisInput, AnalysisStoreResult, now_iso},
    AppState,
};

pub async fn create(
    State(state): State<AppState>,
    Json(input): Json<AnalysisInput>,
) -> Result<Json<AnalysisStoreResult>, (StatusCode, Json<serde_json::Value>)> {
    let source = input.source.clone().unwrap_or_else(|| "extension".to_string());
    store_analysis(&state, input, &source).await
        .map(Json)
        .map_err(|e| {
            tracing::warn!(error = %e, "store_analysis failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e.to_string() })),
            )
        })
}

pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let row: Option<(
        i64, i64, String, String, Option<String>, Option<i64>,
        String, Option<String>, i64, Option<String>, Option<String>, i64,
    )> = sqlx::query_as(
        r#"
        SELECT id, product_id, analyzed_at, source, license_url, license_text_id,
               conditions_json, special_notes, is_generator_doc,
               enabled_conditions_snapshot, accepted_choices_snapshot, is_compliant
        FROM analyses
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_err)?;

    let Some(row) = row else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "analysis not found" })),
        ));
    };

    let (a_id, product_id, analyzed_at, source, license_url, license_text_id,
         conditions_json, special_notes, is_generator_doc,
         enabled_snapshot, accepted_snapshot, is_compliant) = row;

    let license_text: Option<(String, String, Option<String>, Option<String>, String)> =
        if let Some(lid) = license_text_id {
            sqlx::query_as(
                "SELECT text_sha256, body, spec_version, gen_version, created_at FROM license_texts WHERE id = ?",
            )
            .bind(lid)
            .fetch_optional(&state.db)
            .await
            .map_err(internal_err)?
        } else {
            None
        };

    Ok(Json(json!({
        "id": a_id,
        "product_id": product_id,
        "analyzed_at": analyzed_at,
        "source": source,
        "license_url": license_url,
        "license_text_id": license_text_id,
        "conditions_json": conditions_json,
        "special_notes": special_notes,
        "is_generator_doc": is_generator_doc,
        "enabled_conditions_snapshot": enabled_snapshot,
        "accepted_choices_snapshot": accepted_snapshot,
        "is_compliant": is_compliant,
        "license_text": license_text.map(|(hash, body, sv, gv, c)| json!({
            "text_sha256": hash, "body": body, "spec_version": sv, "gen_version": gv, "created_at": c
        })),
    })))
}

pub async fn store_analysis(
    state: &AppState,
    input: AnalysisInput,
    source: &str,
) -> anyhow::Result<AnalysisStoreResult> {
    let now = now_iso();

    // ── 1. Upsert product ─────────────────────────────────────
    let product_id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO products (product_url, product_name, shop_name, first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(product_url) DO UPDATE SET
            product_name = COALESCE(excluded.product_name, products.product_name),
            shop_name    = COALESCE(excluded.shop_name,    products.shop_name),
            last_seen_at = excluded.last_seen_at
        RETURNING id
        "#,
    )
    .bind(&input.product.url)
    .bind(&input.product.name)
    .bind(&input.product.shop_name)
    .bind(&now)
    .bind(&now)
    .fetch_one(&state.db)
    .await?;

    // ── 2. Upsert license_text (if provided) ──────────────────
    let license_text_id: Option<i64> = if let Some(body) = input.license_text.as_ref() {
        if body.trim().is_empty() {
            None
        } else {
            let mut hasher = Sha256::new();
            hasher.update(body.as_bytes());
            let hash = hex::encode(hasher.finalize());

            let existing: Option<i64> = sqlx::query_scalar(
                "SELECT id FROM license_texts WHERE text_sha256 = ?",
            )
            .bind(&hash)
            .fetch_optional(&state.db)
            .await?;

            if let Some(id) = existing {
                Some(id)
            } else {
                let id: i64 = sqlx::query_scalar(
                    r#"
                    INSERT INTO license_texts (text_sha256, body, spec_version, gen_version, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    RETURNING id
                    "#,
                )
                .bind(&hash)
                .bind(body)
                .bind(&input.spec_version)
                .bind(&input.gen_version)
                .bind(&now)
                .fetch_one(&state.db)
                .await?;
                Some(id)
            }
        }
    } else {
        None
    };

    // ── 3. Compute compliance ─────────────────────────────────
    let is_compliant = input
        .is_compliant
        .unwrap_or_else(|| fallback_compliance(&input));

    // ── 4. Compare with latest analysis ───────────────────────
    let conditions_json = canonical_conditions_json(&input.conditions);

    let latest: Option<(i64, Option<i64>, String, i64)> = sqlx::query_as(
        r#"
        SELECT id, license_text_id, conditions_json, is_compliant
        FROM analyses
        WHERE product_id = ?
        ORDER BY analyzed_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .bind(product_id)
    .fetch_optional(&state.db)
    .await?;

    if let Some((latest_id, latest_text_id, latest_cond, latest_compliant)) = &latest {
        if *latest_text_id == license_text_id
            && *latest_cond == conditions_json
            && *latest_compliant == is_compliant as i64
        {
            return Ok(AnalysisStoreResult {
                stored: false,
                reason: Some("no_change".into()),
                product_id,
                analysis_id: *latest_id,
                diff: None,
            });
        }
    }

    let diff = latest.as_ref().map(|(_, _, latest_cond, _)| {
        diff_conditions(latest_cond, &conditions_json)
    });

    // ── 5. Insert new analysis row ────────────────────────────
    let enabled_snap_json = input
        .enabled_conditions_snapshot
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".into()));
    let accepted_snap_json = input
        .accepted_choices_snapshot
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "{}".into()));

    let analysis_id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO analyses (
            product_id, analyzed_at, source, license_url, license_text_id,
            conditions_json, special_notes, is_generator_doc,
            enabled_conditions_snapshot, accepted_choices_snapshot, is_compliant
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        "#,
    )
    .bind(product_id)
    .bind(&now)
    .bind(source)
    .bind(&input.license_url)
    .bind(license_text_id)
    .bind(&conditions_json)
    .bind(&input.special_notes)
    .bind(if input.is_generator_doc { 1_i64 } else { 0 })
    .bind(enabled_snap_json)
    .bind(accepted_snap_json)
    .bind(if is_compliant { 1_i64 } else { 0 })
    .fetch_one(&state.db)
    .await?;

    Ok(AnalysisStoreResult {
        stored: true,
        reason: None,
        product_id,
        analysis_id,
        diff,
    })
}

fn canonical_conditions_json(map: &std::collections::HashMap<String, i32>) -> String {
    let sorted: BTreeMap<&String, &i32> = map.iter().collect();
    serde_json::to_string(&sorted).unwrap_or_else(|_| "{}".into())
}

fn diff_conditions(prev_json: &str, new_json: &str) -> Vec<String> {
    let prev: BTreeMap<String, i32> = serde_json::from_str(prev_json).unwrap_or_default();
    let new_map: BTreeMap<String, i32> = serde_json::from_str(new_json).unwrap_or_default();
    let mut keys: Vec<&String> = prev.keys().chain(new_map.keys()).collect();
    keys.sort();
    keys.dedup();
    keys.into_iter()
        .filter(|k| prev.get(*k) != new_map.get(*k))
        .cloned()
        .collect()
}

fn fallback_compliance(input: &AnalysisInput) -> bool {
    let Some(enabled) = input.enabled_conditions_snapshot.as_ref() else {
        return true;
    };
    if enabled.is_empty() {
        return true;
    }
    !enabled.iter().any(|cond_id| {
        input.conditions.get(cond_id).copied().unwrap_or(-1) < 0
    })
}

fn internal_err<E: std::fmt::Display>(e: E) -> (StatusCode, Json<serde_json::Value>) {
    tracing::warn!(error = %e, "analyses handler error");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": e.to_string() })),
    )
}
