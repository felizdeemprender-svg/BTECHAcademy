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
    You are an expert art director for video marketing of online courses.
    Your task is to create a HIGH-QUALITY image generation prompt in ENGLISH.

    PRIORITY ORDER FOR THE IMAGE CONCEPT:
    1. FIRST PRIORITY — The course topic must be the dominant visual theme:
       - Course Title: "${courseTitle || 'Professional online course'}"
       - The image MUST visually represent this course's subject matter.
    
    2. SECOND PRIORITY — The narrator's script adds emotional context:
       - Voiceover/Script: "${keywords || 'N/A'}"
       - Use this to set the mood, tone, and emotional direction of the image.
    
    3. ADDITIONAL CONTEXT: ${contextHint || 'Marketing visual for social media video'}

    STRICT RULES:
    1. Write ONLY the final English prompt. No greetings, no explanations, no quotation marks.
    2. The image must clearly relate to the COURSE TOPIC above all else.
    3. Photorealistic, professional, modern aesthetic. Think premium stock photography.
    4. Show real people, workspaces, tools, or tangible objects that represent the course theme.
    5. Include: cinematic lighting, shallow depth of field, professional composition.
    6. The image will be used as a background for video at 1080px max resolution.
    7. ABSOLUTELY NO text, no words, no letters, no watermarks in the image.
    8. Keep it under 50 words.

    Generate the prompt now:
  `;

  const { text } = await ai.generate({
    prompt,
  });

  return text.trim();
});
