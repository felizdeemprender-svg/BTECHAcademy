import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })]
});

async function run() {
  try {
    const response = await ai.generate({ model: gemini15Flash, prompt: 'Dime HOLA' });
    console.log("AI Response:", response.text);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
run();
