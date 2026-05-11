CREATE TABLE products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_url     TEXT NOT NULL UNIQUE,
  product_name    TEXT,
  shop_name       TEXT,
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL
);
CREATE INDEX idx_products_last_seen ON products(last_seen_at DESC);
CREATE INDEX idx_products_shop ON products(shop_name);

CREATE TABLE license_texts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  text_sha256   TEXT NOT NULL UNIQUE,
  body          TEXT NOT NULL,
  spec_version  TEXT,
  gen_version   TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE analyses (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id                    INTEGER NOT NULL REFERENCES products(id),
  analyzed_at                   TEXT NOT NULL,
  source                        TEXT NOT NULL,
  license_url                   TEXT,
  license_text_id               INTEGER REFERENCES license_texts(id),
  conditions_json               TEXT NOT NULL,
  special_notes                 TEXT,
  is_generator_doc              INTEGER NOT NULL,
  enabled_conditions_snapshot   TEXT,
  accepted_choices_snapshot     TEXT,
  is_compliant                  INTEGER NOT NULL
);
CREATE INDEX idx_analyses_product ON analyses(product_id, analyzed_at DESC);
CREATE INDEX idx_analyses_compliant ON analyses(is_compliant);
