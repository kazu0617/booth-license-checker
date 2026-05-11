# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BOOTH の商品ページから [VN3 ライセンス利用規約ジェネレータ](https://www.vn3.org/generator)で生成されたライセンス文書（PDF / Google Docs）を検出し、ユーザーが事前に設定した「許容できる選択肢」と照合して結果をページ上部のバナーに表示する **Chrome 拡張機能 (Manifest V3)**。Vanilla JS のみで、ビルドステップ・パッケージマネージャ・テストフレームワークは存在しない。

リポジトリには付属の **Viewer ローカルアプリ** (`viewer/` 配下) もあり、拡張機能が解析した結果を SQLite に永続化して Web UI で閲覧できる。Viewer は Rust (axum) サーバー + React (Vite) フロントエンドの構成で、独立したサブプロジェクトとして動作する（拡張機能本体とはビルド・配布が独立）。

## Commands

ビルド・lint・テストの仕組みはなく、開発はソースを直接編集してブラウザで再読み込みする。

### ローカル開発（拡張機能の読み込み）

1. Chrome で `chrome://extensions/` を開く
2. デベロッパーモードを有効化
3. 「パッケージ化されていない拡張機能を読み込む」でリポジトリのルートを選択
4. コード変更後はそのページの拡張機能カードの再読み込みアイコンをクリック → 動作確認したい BOOTH 商品ページをリロード

### パッケージング

ローカルでパッケージするコマンドは無く、`v*` タグを push すると `.github/workflows/package.yml` が `manifest.json` の `version` を読んで `booth-license-checker-v<version>.zip` を作り GitHub Release を作成する。`zip` 対象に含めるファイルはこのワークフローを `manifest.json` に追加するファイル変更と同期して更新する必要がある。

### バージョン更新

`manifest.json` の `"version"` を上げてから `git tag v<version>` → `git push --tags` の流れ。バージョン文字列はワークフローの zip 名・Release タイトルに使用される。

## Architecture

Manifest V3 拡張で、コードは「ページ上で動く content script 群」「service worker (background)」「設定 UI (options/popup)」の 3 層に分かれる。

### Layer 1: Content scripts (`content.js` ほか)

`https://*.booth.pm/items/*` で `document_idle` に注入される。`manifest.json` の `content_scripts.js` 順序に意味があり、依存性のロード順を保証している:

```
lib/pdf.min.js   →   lib/link-extractor.js   →   vn3-options.js   →   content.js
```

- `lib/pdf.min.js` ... PDF.js v3 UMD。`pdfjsLib` をグローバルに公開
- `lib/link-extractor.js` ... `createRuleBasedExtractor()` を提供。商品説明テキストから URL を抽出し、ライセンス系キーワード近傍にあるものを高スコア化
- `vn3-options.js` ... VN3 ライセンスの 23 条項（`A`〜`W`）と各選択肢のメタデータ・**マッチ用テキスト** (`matchText`) を `VN3_OPTIONS` / `VN3_CATEGORIES` としてエクスポート。**判定の唯一のソース・オブ・トゥルース**
- `content.js` ... 全体のオーケストレータ（IIFE 内に閉じている）

`content.js` の処理フロー:

1. `chrome.storage.sync` から `enabledConditions` / `acceptedChoices` / `enabled` / `onlyVRChat` を読む
2. `onlyVRChat` 時は VRChat バッジ画像 (`asset.booth.pm/.../vrchat.png`) があるかでスキップ判定
3. 商品説明 DOM (`main[role="main"] article` または平文 `main`) からテキスト抽出 → `extractLicenseLinks` で URL 候補を取得
4. ローディングバナー挿入 → Drive フォルダ URL を個別ファイル URL に展開 (`RESOLVE_DRIVE_FOLDER` メッセージ)
5. 各 URL に対し PDF / Google Docs を取得 → テキスト抽出 → `parseLicenseText` で 23 条項の選択肢を判定
6. **複数候補 URL の中から「VN3 フッター付き かつ マッチ件数が最大」の文書を採用**（`bestMatchCount` のループ）。一つでも完全解析できれば他リンクのアクセスエラーは無視
7. 結果に応じて 5 種のバナー (`done` / `loading` / `fetch_failed` / `image_pdf` / undetected) を描画

### Layer 2: Service worker (`background.js`)

CORS と `chrome.permissions` の制約を回避するための **fetch プロキシ**。content script からのメッセージで動く 4 種の RPC:

| Message type | 役割 |
|---|---|
| `FETCH_PDF` | URL を `normalizeUrl` で直接ダウンロード形式に変換 → PDF を取得。HTML が返ってきた場合は Drive 確認ページから `<form action>` / `<a href>` を抽出して再取得。`MAX_PDF_BYTES` (20MB) で上限制御。`ArrayBuffer` は `structuredClone` で送れないため `Array.from(new Uint8Array(...))` で配列化して返す |
| `RESOLVE_DRIVE_FOLDER` | Drive フォルダの SPA ページ HTML から `"1[A-Za-z0-9_-]{28,43}"` の正規表現でファイル ID を抽出。matchText が日本語前提なので「ja / JP / 日本語 / japanese」近傍 ID を先頭に並べ替えて返す |
| `FETCH_GDOCS_TEXT` | Google ドキュメントを `/document/d/{id}/export?format=txt` で取得。HTML が返ったら `GDOCS_PRIVATE` エラー（非公開推定） |
| `OPEN_OPTIONS` | `chrome.runtime.openOptionsPage()` を呼ぶ。バナーから「権限を有効化」導線で利用 |

`normalizeUrl` は Drive `/file/d/{id}/view` → `drive.usercontent.google.com/download?...&confirm=t`、Dropbox `?dl=0` → `?dl=1`、Gist URL → raw URL の変換を担う。`drive.google.com/uc` は 303 を返すので `usercontent` を直接叩いている。

### Layer 3: UI (`options.html`+`options.js`, `popup.html`+`popup.js`)

- `options.js` は `vn3-options.js` の `VN3_CATEGORIES` を回して条項チェックボックス群を生成し、`chrome.storage.sync` に `enabledConditions` (有効化された条項 ID 配列) と `acceptedChoices` (条項 ID → matchText 配列) を保存する。**保存時は matchText を直接キーにする** ので `vn3-options.js` の matchText 変更は破壊的変更扱い
- `options.js` の `PERM_SERVICES` は `manifest.json` の `optional_host_permissions` に対応。`chrome.permissions.request({ origins })` でユーザー操作起点で動的付与
- `popup.js` は現在の BOOTH タブに `chrome.scripting.executeScript` を打ち込み、注入済みバナーの className からステータス（`vn3-banner--ok` 等）を読み出してアイコンを反映する

## Key Domain Knowledge (なぜそうなっているか)

VN3 ライセンス文書の解析には pdf.js / 文書フォーマット由来の落とし穴が多く、修正時は以下を踏まえる必要がある:

- **VN3 文書である判定は最終 800 文字内のフッター正規表現** (`VN3_FOOTER_RE` in `content.js`) でのみ行う。フッター不一致なら他の条件が揃っていてもスキップ
- **「個別条件」の見出し検出は最後の出現位置を使う**。同じ文字列が目次や本文中にも出るため、`(?<!\S)個別条件(?!\S)` を全マッチして最後を採用
- **`A.` 〜 `W.` セクション境界の正規表現は `\s?` を含む** (`(?<![A-Za-z])([A-W])\s?[.．]\s/g`)。pdf.js はページをまたぐと `G .` のように空白が挟まる
- **selection の判定は matchText が長い順** (`classifySection`)。「許可しません」が「配布等（頒布、送信を含む）を許可しません」の部分文字列になる等、最長一致でないと誤分類する
- **特記事項抽出は空白除去後の終端マーカー検索 → 元テキスト位置にマップバック**する独特な実装。pdf.js のスペース挿入を吸収するための工夫で、安易な空白正規化は他のロジックを壊す
- **VN3 全角ヘディング対応**: 現行コードは `[.．]` で全角ピリオドを許容済み（コミット `21aa7fb` の経緯）

`vn3-options.js` の選択肢を増減する場合、`matchText` は **PDF テキスト中に実際に出現する部分文字列**である必要があり、ジェネレータの出力サンプルで検証する。`type` (`permitted` / `conditional` / `not-permitted` / `contact` / `not-applicable`) はバナーのアイコン・色 (`STATUS_INFO` in `content.js`) と options ページのバッジ (`TYPE_LABEL` in `options.js`) の両方で使われる。

## Permissions Model

- `manifest.json` の `host_permissions` は BOOTH のみ（必須・無条件）
- Drive / Docs / Dropbox は `optional_host_permissions`。**ユーザーがオプションページの「権限を付与」ボタンを押すまで fetch は失敗する** → `fetch_failed` バナーで `permissionMissing` ヒントを表示する仕組み
- 新しい外部ホストを追加する際は `manifest.json`、`background.js` の `normalizeUrl`、`content.js` の `OPTIONAL_HOSTNAMES`、`options.js` の `PERM_SERVICES` の 4 箇所を同期更新する

## Style Conventions

- Vanilla ES2020+。`'use strict'` または IIFE で囲む。モジュールバンドラは未使用
- ビルダ／フォーマッタ／lint は無いので、既存コードのインデント幅 (2 スペース) と関数スタイル（アロー関数 + `const`、トップレベルは `function` 宣言）を踏襲する
- すべてのユーザー向け文字列は日本語（拡張機能自体が日本語ユーザー向け）
- バナー DOM の生成は文字列テンプレート + `escapeHtml` で行う統一スタイル

---

## Viewer (`viewer/` サブプロジェクト)

拡張機能が解析した VN3 ライセンス情報をローカル SQLite に永続化し、Web UI で閲覧するためのサブプロジェクト。**拡張機能とは独立** に動作・ビルド・配布される。

### 構成

```
viewer/
├── package.json              ← npm start (本番) / npm run dev (開発) のオーケストレータ
├── server/                   ← Rust + axum + sqlx + SQLite
│   ├── Cargo.toml            ← 全依存はバージョン完全固定
│   ├── migrations/0001_init.sql
│   └── src/
│       ├── main.rs / config.rs / db.rs / auth.rs / static_files.rs / models.rs
│       └── handlers/{analyses, manual, products, export}.rs
├── web/                      ← React + Vite + TypeScript + Tailwind
│   ├── package.json
│   └── src/
│       ├── routes/{Dashboard, ProductList, ProductDetail, ManualRegister, Settings}.tsx
│       ├── components/{Layout, ConditionTable, PdfDropzone, ThemeToggle, ui/...}.tsx
│       ├── lib/{api, theme, pdf, cn, format, local-settings}.ts
│       └── parsing/{vn3-options, vn3-parser}.ts  ← ★ 拡張側からコピー
└── data/                     ← .gitignore (db.sqlite, api-key.txt)
```

### ⚠️ パースロジックの同期警告

`vn3-options.js` または `content.js` の `parseLicenseText` 周辺（`detectVN3Footer`, `extractSpecialNotes`, `cleanPdfText`, `classifySection`, `VN3_FOOTER_RE`）を変更した場合、**`viewer/web/src/parsing/` 配下の対応ファイルも必ず同期更新する**。詳細な対応表は `viewer/web/src/parsing/SYNC_NOTE.md` 参照。

### Viewer の起動

```bash
# 本番（一度ビルドが必要）
cd viewer && npm run build && npm start
# → http://127.0.0.1:38274/

# 開発（HMR 有効、Rust と Vite を並列起動）
cd viewer && npm run dev
# → http://127.0.0.1:5173/  (Vite が /api を Rust にプロキシ)
```

初回起動時に `viewer/data/api-key.txt` が UUID で自動生成され、標準出力にも表示される。このキーを拡張機能のオプションページの「Viewer に保存する」セクションに貼り付けることで連携が完了する。

### Viewer ⇔ 拡張機能の連携

| 拡張機能側 | 役割 |
|---|---|
| `manifest.json` の `optional_host_permissions` に `http://127.0.0.1/*`, `http://localhost/*` を追加 | localhost への fetch 許可をユーザー操作で動的取得 |
| `options.html` / `options.js` の Viewer セクション | サーバー URL / API キーの設定、接続テスト、Viewer を新規タブで開く |
| `content.js` の `sendToViewer()` | 解析成功時に `chrome.runtime.sendMessage('POST_TO_VIEWER', ...)` を呼ぶ |
| `background.js` の `POST_TO_VIEWER` ハンドラ + `postToViewer()` | content script の代わりに service worker から HTTP POST（CORS 回避） |

POST 失敗（サーバー停止中、認証失敗など）はバナー表示には影響しない fail-soft 設計。`console.warn` にログだけ出る。

### Viewer サーバーの主要 API

| メソッド | パス | 認証 |
|---|---|---|
| `POST /api/analyses` | 拡張機能からの自動保存 | API キー必須 |
| `POST /api/analyses/manual` | Viewer の手動登録ページからの保存 | API キー必須 |
| `GET /api/products` | 商品一覧 (q / shop / compliant / limit / offset) | なし |
| `GET /api/products/{id}` | 商品詳細 + 解析履歴 | なし |
| `GET /api/analyses/{id}` | 解析詳細 + 規約本文 | なし |
| `GET /api/shops` | ショップ名 distinct | なし |
| `GET /api/export.json` / `export.csv` | エクスポート | なし |
| `GET /api/health` | 死活確認 | なし |
| `GET /*` | React 静的ファイル / SPA フォールバック | なし |

CORS は `chrome-extension://`, `moz-extension://`, `localhost`/`127.0.0.1` のみ許可（`tower_http::cors::CorsLayer` の `AllowOrigin::predicate`）。サーバーは `127.0.0.1` のみで listen し外部公開しない設計。

### 「差分を記録」のセマンティクス

`POST /api/analyses` 受信時、サーバーは最新 `analyses` 行と新規データを比較し、`license_text_id` (= SHA-256 ハッシュ) と `conditions_json` と `is_compliant` がすべて一致する場合は **insert せず** `last_seen_at` だけ更新して `{ "stored": false, "reason": "no_change" }` を返す。同じ商品を何度開いても DB は肥大化しない。
