import { ai } from '../genkit';
import { z } from 'genkit';
import fs from 'fs/promises';
import path from 'path';

export interface PlanCampaignSocialsParams {
  socials: any[];
  courseTitle: string;
  targetAudience: string;
  campaignMission: string;
  uid: string;
  role: string;
}

async function getAvailableAdns() {
  try {
    let adnsDir = path.join(process.cwd(), 'public', 'adns');
    try {
      await fs.access(adnsDir);
    } catch {
      adnsDir = path.join(process.cwd(), '..', '..', 'public', 'adns');
    }
    const files = await fs.readdir(adnsDir, { withFileTypes: true });
    const adns = [];
    for (const dirent of files) {
      if (dirent.isDirectory()) {
        try {
          const manifest = JSON.parse(await fs.readFile(path.join(adnsDir, dirent.name, 'manifest.json'), 'utf-8'));
          adns.push({ id: dirent.name, name: manifest.name, description: manifest.description || '' });
        } catch {}
      } else if (dirent.name.endsWith('.json')) {
        try {
          const content = JSON.parse(await fs.readFile(path.join(adnsDir, dirent.name), 'utf-8'));
          adns.push({ id: dirent.name.replace('.json', ''), name: content.name, description: content.description || '' });
        } catch {}
      }
    }
    return adns;
  } catch (err) {
    console.error('Error loading ADNs in planCampaignSocials:', err);
    return [
      { id: '01_CINEMA', name: 'Cinema / Visual', description: 'Alta estética, cortes lentos, cinemático.' },
      { id: '03_CORPORAT', name: 'Corporate', description: 'Serio, limpio, ideal para LinkedIn.' },
      { id: '06_FASTCUT', name: 'Fast Cut', description: 'Cortes rápidos, retención alta, ideal para TikTok.' }
    ];
  }
}

const SocialPlanSchema = z.object({
  socials: z.array(z.object({
    marketingName: z.string().describe('Nombre interno de la pieza'),
    adnId: z.string().describe('El ID del ADN seleccionado de la lista provista.'),
    voice_id: z.enum(['mateo', 'silvia', 'pablo', 'camila']).describe('ID de la voz elegida.'),
    music_vibe: z.string().describe('Estilo de música de fondo (ej: corporate_1, epic_2, lofi_chill).'),
    designTokens: z.object({
      primary: z.string().describe('Color primario en HEX (ej: #FF0000)'),
      accent: z.string().describe('Color de acento en HEX'),
      surface: z.string().describe('Color de superficie/fondo en HEX'),
      text: z.string().describe('Color de texto en HEX')
    })
  }))
});

export async function planCampaignSocials({ socials, courseTitle, targetAudience, campaignMission, uid, role }: PlanCampaignSocialsParams) {
  if (!socials || socials.length === 0) return socials;

  const adnsList = await getAvailableAdns();
  const adnsContext = adnsList.map(a => `- ${a.id}: ${a.name} (${a.description})`).join('\n');

  const prompt = `Actúa como Director de Marketing de una campaña digital.
Tienes una lista de videos y carruseles a producir para distintas plataformas. Tu tarea es ASIGNAR el mejor estilo visual (ADN), voz, música, colores y nombre interno para cada pieza, garantizando que el contenido se adapte a las reglas de cada red social.

== CONTEXTO DE LA CAMPAÑA ==
Producto: ${courseTitle}
Audiencia: ${targetAudience}
Objetivo/Estrategia: ${campaignMission}

== ADNs DISPONIBLES (ESTILOS VISUALES) ==
Debes elegir estrictamente uno de los siguientes IDs de ADN para cada pieza:
${adnsContext}

== REGLAS POR PLATAFORMA ==
- TIKTOK: Estilos dinámicos (Fast Cut), retención alta, voces enérgicas (ej: mateo o pablo), música intensa (ej: phonk, hype), colores vibrantes.
- LINKEDIN: Estilos corporativos, serios, voces formales (ej: silvia o camila), música profesional (ej: corporate_1, ambient), colores oscuros/azules.
- INSTAGRAM / YOUTUBE: Estilos cinemáticos, minimalistas, voces cálidas, música lofi_chill o epic.

== TAREAS ==
Para la siguiente lista de piezas, genera la respuesta en JSON asignando adnId, voz, música, colores, y un nombre descriptivo. Respeta el mismo orden.

Lista de piezas a planificar:
${socials.map((s, i) => `${i + 1}. Plataforma: ${s.platform} | Tipo: ${s.type}`).join('\n')}
`;

  try {
    const { output } = await ai.generate(
      {
        prompt,
        output: { schema: SocialPlanSchema }
      },
      'plan_campaign_socials',
      uid
    );

    if (output && output.socials && output.socials.length === socials.length) {
      return socials.map((social, i) => {
        const plan = output.socials[i];
        return {
          ...social,
          marketingName: plan.marketingName || social.marketingName,
          designTokens: plan.designTokens || social.designTokens,
          production_notes: {
            ...(social.production_notes || {}),
            adnId: plan.adnId || social.production_notes?.adnId || '01_CINEMA',
            voice_id: plan.voice_id || social.production_notes?.voice_id || 'mateo',
            music_url: `/audio/music/${plan.music_vibe || 'corporate_1'}.mp3`,
            music_vibe: plan.music_vibe || 'corporate_1'
          }
        };
      });
    }
    return socials;
  } catch (err) {
    console.error('Error in planCampaignSocials:', err);
    return socials;
  }
}
