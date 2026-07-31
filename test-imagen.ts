import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});

async function main() {
  try {
    const { media } = await ai.generate({
      model: 'googleai/imagen-3.0-generate-001',
      prompt: 'A cute cat',
      output: { format: 'media' },
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
      },
    });
    console.log('SUCCESS', media?.url ? 'Got URL' : 'No URL');
  } catch(e) {
    console.error('ERROR', e instanceof Error ? e.message : String(e));
  }
}
main();
