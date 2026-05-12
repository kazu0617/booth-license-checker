// ⚠️ This file mirrors VN3 parsing logic from ../../../content.js.
// See SYNC_NOTE.md and keep behaviour aligned with the extension.

import { VN3_OPTIONS } from './vn3-options';

const VN3_FOOTER_RE =
  /この利用規約は.{0,10}VN3ライセンスVer\.?(?<specVersion>[\d.]+).{0,80}?VN3ライセンス利用規約ジェネレータVer\.?(?<genVersion>[\d.]+).{0,120}?によって作成されました/;

export interface FooterInfo {
  found: boolean;
  specVersion: string | null;
  genVersion: string | null;
}

export interface ParseResult {
  conditions: Map<string, number>;
  isGeneratorDoc: boolean;
  specVersion: string | null;
  genVersion: string | null;
  specialNotes: string | null;
}

export function detectVN3Footer(text: string): FooterInfo {
  const tail = text.length > 800 ? text.slice(-800) : text;
  const normalized = tail.replace(/\s/g, '');
  const m = VN3_FOOTER_RE.exec(normalized);
  if (!m) return { found: false, specVersion: null, genVersion: null };
  return {
    found: true,
    specVersion: m.groups?.specVersion ?? null,
    genVersion: m.groups?.genVersion ?? null,
  };
}

export function parseLicenseText(text: string): ParseResult {
  const result = new Map<string, number>();
  const footerInfo = detectVN3Footer(text);

  // 個別条件セクション以降を検索対象にする
  const headingRe = /(?<!\S)個別条件(?!\S)/g;
  let headingMatch: RegExpExecArray | null;
  let lastHeadingMatch: RegExpExecArray | null = null;
  while ((headingMatch = headingRe.exec(text)) !== null) {
    lastHeadingMatch = headingMatch;
  }
  const searchText = lastHeadingMatch ? text.slice(lastHeadingMatch.index) : text;

  const boundaries: { letter: string; pos: number }[] = [];
  // pdf.js はページ境界でアイテム分割が変わり "G ." のように
  // 文字と句読点の間にスペースが入る場合があるため \s? で吸収する
  const re = /(?<![A-Za-z])([A-W])\s?[.．]\s/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(searchText)) !== null) {
    boundaries.push({ letter: m[1], pos: m.index });
  }

  for (let i = 0; i < boundaries.length; i++) {
    const { letter, pos } = boundaries[i];
    const nextPos = i + 1 < boundaries.length ? boundaries[i + 1].pos : searchText.length;
    const sectionText = searchText.slice(pos, nextPos);
    result.set(letter, classifySection(letter, sectionText));
  }

  for (const opt of VN3_OPTIONS) {
    if (!result.has(opt.id)) result.set(opt.id, -1);
  }

  return {
    conditions: result,
    isGeneratorDoc: footerInfo.found,
    specVersion: footerInfo.specVersion,
    genVersion: footerInfo.genVersion,
    specialNotes: extractSpecialNotes(searchText),
  };
}

export function extractSpecialNotes(text: string): string | null {
  // 個別条件の検出と同様に、前後が非空白文字でない（見出しとして孤立している）
  // 「特記事項」のみを検出する。本文中に「特記事項」が含まれる場合の誤拾いを防ぐ。
  const headingRe = /(?<!\S)特記事項(?!\S)/g;
  let headingMatch: RegExpExecArray | null;
  let lastHeadingMatch: RegExpExecArray | null = null;
  while ((headingMatch = headingRe.exec(text)) !== null) {
    lastHeadingMatch = headingMatch;
  }
  if (!lastHeadingMatch) return null;

  const idx = lastHeadingMatch.index;
  const afterHeading = text.slice(idx + 4).trim();

  const normalized = afterHeading.replace(/\s/g, '');
  const END_MARKERS = ['この利用規約は', '権利者および権利者への問い合わせ先'];
  const candidates = END_MARKERS.map((m) => normalized.indexOf(m)).filter((p) => p >= 0);
  const footerIdxNorm = candidates.length > 0 ? Math.min(...candidates) : -1;

  let content: string;
  if (footerIdxNorm >= 0) {
    let normCount = 0;
    let origIdx = 0;
    while (origIdx < afterHeading.length && normCount < footerIdxNorm) {
      if (!/\s/.test(afterHeading[origIdx])) normCount++;
      origIdx++;
    }
    content = afterHeading.slice(0, origIdx);
  } else {
    content = afterHeading;
  }

  const trimmed = cleanPdfText(content.trim().replace(/\s*[\d０-９]+[.．]\s*$/, '').trim());
  if (!trimmed || /^[\s　]*なし[\s　]*$/.test(trimmed)) return null;
  return trimmed;
}

export function cleanPdfText(text: string): string {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ (?=[　-鿿＀-￯])/g, '')
    .replace(/(?<=[　-鿿＀-￯]) /g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function classifySection(letter: string, text: string): number {
  const option = VN3_OPTIONS.find((o) => o.id === letter);
  if (!option) return -1;
  // matchText が長い（具体的な）ものを先に検査して部分一致の誤検出を防ぐ
  const byLength = option.choices
    .map((c, i) => ({ matchText: c.matchText, i }))
    .sort((a, b) => b.matchText.length - a.matchText.length);
  for (const { matchText, i } of byLength) {
    if (text.includes(matchText)) return i;
  }
  return -1;
}

/**
 * Compute compliance verdict given parse result and user-configured constraints.
 * Mirrors the logic in content.js' showBanner('done') branch.
 */
export function computeIsCompliant(
  conditions: Map<string, number>,
  enabledConditions: string[],
  acceptedChoices: Record<string, string[]>,
): boolean {
  const checkedIds = VN3_OPTIONS.map((o) => o.id).filter((id) => enabledConditions.includes(id));
  if (checkedIds.length === 0) return true;
  return checkedIds.every((id) => {
    const idx = conditions.get(id);
    if (idx === undefined || idx === -1) return false;
    const option = VN3_OPTIONS.find((o) => o.id === id);
    const matchText = option?.choices[idx]?.matchText;
    const accepted = acceptedChoices[id] ?? [];
    return !!matchText && accepted.includes(matchText);
  });
}
