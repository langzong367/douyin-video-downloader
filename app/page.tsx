'use client';

import { ArrowDownToLine, Link2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Status = 'idle' | 'loading' | 'ready' | 'error';
type Video = { id: string; title: string; downloadUrl: string };

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
  const [video, setVideo] = useState<Video | null>(null);

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
          <p className="eyebrow">DOUYIN VIDEO DOWNLOADER / 01</p>
          <h1 className="mt-5 max-w-2xl font-heading text-[clamp(3.2rem,9vw,7rem)] font-black leading-[0.88] tracking-[-0.075em]">
            贴链接，<br /><span>拿视频。</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            短链接、视频页链接、完整分享文案，都可以直接粘贴。自动提取其中的抖音视频链接。
          </p>

          <form onSubmit={handleSubmit} className="download-panel mt-10">
            <label htmlFor="video-url" className="mb-3 block text-sm font-medium text-zinc-300">
              抖音链接或分享文案
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
                  placeholder="粘贴链接，或直接粘贴抖音分享文案"
                  className="h-14 rounded-none border-zinc-700 bg-zinc-950 pl-12 text-base text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/30"
                />
              </div>
              <Button type="submit" disabled={status === 'loading'} className="h-14 rounded-none bg-orange-500 px-7 text-base font-bold text-black hover:bg-orange-400">
                {status === 'loading' ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}
                {status === 'loading' ? '解析中' : '解析视频'}
              </Button>
            </div>

            <div className="mt-5 flex min-h-6 items-center justify-between gap-4 text-sm" aria-live="polite">
              <span className={status === 'error' ? 'text-red-400' : 'text-zinc-400'}>{message || '粘贴公开可访问的视频链接'}</span>
              <span className="hidden items-center gap-1.5 text-zinc-500 sm:flex"><ShieldCheck size={15} /> 不保存下载记录</span>
            </div>

            {video && (
              <div className="result-card mt-5 flex flex-col gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{video.title}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">ID {video.id}</p>
                </div>
                <a href={video.downloadUrl} className={buttonVariants({ className: 'h-11 shrink-0 rounded-none bg-white px-5 font-bold text-black hover:bg-zinc-200' })}>
                  <ArrowDownToLine /> 下载 MP4
                </a>
              </div>
            )}
          </form>

          <div className="mt-7 flex items-start gap-3 border-l-2 border-zinc-700 pl-4 text-sm leading-6 text-zinc-500">
            <span>请仅下载你有权保存的内容。私密、已删除或受地区限制的视频无法解析。</span>
          </div>
        </div>
      </section>
    </main>
  );
}
