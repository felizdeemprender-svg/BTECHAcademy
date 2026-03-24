import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { firebaseConfig } from './src/firebase/config';
import { checkAiHealth } from './src/ai/flows/check-ai-health';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Testing Firebase...");
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, 'default');
    const q = query(collection(db, "_test_connection_"), limit(1));
    // Provide a timeout for Firestore just in case it hangs
    await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 5s")), 5000))
    ]);
    console.log("Firebase connection OK (Firestore read attempted).");
  } catch (e: any) {
    if (e.message.includes('Missing or insufficient permissions')) {
      console.log("Firebase connection OK (Firestore reachable, permission denied as expected).");
    } else {
      console.error("Firebase error:", e.message);
    }
  }

  console.log("\nTesting AI...");
  try {
    const res = await checkAiHealth();
    console.log("AI Result:", res);
  } catch (e: any) {
    console.error("AI Error:", e.message);
  }
  process.exit(0);
}

run();
