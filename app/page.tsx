'use client';

import { ArrowDownToLine, Link2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Status = 'idle' | 'loading' | 'ready' | 'error';
type Video = { id: string; title: string; downloadUrl: string };
type PageVideo = { page: true; url: string; title: string };

function feishuLink(text: string) {
  const match = text.match(/(?:https?:\/\/)?[a-z0-9-]+\.feishu\.cn\/(?:wiki|docx)\/[A-Za-z0-9]+(?:#[A-Za-z0-9-]+)?/i);
  return match ? new URL(/^https?:/i.test(match[0]) ? match[0] : `https://${match[0]}`).href : null;
}

function pageLink(text: string) {
  const match = text.match(/(?:https?:\/\/)?(?:www\.|m\.)?bilibili\.com\/video\/(?:BV[A-Za-z0-9]{10}|av\d+)\/?(?:\?[^\s<>"'，。！？、；;]*)?/i)
    || text.match(/(?:https?:\/\/)?b23\.tv\/[A-Za-z0-9]+/i)
    || text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try { return new URL((/^https?:/i.test(match[0]) ? match[0] : `https://${match[0]}`).replace(/[)\]，。！？、；;]+$/g, '')).href; }
  catch { return null; }
}

type ModelContext = {
  registerTool(tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute(input: unknown): Promise<Video>;
  }, options: { signal: AbortSignal }): void | Promise<void>;
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [video, setVideo] = useState<Video | PageVideo | null>(null);

  async function resolveVideo(input: string) {
    setStatus('loading');
    setMessage('正在读取视频信息…');
    setVideo(null);

    try {
    const response = await fetch(`/api/video?url=${encodeURIComponent(input)}`, { signal: AbortSignal.timeout(65000) });
    const result = await response.json() as Video & { error?: string };
    if (!response.ok) throw new Error(result.error || '解析失败，请稍后重试');

    setVideo(result);
    setStatus('ready');
    setMessage('链接已识别，可以下载');
    return result;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '网络连接失败，请重试');
      throw error;
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const feishu = feishuLink(url);
      const link = feishu || pageLink(url);
      const host = link ? new URL(link).hostname : '';
      if (feishu || link && !/(^|\.)(?:douyin|iesdouyin)\.com$/i.test(host)) {
        setVideo({ page: true, url: link!, title: feishu ? '飞书文档视频' : /(^|\.)(?:bilibili\.com|b23\.tv)$/i.test(host) ? 'B站视频' : '网页视频' });
        setStatus('ready');
        setMessage('打开页面并播放视频，再点击一贴即下扩展下载');
        return;
      }
      if (/feishu\.cn/i.test(url)) throw new Error('请粘贴飞书 wiki 或 docx 文档链接');
      await resolveVideo(url);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '解析失败，请稍后重试');
    }
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'resolve_douyin_video',
      title: '解析抖音视频',
      description: '解析一个公开可访问的抖音视频链接，并在页面中准备下载。',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: '完整的抖音视频或短链接' } },
        required: ['url'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        const toolUrl = (input as { url?: unknown } | null)?.url;
        if (typeof toolUrl !== 'string' || !toolUrl.trim()) throw new Error('需要一个抖音视频链接');
        setUrl(toolUrl);
        return resolveVideo(toolUrl);
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="signal-grid" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="一贴即下首页">
          <span className="logo-mark"><ArrowDownToLine size={19} strokeWidth={2.4} /></span>
          <span className="font-heading text-lg font-semibold tracking-[-0.03em]">一贴即下</span>
        </Link>
        <span className="status-pill"><span /> 服务在线</span>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl place-items-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-3xl">
          <p className="eyebrow">VIDEO DOWNLOADER / 01</p>
          <h1 className="mt-5 max-w-2xl font-heading text-[clamp(3.2rem,9vw,7rem)] font-black leading-[0.88] tracking-[-0.075em]">
            贴链接，<br /><span>拿视频。</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            抖音、B站、飞书链接，或包含视频的网页地址，都可以直接粘贴。
          </p>

          <form onSubmit={handleSubmit} className="download-panel mt-10">
            <label htmlFor="video-url" className="mb-3 block text-sm font-medium text-zinc-300">
              视频链接或分享文案
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <Input
                  id="video-url"
                  type="text"
                  maxLength={8000}
                  required
                  value={url}
                  disabled={status === 'loading'}
                  onChange={(event) => { setUrl(event.target.value); setVideo(null); setStatus('idle'); setMessage(''); }}
                  placeholder="粘贴视频链接或整段分享文案"
                  className="h-14 rounded-none border-zinc-700 bg-zinc-950 pl-12 text-base text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/30"
                />
              </div>
              <Button type="submit" disabled={status === 'loading'} className="h-14 rounded-none bg-orange-500 px-7 text-base font-bold text-black hover:bg-orange-400">
                {status === 'loading' ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}
                {status === 'loading' ? '识别中' : '识别链接'}
              </Button>
            </div>

            <div className="mt-5 flex min-h-6 items-center justify-between gap-4 text-sm" aria-live="polite">
              <span className={status === 'error' ? 'text-red-400' : 'text-zinc-400'}>{message || '抖音可网页下载；其他页面需 Chrome 扩展'}</span>
              <span className="hidden items-center gap-1.5 text-zinc-500 sm:flex"><ShieldCheck size={15} /> 不保存下载记录</span>
            </div>

            {video && (
              <div className="result-card mt-5 flex flex-col gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{video.title}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{'page' in video ? '在 Chrome 打开页面并点击扩展图标' : `ID ${video.id}`}</p>
                </div>
                <a href={'page' in video ? video.url : video.downloadUrl} target={'page' in video ? '_blank' : undefined} rel={'page' in video ? 'noopener noreferrer' : undefined} className={buttonVariants({ className: 'h-11 shrink-0 rounded-none bg-white px-5 font-bold text-black hover:bg-zinc-200' })}>
                  <ArrowDownToLine /> {'page' in video ? '打开视频页面' : '下载 MP4'}
                </a>
              </div>
            )}
          </form>

          <div className="mt-7 border border-zinc-700 p-4 text-sm leading-6 text-zinc-400">
            B站、飞书及普通网页视频需要 <a className="text-white underline" href="/feishu-extension.zip" download>下载 Chrome 扩展</a>并解压，在 <code>chrome://extensions</code> 开启开发者模式并加载解压后的 <code>extension</code> 文件夹。打开视频页面，必要时先播放，再点击扩展图标下载。
          </div>
          <div className="mt-7 flex items-start gap-3 border-l-2 border-zinc-700 pl-4 text-sm leading-6 text-zinc-500">
            <span>请仅保存你有权下载的内容。B站支持公开可获取的带声视频；普通网页支持可直接获取的 MP4/WebM 等文件。分段流、DRM 或受权限限制的视频不保证可用。</span>
          </div>
        </div>
      </section>
    </main>
  );
}
