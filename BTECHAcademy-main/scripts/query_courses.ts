import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  const courseIds = ['EZLyNzBp0FPm9HLIUPO8', '7Y8OXhmqptHU4IIGz7Eg', 'DDi9uCZiYSwP3OZyhOTp'];
  
  for (const id of courseIds) {
    const snap = await db.collection('courses').doc(id).get();
    if (snap.exists) {
      console.log(`Course ${id} exists:`, snap.data()?.title);
    } else {
      console.log(`Course ${id} DOES NOT EXIST`);
    }
  }
}

main().catch(console.error);
