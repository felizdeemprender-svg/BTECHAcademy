import { ai } from '../genkit';
import { z } from 'zod';

export const generateImagePromptInputSchema = z.object({
  keywords: z.string().optional(),
  contextHint: z.string().optional(),
  courseTitle: z.string().optional()
});

export const generateImagePromptFlow = ai.defineFlow({
  name: 'generateImagePrompt',
  inputSchema: generateImagePromptInputSchema,
  outputSchema: z.string(),
}, async (input) => {
  const { keywords = '', contextHint = '', courseTitle = '' } = input;

  const prompt = `
    You are an expert art director and expert prompt engineer for AI image generation models like Stable Diffusion and Midjourney.
    Your task is to take the user's intent (which might be in Spanish) and translate it into a HIGH-QUALITY, highly descriptive image generation prompt in perfect ENGLISH.

    Context about the project:
    - Course Title: ${courseTitle || 'N/A'}
    - Keywords / Tags: ${keywords || 'N/A'}
    - Specific Context or Hint: ${contextHint || 'An engaging marketing image for an online tech/business course'}

    Rules for your prompt:
    1. Write ONLY the final English prompt. No greetings, no explanations, no quotation marks.
    2. Focus on a photorealistic, professional, corporate, and modern aesthetic. 
    3. Make the subject highly concrete and visually obvious. Avoid abstract concepts; instead, describe real people, offices, screens, or tangible objects representing the theme.
    4. Include lighting details (e.g., 'cinematic lighting', 'soft studio lighting').
    5. Include camera angle or composition instructions (e.g., 'wide shot', 'centered', '4k resolution').
    6. NO text overlays, NO words written on the image. (Adding "no text, no words" at the end helps).
    7. Keep it under 60 words.

    Based on the context provided, generate the best possible image prompt now:
  `;

  const { text } = await ai.generate({
    prompt,
  });

  return text.trim();
});
