import { adminDb } from '../src/firebase/admin';

async function checkId() {
  const id = 'i9qq8v4hn8';
  let found = false;

  const sp = await adminDb.collection('salesPages').doc(id).get();
  if (sp.exists) {
    console.log(`Encontrado en salesPages:`, sp.data()?.title);
    found = true;
  }

  const cmp = await adminDb.collection('campaigns').doc(id).get();
  if (cmp.exists) {
    console.log(`Encontrado en campaigns:`, cmp.data()?.name);
    found = true;
  }

  const crs = await adminDb.collection('courses').doc(id).get();
  if (crs.exists) {
    console.log(`Encontrado en courses:`, crs.data()?.title);
    found = true;
  }

  if (!found) {
    console.log(`EL ID ${id} NO EXISTE EN LA BASE DE DATOS.`);
  }
}

checkId();
