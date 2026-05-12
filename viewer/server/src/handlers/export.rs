use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};

use crate::AppState;

pub async fn export_json(
    State(state): State<AppState>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let products: Vec<(i64, String, Option<String>, Option<String>, String, String)> =
        sqlx::query_as(
            "SELECT id, product_url, product_name, shop_name, first_seen_at, last_seen_at FROM products",
        )
        .fetch_all(&state.db)
        .await
        .map_err(internal_err)?;

    let analyses: Vec<(
        i64,
        i64,
        String,
        String,
        Option<String>,
        Option<i64>,
        String,
        Option<String>,
        i64,
        Option<String>,
        Option<String>,
        i64,
    )> = sqlx::query_as(
        r#"SELECT id, product_id, analyzed_at, source, license_url, license_text_id,
                  conditions_json, special_notes, is_generator_doc,
                  enabled_conditions_snapshot, accepted_choices_snapshot, is_compliant
           FROM analyses"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_err)?;

    let license_texts: Vec<(i64, String, String, Option<String>, Option<String>, String)> =
        sqlx::query_as(
            "SELECT id, text_sha256, body, spec_version, gen_version, created_at FROM license_texts",
        )
        .fetch_all(&state.db)
        .await
        .map_err(internal_err)?;

    Ok(Json(json!({
        "products": products.into_iter().map(|(id, url, name, shop, first, last)| json!({
            "id": id, "product_url": url, "product_name": name, "shop_name": shop,
            "first_seen_at": first, "last_seen_at": last
        })).collect::<Vec<_>>(),
        "analyses": analyses.into_iter().map(|(id, pid, at, src, lurl, ltid, cond, notes, gen, ena, acc, comp)| json!({
            "id": id, "product_id": pid, "analyzed_at": at, "source": src,
            "license_url": lurl, "license_text_id": ltid,
            "conditions": serde_json::from_str::<serde_json::Value>(&cond).unwrap_or(json!({})),
            "special_notes": notes, "is_generator_doc": gen != 0,
            "enabled_conditions_snapshot": ena.as_ref().and_then(|s| serde_json::from_str::<Value>(s).ok()),
            "accepted_choices_snapshot": acc.as_ref().and_then(|s| serde_json::from_str::<Value>(s).ok()),
            "is_compliant": comp != 0
        })).collect::<Vec<_>>(),
        "license_texts": license_texts.into_iter().map(|(id, hash, body, sv, gv, c)| json!({
            "id": id, "text_sha256": hash, "body": body,
            "spec_version": sv, "gen_version": gv, "created_at": c
        })).collect::<Vec<_>>(),
    })))
}

pub async fn export_csv(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let rows: Vec<(
        String,
        Option<String>,
        Option<String>,
        String,
        String,
        String,
        i64,
    )> = sqlx::query_as(
        r#"SELECT p.product_url, p.product_name, p.shop_name,
                  a.analyzed_at, a.source, a.conditions_json, a.is_compliant
           FROM analyses a
           JOIN products p ON p.id = a.product_id
           ORDER BY a.analyzed_at DESC"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_err)?;

    let mut buf = String::new();
    let condition_ids = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W"];
    buf.push_str("product_url,product_name,shop_name,analyzed_at,source,is_compliant");
    for c in &condition_ids {
        buf.push(',');
        buf.push_str(c);
    }
    buf.push('\n');

    for (url, name, shop, at, src, cond_json, compliant) in rows {
        let cond: std::collections::HashMap<String, i32> =
            serde_json::from_str(&cond_json).unwrap_or_default();
        write_csv_field(&mut buf, &url);
        buf.push(',');
        write_csv_field(&mut buf, name.as_deref().unwrap_or(""));
        buf.push(',');
        write_csv_field(&mut buf, shop.as_deref().unwrap_or(""));
        buf.push(',');
        write_csv_field(&mut buf, &at);
        buf.push(',');
        write_csv_field(&mut buf, &src);
        buf.push(',');
        buf.push_str(if compliant != 0 { "1" } else { "0" });
        for c in &condition_ids {
            buf.push(',');
            buf.push_str(&cond.get(*c).copied().unwrap_or(-1).to_string());
        }
        buf.push('\n');
    }

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/csv; charset=utf-8".parse().unwrap());
    headers.insert(
        header::CONTENT_DISPOSITION,
        "attachment; filename=\"booth-license-viewer.csv\"".parse().unwrap(),
    );
    Ok((headers, buf))
}

fn write_csv_field(buf: &mut String, s: &str) {
    let needs_quote = s.contains(',') || s.contains('"') || s.contains('\n');
    if needs_quote {
        buf.push('"');
        for ch in s.chars() {
            if ch == '"' {
                buf.push('"');
            }
            buf.push(ch);
        }
        buf.push('"');
    } else {
        buf.push_str(s);
    }
}

fn internal_err<E: std::fmt::Display>(e: E) -> (StatusCode, Json<Value>) {
    tracing::warn!(error = %e, "export error");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": e.to_string() })),
    )
}
