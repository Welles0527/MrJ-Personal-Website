import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../cloudfunctions/youversion-verse/edge-tts.js', import.meta.url), 'utf8');
const clientTime = Date.parse('2026-10-12T06:00:00Z');
const serverTime = clientTime + 10 * 60 * 1000;
class ClientDate extends Date {
  constructor(value = clientTime) { super(value); }
  static now() { return clientTime; }
}
const tokenAt = (time) => {
  const seconds = BigInt(Math.floor(time / 1000));
  const ticks = (seconds - seconds % 300n + 11644473600n) * 10000000n;
  return crypto.createHash('sha256').update(`${ticks}6A5AA1D4EAFF4E9FB37E23D68491D6F4`).digest('hex').toUpperCase();
};
const frame = (opcode, payload) => Buffer.concat([Buffer.from([0x80 | opcode, payload.length]), payload]);

function loadClient(mode = 'clock-skew') {
  const requests = [];
  const https = {
    request(options) {
      requests.push(options);
      const request = new EventEmitter();
      request.destroy = () => {};
      request.end = () => queueMicrotask(() => {
        const token = new URL(options.path, 'https://speech.platform.bing.com').searchParams.get('Sec-MS-GEC');
        if (mode !== 'clock-skew' || token !== tokenAt(serverTime)) {
          const response = new EventEmitter();
          response.statusCode = mode === 'server-error' ? 500 : 403;
          response.headers = { date: new Date(serverTime).toUTCString() };
          response.resume = () => {};
          request.emit('response', response);
          return;
        }
        const socket = new EventEmitter();
        socket.write = () => {};
        socket.destroy = () => {};
        const accept = crypto.createHash('sha1').update(`${options.headers['Sec-WebSocket-Key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
        request.emit('upgrade', { headers: { 'sec-websocket-accept': accept } }, socket, Buffer.alloc(0));
        const headers = Buffer.from('Path:audio\r\nContent-Type:audio/mpeg\r\n');
        const length = Buffer.alloc(2);
        length.writeUInt16BE(headers.length);
        socket.emit('data', Buffer.concat([
          frame(2, Buffer.concat([length, headers, Buffer.from('test audio')])),
          frame(1, Buffer.from('Path:turn.end\r\n\r\n'))
        ]));
      });
      return request;
    }
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, Buffer, URLSearchParams, Date: ClientDate, setTimeout, clearTimeout,
    require(name) { return name === 'https' ? https : crypto; }
  });
  return { ...module.exports, requests };
}

const skewed = loadClient();
assert.equal((await skewed.synthesizeEdgeSpeech('你好。')).toString(), 'test audio');
assert.equal(skewed.requests.length, 2, '403 应根据微软时间校正签名，并仅重试一次');
await skewed.synthesizeEdgeSpeech('第二段。');
assert.equal(skewed.requests.length, 3, '后续段落应复用已校正的时间');
assert.equal(skewed.EDGE_TTS.voice, 'zh-CN-YunyangNeural', '应保留原来的云端男声');
assert.equal(skewed.requests[0].hostname, 'api.msedgeservices.com', '应连接微软迁移后的朗读地址');
const speechUrl = new URL(skewed.requests[0].path, 'https://api.msedgeservices.com');
assert.equal(speechUrl.pathname, '/tts/cognitiveservices/websocket/v1');
assert.equal(speechUrl.searchParams.get('Ocp-Apim-Subscription-Key'), skewed.EDGE_TTS.trustedClientToken);

const denied = loadClient('denied');
await assert.rejects(denied.synthesizeEdgeSpeech('你好。'), /403/);
assert.equal(denied.requests.length, 2, '持续拒绝访问时不得无限重试');
const failed = loadClient('server-error');
await assert.rejects(failed.synthesizeEdgeSpeech('你好。'), /500/);
assert.equal(failed.requests.length, 1, '非时间校验错误不应触发校时重试');
console.log('Edge TTS clock recovery regression passed.');
