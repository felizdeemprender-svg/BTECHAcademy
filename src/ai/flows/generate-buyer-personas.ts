'use server';

import { ai } from '../genkit';
import { z } from 'zod';

const GeneratePersonasInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
});

const BuyerPersonaSchema = z.object({
  id: z.string(),
  label: z.string().describe("Título corto del perfil, ej: 'El Freelancer Exhausto'"),
  desc: z.string().describe("Descripción del enfoque estratégico, dolores y deseos de este perfil."),
});

const PersonasOutputSchema = z.object({
  personas: z.array(BuyerPersonaSchema).length(6).describe("Exactamente 6 perfiles de comprador ideal."),
});

export type GeneratePersonasInput = z.infer<typeof GeneratePersonasInputSchema>;
export type GeneratePersonasOutput = z.infer<typeof PersonasOutputSchema>;

export async function generateBuyerPersonas(input: GeneratePersonasInput): Promise<GeneratePersonasOutput> {
  try {
    return await generateBuyerPersonasFlow(input);
  } catch (e: any) {
    console.error("[Flow: GenerateBuyerPersonas] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico al generar Buyer Personas.");
  }
}

const generateBuyerPersonasFlow = ai.defineFlow(
  {
    name: 'generateBuyerPersonasFlow',
    inputSchema: GeneratePersonasInputSchema,
    outputSchema: PersonasOutputSchema,
  },
  async (input) => {
    const promptText = `Actúa como un Experto en Marketing de Respuesta Directa y Analista de Comportamiento del Consumidor.
Tu tarea es definir EXACTAMENTE 6 Buyer Personas (Perfiles de Comprador Ideal) estratégicamente distintos para el siguiente infoproducto:

- Título del Curso: "${input.courseTitle}"
- Descripción: "${input.courseDescription}"

REGLAS:
1. Crea 6 perfiles variados. Algunos pueden estar enfocados en el dolor actual, otros en la aspiración, otros en un nicho profesional específico.
2. Cada "label" debe ser corto, impactante y fácil de identificar (ej: 'El Profesional Estancado', 'El Dueño de Agencia').
3. Cada "desc" debe resumir en una o dos frases breves los dolores principales, el nivel de conocimiento y el beneficio clave que buscan.
4. Devuelve el JSON con la estructura solicitada.
`;

    const { output } = await ai.generate({
      prompt: promptText,
      output: { format: 'json', schema: PersonasOutputSchema }
    });

    if (!output) {
      throw new Error("El modelo no devolvió ningún output para Buyer Personas.");
    }

    return output;
  }
);
