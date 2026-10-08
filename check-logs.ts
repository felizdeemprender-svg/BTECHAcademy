import { getAdminApp, getAdminFirestore } from './src/firebase/admin';
import { getAuth } from 'firebase-admin/auth';

async function run() {
  const admin = await getAdminApp();
  const db = getAdminFirestore();
  const auth = getAuth(admin);

  console.log('Fetching user supervisor.felizdeemprender@gmail.com...');
  try {
    const userRecord = await auth.getUserByEmail('supervisor.felizdeemprender@gmail.com');
    const uid = userRecord.uid;

    const snapshot = await db.collection('campaigns').where('mentorId', '==', uid).get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`\nCampaign ID: ${doc.id}`);
      console.log(`Title: ${data.title}`);
      console.log(`Execution Logs Count: ${data.executionLogs?.length || 0}`);
      if (data.executionLogs && data.executionLogs.length > 0) {
        data.executionLogs.forEach((log: any, idx: number) => {
          console.log(`\n  Log #${idx + 1}:`);
          console.log(`  - Status: ${log.status}`);
          console.log(`  - Platform: ${log.platform}`);
          console.log(`  - Video Name: ${log.videoName}`);
          console.log(`  - Time: ${log.time}`);
          console.log(`  - Feedback: ${log.feedback}`);
        });
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
