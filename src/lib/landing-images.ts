export interface SectionForImage {
  id: string;
  baseType: string;
  title?: string;
  content?: string;
  bullets?: string[];
}

export interface ImageGenerationContext {
  styleName: string;
  styleDescription: string;
  palette: { primary: string; accent: string; secondary: string };
  courseTitle: string;
}

function hexToDescriptive(hex: string): string {
  const map: Record<string, string> = {
    '3B2D86': 'deep purple',
    'FACC15': 'gold',
    'F8FAFC': 'off-white',
    '1E40AF': 'royal blue',
    'F59E0B': 'amber',
    '000000': 'black',
    'FFFFFF': 'white',
    'D4AF37': 'metallic gold',
    'C0C0C0': 'silver',
    '4A0E17': 'wine red',
    'FFFDD0': 'cream',
    '8B9A46': 'olive green',
    '0F2C59': 'navy blue',
  };
  const upper = hex.replace('#', '').toUpperCase();
  return map[upper] || hex;
}

function getSectionVisualPrompt(baseType: string): string {
  const prompts: Record<string, string> = {
    narrativeSections: 'Wide horizontal composition. A workspace, learning environment, or creative professional scene that embodies the content below.',
    mentorProfile: 'Vertical portrait-oriented composition. A professional study, mentorship, or teaching environment that represents authority and expertise.',
    testimonials: 'Community or success-focused scene. Group of diverse professionals, graduation, achievement, or testimonial wall representation.',
    bonuses: 'Premium gift or added-value visual. Exclusive supplement, bonus material, or unexpected reward presented in an elegant way.',
    countdownTimer: 'Urgency and opportunity. Limited-time, exclusive access, or time-sensitive visual that conveys scarcity.',
    syllabus: 'Educational structure. Course materials, curriculum, modules, or organized learning path visualization.',
    benefits: 'Transformation and results. Before/after, growth, improvement, or positive outcome representation.',
    heroVideo: 'Hero landing image. Bold, attention-grabbing professional visual that sets the tone for the entire page.',
  };
  return prompts[baseType] || 'Professional business or educational environment reflecting the content.';
}

function getStyleVibe(styleName: string): string {
  const vibes: Record<string, string> = {
    classic: 'Warm, emotional storytelling, human-centered, natural lighting, approachable.',
    dharma: 'Elite luxury, sophisticated, minimalist, exclusive, dark and moody with elegant accents.',
  };
  return vibes[styleName.toLowerCase()] || 'Professional, modern, clean, high-quality.';
}

export function buildSectionPrompt(section: SectionForImage, ctx: ImageGenerationContext): string {
  const parts: string[] = [];

  parts.push(`Create a professional marketing image for the online course "${ctx.courseTitle}".`);
  parts.push(`\nSection type: ${section.baseType}.`);

  if (section.title) parts.push(`\nSection headline: "${section.title}"`);
  if (section.content) parts.push(`\nSection content: "${section.content}"`);

  if (section.bullets && section.bullets.length > 0) {
    const top = section.bullets.slice(0, 4).join(' · ');
    parts.push(`\nKey concepts illustrated: ${top}.`);
  }

  const visualDir = getSectionVisualPrompt(section.baseType);
  parts.push(`\n\nComposition: ${visualDir}`);

  const vibe = getStyleVibe(ctx.styleName);
  parts.push(`\nVisual style: ${vibe} ${ctx.styleDescription}`);

  const primaryDesc = hexToDescriptive(ctx.palette.primary);
  const accentDesc = hexToDescriptive(ctx.palette.accent);
  parts.push(`\nBrand colors: primary=${primaryDesc} (${ctx.palette.primary}), accent=${accentDesc} (${ctx.palette.accent}). Subtly incorporate these tones into the image.`);

  parts.push(`\nTechnical: Photorealistic, professional photography, cinematic lighting, shallow depth of field, premium quality. ABSOLUTELY NO text, no words, no letters, no watermarks, no logos.`);

  return parts.join('');
}

export function buildContextHint(section: SectionForImage, ctx: ImageGenerationContext): string {
  return `Section: ${section.baseType}. Style: ${ctx.styleName} — ${ctx.styleDescription}. Brand palette: primary=${ctx.palette.primary}, accent=${ctx.palette.accent}. Visual mood: ${getStyleVibe(ctx.styleName)}`;
}

export function getSectionsNeedingImages(
  sections: any[],
  styleData: any
): SectionForImage[] {
  return sections.filter((sec: any) => {
    if (sec.imageUrl) return false;
    const baseId = sec.id.split('_')[0];
    const styleSec = styleData?.availableSections?.find((s: any) => s.id === baseId);
    const ct = styleSec?.contentType;
    if (ct === 'mixed' || ct === 'image') return true;
    return false;
  }).map((sec: any) => ({
    id: sec.id,
    baseType: sec.id.split('_')[0],
    title: sec.title,
    content: sec.content,
    bullets: sec.bullets,
  }));
}
