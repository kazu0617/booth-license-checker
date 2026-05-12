# パースロジック同期手順

このディレクトリは拡張機能側のパースロジックを **コピー** したものです。
拡張機能を変更したら必ずこちらも追従させてください。

## ソースとの対応

| Viewer 側 | 拡張機能側のソース |
|---|---|
| `vn3-options.ts` の `VN3_OPTIONS` / `VN3_CATEGORIES` | `../../../vn3-options.js` 全体 |
| `vn3-parser.ts` の `VN3_FOOTER_RE` | `../../../content.js` の `VN3_FOOTER_RE` |
| `vn3-parser.ts` の `detectVN3Footer` | `../../../content.js` の `detectVN3Footer` |
| `vn3-parser.ts` の `parseLicenseText` | `../../../content.js` の `parseLicenseText` |
| `vn3-parser.ts` の `extractSpecialNotes` | `../../../content.js` の `extractSpecialNotes` |
| `vn3-parser.ts` の `cleanPdfText` | `../../../content.js` の `cleanPdfText` |
| `vn3-parser.ts` の `classifySection` | `../../../content.js` の `classifySection` |
| `vn3-parser.ts` の `computeIsCompliant` | `../../../content.js` の `sendToViewer` 内 / `showBanner('done')` の判定ロジック |

## 同期チェックリスト

拡張機能側を編集したら以下を確認:

- [ ] `vn3-options.js` の `VN3_OPTIONS`（label, matchText, type, choices の追加削除）に変更があるか?
  → ある場合: `vn3-options.ts` も同じ内容に更新する。`matchText` は **substring 検索のキー** かつ `chrome.storage.sync` の **永続キー** でもあるため、変更時はマイグレーション要否も検討する
- [ ] `vn3-options.js` の `VN3_CATEGORIES` に変更があるか?
- [ ] `content.js` の `VN3_FOOTER_RE` 正規表現に変更があるか?
- [ ] `content.js` の `parseLicenseText` / `extractSpecialNotes` / `cleanPdfText` / `classifySection` / `detectVN3Footer` のロジックに変更があるか?
- [ ] `content.js` の判定ロジック（`showBanner('done')` 内 / `sendToViewer` の `computeIsCompliant`）に変更があるか?
- [ ] CLAUDE.md の「Key Domain Knowledge」セクションも更新する

## 将来的な検討事項

このコピー方式は同期忘れリスクがあります。不整合が頻発するようになったら、
拡張機能とフロントエンドの間で `shared/` ディレクトリに抽出してビルド時に
両者へ配布する方式へリファクタリングを検討してください。
