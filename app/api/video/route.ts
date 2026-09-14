import { normalizeInput, validateUrl, extractId, extractVideo } from '@/lib/douyin';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

async function getVideo(input: string) {
  let source = normalizeInput(input);
  let id = extractId(source);
  for (let hop = 0; !id && hop < 5; hop++) {
    const landing = await fetch(validateUrl(source), {
      headers: { 'User-Agent': MOBILE_UA }, redirect: 'manual', signal: AbortSignal.timeout(12000),
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
      redirect: 'manual', signal: AbortSignal.timeout(12000),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0];
      cookies.set(pair.split('=')[0], pair);
    }
    const html = await response.text();
    const video = extractVideo(html);
    if (response.ok && video) return { ...video, id, shareUrl };
  }
  throw new Error('抖音暂未返回视频信息，可能是访问校验或网络限制。请稍后重试，不能据此判断视频已删除。');
}

function errorResponse(error: unknown) {
  const message = error instanceof Error && error.name === 'TimeoutError'
    ? '连接抖音超时，请稍后重试'
    : error instanceof Error ? error.message : '解析失败，请稍后重试';
  return Response.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('url');
  try {
    const cachedId = searchParams.get('id');
    const cachedVideo = searchParams.get('video_id');
    const direct = searchParams.get('mode') === 'download' && cachedId && cachedVideo;
    if (direct && (!/^\d{10,25}$/.test(cachedId) || !/^v[A-Za-z0-9]{10,100}$/.test(cachedVideo))) {
      throw new Error('下载参数无效，请重新解析');
    }
    const video = direct
      ? { id: cachedId, videoId: cachedVideo, title: '抖音视频', shareUrl: `https://www.iesdouyin.com/share/video/${cachedId}/` }
      : await getVideo(input || '');
    if (searchParams.get('mode') !== 'download') {
      return Response.json({
        id: video.id,
        title: video.title,
        downloadUrl: `/api/video?mode=download&id=${video.id}&video_id=${video.videoId}`,
      });
    }

    const media = await fetch(`https://aweme.snssdk.com/aweme/v1/play/?line=0&ratio=720p&video_id=${video.videoId}`, {
      headers: { Referer: video.shareUrl, 'User-Agent': MOBILE_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(180000),
    });
    if (!media.ok || !media.body) throw new Error('视频文件读取失败，请稍后重试');
    if (!/^(video\/|application\/octet-stream)/i.test(media.headers.get('content-type') || '')) {
      await media.body.cancel();
      throw new Error('抖音返回了非视频内容，请重新解析后下载');
    }

    const headers = new Headers({
      'Content-Disposition': `attachment; filename="douyin_${video.id}.mp4"`,
      'Content-Type': media.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'private, no-store',
    });
    const length = media.headers.get('content-length');
    if (length) headers.set('Content-Length', length);
    return new Response(media.body, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
