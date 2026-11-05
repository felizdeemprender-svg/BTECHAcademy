import { ai } from '../genkit';
import { z } from 'zod';

export const generateImagePromptInputSchema = z.object({
  keywords: z.string().optional(),
  contextHint: z.string().optional(),
  courseTitle: z.string().optional(),
  channel: z.string().optional(),
  uid: z.string().optional(),
  role: z.string().optional()
});

export const generateImagePromptFlow = ai.defineFlow({
  name: 'generateImagePrompt',
  inputSchema: generateImagePromptInputSchema,
  outputSchema: z.string(),
}, async (input: any) => {
  const { keywords = '', contextHint = '', courseTitle = '', channel = 'video' } = input;

  const isHorizontal = channel === 'landing' || channel === 'thumbnails';
  const formatContext = channel === 'thumbnails'
    ? "This image is the main Hero Cover Thumbnail for a Course in a catalog (aspect ratio 16:9). It must be visually magnetic, evocative, and tailored to the exact niche of the course."
    : isHorizontal
      ? "This image is for a Web Sales Landing Page section (aspect ratio 16:9 or 4:3). It should be an evocative, high-converting visual."
      : "This image is for a Social Media Video (TikTok/Reel) background (aspect ratio 9:16).";

  const prompt = `
    You are an expert art director and visual storyteller.
    Your task is to create a HIGH-QUALITY image generation prompt in ENGLISH.

    ${formatContext}

    PRIORITY ORDER FOR THE IMAGE CONCEPT:
    1. FIRST PRIORITY — Subject matter & authentic aesthetic:
       - Course Title: "${courseTitle || keywords || 'Online course'}"
       - Match the visual aesthetic, atmosphere, lighting, and environment to the TRUE nature of the subject:
         * If holistic, spiritual, wellness, psychology, or personal growth: warm, organic, sensory, natural textures, serene or soulful mood, golden hour or soft natural light. NEVER use sterile corporate offices or suits.
         * If technology, engineering, coding, or electronics: authentic hardware, glowing circuits, modern lab or maker setup, crisp cinematic lighting.
         * If arts, crafts, gastronomy, or practical trades: hands-on action, rich tactile materials, artisan workshop, close-up detail.
         * If business, marketing, or leadership: editorial contemporary portrait or dynamic creative studio, avoiding generic stock-photo clichés.
    
    2. SECOND PRIORITY — Description, script, or emotional context:
       - Context / Script: "${keywords || 'N/A'}"
       - Additional Hint: "${contextHint || 'N/A'}"

    STRICT RULES:
    1. Write ONLY the final English prompt. No greetings, no explanations, no quotation marks.
    2. DO NOT default to corporate office scenes, business suits, or generic boardrooms unless the topic is strictly corporate finance.
    3. Include specific details on subject, environment, lighting, color palette, and camera framing (e.g. shallow depth of field, editorial photography).
    4. ABSOLUTELY NO text, no words, no letters, no typography, no watermarks in the image.
    5. Keep it under 55 words.

    Generate the prompt now:
  `;

  const { text } = await ai.generate(
    { 
      prompt,
      context: { uid: input.uid, role: input.role }
    } as any,
    'generate_image_prompt',
    input.uid
  );

  return text.trim();
});
