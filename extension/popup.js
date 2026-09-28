import { bilibiliFiles, bilibiliPage, directVideo, feishuVideo } from './media.js';

const button = document.querySelector('#download');
const status = document.querySelector('#status');
const hint = document.querySelector('#hint');
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

function ready(files, message) {
  hint.textContent = message;
  button.disabled = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    let started = 0;
    try {
      for (const file of files) {
        const options = { url: file.url, conflictAction: 'uniquify' };
        if (file.filename) options.filename = file.filename;
        const id = await chrome.downloads.download(options);
        if (typeof id !== 'number') throw new Error('未能开始下载');
        started++;
      }
      status.textContent = '已交给 Chrome，请在下载列表确认文件完成。';
    } catch (error) {
      status.textContent = `${started ? `已创建 ${started}/${files.length} 个下载；` : ''}${error instanceof Error ? error.message : '下载失败'}`;
      button.disabled = false;
    }
  });
}

try {
  if (!tab?.id) throw new Error('请先打开视频页面');
  const key = `video:${tab.id}`;
  const stored = await chrome.storage.session.get(key);
  const feishu = feishuVideo(stored[key]);
  if (tab.url && /\.feishu\.cn\//i.test(tab.url)) {
    if (!feishu) throw new Error('请先在飞书文档中播放视频，再打开扩展');
    ready([feishu], '已识别当前飞书页面播放的视频。');
  } else {
    const bilibili = bilibiliPage(tab.url);
    if (bilibili) {
      const [frame] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: async (id, page) => {
        const key = id.toLowerCase().startsWith('av') ? 'aid' : 'bvid';
        const value = key === 'aid' ? id.slice(2) : id;
        const view = await (await fetch(`https://api.bilibili.com/x/web-interface/view?${key}=${encodeURIComponent(value)}`, { credentials: 'include' })).json();
        if (view.code !== 0 || !view.data?.pages?.[page - 1]) return { view };
        const cid = view.data.pages[page - 1].cid;
        const play = await (await fetch(`https://api.bilibili.com/x/player/playurl?${key}=${encodeURIComponent(value)}&cid=${cid}&qn=64&fnval=0`, { credentials: 'include' })).json();
        return { view, play };
      }, args: [bilibili.id, bilibili.page] });
      const { view, play } = frame?.result || {};
      if (view?.code !== 0 || !view?.data?.pages?.[bilibili.page - 1]) throw new Error('B站暂未返回这条视频的信息');
      const files = bilibiliFiles(play, bilibili.id, bilibili.page);
      if (!files.length) throw new Error('B站暂未提供可直接下载的单文件视频');
      ready(files, `${view.data.title} · ${files.length > 1 ? `${files.length} 段` : '带声音视频'}`);
    } else {
      let candidate;
      try {
        const [frame] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
          const videos = [...document.querySelectorAll('video')].sort((a, b) => Number(!b.paused) - Number(!a.paused) || b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
          const sources = videos.flatMap(video => [video.currentSrc, video.src, ...[...video.querySelectorAll('source')].map(source => source.src)]);
          const recent = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => /\.(?:mp4|m4v|mov|webm)(?:[?#]|$)/i.test(url)).reverse();
          return [...sources, ...recent].find(url => /^https?:\/\//i.test(url)) || null;
        } });
        candidate = frame?.result;
      } catch { /* Direct media tabs may not allow script injection. */ }
      if (!candidate && /\.(?:mp4|m4v|mov|webm)(?:[?#]|$)/i.test(tab.url || '')) candidate = tab.url;
      const media = directVideo(candidate);
      if (!media) throw new Error('未发现可直接下载的视频；分段流或受保护视频暂不支持');
      ready([media], '已识别当前网页的直接视频文件。');
    }
  }
} catch (error) {
  hint.textContent = error instanceof Error ? error.message : '未找到可下载的视频';
}
