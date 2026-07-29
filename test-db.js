const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function test() {
  const snapshot = await db.collection('landingStyles').get();
  console.log(`Found ${snapshot.size} styles`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().name);
  });
}

test().catch(console.error);
