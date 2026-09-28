import { feishuVideo } from './media.js';

const button = document.querySelector('#download');
const status = document.querySelector('#status');
const hint = document.querySelector('#hint');
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const key = tab ? `video:${tab.id}` : '';
const stored = key ? await chrome.storage.session.get(key) : {};
const video = feishuVideo(stored[key]);

if (video) {
  hint.textContent = '已识别当前页面播放的视频。';
  button.disabled = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = '正在创建下载…';
    try {
      const id = await chrome.downloads.download({ url: video.url, filename: video.filename, conflictAction: 'uniquify' });
      if (typeof id !== 'number') throw new Error('未能开始下载');
      status.textContent = '已交给 Chrome 下载。';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : '下载失败，请重新播放后重试';
      button.disabled = false;
    }
  });
}
