import assert from 'node:assert/strict';
import { normalizeInput, extractId, extractVideo, validateUrl } from './douyin.ts';

for (const input of [
  'https://v.douyin.com/D5RP-0g3r4o/',
  '复制打开抖音 https://v.douyin.com/D5RP-0g3r4o/ 下载这个视频',
  '[视频](https://v.douyin.com/D5RP-0g3r4o/下载这个视频)',
  'v.douyin.com/D5RP-0g3r4o/',
  'http://v.douyin.com/D5RP-0g3r4o/',
]) assert.equal(normalizeInput(input).href, 'https://v.douyin.com/D5RP-0g3r4o/');
assert.equal(normalizeInput('https://v.douyin.com/J2i5OxT\\_Xzc/').pathname, '/J2i5OxT_Xzc/');
for (const input of ['https://www.douyin.com/video/7680412201601109486', 'https://www.iesdouyin.com/share/video/7680412201601109486/', 'https://www.douyin.com/?modal_id=7680412201601109486']) {
  assert.equal(extractId(normalizeInput(input)), '7680412201601109486');
}
for (const input of ['https://evil.com', 'https://evil.douyin.com/v', 'https://douyin.com.evil.com', 'a'.repeat(8001)]) assert.throws(() => normalizeInput(input));
assert.throws(() => validateUrl(new URL('https://127.0.0.1/video/123')));
assert.deepEqual(extractVideo('"desc":"标题", "play_addr": {"url_list": [], "uri": "v0300fg10000da8ftq7og65lj8vcmfq0"}'), { title: '标题', videoId: 'v0300fg10000da8ftq7og65lj8vcmfq0' });
assert.equal(extractVideo('<html>验证</html>'), null);
console.log('链接格式、域名边界、视频字段解析检查通过');
