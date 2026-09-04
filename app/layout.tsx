import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '一贴即下｜抖音视频下载',
  description: '粘贴抖音视频链接，解析并下载公开视频。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
