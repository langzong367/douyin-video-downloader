import { extractId, extractVideo, normalizeInput, validateUrl } from '../../lib/douyin.ts';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

async function getVideo(input: string) {
  let source = normalizeInput(input);
  let id = extractId(source);
  for (let hop = 0; !id && hop < 5; hop++) {
    const landing = await fetch(validateUrl(source), {
      headers: { 'User-Agent': MOBILE_UA },
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });
    const location = landing.headers.get('location');
    await landing.body?.cancel();
    if (!location) break;
    source = validateUrl(new URL(location, source));
    id = extractId(source);
  }
  if (!id) throw new Error('未找到视频 ID，请检查链接');

  const shareUrl = `https://www.iesdouyin.com/share/video/${id}/`;
  const cookies = new Map<string, string>();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(shareUrl, {
      headers: { 'User-Agent': MOBILE_UA, Cookie: [...cookies.values()].join('; ') },
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0];
      cookies.set(pair.split('=')[0], pair);
    }
    const video = extractVideo(await response.text());
    if (response.ok && video) return { ...video, id, shareUrl };
  }
  throw new Error('抖音暂未返回视频信息，可能是访问校验或网络限制。请稍后重试。');
}

function json(data: object, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async function video(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const videoId = params.get('video_id');

    if (params.get('mode') === 'download') {
      if (!id || !/^\d{10,25}$/.test(id) || !videoId || !/^v[A-Za-z0-9]{10,100}$/.test(videoId)) {
        throw new Error('下载参数无效，请重新解析');
      }
      const media = await fetch(
        `https://aweme.snssdk.com/aweme/v1/play/?line=0&ratio=720p&video_id=${videoId}`,
        { headers: { 'User-Agent': MOBILE_UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) },
      );
      const contentType = media.headers.get('content-type') || '';
      if (!media.ok || !media.body || !/^video\//i.test(contentType)) {
        await media.body?.cancel();
        throw new Error('视频文件读取失败，请重新解析');
      }
      await media.body.cancel();
      return json({ url: media.url, filename: `douyin_${id}.mp4` });
    }

    const resolved = await getVideo(params.get('url') || '');
    return json({
      id: resolved.id,
      title: resolved.title,
      downloadUrl: `/api/video?mode=download&id=${resolved.id}&video_id=${resolved.videoId}`,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? '连接抖音超时，请稍后重试'
      : error instanceof Error ? error.message : '解析失败，请稍后重试';
    return json({ error: message }, 400);
  }
}

export const config = { path: '/api/video' };

