import { feishuVideo } from './media.js';

chrome.webRequest.onBeforeRequest.addListener(
  ({ url, tabId }) => {
    if (tabId < 0 || !feishuVideo(url)) return;
    // ponytail: only the most recently played video per tab; keep a list if multi-video pages need it.
    void chrome.storage.session.set({ [`video:${tabId}`]: url });
  },
  { urls: ['https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/video/*'] },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(`video:${tabId}`);
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.url) void chrome.storage.session.remove(`video:${tabId}`);
});
