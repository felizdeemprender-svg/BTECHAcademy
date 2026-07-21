const { getAdminFirestore } = require('./src/firebase/admin');
const db = getAdminFirestore();

async function main() {
  const pagesSnap = await db.collection('salesPages').where('landingType', 'in', ['promocion', 'embajador']).get();
  let count = 0;
  for (const doc of pagesSnap.docs) {
    const data = doc.data();
    if (data.referidoId && !data.referidoName) {
      console.log(`Fixing landing ${doc.id} with referidoId ${data.referidoId}`);
      
      // Intentar obtener de users
      let name = null;
      const userDoc = await db.collection('users').doc(data.referidoId).get();
      if (userDoc.exists) {
        name = userDoc.data().displayName || userDoc.data().email || userDoc.data().name;
      }
      
      // Intentar extraer del título si es " - Promo <Nombre>"
      if (!name && data.title && data.title.includes(' - Promo ')) {
        name = data.title.split(' - Promo ')[1];
      }

      if (name) {
        await doc.ref.update({ referidoName: name });
        console.log(`Updated ${doc.id} with referidoName = ${name}`);
        count++;
      } else {
        console.log(`No name found for ${doc.id}`);
      }
    }
  }
  console.log(`Fixed ${count} landings.`);
}
main().catch(console.error).finally(() => process.exit(0));
