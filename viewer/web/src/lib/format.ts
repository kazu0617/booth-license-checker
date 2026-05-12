export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return `${sec}秒前`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}分前`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}時間前`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day}日前`;
    return formatDateTime(iso);
  } catch {
    return iso;
  }
}

export function shortenUrl(url: string, max = 50): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '…' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}
