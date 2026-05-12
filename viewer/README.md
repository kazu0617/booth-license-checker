# BOOTH License Viewer

`booth-license-checker` 拡張機能が解析した VN3 ライセンス情報を、ローカル SQLite に保存して Web UI で閲覧するツール。Rust (axum) サーバー + React (Vite) フロントエンドで構成される。

## 構成

```
viewer/
├── server/    # Rust + axum + sqlx + SQLite
├── web/       # React + Vite + TypeScript + Tailwind
└── data/      # 実行時生成 (db.sqlite, api-key.txt)
```

## セットアップ

```bash
# 初回のみ: Web 側依存と Rust 依存の取得 + ビルド
cd viewer
npm install
npm run build
```

## 起動

### 本番モード

```bash
cd viewer
npm start
# → http://127.0.0.1:38274/ をブラウザで開く
```

リリースビルドされた Rust バイナリが起動し、API と React 静的ファイルの両方を配信する。

### 開発モード (HMR 有効)

```bash
cd viewer
npm run dev
# → http://127.0.0.1:5173/ をブラウザで開く
```

Rust サーバー (`127.0.0.1:38274`) と Vite dev サーバー (`127.0.0.1:5173`) が同時起動する。Vite が `/api/*` を Rust にプロキシする。

## 初回起動時

サーバーは初回起動時に `data/api-key.txt` を自動生成し、標準出力に表示する。
このキーを拡張機能の **オプションページ → 「Viewer に保存する」 → API キー** に貼り付ける。

## 拡張機能との連携

1. 拡張機能のオプションページで「Viewer に保存する」を有効化
2. サーバー URL: `http://127.0.0.1:38274` (デフォルト)
3. API キー: `viewer/data/api-key.txt` の内容を貼り付け
4. 「接続テスト」ボタンで疎通確認
5. BOOTH 商品ページを開くたびに解析結果が自動保存される

## CLI オプション

```bash
booth-license-viewer --port 38274 --data-dir ./data
```

または環境変数:

```bash
BLV_PORT=38274 BLV_DATA_DIR=./data booth-license-viewer
```
