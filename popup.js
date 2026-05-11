'use strict';

const toggleEnabled = document.getElementById('toggle-enabled');
const statusDot = document.querySelector('.status__dot');
const statusText = document.getElementById('status-text');
const btnSettings = document.getElementById('btn-settings');

// ── 有効/無効トグル ─────────────────────────────────────────────────

chrome.storage.sync.get({ enabled: true }, data => {
  toggleEnabled.checked = data.enabled;
});

toggleEnabled.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: toggleEnabled.checked });
});

// ── 設定ページを開く ────────────────────────────────────────────────

btnSettings.addEventListener('click', e => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ── 現在のタブのステータスを取得 ────────────────────────────────────

chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
  const tab = tabs[0];
  if (!tab) return;

  const url = tab.url || '';
  if (!/^https:\/\/(?:[^./]+\.)?booth\.pm\/(?:[^/]+\/)?items\//.test(url)) {
    setStatus('neutral', 'Booth.pm の商品ページを開いてください');
    return;
  }

  // content script からステータスを取得
  try {
    const banner = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const el = document.getElementById('booth-license-checker-banner');
        if (!el) return null;
        if (el.classList.contains('vn3-banner--error'))   return 'error';
        if (el.classList.contains('vn3-banner--ok'))      return 'ok';
        if (el.classList.contains('vn3-banner--warn'))    return 'warn';
        if (el.classList.contains('vn3-banner--loading')) return 'loading';
        if (el.classList.contains('vn3-badge--undetected')) return 'undetected';
        return 'unknown';
      },
    });

    const result = banner?.[0]?.result;
    switch (result) {
      case 'error':
        setStatus('error', '必要条件が確認できない項目があります');
        break;
      case 'ok':
        setStatus('ok', '全ての必要条件が確認されました');
        break;
      case 'warn':
        setStatus('warn', 'ライセンス文書を取得できませんでした');
        break;
      case 'loading':
        setStatus('warn', 'ライセンス文書を読み込み中です');
        break;
      case 'undetected':
        setStatus('neutral', 'VN3 ライセンスは検出されませんでした');
        break;
      default:
        setStatus('neutral', 'ステータスを取得できませんでした');
    }
  } catch {
    setStatus('neutral', 'ページ情報を取得できませんでした');
  }
});

function setStatus(type, text) {
  statusDot.className = `status__dot status__dot--${type}`;
  statusText.textContent = text;
}

// ── Viewer 連携の状態を表示 ─────────────────────────────────────────
(async () => {
  const settings = await chrome.storage.sync.get({ viewerEnabled: false, viewerUrl: '', viewerApiKey: '' });
  if (!settings.viewerEnabled) return;

  const row = document.getElementById('viewer-status-row');
  const dot = document.getElementById('viewer-status-dot');
  const txt = document.getElementById('viewer-status-text');
  row.style.display = 'block';

  function setVStatus(type, text) {
    dot.className = `status__dot status__dot--${type}`;
    txt.textContent = text;
  }

  if (!settings.viewerUrl || !settings.viewerApiKey) {
    setVStatus('warn', '未設定 (URL or API キー)');
    return;
  }

  try {
    const url = settings.viewerUrl.replace(/\/+$/, '');
    let originGranted = true;
    try {
      const u = new URL(url);
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
        originGranted = await chrome.permissions.contains({ origins: [`${u.protocol}//${u.hostname}/*`] });
      }
    } catch { originGranted = false; }
    if (!originGranted) {
      setVStatus('error', '権限未付与');
      return;
    }
    const res = await fetch(`${url}/api/health`);
    if (res.ok) setVStatus('ok', '接続中');
    else setVStatus('error', `HTTP ${res.status}`);
  } catch (e) {
    setVStatus('error', `接続失敗: ${e.message.slice(0, 30)}`);
  }
})();
