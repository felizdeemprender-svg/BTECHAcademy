import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { generateSecMsGecV2, generateSpeechV2, getAudioDuration } from '../tts';

describe('Edge TTS v2 (Sec-MS-GEC v2)', () => {
  it('generates a valid v2 Sec-MS-GEC token (<16-hex CS64>-<64-hex SHA256>)', () => {
    const token = generateSecMsGecV2();
    expect(token).toMatch(/^[0-9A-F]{16}-[0-9A-F]{64}$/);
  });

  it('synthesizes real MP3 audio via Microsoft Edge WebSocket v2 with voice elena', async () => {
    const mp3Path = await generateSpeechV2(
      '¿Sientes que la Navidad se ha convertido en una carrera de compromisos y gastos?',
      'elena'
    );
    expect(fs.existsSync(mp3Path)).toBe(true);
    const stat = fs.statSync(mp3Path);
    expect(stat.size).toBeGreaterThan(5000);
    const duration = await getAudioDuration(mp3Path);
    expect(duration).toBeGreaterThan(2);
  }, 15000);
});

