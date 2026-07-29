"use strict";

const crypto = require("crypto");
const https = require("https");

const EDGE_TTS = Object.freeze({
  voice: "zh-CN-YunyangNeural",
  rate: "-12%",
  pitch: "-8Hz",
  volume: "+0%",
  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
  trustedClientToken: "6A5AA1D4EAFF4E9FB37E23D68491D6F4",
  secMsGecVersion: "1-143.0.3650.75"
});
const EDGE_TTS_HOST = "speech.platform.bing.com";
const EDGE_TTS_PATH = "/consumer/speech/synthesize/readaloud/edge/v1";
const EDGE_TTS_TIMEOUT_MS = 13000;
const WEB_SOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function randomId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function edgeTimestamp(date = new Date()) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = value => String(value).padStart(2, "0");
  return `${weekdays[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function generateSecMsGec() {
  let seconds = BigInt(Math.floor(Date.now() / 1000));
  seconds -= seconds % 300n;
  const windowsFileTime = (seconds + 11644473600n) * 10000000n;
  return crypto
    .createHash("sha256")
    .update(`${windowsFileTime}${EDGE_TTS.trustedClientToken}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function speechConfigMessage() {
  return [
    `X-Timestamp:${edgeTimestamp()}\r\n`,
    "Content-Type:application/json; charset=utf-8\r\n",
    "Path:speech.config\r\n\r\n",
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: "true",
              wordBoundaryEnabled: "false"
            },
            outputFormat: EDGE_TTS.outputFormat
          }
        }
      }
    }),
    "\r\n"
  ].join("");
}

function ssmlMessage(text) {
  const ssml = [
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>",
    `<voice name='${EDGE_TTS.voice}'>`,
    `<prosody pitch='${EDGE_TTS.pitch}' rate='${EDGE_TTS.rate}' volume='${EDGE_TTS.volume}'>`,
    escapeXml(text),
    "</prosody></voice></speak>"
  ].join("");
  return [
    `X-RequestId:${randomId()}\r\n`,
    "Content-Type:application/ssml+xml\r\n",
    `X-Timestamp:${edgeTimestamp()}Z\r\n`,
    "Path:ssml\r\n\r\n",
    ssml
  ].join("");
}

function clientFrame(payload, opcode = 1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
  const mask = crypto.randomBytes(4);
  const extendedLength = data.length < 126 ? 0 : data.length <= 65535 ? 2 : 8;
  const frame = Buffer.alloc(2 + extendedLength + 4 + data.length);
  frame[0] = 0x80 | opcode;
  if (extendedLength === 0) {
    frame[1] = 0x80 | data.length;
  } else if (extendedLength === 2) {
    frame[1] = 0x80 | 126;
    frame.writeUInt16BE(data.length, 2);
  } else {
    frame[1] = 0x80 | 127;
    frame.writeBigUInt64BE(BigInt(data.length), 2);
  }
  const maskOffset = 2 + extendedLength;
  mask.copy(frame, maskOffset);
  for (let index = 0; index < data.length; index += 1) {
    frame[maskOffset + 4 + index] = data[index] ^ mask[index % 4];
  }
  return frame;
}

function createFrameParser(onFrame) {
  let pending = Buffer.alloc(0);
  return chunk => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= 2) {
      let payloadLength = pending[1] & 0x7f;
      let payloadOffset = 2;
      if (payloadLength === 126) {
        if (pending.length < 4) return;
        payloadLength = pending.readUInt16BE(2);
        payloadOffset = 4;
      } else if (payloadLength === 127) {
        if (pending.length < 10) return;
        const longLength = pending.readBigUInt64BE(2);
        if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Edge TTS frame is too large");
        payloadLength = Number(longLength);
        payloadOffset = 10;
      }
      const masked = Boolean(pending[1] & 0x80);
      const maskLength = masked ? 4 : 0;
      if (pending.length < payloadOffset + maskLength + payloadLength) return;
      const mask = masked ? pending.subarray(payloadOffset, payloadOffset + 4) : null;
      const payload = Buffer.from(
        pending.subarray(payloadOffset + maskLength, payloadOffset + maskLength + payloadLength)
      );
      if (mask) {
        for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      }
      const opcode = pending[0] & 0x0f;
      pending = pending.subarray(payloadOffset + maskLength + payloadLength);
      onFrame(opcode, payload);
    }
  };
}

function extractAudioChunk(payload) {
  if (payload.length < 2) return null;
  const headerLength = payload.readUInt16BE(0);
  const audioStart = headerLength + 2;
  if (audioStart > payload.length) return null;
  const headers = payload.subarray(2, audioStart).toString("utf8");
  if (!/(?:^|\r\n)Path:audio(?:\r\n|$)/i.test(headers)) return null;
  const audio = payload.subarray(audioStart);
  return audio.length ? audio : null;
}

function synthesizeEdgeSpeech(text) {
  return new Promise((resolve, reject) => {
    const connectionId = randomId();
    const query = new URLSearchParams({
      TrustedClientToken: EDGE_TTS.trustedClientToken,
      ConnectionId: connectionId,
      "Sec-MS-GEC": generateSecMsGec(),
      "Sec-MS-GEC-Version": EDGE_TTS.secMsGecVersion
    });
    const webSocketKey = crypto.randomBytes(16).toString("base64");
    const expectedAccept = crypto
      .createHash("sha1")
      .update(`${webSocketKey}${WEB_SOCKET_GUID}`, "ascii")
      .digest("base64");
    const request = https.request({
      hostname: EDGE_TTS_HOST,
      port: 443,
      method: "GET",
      path: `${EDGE_TTS_PATH}?${query.toString()}`,
      headers: {
        "Connection": "Upgrade",
        "Upgrade": "websocket",
        "Sec-WebSocket-Key": webSocketKey,
        "Sec-WebSocket-Version": "13",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        "Cookie": `muid=${randomId().toUpperCase()};`
      }
    });
    let socket;
    let settled = false;
    const audioChunks = [];
    const timeout = setTimeout(() => finish(new Error("Edge TTS request timed out")), EDGE_TTS_TIMEOUT_MS);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      request.destroy();
      if (socket) socket.destroy();
      if (error) {
        reject(error);
        return;
      }
      if (!audioChunks.length) {
        reject(new Error("Edge TTS returned no audio"));
        return;
      }
      resolve(Buffer.concat(audioChunks));
    }

    request.on("upgrade", (response, upgradedSocket, head) => {
      socket = upgradedSocket;
      if (response.headers["sec-websocket-accept"] !== expectedAccept) {
        finish(new Error("Edge TTS websocket validation failed"));
        return;
      }
      const receive = createFrameParser((opcode, payload) => {
        if (opcode === 1) {
          const message = payload.toString("utf8");
          if (/(?:^|\r\n)Path:turn\.end(?:\r\n|$)/i.test(message)) finish();
          return;
        }
        if (opcode === 2) {
          const audio = extractAudioChunk(payload);
          if (audio) audioChunks.push(audio);
          return;
        }
        if (opcode === 8) {
          finish(audioChunks.length ? undefined : new Error("Edge TTS websocket closed early"));
          return;
        }
        if (opcode === 9) socket.write(clientFrame(payload, 10));
      });
      socket.on("data", receive);
      socket.on("error", error => {
        if (!settled) finish(error);
      });
      socket.on("close", () => {
        if (!settled) finish(audioChunks.length ? undefined : new Error("Edge TTS websocket closed early"));
      });
      if (head.length) receive(head);
      socket.write(clientFrame(speechConfigMessage()));
      socket.write(clientFrame(ssmlMessage(text)));
    });
    request.on("response", response => {
      finish(new Error(`Edge TTS websocket upgrade failed: ${response.statusCode}`));
    });
    request.on("error", error => {
      if (!settled) finish(error);
    });
    request.end();
  });
}

module.exports = { EDGE_TTS, synthesizeEdgeSpeech };
