import { getAdminFirestore } from '../src/firebase/admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

const db = getAdminFirestore();

const CATEGORIES = [
  { name: 'Negocios y Emprendimiento', description: 'Creación de empresas, estrategia, gestión y liderazgo.' },
  { name: 'Marketing y Ventas', description: 'Marketing digital, redes sociales, ventas y publicidad.' },
  { name: 'Tecnología y Programación', description: 'Desarrollo web, software, IA y ciencia de datos.' },
  { name: 'Desarrollo Personal', description: 'Mindset, productividad, coaching y habilidades blandas.' },
  { name: 'Diseño y Creatividad', description: 'Diseño gráfico, UX/UI, fotografía y artes creativas.' },
  { name: 'Finanzas e Inversión', description: 'Finanzas personales, trading, cripto e inversiones.' },
  { name: 'Salud y Bienestar', description: 'Fitness, nutrición, salud mental y estilo de vida.' },
  { name: 'Idiomas', description: 'Aprendizaje de lenguas extranjeras y comunicación.' },
  { name: 'Educación', description: 'Pedagogía, formación de formadores y academia.' },
  { name: 'Habilidades Profesionales', description: 'Oratoria, redacción, office y herramientas corporativas.' }
];

const LEVELS = [
  { name: 'Principiante', description: 'Ideal para quienes comienzan desde cero sin conocimientos previos.', order: 0 },
  { name: 'Intermedio', description: 'Para quienes ya tienen bases y quieren profundizar sus habilidades.', order: 1 },
  { name: 'Avanzado', description: 'Nivel técnico profundo para usuarios con experiencia sólida.', order: 2 },
  { name: 'Experto', description: 'Especializaciones de alto nivel y maestría profesional.', order: 3 }
];

async function seed() {
  console.log('🚀 Iniciando carga de datos iniciales...');

  // 1. Cargar Categorías
  console.log('\n📦 Cargando categorías...');
  for (const cat of CATEGORIES) {
    const id = cat.name.toLowerCase().replace(/\s+/g, '-');
    await db.collection('categories').doc(id).set({
      ...cat,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    console.log(` ✅ Categoría: ${cat.name}`);
  }

  // 2. Cargar Niveles
  console.log('\n🏆 Cargando niveles...');
  for (const level of LEVELS) {
    const id = level.name.toLowerCase().replace(/\s+/g, '-');
    await db.collection('levels').doc(id).set({
      ...level,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    console.log(` ✅ Nivel: ${level.name}`);
  }

  console.log('\n✨ Proceso de carga completado con éxito.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error durante la carga:', err);
  process.exit(1);
});
