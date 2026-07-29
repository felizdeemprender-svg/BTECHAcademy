import { ai } from '../genkit';
import { z } from 'zod';

export const generateImagePromptInputSchema = z.object({
  keywords: z.string().optional(),
  contextHint: z.string().optional(),
  courseTitle: z.string().optional(),
  channel: z.string().optional()
});

export const generateImagePromptFlow = ai.defineFlow({
  name: 'generateImagePrompt',
  inputSchema: generateImagePromptInputSchema,
  outputSchema: z.string(),
}, async (input) => {
  const { keywords = '', contextHint = '', courseTitle = '', channel = 'video' } = input;

  const isLanding = channel === 'landing';
  const formatContext = isLanding 
    ? "This image is for a professional Web Sales Landing Page section (aspect ratio 16:9 or 4:3). It should be a beautiful, high-converting banner or supportive image." 
    : "This image is for a Social Media Video (TikTok/Reel) background (aspect ratio 9:16).";

  const prompt = `
    You are an expert art director for digital marketing.
    Your task is to create a HIGH-QUALITY image generation prompt in ENGLISH.

    ${formatContext}

    PRIORITY ORDER FOR THE IMAGE CONCEPT:
    1. FIRST PRIORITY — The core theme must be the dominant visual:
       - Course Title: "${courseTitle || 'Professional online course'}"
       - The image MUST visually represent this subject matter in an inspiring way.
    
    2. SECOND PRIORITY — The script or text provides emotional context:
       - ${isLanding ? 'Section Text' : 'Voiceover Script'}: "${keywords || 'N/A'}"
       - Use this to set the mood, tone, and emotional direction of the image.
    
    3. ADDITIONAL CONTEXT: ${contextHint || 'Marketing visual for digital product'}

    STRICT RULES:
    1. Write ONLY the final English prompt. No greetings, no explanations, no quotation marks.
    2. The image must clearly relate to the COURSE TOPIC and the SECTION TEXT above all else.
    3. Photorealistic, professional, modern aesthetic. Think premium stock photography or high-end digital art.
    4. Show real people, workspaces, tools, or tangible objects that represent the theme.
    5. Include: cinematic lighting, shallow depth of field, professional composition.
    6. ABSOLUTELY NO text, no words, no letters, no watermarks in the image.
    7. Keep it under 50 words.

    Generate the prompt now:
  `;

  const { text } = await ai.generate({
    prompt,
  });

  return text.trim();
});
