import assert from 'node:assert/strict';
import { bilibiliFiles, bilibiliPage, directVideo, feishuVideo } from './media.js';

const url = 'https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/video/Ll63bhqoIo2qDbxkuUbcbFiOnQh/?quality=1080p&mount_point=docx_file';
assert.deepEqual(feishuVideo(url), {
  url,
  filename: 'feishu_video_Ll63bhqoIo2qDbxkuUbcbFiOnQh.mp4',
});
for (const value of [
  'https://flova-team.feishu.cn/wiki/FlRMw7HXCiPD9kk6m21cdpgNnBc',
  'https://internal-api-drive-stream.feishu.cn.evil.com/space/api/box/stream/download/video/token/',
  'http://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/video/token/',
]) assert.equal(feishuVideo(value), null);
console.log('飞书媒体地址边界检查通过');

assert.deepEqual(bilibiliPage('https://www.bilibili.com/video/BV1C3GZ6PEH6/?p=2'), { id: 'BV1C3GZ6PEH6', page: 2 });
assert.equal(bilibiliPage('https://www.bilibili.com.evil.com/video/BV1C3GZ6PEH6'), null);
assert.deepEqual(bilibiliFiles({ code: 0, data: { format: 'mp4720', durl: [{ url: 'https://upos.bilivideo.com/movie.mp4' }] } }, 'BV1C3GZ6PEH6', 1), [
  { url: 'https://upos.bilivideo.com/movie.mp4', filename: 'bilibili_BV1C3GZ6PEH6_p1.mp4' },
]);
assert.deepEqual(bilibiliFiles({ code: 0, data: { format: 'mp4720', durl: [{ url: 'https://bilivideo.com.evil.com/movie.mp4' }] } }, 'BV1C3GZ6PEH6', 1), []);
assert.equal(directVideo('blob:https://example.com/123'), null);
assert.deepEqual(directVideo('https://example.com/media/video.webm?token=abc'), { url: 'https://example.com/media/video.webm?token=abc', filename: 'web_video.webm' });
console.log('B站和网页视频地址检查通过');

const listeners = {};
const stored = {};
globalThis.chrome = {
  webRequest: { onBeforeRequest: { addListener: callback => { listeners.request = callback; } } },
  storage: { session: { set: async value => Object.assign(stored, value), remove: async key => { delete stored[key]; } } },
  tabs: {
    onRemoved: { addListener: callback => { listeners.removed = callback; } },
    onUpdated: { addListener: callback => { listeners.updated = callback; } },
  },
};
await import('./background.js');
listeners.request({ url, tabId: 7 });
await Promise.resolve();
assert.equal(stored['video:7'], url);
listeners.updated(7, { status: 'loading' });
await Promise.resolve();
assert.equal(stored['video:7'], undefined);
console.log('标签页切换后清理飞书视频记录检查通过');

const elements = Object.fromEntries(['#download', '#status', '#hint'].map(key => [key, { disabled: true, textContent: '' }]));
Object.defineProperty(globalThis, 'document', { value: { querySelector: key => elements[key] } });
chrome.tabs.query = async () => [{ id: 8, url: 'https://example.com/article' }];
chrome.storage.session.get = async () => ({});
chrome.scripting = { executeScript: async () => [{ result: null }] };
await import('./popup.js');
assert.equal(elements['#download'].disabled, true);
assert.match(elements['#hint'].textContent, /未发现可直接下载的视频/);
console.log('普通网页无视频时不误报下载检查通过');
