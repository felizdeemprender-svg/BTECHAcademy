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
  console.log(`Campaign: ${doc.id}`);
  if (data.executionLogs && data.executionLogs.length > 0) {
    console.log(`- executionLogs:`);
    console.log(JSON.stringify(data.executionLogs, null, 2));
  } else {
    console.log(`- executionLogs: not found or empty!`);
  }
}

checkCampaigns().catch(console.error);
