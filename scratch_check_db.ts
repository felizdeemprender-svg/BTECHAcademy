import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function check() {
  const campaignsSnap = await db.collection('campaigns').get();
  console.log('--- Campaigns ---');
  campaignsSnap.forEach(doc => {
    console.log(doc.id, doc.data().name || doc.data().title);
  });

  const salesPagesSnap = await db.collection('salesPages').get();
  console.log('\n--- Sales Pages ---');
  salesPagesSnap.forEach(doc => {
    console.log(doc.id, doc.data().title, doc.data().type);
  });
}

check().catch(console.error);
