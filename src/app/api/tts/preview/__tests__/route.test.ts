import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/tts', () => ({
  generateSpeechV2: vi.fn().mockImplementation(async (text: string, voiceId: string) => {
    return 'public/tts_cache/mock-test.mp3';
  }),
}));

vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: vi.fn().mockResolvedValue(Buffer.from('MOCK_MP3_AUDIO_BYTES')),
    },
  },
}));

describe('API Route /api/tts/preview', () => {
  it('devuelve streaming de audio con Content-Type audio/mpeg', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/tts/preview?voiceId=es-AR-TomasNeural&text=Hola');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toContain('public');
  });

  it('usa sampleText del catálogo si no se provee texto explícito', async () => {
    const { GET } = await import('../route');
    const { generateSpeechV2 } = await import('@/lib/tts');
    const req = new NextRequest('http://localhost:9002/api/tts/preview?voiceId=es-AR-TomasNeural');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(generateSpeechV2).toHaveBeenCalledWith(
      expect.stringContaining('Tomás'),
      'es-AR-TomasNeural'
    );
  });
});
