import { adminDb } from '../src/firebase/admin';

async function checkProducts() {
  try {
    const courses = await adminDb.collection('courses').get();
    console.log('--- COURSES ---');
    courses.forEach(c => console.log(c.id, c.data().title));
    
    const followups = await adminDb.collection('followups').get();
    console.log('--- FOLLOWUPS ---');
    followups.forEach(f => console.log(f.id, f.data().title));

    const sales = await adminDb.collection('salesPages').get();
    console.log('--- SALES PAGES ---');
    sales.forEach(s => console.log(s.id, s.data().title, s.data().courseId, s.data().productId, s.data().productType));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkProducts();
