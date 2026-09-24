import { adminDb } from './src/firebase/admin';

async function run() {
  const snapshot = await adminDb.collection('salesPages').limit(1).get();
  if (snapshot.empty) {
    console.log("No sales pages found");
    return;
  }
  console.log("Found ID:", snapshot.docs[0].id);
  process.exit(0);
}

run().catch(console.error);
