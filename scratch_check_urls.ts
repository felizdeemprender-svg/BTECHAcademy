import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function checkCampaigns() {
  const doc = await db.collection('campaigns').doc('hzp7xd8ohi5').get();
  const data = doc.data() as any;
  if (data.videoSkeletons) {
    data.videoSkeletons.forEach((v: any, i: number) => {
      console.log(`Video ${i+1}:`);
      console.log(`- video_url: ${v.production_notes?.video_url}`);
    });
  }
}

checkCampaigns().catch(console.error);
