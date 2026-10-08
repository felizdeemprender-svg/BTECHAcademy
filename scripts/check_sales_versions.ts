import { adminDb } from '../src/firebase/admin';

async function main() {
  console.log('Fetching salesPages from production database...\n');
  const snapshot = await adminDb.collection('salesPages').get();
  
  const v1Pages = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.content || !data.content.sections) {
      v1Pages.push({ id: doc.id, ...data });
    }
  }

  console.log(`Encontradas ${v1Pages.length} landings en V1:`);
  
  for (const page of v1Pages) {
    const title = (page as any).courseTitle || (page as any).title || 'Sin Título';
    const mentorId = (page as any).mentorId;
    let mentorName = 'Desconocido';
    
    if (mentorId) {
      const userDoc = await adminDb.collection('users').doc(mentorId).get();
      if (userDoc.exists) {
        mentorName = userDoc.data()?.displayName || userDoc.data()?.email || mentorId;
      } else {
        mentorName = `Usuario no encontrado (${mentorId})`;
      }
    }
    
    console.log(`- "${title}" (ID: ${page.id}) -> Creada por: ${mentorName}`);
  }
}

main().catch(console.error);
