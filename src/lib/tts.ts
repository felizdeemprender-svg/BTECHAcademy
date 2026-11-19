/**
 * @fileOverview Sistema de Voz Microsoft Edge Neural (Sec-MS-GEC v2) con Caché Inteligente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import crypto from 'crypto';
import WebSocket from 'isomorphic-ws';

const execPromise = promisify(exec);
const fsPromises = fs.promises;

// Configuración de Caché (en os.tmpdir() para compatibilidad garantizada en Cloud Run y local)
const CACHE_DIR = path.join(os.tmpdir(), 'tts_cache');
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// Mapeo de Voces para Microsoft Edge Neural
const EDGE_VOICE_MAPPING: Record<string, string> = {
  'sofia': 'es-ES-ElviraNeural',
  'mateo': 'es-ES-AlvaroNeural',
  'diego': 'es-MX-JorgeNeural',
  'dalia': 'es-MX-DaliaNeural',
  'jorge': 'es-MX-JorgeNeural',
  'alvaro': 'es-ES-AlvaroNeural',
  'elvira': 'es-ES-ElviraNeural',
  'ximena': 'es-ES-XimenaNeural',
  'paloma': 'es-US-PalomaNeural',
  'alonso': 'es-US-AlonsoNeural',
  'tomas': 'es-AR-TomasNeural',
  'elena': 'es-AR-ElenaNeural',
  'gonzalo': 'es-CO-GonzaloNeural',
  'salome': 'es-CO-SalomeNeural',
  'guy': 'en-US-GuyNeural',
  'jenny': 'en-US-JennyNeural',
  'antonio': 'pt-BR-AntonioNeural',
  'francisca': 'pt-BR-FranciscaNeural'
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y DRM SEC-MS-GEC V2 (Microsoft Edge ReadAloud Protocol v2)
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0];
const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

const SHA256_INITIAL = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
const SHA256_STATE = [0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A, 0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2];
const SHA256_SCHEDULE = [0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA, 0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6, 0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33, 0xD258B060, 0x72766564];
const SHA256_ROUND_CONSTANTS = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
];
const SHA256_ADJUSTMENT = 0xC9DC06A7;
const SHA256_BLOCK_CONSTANTS = [...SHA256_ROUND_CONSTANTS.slice(0, 14), SHA256_ADJUSTMENT, ...SHA256_ROUND_CONSTANTS.slice(15)];
const SHA256_SIGMA0_ADJUSTMENT = 0x059C0B80;
const SHA256_SIGMA1_ADJUSTMENT = 0x000B92C0;

const CS64_COEFFICIENTS: Array<[number, number]> = [
  [0xE82E91B1, 0xB32700D0], [0x44DE24C6, 0x88DFF51D], [0x3BEB65BC, 0x29514038], [0xC89C5933, 0xB328CBDF],
  [0x8D1EC211, 0xD405B4D5], [0x314EF5D5, 0x26E55F3C], [0xE92491B1, 0x607801C6], [0xF0A5B9D5, 0x82B2C1FB],
  [0x06064CF3, 0xFA51A3DA], [0xDA79FA60, 0x207CC464], [0xBED20560, 0x3C3C74F3], [0x89F9C9F8, 0xD2D14B61],
  [0x35FA38C6, 0xBB04A2C1], [0xCB49E3C6, 0xC5626167]
];
const CS64_FACTOR = 0x82893933;
const CS64_ADJUSTMENT0 = 0xF2F90B1A;
const CS64_ADJUSTMENT1 = 0x0B1A0000;

let clockSkewSeconds = 0;

const rotr = (v: number, n: number) => ((v >>> n) | (v << (32 - n))) >>> 0;
const rol16 = (v: number) => (((v & 0xFFFF) << 16) | (v >>> 16)) >>> 0;
const sigma0 = (v: number) => (rotr(v, 7) ^ rotr(v, 18) ^ (v >>> 3)) >>> 0;
const sigma1 = (v: number) => (rotr(v, 17) ^ rotr(v, 19) ^ (v >>> 10)) >>> 0;

function sha256Rounds(state: number[], words: number[], firstRound = 0): number[] {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  for (let i = firstRound; i < 64; i++) {
    const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
    const ch = (g ^ (e & (f ^ g))) >>> 0;
    const t1 = (h + s1 + ch + constants[i] + words[i]) >>> 0;
    const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
    const maj = ((a & b) | (c & (a | b))) >>> 0;
    const t2 = (s0 + maj) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0;
    d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  return [a, b, c, d, e, f, g, h];
}

function expandSha256Schedule(words: number[], firstWord = 16): void {
  for (let i = firstWord; i < 64; i++) {
    words[i] = (sigma1(words[i - 2]) + words[i - 7] + sigma0(words[i - 15]) + words[i - 16]) >>> 0;
  }
}

function sha256Init(data7: Buffer): number[] {
  const words: number[] = new Array(14).fill(0);
  words.push(((data7[0] << 16) | (data7[1] << 8) | data7[2]) >>> 0);
  words.push(data7.readUInt32BE(3));
  for (let i = 16; i < 30; i++) {
    let val = SHA256_SCHEDULE[i - 16];
    if (i - 2 >= 14) val = (val + (i === 16 ? (sigma1(words[i - 2]) ^ SHA256_SIGMA1_ADJUSTMENT) : sigma1(words[i - 2]))) >>> 0;
    if (i - 7 >= 14) val = (val + words[i - 7]) >>> 0;
    if (i - 15 >= 14) val = (val + (i === 29 ? (sigma0(words[i - 15]) ^ SHA256_SIGMA0_ADJUSTMENT) : sigma0(words[i - 15]))) >>> 0;
    words.push(val >>> 0);
  }
  words.push((sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14] + SHA256_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) >>> 0);
  expandSha256Schedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((x, idx) => (x + working[idx]) >>> 0);
}

function sha256Digest(data: Buffer): Buffer {
  const length = 57 + data.length;
  const padZeroCount = (((55 - length) % 64) + 64) % 64;
  const tail = data.subarray(7);
  const padded = Buffer.alloc(tail.length + 1 + padZeroCount + 8);
  tail.copy(padded, 0);
  padded[tail.length] = 0x80;
  padded.writeBigUInt64BE(BigInt(length * 8), padded.length - 8);
  let state = sha256Init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words: number[] = [];
    for (let i = 0; i < 16; i++) words.push(padded.readUInt32BE(offset + i * 4));
    expandSha256Schedule(words, 16);
    const working = sha256Rounds(state, words, 0);
    state = state.map((x, idx) => (x + working[idx]) >>> 0);
  }
  const out = Buffer.alloc(32);
  state.forEach((w, idx) => out.writeUInt32BE(w, idx * 4));
  return out;
}

function wordsLe4Even(data: Buffer): number[] {
  const pad = (4 - (data.length % 4)) % 4;
  const padded = pad ? Buffer.concat([data, Buffer.alloc(pad)]) : data;
  const words: number[] = [];
  for (let i = 0; i < padded.length; i += 4) words.push(padded.readUInt32LE(i));
  if (words.length % 2 === 1) words.push(0);
  return words;
}

function cs64Digest(data: Buffer, digest: Buffer): string {
  const keyA = (digest.readUInt32LE(0) | 1) >>> 0;
  const keyB = (digest.readUInt32LE(4) | 1) >>> 0;
  const factors = [Math.imul(keyA, CS64_FACTOR) >>> 0, Math.imul(keyB, CS64_FACTOR) >>> 0];
  const terms = CS64_COEFFICIENTS.map(([c], i) => Math.imul(c, factors[i % 2]) >>> 0);
  const offsets = CS64_COEFFICIENTS.map(([, o]) => o >>> 0);
  const inputWords = wordsLe4Even(Buffer.concat([Buffer.from([0]), data]));
  for (let i = 0; i < inputWords.length; i++) {
    const w = inputWords[i];
    let term = Math.imul(w, i % 2 === 0 ? keyA : keyB) >>> 0;
    let offset = Math.imul(rol16(w), i % 2 === 0 ? 0xEF0569FB : 0xC31713DB) >>> 0;
    if (i === 0) {
      term = (term + Math.imul(CS64_ADJUSTMENT0, factors[0])) >>> 0;
      offset = (offset + CS64_ADJUSTMENT1) >>> 0;
    }
    terms.push(term);
    offsets.push(offset);
  }
  let swapAcc = 0, swapLast = 0, state = 0, acc = 0;
  for (let i = 0; i < terms.length; i += 2) {
    const x = terms[i], y = terms[i + 1];
    let t = rol16((offsets[i] + x) >>> 0);
    let q = Math.imul(t, 0x76F50F34) >>> 0;
    swapAcc = (swapAcc + ((Math.imul(rol16(q), 0xC3EFEA97) + q) >>> 0)) >>> 0;
    t = rol16((offsets[i + 1] + y) >>> 0);
    q = Math.imul(t, 0x1881CE3C) >>> 0;
    swapLast = (Math.imul(rol16(q), 0x35BD1EC9) + q) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;

    state = (Math.imul(state, keyA) + x) >>> 0;
    state = Math.imul(rol16(state), 0xCF98B111) >>> 0;
    state = Math.imul(rol16(state), 0x87085B9F) >>> 0;
    state = Math.imul(rol16(state), 0x12CEB96D) >>> 0;
    state = Math.imul(rol16(state), 0x257E1D83) >>> 0;
    acc = (acc + state) >>> 0;
    t = (Math.imul(state, keyB) + y) >>> 0;
    t = Math.imul(rol16(t), 0xA27416F5) >>> 0;
    t = Math.imul(rol16(t), 0xD38396FF) >>> 0;
    state = Math.imul(rol16(Math.imul(rol16(t), 0x7C932B89) >>> 0), 0xBFA49F69) >>> 0;
    acc = (acc + state) >>> 0;
  }
  const out = Buffer.alloc(8);
  out.writeUInt32LE((swapLast ^ state) >>> 0, 0);
  out.writeUInt32LE((swapAcc ^ acc) >>> 0, 4);
  return out.toString('hex').toUpperCase();
}

export function generateSecMsGecV2(): string {
  const unixNow = Date.now() / 1000 + clockSkewSeconds;
  let ticks = unixNow + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const data = Buffer.from(`${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`, 'ascii');
  const digest = sha256Digest(data);
  const cs64 = cs64Digest(data, digest);
  return `${cs64}-${digest.toString('hex').toUpperCase()}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatEdgeVoiceName(shortVoice: string): string {
  const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(shortVoice);
  if (match) {
    const [, lang, region, name] = match;
    return `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
  }
  return shortVoice;
}

async function synthesizeWithEdgeWebSocket(text: string, shortVoice: string): Promise<Buffer> {
  const connectionId = crypto.randomUUID().replace(/-/g, '');
  const secMsGec = generateSecMsGecV2();
  const url = `${WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;
  const fullVoice = formatEdgeVoiceName(shortVoice);
  const escaped = escapeXml(text);
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${fullVoice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escaped}</prosody></voice></speak>`;

  return new Promise<Buffer>((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { ws.close(); } catch {}
        reject(new Error('Edge TTS timeout'));
      }
    }, 12000);

    const finish = (err?: Error, buf?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (err) reject(err);
      else resolve(buf!);
    };

    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Cookie': `muid=${crypto.randomBytes(16).toString('hex').toUpperCase()};`
      }
    });

    if (typeof (ws as any).on === 'function') {
      (ws as any).on('unexpected-response', (_req: any, res: any) => {
        const serverDate = res?.headers?.['date'] || res?.headers?.['Date'];
        if (serverDate) {
          const parsed = new Date(serverDate).getTime() / 1000;
          if (!isNaN(parsed)) {
            clockSkewSeconds = parsed - Date.now() / 1000;
          }
        }
        finish(new Error(`Edge TTS HTTP ${res?.statusCode || 403}`));
      });
    }

    ws.onopen = () => {
      const timestamp = new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
      ws.send(
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`
      );
      ws.send(
        `X-RequestId:${ crypto.randomUUID().replace(/-/g, '') }\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml
      );
    };

    ws.onmessage = (event: any) => {
      const raw = event.data !== undefined ? event.data : event;
      if (typeof raw === 'string') {
        if (raw.includes('Path:turn.end')) {
          if (audioChunks.length === 0) {
            finish(new Error('Edge TTS: No audio received'));
          } else {
            finish(undefined, Buffer.concat(audioChunks));
          }
        }
        return;
      }

      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (buf.length < 2) return;

      // Detectar si es mensaje de texto llegando como Buffer (ej. Path:turn.end)
      const headerEndIdx = buf.indexOf('\r\n\r\n');
      if (headerEndIdx !== -1 && buf[0] !== 0x00) {
        const textMsg = buf.toString('utf-8');
        if (textMsg.includes('Path:turn.end')) {
          if (audioChunks.length === 0) {
            finish(new Error('Edge TTS: No audio received'));
          } else {
            finish(undefined, Buffer.concat(audioChunks));
          }
        }
        return;
      }

      const headerLen = buf.readUInt16BE(0);
      if (headerLen + 2 <= buf.length) {
        const headerStr = buf.subarray(2, headerLen + 2).toString('utf-8');
        if (headerStr.includes('Path:audio')) {
          const audioData = buf.subarray(headerLen + 2);
          if (audioData.length > 0) {
            audioChunks.push(audioData);
          }
        }
      }
    };

    ws.onerror = (err: any) => {
      finish(new Error(err?.message || 'Edge TTS WebSocket error'));
    };

    ws.onclose = () => {
      if (audioChunks.length > 0) {
        finish(undefined, Buffer.concat(audioChunks));
      } else {
        finish(new Error('Edge TTS WebSocket closed without audio'));
      }
    };
  });
}

/**
 * Genera un hash único basado en el texto y la voz para el sistema de caché
 */
function getCacheHash(text: string, voiceId: string): string {
  return crypto.createHash('md5').update(`${text.trim()}_${voiceId.toLowerCase()}`).digest('hex');
}

function resolveEdgeVoice(voiceId: string): string {
  if (voiceId.includes('Neural') || voiceId.includes('-')) {
    return voiceId;
  }
  const lower = voiceId.toLowerCase();
  for (const [key, val] of Object.entries(EDGE_VOICE_MAPPING)) {
    if (lower.includes(key)) return val;
  }
  return EDGE_VOICE_MAPPING['mateo'];
}

/**
 * [V2] Generador de Voz Microsoft Edge Neural (Sec-MS-GEC v2) con Caché y Reintento por Clock Skew
 * @returns Path del archivo generado o recuperado de caché
 */
export async function generateSpeechV2(text: string, voiceId: string, _isSmokeTest: boolean = false): Promise<string> {
  const hash = getCacheHash(text, voiceId);
  const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

  // 1. Verificar Caché en Disco
  if (existsSync(cachePath)) {
    console.log(`🎯 [TTS:Cache] Hit! Reusing audio for: "${text.substring(0, 20)}..."`);
    return cachePath;
  }

  const edgeVoice = resolveEdgeVoice(voiceId);
  console.log(`🌐 [TTS:Edge] Generating new audio (${edgeVoice}) for: "${text.substring(0, 25)}..."`);

  try {
    let finalBuffer: Buffer;
    try {
      finalBuffer = await synthesizeWithEdgeWebSocket(text, edgeVoice);
    } catch (firstErr: any) {
      // Si hubo ajuste de clockSkew tras un 403, reintentar inmediatamente
      console.warn(`⚠️ [TTS:Edge] Reintentando síntesis tras error inicial (${firstErr?.message})...`);
      finalBuffer = await synthesizeWithEdgeWebSocket(text, edgeVoice);
    }

    await fsPromises.writeFile(cachePath, finalBuffer);
    return cachePath;
  } catch (err) {
    console.error('❌ [TTS:Edge Error]', err);
    throw err;
  }
}

/**
 * Compatibilidad para llamadas directas a generateSpeechMP3 (usa Edge TTS v2)
 */
export async function generateSpeechMP3(text: string, voiceId: string, _apiKey: string, outputPath: string) {
  const cachedPath = await generateSpeechV2(text, voiceId);
  if (cachedPath !== outputPath) {
    await fsPromises.copyFile(cachedPath, outputPath);
  }
  return outputPath;
}

/**
 * Obtiene la duración exacta de un archivo de audio
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    let resolvedFfmpeg = ffmpegStatic;
    if (!resolvedFfmpeg || !existsSync(resolvedFfmpeg)) {
      const ext = process.platform === 'win32' ? '.exe' : '';
      resolvedFfmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', `ffmpeg${ext}`);
    }

    try {
      const { stderr } = await execPromise(`"${resolvedFfmpeg}" -i "${filePath}"`);
      return parseDuration(stderr);
    } catch (err: any) {
      const output = err.stderr || err.message;
      return parseDuration(output);
    }
  } catch (err) {
    console.error('[TTS:DurationError] Error reading duration, using fallback...', (err as Error).message);
    const stats = await fsPromises.stat(filePath);
    return Math.max(1, stats.size / 6000); // Estimación 48kbps
  }
}

function parseDuration(output: string): number {
  const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (durationMatch) {
    const hours = parseFloat(durationMatch[1]);
    const minutes = parseFloat(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    return (hours * 3600) + (minutes * 60) + seconds;
  }
  throw new Error('No duration match in FFmpeg output');
}
