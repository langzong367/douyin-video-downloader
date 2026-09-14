const hosts = new Set(['douyin.com', 'www.douyin.com', 'v.douyin.com', 'm.douyin.com', 'www.iesdouyin.com', 'iesdouyin.com']);

export function validateUrl(url: URL) {
  if (!hosts.has(url.hostname) || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('仅支持抖音链接，请粘贴视频链接或完整分享文案');
  }
  url.protocol = 'https:';
  return url;
}

export function normalizeInput(input: string) {
  if (!input || input.length > 8000) throw new Error('请粘贴抖音视频链接或分享文案（最多 8000 字）');
  const clean = input.replace(/\\_/g, '_').replace(/&amp;/g, '&').replace(/[\u200B-\u200D\uFEFF]/g, '');
  const match = clean.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:douyin|iesdouyin)\.com(?=\/|\?|\s|$)[^\s<>"'\])\u3000-\u9fff]*/i);
  if (!match) throw new Error('未找到抖音链接，可直接粘贴完整分享文案');
  const url = validateUrl(new URL(/^https?:/i.test(match[0]) ? match[0] : `https://${match[0]}`));
  if (url.hostname === 'v.douyin.com') {
    const code = url.pathname.match(/^\/([A-Za-z0-9_-]+)/)?.[1];
    if (!code) throw new Error('抖音短链接不完整');
    return new URL(`https://v.douyin.com/${code}/`);
  }
  return url;
}

export function extractId(url: URL) {
  const id = url.pathname.match(/\/(?:share\/)?video\/(\d+)/)?.[1]
    || url.searchParams.get('modal_id') || url.searchParams.get('aweme_id') || url.searchParams.get('item_id');
  return id && /^\d{10,25}$/.test(id) ? id : null;
}

export function extractVideo(html: string) {
  const block = html.match(/"play_addr"\s*:\s*(\{[^}]+\})/)?.[1];
  if (!block) return null;
  try {
    const address = JSON.parse(block);
    if (!/^v[A-Za-z0-9]{10,100}$/.test(address.uri)) return null;
    const title = html.match(/"desc"\s*:\s*("(?:\\.|[^"\\])*")/)?.[1];
    return { videoId: address.uri as string, title: title ? JSON.parse(title) as string : '抖音视频' };
  } catch { return null; }
}
