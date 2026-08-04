import { adminDb } from '../src/firebase/admin';
import { LANDING_STYLES } from '../src/lib/landing-styles';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function seedStyles() {
  console.log('🚀 Sincronizando estilos de landing a Firestore...');

  const batch = adminDb.batch();
  const stylesRef = adminDb.collection('landingStyles');

  let count = 0;
  for (const style of LANDING_STYLES) {
    const baseExtra = (style.tokens as any)?.extraTokens || {};
    const enrichedBrands = (style.brands || []).map((b: any) => ({
      ...b,
      tokens: {
        ...(b.tokens || {}),
        // Pack cerrado: cada brand lleva su propio extraTokens (clon del base) para que el
        // renderer nunca caiga en un genérico; los brands que no los declaren heredan el base.
        extraTokens: b.tokens?.extraTokens || baseExtra,
      },
    }));
    const docRef = stylesRef.doc(style.id);
    batch.set(docRef, {
      ...style,
      brands: enrichedBrands,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    count++;
    console.log(`  • ${style.id} (${style.name}) — ${style.availableSections?.length || 0} secciones`);
  }

  await batch.commit();

  console.log(`✅ Seeded ${count} styles into Firestore landingStyles collection.`);
}

seedStyles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error seeding styles:', err);
    process.exit(1);
  });
