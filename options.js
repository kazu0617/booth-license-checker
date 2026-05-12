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

// ── Viewer 連携 ─────────────────────────────────────────────────────
const viewerSection      = document.getElementById('viewer-section');
const toggleViewerEnabled = document.getElementById('toggle-viewer-enabled');
const inputViewerUrl     = document.getElementById('viewer-url');
const inputViewerApiKey  = document.getElementById('viewer-api-key');
const btnViewerTest      = document.getElementById('viewer-btn-test');
const btnViewerOpen      = document.getElementById('viewer-btn-open');
const viewerStatusEl     = document.getElementById('viewer-status');

const DEFAULT_VIEWER_URL = 'http://127.0.0.1:38274';

function originForUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return null;
    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return null;
  }
}

function setViewerSectionDisabled(disabled) {
  viewerSection.classList.toggle('viewer-section--disabled', disabled);
}

function setViewerStatus(text, kind) {
  viewerStatusEl.textContent = text;
  viewerStatusEl.className = `viewer-status${kind ? ' viewer-status--' + kind : ''}`;
}

toggleViewerEnabled.addEventListener('change', async () => {
  setViewerSectionDisabled(!toggleViewerEnabled.checked);
  if (toggleViewerEnabled.checked) {
    const origin = originForUrl(inputViewerUrl.value || DEFAULT_VIEWER_URL);
    if (origin) {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        toggleViewerEnabled.checked = false;
        setViewerSectionDisabled(true);
        setViewerStatus('権限が付与されなかったため有効化できませんでした', 'error');
        return;
      }
      setViewerStatus('権限を付与しました。「保存」ボタンで設定を確定してください', 'ok');
    }
  } else {
    setViewerStatus('');
  }
});

btnViewerTest.addEventListener('click', async () => {
  const url = (inputViewerUrl.value || DEFAULT_VIEWER_URL).replace(/\/+$/, '');
  setViewerStatus('接続中…');
  try {
    const origin = originForUrl(url);
    if (origin) {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        setViewerStatus('権限が付与されませんでした', 'error');
        return;
      }
    }
    const res = await fetch(`${url}/api/health`, { method: 'GET' });
    if (!res.ok) {
      setViewerStatus(`エラー: HTTP ${res.status}`, 'error');
      return;
    }
    const data = await res.json();
    if (data && data.ok) {
      setViewerStatus(`接続成功 (${data.service} v${data.version})`, 'ok');
    } else {
      setViewerStatus('応答は受け取りましたが ok=false でした', 'error');
    }
  } catch (e) {
    setViewerStatus(`接続失敗: ${e.message}`, 'error');
  }
});

btnViewerOpen.addEventListener('click', () => {
  const url = (inputViewerUrl.value || DEFAULT_VIEWER_URL).replace(/\/+$/, '');
  chrome.tabs.create({ url });
});

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

chrome.storage.sync.get({
  enabledConditions: [], acceptedChoices: {}, enabled: true, onlyVRChat: true,
  viewerEnabled: false, viewerUrl: DEFAULT_VIEWER_URL, viewerApiKey: '',
}, data => {
  toggleEnabled.checked = data.enabled;
  toggleOnlyVRChat.checked = data.onlyVRChat;
  toggleViewerEnabled.checked = !!data.viewerEnabled;
  inputViewerUrl.value = data.viewerUrl || DEFAULT_VIEWER_URL;
  inputViewerApiKey.value = data.viewerApiKey || '';
  setViewerSectionDisabled(!data.viewerEnabled);

  // viewerEnabled が ON でも localhost 権限が無いと送信が黙って失敗するため、
  // ページ表示時に検証して状態を表示する
  if (data.viewerEnabled) {
    const origin = originForUrl(data.viewerUrl || DEFAULT_VIEWER_URL);
    if (origin) {
      chrome.permissions.contains({ origins: [origin] }).then(granted => {
        if (!granted) {
          setViewerStatus('⚠ サーバー URL への権限が付与されていません。「接続テスト」を実行して権限を付与してください', 'error');
        }
      });
    }
  }

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

  chrome.storage.sync.set({
    enabledConditions,
    acceptedChoices,
    enabled: toggleEnabled.checked,
    onlyVRChat: toggleOnlyVRChat.checked,
    viewerEnabled: toggleViewerEnabled.checked,
    viewerUrl: (inputViewerUrl.value || DEFAULT_VIEWER_URL).replace(/\/+$/, ''),
    viewerApiKey: inputViewerApiKey.value.trim(),
  }, () => {
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
