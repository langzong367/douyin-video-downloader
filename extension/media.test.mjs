import assert from 'node:assert/strict';
import { feishuVideo } from './media.js';

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
