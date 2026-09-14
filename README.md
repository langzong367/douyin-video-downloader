# 一贴即下

一个简单的抖音公开视频下载工具。粘贴抖音短链接或视频页链接，解析成功后即可下载 MP4。

**在线使用：** [yitie-jixia.zejunchu.chatgpt.site](https://yitie-jixia.zejunchu.chatgpt.site)

## 功能

- 支持 `v.douyin.com` 短链接和 `douyin.com/video/...` 视频页链接
- 支持完整分享文案、Markdown 链接、无协议链接、移动分享页及带 `modal_id` 的页面链接；自动清理尾随中文与转义下划线
- 对分享页进行最多三次请求并保留响应 Cookie；超时、上游校验不再误报为视频删除
- 下载复用解析出的媒体 ID，避免点击下载时重复解析
- 服务端解析视频，浏览器直接下载 MP4
- 不需要登录，不保存下载记录
- 适配桌面端和手机端

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可使用。

生产构建：

```bash
npm run build
```

## 实现方式

项目使用 React、Vinext、Tailwind CSS 和 Cloudflare Workers。服务器只接受抖音域名，解析公开分享页中的视频信息，再以流式响应返回视频文件。

## 使用说明

请仅下载你有权保存的内容。私密、已删除、受地区限制的视频无法解析。抖音页面结构或访问策略变化时，解析逻辑可能需要更新。

本项目与抖音及字节跳动无关联。

链接与解析回归检查：`node --experimental-strip-types lib/douyin.test.ts`。
本工具支持上述抖音链接形式，不代表支持所有平台或绕过私密、登录及地区限制。上游限流或验证仍可能导致失败。
