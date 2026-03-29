import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: 'googleai/gemini-2.5-flash'
});

async function run() {
  try {
    const response = await ai.generate({ prompt: 'Dime HOLA' });
    console.log("AI Response:", response.text);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
run();
