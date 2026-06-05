import { generateTemplateCollection } from './src/ai/flows/generate-template-collection';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log("Iniciando generación intensiva de prueba (TODOS los canales)...");
    const result = await generateTemplateCollection({
      directives: "Campaña de lanzamiento agresiva para el Black Friday de mi academia de ventas B2B.",
      mentorName: "Mentor VIP",
      enabledChannels: { landings: true, emails: true, socials: true, ads: true },
      platforms: { twitter: true, instagram: true, tiktok: true, linkedin: true }
    });
    console.log("ÉXITO!");
  } catch (error: any) {
    console.error("EXPECTED ERROR CAUGHT:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  }
  process.exit(0);
}
run();
