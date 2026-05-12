// ⚠️ This file is COPIED from ../../../vn3-options.js. See SYNC_NOTE.md.
// Do not edit independently — keep in sync with the extension.

export type ChoiceType = 'permitted' | 'conditional' | 'not-permitted' | 'contact' | 'not-applicable';

export interface VN3Choice {
  label: string;
  matchText: string;
  type: ChoiceType;
}

export interface VN3Option {
  id: string;
  label: string;
  en: string;
  category: string;
  categoryLabel: string;
  choices: VN3Choice[];
}

export interface VN3Category {
  id: string;
  label: string;
}

// VN3 ライセンスジェネレータが定義する条項 A〜W
export const VN3_OPTIONS: VN3Option[] = [
  // ── 1. 利用主体 ──────────────────────────────────────────────────────
  {
    id: 'A',
    label: '個人による利用',
    en: 'Personal Use',
    category: 'usage',
    categoryLabel: '利用主体',
    choices: [
      { label: '営利・非営利の目的問わず利用を許可します',           matchText: '営利・非営利の目的問わず利用',         type: 'permitted' },
      { label: '非営利および非営利有償目的での利用を許可します',     matchText: '非営利および非営利有償目的での利用', type: 'permitted' },
      { label: '非営利目的に限り許可します',                         matchText: '非営利目的に限り',                   type: 'conditional' },
      { label: '許可しません',                                       matchText: '許可しません',                       type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                   matchText: '問い合わせ',                         type: 'contact' },
    ],
  },
  {
    id: 'B',
    label: '法人による利用',
    en: 'Corporate Use',
    category: 'usage',
    categoryLabel: '利用主体',
    choices: [
      { label: '営利・非営利の目的問わず利用を許可します',           matchText: '営利・非営利の目的問わず利用',         type: 'permitted' },
      { label: '非営利および非営利有償目的での利用を許可します',     matchText: '非営利および非営利有償目的での利用', type: 'permitted' },
      { label: '非営利目的に限り許可します',                         matchText: '非営利目的に限り',                   type: 'conditional' },
      { label: '許可しません',                                       matchText: '許可しません',                       type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                   matchText: '問い合わせ',                         type: 'contact' },
    ],
  },

  // ── 2. オンラインサービスへのアップロード ─────────────────────────────
  {
    id: 'C',
    label: 'ソーシャルコミュニケーションプラットフォームへのアップロード（自己利用）',
    en: 'Upload to Social Platforms (VRChat etc.) for Own Use',
    category: 'upload',
    categoryLabel: 'オンラインサービスへのアップロード',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
  {
    id: 'D',
    label: 'オンラインゲームプラットフォームへのアップロード（自己利用）',
    en: 'Upload to Online Game Platforms for Own Use',
    category: 'upload',
    categoryLabel: 'オンラインサービスへのアップロード',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
  {
    id: 'E',
    label: 'プラットフォーム上で第三者に利用させる目的でのアップロード',
    en: 'Upload to Platforms for Third-Party Use (e.g. VRChat Public)',
    category: 'upload',
    categoryLabel: 'オンラインサービスへのアップロード',
    choices: [
      { label: '許可します（例えばVRChatにてPublicでの公開の許可を含みます）',                         matchText: '許可します',       type: 'permitted' },
      { label: '対象を限定しての公開を許可します（例えばVRChatにてPrivateでの公開の許可を含みます）',   matchText: '対象を限定して',   type: 'conditional' },
      { label: '許可しません',                                                                         matchText: '許可しません',     type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                     matchText: '問い合わせ',       type: 'contact' },
    ],
  },

  // ── 3. センシティブな表現 ─────────────────────────────────────────────
  {
    id: 'F',
    label: '性的表現への利用',
    en: 'Sexual Content',
    category: 'sensitive',
    categoryLabel: 'センシティブな表現',
    choices: [
      { label: '許可します',                                                                                   matchText: '許可します',               type: 'permitted' },
      { label: '許可します（ただし棲み分けはおこなうこと）',                                                   matchText: '棲み分け',                 type: 'conditional' },
      { label: '許可しません（ただし私的使用（プライベートな範囲での利用）については禁止しません）',           matchText: '私的使用（プライベートな範囲', type: 'conditional' },
      { label: '許可しません',                                                                                 matchText: '許可しません',             type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                             matchText: '問い合わせ',               type: 'contact' },
    ],
  },
  {
    id: 'G',
    label: '暴力的表現への利用',
    en: 'Violent Content',
    category: 'sensitive',
    categoryLabel: 'センシティブな表現',
    choices: [
      { label: '許可します',                                                                                   matchText: '許可します',               type: 'permitted' },
      { label: '許可します（ただし棲み分けはおこなうこと）',                                                   matchText: '棲み分け',                 type: 'conditional' },
      { label: '許可しません（ただし私的使用（プライベートな範囲での利用）については禁止しません）',           matchText: '私的使用（プライベートな範囲', type: 'conditional' },
      { label: '許可しません',                                                                                 matchText: '許可しません',             type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                             matchText: '問い合わせ',               type: 'contact' },
    ],
  },
  {
    id: 'H',
    label: '政治活動・宗教活動への利用',
    en: 'Political / Religious Activities',
    category: 'sensitive',
    categoryLabel: 'センシティブな表現',
    choices: [
      { label: '許可します',                                                                                   matchText: '許可します',               type: 'permitted' },
      { label: '許可しません（ただし私的使用（プライベートな範囲での利用）については禁止しません）',           matchText: '私的使用（プライベートな範囲', type: 'conditional' },
      { label: '許可しません',                                                                                 matchText: '許可しません',             type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                             matchText: '問い合わせ',               type: 'contact' },
    ],
  },

  // ── 4. 加工 ──────────────────────────────────────────────────────────
  {
    id: 'I',
    label: '調整・ポリゴン削減・ファイル形式変換',
    en: 'Adjustment, Polygon Reduction, File Format Conversion',
    category: 'modification',
    categoryLabel: '加工',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
  {
    id: 'J',
    label: 'データの改変（主たる素体として）',
    en: 'Modification of Data (as Primary Base)',
    category: 'modification',
    categoryLabel: '加工',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
  {
    id: 'K',
    label: '他のデータを改変する目的での利用（従たる素体として）',
    en: 'Use for Modifying Other Data (as Secondary Base)',
    category: 'modification',
    categoryLabel: '加工',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
  {
    id: 'L',
    label: '調整・改変の第三者への委託',
    en: 'Outsourcing Adjustments / Modifications',
    category: 'modification',
    categoryLabel: '加工',
    choices: [
      { label: '許可します',                         matchText: '許可します',               type: 'permitted' },
      { label: 'ユーザー間で行うことを許可します',   matchText: 'ユーザー間で行うことを許可', type: 'conditional' },
      { label: '許可しません',                       matchText: '許可しません',             type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',               type: 'contact' },
    ],
  },

  // ── 5. 再配布・配布 ───────────────────────────────────────────────────
  {
    id: 'M',
    label: '未改変状態での再配布',
    en: 'Redistribution without Modification',
    category: 'redistribution',
    categoryLabel: '再配布・配布',
    choices: [
      { label: '許可します',                                           matchText: '許可します',                                     type: 'permitted' },
      { label: '無償に限り許可します',                                 matchText: '無償に限り許可',                                 type: 'conditional' },
      { label: '本利用規約に従わせることを条件に許可します',           matchText: '本利用規約に従わせることを条件に許可',           type: 'conditional' },
      { label: '無償に限り本利用規約に従わせることを条件に許可します', matchText: '無償に限り本利用規約に従わせることを条件に許可', type: 'conditional' },
      { label: 'ユーザー間で行うことを許可します',                     matchText: 'ユーザー間で行うことを許可',                     type: 'conditional' },
      { label: '無償に限りユーザー間で行うことを許可します',           matchText: '無償に限りユーザー間で行うことを許可',           type: 'conditional' },
      { label: '許可しません',                                         matchText: '許可しません',                                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                     matchText: '問い合わせ',                                     type: 'contact' },
    ],
  },
  {
    id: 'N',
    label: '改変データの配布',
    en: 'Distribution of Modified Data',
    category: 'redistribution',
    categoryLabel: '再配布・配布',
    choices: [
      { label: '許可します',                                           matchText: '許可します',                                     type: 'permitted' },
      { label: '無償に限り許可します',                                 matchText: '無償に限り許可',                                 type: 'conditional' },
      { label: '本利用規約に従わせることを条件に許可します',           matchText: '本利用規約に従わせることを条件に許可',           type: 'conditional' },
      { label: '無償に限り本利用規約に従わせることを条件に許可します', matchText: '無償に限り本利用規約に従わせることを条件に許可', type: 'conditional' },
      { label: 'ユーザー間で行うことを許可します',                     matchText: 'ユーザー間で行うことを許可',                     type: 'conditional' },
      { label: '無償に限りユーザー間で行うことを許可します',           matchText: '無償に限りユーザー間で行うことを許可',           type: 'conditional' },
      { label: '許可しません',                                         matchText: '許可しません',                                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                     matchText: '問い合わせ',                                     type: 'contact' },
    ],
  },

  // ── 6. メディア・プロダクトへの利用 ──────────────────────────────────
  {
    id: 'O',
    label: '映像作品・配信・放送への利用',
    en: 'Use in Videos / Streaming / Broadcasting',
    category: 'media',
    categoryLabel: 'メディア・プロダクトへの利用',
    choices: [
      { label: '許可します',                                                                                   matchText: '許可します',                     type: 'permitted' },
      { label: 'オリジナルと異なることが分かる程度に改変した場合は許可します（公式配信と誤解されないため）', matchText: 'オリジナルと異なることが分かる程度', type: 'conditional' },
      { label: '許可しません',                                                                                 matchText: '許可しません',                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                             matchText: '問い合わせ',                     type: 'contact' },
    ],
  },
  {
    id: 'P',
    label: '出版物・電子出版物への利用',
    en: 'Use in Publications / E-books',
    category: 'media',
    categoryLabel: 'メディア・プロダクトへの利用',
    choices: [
      { label: '許可します',                                                                                   matchText: '許可します',                     type: 'permitted' },
      { label: 'オリジナルと異なることが分かる程度に改変した場合は許可します（公式書籍と誤解されないため）', matchText: 'オリジナルと異なることが分かる程度', type: 'conditional' },
      { label: '許可しません',                                                                                 matchText: '許可しません',                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                             matchText: '問い合わせ',                     type: 'contact' },
    ],
  },
  {
    id: 'Q',
    label: '有体物（グッズ）への利用',
    en: 'Use in Physical Merchandise',
    category: 'media',
    categoryLabel: 'メディア・プロダクトへの利用',
    choices: [
      { label: '許可します',                                                                                    matchText: '許可します',                     type: 'permitted' },
      { label: 'オリジナルと異なることが分かる程度に改変した場合は許可します（公式グッズと誤解されないため）', matchText: 'オリジナルと異なることが分かる程度', type: 'conditional' },
      { label: '許可しません',                                                                                  matchText: '許可しません',                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                              matchText: '問い合わせ',                     type: 'contact' },
    ],
  },
  {
    id: 'R',
    label: 'ソフトウェアへの組み込み配布',
    en: 'Embedding in Software / Games for Distribution',
    category: 'media',
    categoryLabel: 'メディア・プロダクトへの利用',
    choices: [
      { label: '許可します',                                                                                    matchText: '許可します',                     type: 'permitted' },
      { label: 'オリジナルと異なることが分かる程度に改変した場合は許可します（公式ソフトと誤解されないため）', matchText: 'オリジナルと異なることが分かる程度', type: 'conditional' },
      { label: '許可しません',                                                                                  matchText: '許可しません',                   type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                                              matchText: '問い合わせ',                     type: 'contact' },
    ],
  },

  // ── 7. 二次創作 ───────────────────────────────────────────────────────
  {
    id: 'S',
    label: 'メッシュ・ウェイトを流用した衣装データ等の作成',
    en: 'Creating Costume Data Reusing Mesh / Weights',
    category: 'derivative',
    categoryLabel: '二次創作',
    choices: [
      { label: '営利・非営利の目的問わず配布等（頒布、送信を含む）を許可します',       matchText: '営利・非営利の目的問わず配布等',           type: 'permitted' },
      { label: '非営利および非営利有償目的での配布等（頒布、送信を含む）を許可します', matchText: '非営利および非営利有償目的での配布等',     type: 'permitted' },
      { label: '非営利目的での配布等（頒布、送信を含む）を許可します',                 matchText: '非営利目的での配布等',                     type: 'conditional' },
      { label: '私的かつ本人のみによる利用に限り許可します',                           matchText: '私的かつ本人のみによる利用',               type: 'conditional' },
      // "作成を許可しません" は "許可しません" を含むため先に検査
      { label: '作成を許可しません',                                                   matchText: '作成を許可しません',                       type: 'not-permitted' },
      { label: '該当するデータではありません',                                         matchText: '該当するデータではありません',             type: 'not-applicable' },
      { label: '権利者に個別に問い合わせて下さい',                                     matchText: '問い合わせ',                               type: 'contact' },
    ],
  },
  {
    id: 'T',
    label: 'メッシュ・ウェイトを流用しない規格準拠の新規衣装・テクスチャデータの作成',
    en: 'Creating New Costume / Texture Data without Reusing Mesh',
    category: 'derivative',
    categoryLabel: '二次創作',
    choices: [
      { label: '営利・非営利の目的問わず配布等（頒布、送信を含む）を許可します',       matchText: '営利・非営利の目的問わず配布等',           type: 'permitted' },
      { label: '非営利および非営利有償目的での配布等（頒布、送信を含む）を許可します', matchText: '非営利および非営利有償目的での配布等',     type: 'permitted' },
      { label: '非営利目的での配布等（頒布、送信を含む）を許可します',                 matchText: '非営利目的での配布等',                     type: 'conditional' },
      { label: '私的かつ本人のみによる利用に限り許可します',                           matchText: '私的かつ本人のみによる利用',               type: 'conditional' },
      { label: '作成を許可しません',                                                   matchText: '作成を許可しません',                       type: 'not-permitted' },
      { label: '該当するデータではありません',                                         matchText: '該当するデータではありません',             type: 'not-applicable' },
      { label: '権利者に個別に問い合わせて下さい',                                     matchText: '問い合わせ',                               type: 'contact' },
    ],
  },
  {
    id: 'U',
    label: 'データをモチーフにした二次的著作物（いわゆる二次創作）の作成',
    en: 'Creating Derivative Works (Fan Art, etc.)',
    category: 'derivative',
    categoryLabel: '二次創作',
    choices: [
      { label: '営利・非営利の目的問わず配布等（頒布、送信を含む）を許可します',       matchText: '営利・非営利の目的問わず配布等',               type: 'permitted' },
      { label: '非営利および非営利有償目的での配布等（頒布、送信を含む）を許可します', matchText: '非営利および非営利有償目的での配布等',         type: 'permitted' },
      { label: '非営利目的での配布等（頒布、送信を含む）を許可します',                 matchText: '非営利目的での配布等',                         type: 'conditional' },
      // "配布等（頒布、送信を含む）を許可しません" は "許可しません" を含むため先に検査
      { label: '配布等（頒布、送信を含む）を許可しません',                             matchText: '配布等（頒布、送信を含む）を許可しません',     type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',                                     matchText: '問い合わせ',                                   type: 'contact' },
    ],
  },

  // ── 8. その他 ─────────────────────────────────────────────────────────
  {
    id: 'V',
    label: 'クレジット表記',
    en: 'Credit / Attribution',
    category: 'other',
    categoryLabel: 'その他',
    choices: [
      { label: '必要です',                   matchText: '必要です',                   type: 'conditional' },
      { label: '不要ですがあると嬉しいです', matchText: '不要ですがあると嬉しいです', type: 'permitted' },
      { label: '不要です',                   matchText: '不要です',                   type: 'permitted' },
      { label: '権利者に個別に問い合わせて下さい', matchText: '問い合わせ',           type: 'contact' },
    ],
  },
  {
    id: 'W',
    label: '権利義務の譲渡等',
    en: 'Transfer / Assignment of Rights',
    category: 'other',
    categoryLabel: 'その他',
    choices: [
      { label: '許可します',                         matchText: '許可します',   type: 'permitted' },
      { label: '許可しません',                       matchText: '許可しません', type: 'not-permitted' },
      { label: '権利者に個別に問い合わせて下さい',   matchText: '問い合わせ',   type: 'contact' },
    ],
  },
];

// カテゴリ一覧（表示順）
export const VN3_CATEGORIES: VN3Category[] = [
  { id: 'usage',          label: '利用主体' },
  { id: 'upload',         label: 'オンラインサービスへのアップロード' },
  { id: 'sensitive',      label: 'センシティブな表現' },
  { id: 'modification',   label: '加工' },
  { id: 'redistribution', label: '再配布・配布' },
  { id: 'media',          label: 'メディア・プロダクトへの利用' },
  { id: 'derivative',     label: '二次創作' },
  { id: 'other',          label: 'その他' },
];
