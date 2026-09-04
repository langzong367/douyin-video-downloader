const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

function parseInput(input: string) {
  const url = new URL(input.trim());
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(host === 'douyin.com' || host.endsWith('.douyin.com'))) {
    throw new Error('请输入有效的抖音链接');
  }
  return url;
}

async function getVideo(input: string) {
  const source = parseInput(input);
  const landing = await fetch(source, {
    headers: { 'User-Agent': MOBILE_UA },
    redirect: 'follow',
  });

  const id = landing.url.match(/\/(?:video|share\/video)\/(\d+)/)?.[1];
  if (!id) throw new Error('未找到视频 ID，请检查链接');

  const shareUrl = `https://www.iesdouyin.com/share/video/${id}/`;
  const first = await fetch(shareUrl, { headers: { 'User-Agent': MOBILE_UA } });
  const cookie = first.headers.get('set-cookie')?.split(';', 1)[0];
  let html = await first.text();

  if (!html.includes('"play_addr"') && cookie) {
    html = await fetch(shareUrl, {
      headers: { Cookie: cookie, 'User-Agent': MOBILE_UA },
    }).then((response) => response.text());
  }

  const videoId = html.match(/"play_addr":\{"uri":"([^"]+)"/)?.[1];
  if (!videoId) throw new Error('该视频暂时无法解析，可能已删除或设为私密');

  const rawTitle = html.match(/"desc":"((?:\\.|[^"\\])*)"/)?.[1];
  const title = rawTitle ? JSON.parse(`"${rawTitle}"`) : `抖音视频 ${id}`;

  return {
    id,
    title,
    shareUrl,
    mediaUrl: `https://aweme.snssdk.com/aweme/v1/play/?line=0&ratio=720p&video_id=${encodeURIComponent(videoId)}`,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : '解析失败，请稍后重试';
  return Response.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('url');
  if (!input) return Response.json({ error: '请提供抖音链接' }, { status: 400 });

  try {
    const video = await getVideo(input);
    if (searchParams.get('mode') !== 'download') {
      return Response.json({
        id: video.id,
        title: video.title,
        downloadUrl: `/api/video?mode=download&url=${encodeURIComponent(input)}`,
      });
    }

    const media = await fetch(video.mediaUrl, {
      headers: { Referer: video.shareUrl, 'User-Agent': MOBILE_UA },
      redirect: 'follow',
    });
    if (!media.ok || !media.body) throw new Error('视频文件读取失败，请稍后重试');

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
