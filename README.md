# 一贴即下

一个轻量的视频下载工具：抖音公开视频直接在网页下载；飞书文档视频通过已登录的 Chrome 扩展下载。

**在线使用：** [yitie-jixia-cn.netlify.app](https://yitie-jixia-cn.netlify.app)

## 功能

- 支持 `v.douyin.com` 短链接和 `douyin.com/video/...` 视频页链接
- 支持完整分享文案、Markdown 链接、无协议链接、移动分享页及带 `modal_id` 的页面链接；自动清理尾随中文与转义下划线
- 对分享页进行最多三次请求并保留响应 Cookie；超时、上游校验不再误报为视频删除
- 下载复用解析出的媒体 ID，避免点击下载时重复解析
- 服务端解析视频，浏览器直接下载 MP4
- 飞书 `wiki` / `docx` 文档链接：打开文档播放视频后，使用配套 Chrome 扩展保存已加载的 MP4
- 不保存下载记录；抖音无需登录，飞书使用浏览器已有的登录状态
- 抖音网页适配桌面端和手机端；飞书扩展需桌面版 Chrome

## 飞书扩展安装

从网站下载 `feishu-extension.zip` 并解压。Chrome 打开 `chrome://extensions`，开启“开发者模式”，点击“加载已解压的扩展程序”，选择解压得到的 `extension` 文件夹。然后在已登录的飞书文档里播放视频，点击扩展图标和“下载当前视频”。扩展仅在 `*.feishu.cn` 页面观察视频请求，下载由 Chrome 在本机完成，不读取或上传 Cookie。

扩展目前识别飞书文档中已播放的直链 MP4，每个标签页仅保留最近播放的一条；重新播放可刷新识别结果。它不支持任意网站、未授权内容、DRM 或受播放保护的视频。

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

项目保留 React / Vinext 本地界面；线上 Netlify 使用 `netlify-static/index.html` 和 `netlify/functions/video.ts`。服务器只接受抖音域名，解析公开分享页中的视频信息；飞书视频不经过服务器，由 `extension/` 的 Chrome 扩展在用户浏览器内处理。

## 使用说明

请仅下载你有权保存的内容。私密、已删除、受地区限制的视频无法解析。抖音页面结构或访问策略变化时，解析逻辑可能需要更新。

本项目与抖音及字节跳动无关联。

链接与解析回归检查：`node --experimental-strip-types lib/douyin.test.ts`；扩展地址检查：`node extension/media.test.mjs`。
本工具只支持上述抖音及飞书链接形式，不代表支持所有平台或绕过私密、登录及地区限制。上游限流或验证仍可能导致失败。
