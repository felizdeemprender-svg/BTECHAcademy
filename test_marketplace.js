const { adminDb } = require('./src/firebase/admin');

async function test() {
  try {
    const categories = await adminDb.collection('categories').orderBy('name', 'asc').get();
    console.log("Categories OK", categories.docs.length);
  } catch (e) {
    console.error("Categories Error:", e);
  }

  try {
    const levels = await adminDb.collection('levels').orderBy('order', 'asc').get();
    console.log("Levels OK", levels.docs.length);
  } catch (e) {
    console.error("Levels Error:", e);
  }
}

test();
