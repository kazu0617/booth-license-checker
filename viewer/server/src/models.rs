use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductInput {
    pub url: String,
    pub name: Option<String>,
    pub shop_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisInput {
    pub product: ProductInput,
    #[serde(default)]
    pub source: Option<String>,
    pub license_url: Option<String>,
    pub license_text: Option<String>,
    pub spec_version: Option<String>,
    pub gen_version: Option<String>,
    #[serde(default)]
    pub is_generator_doc: bool,
    pub conditions: HashMap<String, i32>,
    pub special_notes: Option<String>,
    pub enabled_conditions_snapshot: Option<Vec<String>>,
    pub accepted_choices_snapshot: Option<HashMap<String, Vec<String>>>,
    /// Compliance verdict pre-computed by the client (extension or web UI),
    /// since the server does not bundle VN3_OPTIONS.
    pub is_compliant: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct AnalysisStoreResult {
    pub stored: bool,
    pub reason: Option<String>,
    pub product_id: i64,
    pub analysis_id: i64,
    pub diff: Option<Vec<String>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProductRow {
    pub id: i64,
    pub product_url: String,
    pub product_name: Option<String>,
    pub shop_name: Option<String>,
    pub first_seen_at: String,
    pub last_seen_at: String,
}

#[derive(Debug, Serialize)]
pub struct ProductListItem {
    #[serde(flatten)]
    pub product: ProductRow,
    pub latest_analysis_id: Option<i64>,
    pub latest_analyzed_at: Option<String>,
    pub latest_is_compliant: Option<bool>,
    pub analysis_count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AnalysisRow {
    pub id: i64,
    pub product_id: i64,
    pub analyzed_at: String,
    pub source: String,
    pub license_url: Option<String>,
    pub license_text_id: Option<i64>,
    pub conditions_json: String,
    pub special_notes: Option<String>,
    pub is_generator_doc: i64,
    pub enabled_conditions_snapshot: Option<String>,
    pub accepted_choices_snapshot: Option<String>,
    pub is_compliant: i64,
}

#[derive(Debug, Serialize)]
pub struct ProductDetailResponse {
    pub product: ProductRow,
    pub analyses: Vec<AnalysisRow>,
}

pub fn now_iso() -> String {
    let now: DateTime<Utc> = Utc::now();
    now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}
