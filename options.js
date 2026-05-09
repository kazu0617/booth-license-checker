'use strict';

// ── 外部サービス権限管理 ────────────────────────────────────────────

const PERM_SERVICES = [
  {
    id: 'gdrive',
    origins: [
      'https://drive.google.com/*',
      'https://drive.usercontent.google.com/*',
      'https://docs.google.com/*',
    ],
  },
  {
    id: 'dropbox',
    origins: [
      'https://www.dropbox.com/*',
      'https://dl.dropboxusercontent.com/*',
    ],
  },
];

async function updatePermBadge(service) {
  const badge = document.getElementById(`perm-badge-${service.id}`);
  const btn   = document.getElementById(`perm-btn-${service.id}`);
  const granted = await chrome.permissions.contains({ origins: service.origins });
  if (granted) {
    badge.textContent = '付与済み';
    badge.className = 'perm-badge perm-badge--granted';
    btn.disabled = true;
    btn.textContent = '付与済み';
  } else {
    badge.textContent = '未付与';
    badge.className = 'perm-badge perm-badge--missing';
    btn.disabled = false;
    btn.textContent = '権限を付与';
  }
}

PERM_SERVICES.forEach(service => {
  updatePermBadge(service);
  document.getElementById(`perm-btn-${service.id}`).addEventListener('click', async () => {
    const granted = await chrome.permissions.request({ origins: service.origins });
    if (granted) updatePermBadge(service);
  });
});

const container = document.getElementById('options-container');
const toggleEnabled = document.getElementById('toggle-enabled');
const toggleOnlyVRChat = document.getElementById('toggle-only-vrchat');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');
const saveStatus = document.getElementById('save-status');

const TYPE_LABEL = {
  'permitted':      '許可',
  'conditional':    '条件付き',
  'not-permitted':  '不許可',
  'contact':        '要確認',
  'not-applicable': '該当なし',
};

// ── カテゴリ別にオプションと選択肢を描画 ─────────────────────────────

VN3_CATEGORIES.forEach(cat => {
  const options = VN3_OPTIONS.filter(o => o.category === cat.id);
  if (options.length === 0) return;

  const block = document.createElement('div');
  block.className = 'category-block';
  block.innerHTML = `<div class="category-block__title">${cat.label}</div>`;

  options.forEach(opt => {
    const optBlock = document.createElement('div');
    optBlock.className = 'option-block option-block--disabled';

    const header = document.createElement('label');
    header.className = 'option-block__header';
    header.innerHTML = `
      <input type="checkbox" class="condition-toggle" data-condition-id="${opt.id}">
      <div class="option-block__text">
        <span class="option-block__label">${opt.label}</span>
        <span class="option-block__en">${opt.en}</span>
      </div>
    `;
    optBlock.appendChild(header);

    opt.choices.forEach(choice => {
      const row = document.createElement('label');
      row.className = 'choice-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.disabled = true;
      cb.dataset.id = opt.id;
      cb.dataset.choiceKey = choice.matchText;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'choice-row__label';
      labelSpan.textContent = choice.label;

      const typeSpan = document.createElement('span');
      typeSpan.className = `choice-row__type choice-row__type--${choice.type}`;
      typeSpan.textContent = TYPE_LABEL[choice.type] ?? choice.type;

      row.appendChild(cb);
      row.appendChild(labelSpan);
      row.appendChild(typeSpan);
      optBlock.appendChild(row);
    });

    const condToggle = header.querySelector('.condition-toggle');
    condToggle.addEventListener('change', () => {
      setConditionEnabled(optBlock, condToggle.checked);
    });

    block.appendChild(optBlock);
  });

  container.appendChild(block);
});

function setConditionEnabled(optBlock, enabled) {
  optBlock.classList.toggle('option-block--disabled', !enabled);
  optBlock.querySelectorAll('input[data-id]').forEach(cb => {
    cb.disabled = !enabled;
    if (!enabled) cb.checked = false;
  });
}

// ── 設定の読み込み ──────────────────────────────────────────────────

chrome.storage.sync.get({ enabledConditions: [], acceptedChoices: {}, enabled: true, onlyVRChat: true }, data => {
  toggleEnabled.checked = data.enabled;
  toggleOnlyVRChat.checked = data.onlyVRChat;

  const enabled = data.enabledConditions || [];
  const accepted = data.acceptedChoices || {};

  enabled.forEach(id => {
    const toggle = document.querySelector(`.condition-toggle[data-condition-id="${id}"]`);
    if (!toggle) return;
    toggle.checked = true;
    setConditionEnabled(toggle.closest('.option-block'), true);
  });

  Object.entries(accepted).forEach(([id, keys]) => {
    const keySet = new Set(keys);
    document.querySelectorAll(`input[data-id="${id}"]`).forEach(cb => {
      if (keySet.has(cb.dataset.choiceKey)) cb.checked = true;
    });
  });
});

// ── 保存 ────────────────────────────────────────────────────────────

btnSave.addEventListener('click', () => {
  const enabledConditions = Array.from(
    document.querySelectorAll('.condition-toggle:checked')
  ).map(el => el.dataset.conditionId);

  const acceptedChoices = {};
  document.querySelectorAll('input[data-id]:checked').forEach(cb => {
    const id = cb.dataset.id;
    const key = cb.dataset.choiceKey;
    if (!key) return;
    if (!acceptedChoices[id]) acceptedChoices[id] = [];
    acceptedChoices[id].push(key);
  });

  chrome.storage.sync.set({ enabledConditions, acceptedChoices, enabled: toggleEnabled.checked, onlyVRChat: toggleOnlyVRChat.checked }, () => {
    saveStatus.classList.add('visible');
    setTimeout(() => saveStatus.classList.remove('visible'), 4000);
  });
});

// ── リセット ─────────────────────────────────────────────────────────

btnReset.addEventListener('click', () => {
  document.querySelectorAll('.condition-toggle').forEach(cb => {
    cb.checked = false;
    setConditionEnabled(cb.closest('.option-block'), false);
  });
  document.querySelectorAll('input[data-id]').forEach(cb => {
    cb.checked = false;
  });
});
