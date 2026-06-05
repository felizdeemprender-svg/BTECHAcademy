import { adminDb } from './src/firebase/admin';

async function checkSalesPages() {
  const ids = ['2AAEy29PWe0AaEdSZeZB', 'A1xGilngHRZBLzMVXAd9'];
  const snap = await adminDb.collection('salesPages').where('isActive', '==', true).get();
  
  console.log(`Total active sales pages: ${snap.size}`);
  const salesPages = snap.docs.map(d => d.data());
  
  for (const id of ids) {
    const sp = salesPages.find(s => s.courseId === id);
    if (sp) {
      console.log(`✅ Course ${id} has a sales page: ${sp.title}`);
    } else {
      console.log(`❌ Course ${id} DOES NOT have an active sales page.`);
    }
  }
}

checkSalesPages().catch(console.error);
