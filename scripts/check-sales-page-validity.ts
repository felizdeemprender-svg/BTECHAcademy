import { adminDb } from '../src/firebase/admin';
import { isSalesPageDateValid } from '../src/domain/catalog/promo-window';

async function checkSalesPage() {
  try {
    const s = await adminDb.collection('salesPages').doc('ul332lsa6xo').get();
    const data = s.data();
    console.log('ID:', s.id);
    console.log('courseId:', data?.courseId);
    console.log('isActive:', data?.isActive);
    console.log('referidoId:', data?.referidoId);
    console.log('landingType:', data?.landingType);
    console.log('activeFrom:', data?.activeFrom);
    console.log('activeUntil:', data?.activeUntil);
    console.log('isSalesPageDateValid:', isSalesPageDateValid(
      data?.landingType,
      data?.activeFrom,
      data?.activeUntil,
      new Date(),
      true // allowUndefined
    ));

    const s2 = await adminDb.collection('salesPages').doc('mlapxf4zsth').get();
    const data2 = s2.data();
    console.log('\nID:', s2.id);
    console.log('courseId:', data2?.courseId);
    console.log('isActive:', data2?.isActive);
    console.log('referidoId:', data2?.referidoId);
    console.log('landingType:', data2?.landingType);
    console.log('activeFrom:', data2?.activeFrom);
    console.log('activeUntil:', data2?.activeUntil);
    console.log('isSalesPageDateValid:', isSalesPageDateValid(
      data2?.landingType,
      data2?.activeFrom,
      data2?.activeUntil,
      new Date(),
      true
    ));

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkSalesPage();
