import { adminDb } from '../src/firebase/admin';

async function main() {
  const camp = await adminDb.collection('campaigns').doc('nu6tigwwklj').get();
  const cData = camp.data();
  console.log('Campaign:');
  console.log(`isActive: ${cData?.isActive}`);
  console.log(`autoPilot: ${cData?.autoPilot}`);
  console.log(`progress:`, cData?.progress);
  
  if (cData?.salesPageId) {
    const sp = await adminDb.collection('salesPages').doc(cData.salesPageId).get();
    const spData = sp.data();
    if (spData?.aiContent?.socials) {
       console.log(`\nFound ${spData.aiContent.socials.length} socials in salesPage ${cData.salesPageId}`);
       spData.aiContent.socials.forEach((s: any, i: number) => {
         console.log(` [${i}] ${s.platform} | isLocked: ${s.production_notes?.isLocked}`);
       });
    } else {
       console.log('No aiContent.socials found in salesPage');
    }
  }
}

main().catch(console.error);
