import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  const uid = 'uVkvMvMAuqZzmkDaFzVkzjFW4iD2'; // tutor.felizdeemprender@gmail.com
  const userRef = db.collection('users').doc(uid);
  
  await userRef.update({
    roles: require('firebase-admin').firestore.FieldValue.arrayUnion('admin')
  });
  
  console.log('Added admin role to tutor.felizdeemprender@gmail.com');
}

main().catch(console.error);
