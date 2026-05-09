/**
 * @typedef {{ url: string, score: number }} LinkCandidate
 * score は 0–1 の信頼度。高いほどライセンス文書である可能性が高い。
 *
 * @typedef {{ extractLinks(text: string): Promise<LinkCandidate[]> }} LinkExtractor
 * 商品説明テキストから候補 URL を抽出し、score 降順で返す。
 */

const TERMS_SECTION_KEYWORDS = [
  '利用規約', 'ライセンス', '使用規約', 'Terms of Use', 'Terms',
  'License', '約款', '許諾条件', '利用条件', 'Usage Policy', 'ご利用規約',
];

function isValidLicenseUrl(href) {
  if (!href || href.startsWith('javascript:') || href === '#') return false;
  try {
    const u = new URL(href);
    // vn3.org はフレームワーク解説サイトなので除外
    if (u.hostname === 'www.vn3.org' || u.hostname === 'vn3.org') return false;
    // booth.pm 内リンクも除外
    if (u.hostname === 'booth.pm' || u.hostname.endsWith('.booth.pm')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * テキスト中の URL を抽出して返す。
 * @param {string} text
 * @returns {string[]}
 */
function extractUrlsFromText(text) {
  const seen = new Set();
  const results = [];
  // 全角スペース・句読点・閉じ括弧などを URL の終端とみなす
  const re = /https?:\/\/[^\s　、。，．\)\"\'<>\]]+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    // 末尾の句読点・括弧を取り除く
    const url = m[0].replace(/[.,;:!?\)\"\']+$/, '');
    if (isValidLicenseUrl(url) && !seen.has(url)) {
      seen.add(url);
      results.push(url);
    }
  }
  return results;
}

/**
 * ルールベース LinkExtractor を返す。
 * - Tier 1: ライセンス系キーワードの近傍にある URL → score: 1.0
 * - Tier 2: それ以外の URL                          → score: 0.5
 * @returns {LinkExtractor}
 */
function createRuleBasedExtractor() {
  return {
    async extractLinks(text) {
      const urls = extractUrlsFromText(text);
      if (urls.length === 0) return [];

      /** @type {Map<string, number>} url → score */
      const candidates = new Map();

      for (const url of urls) {
        const idx = text.indexOf(url);
        // URL 前後 100 文字以内にライセンス系キーワードがあれば高スコア
        const window = text.slice(Math.max(0, idx - 100), idx + url.length + 100);
        const nearKeyword = TERMS_SECTION_KEYWORDS.some(kw => window.includes(kw));
        candidates.set(url, nearKeyword ? 1.0 : 0.5);
      }

      return Array.from(candidates.entries())
        .map(([url, score]) => ({ url, score }))
        .sort((a, b) => b.score - a.score);
    },
  };
}
