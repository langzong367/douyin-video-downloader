export function feishuVideo(url) {
  try {
    const value = new URL(url);
    if (value.protocol !== 'https:' || value.hostname !== 'internal-api-drive-stream.feishu.cn') return null;
    const token = value.pathname.match(/^\/space\/api\/box\/stream\/download\/video\/([A-Za-z0-9_-]+)\/?$/)?.[1];
    return token ? { url: value.href, filename: `feishu_video_${token}.mp4` } : null;
  } catch {
    return null;
  }
}

export function bilibiliPage(url) {
  try {
    const value = new URL(url);
    if (value.protocol !== 'https:' || !['www.bilibili.com', 'm.bilibili.com', 'bilibili.com'].includes(value.hostname)) return null;
    const id = value.pathname.match(/^\/video\/(BV[A-Za-z0-9]{10}|av\d+)\/?$/i)?.[1];
    if (!id) return null;
    const page = Number(value.searchParams.get('p'));
    return { id, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
  } catch {
    return null;
  }
}

export function directVideo(url) {
  try {
    const value = new URL(url);
    if (!['http:', 'https:'].includes(value.protocol)) return null;
    const extension = value.pathname.match(/\.(mp4|m4v|mov|webm)$/i)?.[1]?.toLowerCase();
    return { url: value.href, filename: extension ? `web_video.${extension}` : undefined };
  } catch {
    return null;
  }
}

export function bilibiliFiles(play, id, page) {
  if (play?.code !== 0 || !Array.isArray(play.data?.durl) || !play.data.durl.length) return [];
  return play.data.durl.flatMap((part, index) => {
    const media = directVideo(part.url);
    if (!media) return [];
    if (!/(^|\.)bilivideo\.(com|cn)$/i.test(new URL(media.url).hostname)) return [];
    const extension = play.data.format?.startsWith('mp4') ? 'mp4' : 'flv';
    const suffix = play.data.durl.length > 1 ? `_part${index + 1}` : '';
    return [{ url: media.url, filename: `bilibili_${id}_p${page}${suffix}.${extension}` }];
  });
}
