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
