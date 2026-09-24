import { adminDb } from '../src/firebase/admin';

async function checkRecord() {
  try {
    const s = await adminDb.collection('salesPages').doc('n18brfdilm').get();
    console.log(s.data());
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkRecord();
