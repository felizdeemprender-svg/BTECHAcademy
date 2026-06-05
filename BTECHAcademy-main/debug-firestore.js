const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function test() {
  const coursesSnap = await db.collection('courses').get();
  console.log('Total courses in DB:', coursesSnap.size);
  coursesSnap.forEach(d => console.log('Course:', d.id, d.data().title, 'Tutor:', d.data().tutorId));
  const enrollsSnap = await db.collection('enrollments').get();
  console.log('Total enrollments in DB:', enrollsSnap.size);
  enrollsSnap.forEach(d => console.log('Enrollment:', d.id, 'Course:', d.data().courseId, 'Student:', d.data().studentId, 'Tutor:', d.data().tutorId));
}
test().catch(console.error);
