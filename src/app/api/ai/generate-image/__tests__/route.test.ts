import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGenerateImagePromptFlow } = vi.hoisted(() => ({
  mockGenerateImagePromptFlow: vi.fn(),
}));

vi.mock('@/ai/flows/generate-image-prompt', () => ({
  generateImagePromptFlow: mockGenerateImagePromptFlow,
}));

vi.mock('@/lib/payments/credits', () => ({
  calculateImageCost: vi.fn().mockResolvedValue({ providerCost: 0.02, billedCost: 0.04 }),
  deductCredits: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '../route';

describe('API Route /api/ai/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_GENAI_API_KEY = 'fake-google-key';
  });

  it('devuelve únicamente el prompt sugerido sin llamar a Google Imagen cuando mode === "prompt_only"', async () => {
    mockGenerateImagePromptFlow.mockResolvedValueOnce(
      'Editorial photograph of an artisanal sourdough bakery kitchen with warm morning sunlight',
    );
    const fetchSpy = vi.spyOn(global, 'fetch');

    const req = new NextRequest('http://localhost:9002/api/ai/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'prompt_only',
        courseTitle: 'Panadería de Masa Madre',
        keywords: 'Panadería de Masa Madre, fermentación, masa madre',
        contextHint: 'Temática: fermentación | Módulos: 1. Madre activa; 2. Horneado',
        channel: 'thumbnails',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.generatedPrompt).toBe(
      'Editorial photograph of an artisanal sourdough bakery kitchen with warm morning sunlight',
    );
    expect(json.imageDataUrl).toBeUndefined();
    expect(mockGenerateImagePromptFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        courseTitle: 'Panadería de Masa Madre',
        keywords: 'Panadería de Masa Madre, fermentación, masa madre',
        contextHint: 'Temática: fermentación | Módulos: 1. Madre activa; 2. Horneado',
        channel: 'thumbnails',
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('respeta el prompt manual (customPrompt) sin sobreescribirlo con Gemini al generar la imagen', async () => {
    const customPrompt =
      'Close-up photography of acoustic guitar strings in a cozy wooden studio, warm tungsten light';

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { data: 'ZmFrZS1pbWFnZS1iYXNlNjQ=' } }],
            },
          },
        ],
      }),
    } as any);

    const req = new NextRequest('http://localhost:9002/api/ai/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt: customPrompt,
        courseTitle: 'Guitarra Acústica desde Cero',
        channel: 'thumbnails',
        engine: 'premium',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockGenerateImagePromptFlow).not.toHaveBeenCalled();
    expect(json.generatedPrompt).toBe(customPrompt);
    expect(json.imageDataUrl).toBe('data:image/jpeg;base64,ZmFrZS1pbWFnZS1iYXNlNjQ=');
  });

  it('usa fallback neutro sin sesgo corporativo si Gemini falla en mode === "prompt_only"', async () => {
    mockGenerateImagePromptFlow.mockRejectedValueOnce(new Error('Gemini quota exceeded'));

    const req = new NextRequest('http://localhost:9002/api/ai/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'prompt_only',
        courseTitle: 'Huerta Orgánica Urbana',
        channel: 'thumbnails',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.generatedPrompt).toContain('Editorial photography representing "Huerta Orgánica Urbana"');
    expect(json.generatedPrompt.toLowerCase()).not.toContain('business');
    expect(json.generatedPrompt.toLowerCase()).not.toContain('office');
  });
});

