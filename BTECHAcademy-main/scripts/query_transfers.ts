import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  const snap = await db.collection('transferOrders').get();
  console.log(`Total orders: ${snap.size}`);
  snap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

main().catch(console.error);
