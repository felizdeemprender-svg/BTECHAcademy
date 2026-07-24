import { getAdminFirestore } from '../src/firebase/admin';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const db = getAdminFirestore();
  
  // Read the mock file we generated
  const mockFilePath = path.join(__dirname, '..', '..', '..', 'Users', 'Admin', '.gemini', 'antigravity-ide', 'brain', 'b30ea002-9f17-4af2-b26b-6599658a4630', 'scratch', 'mock-atomic-generation.json');
  console.log('Reading:', mockFilePath);
  
  const fileContent = fs.readFileSync(mockFilePath, 'utf-8');
  const result = JSON.parse(fileContent);
  
  // Format the document according to what use-ai-generation.ts does
  const newCollection = {
    name: "Demo: FastoriaAcademy y sus ventajas",
    directives: "Generar demo estilo classic sobre ventajas de FastoriaAcademy",
    ownerId: "W7oR0f2q39bU0Ff10w4yv9FmZ6D3", // Default ID
    assets: result,
    designTokens: null,
    styleId: "classic",
    isDemo: true, // Special flag to hide from catalog
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docId = "demo-classic-style";
  const collectionRef = db.collection('templateCollections').doc(docId);
  
  await collectionRef.set(newCollection);
  
  console.log(`✅ Demo landing injected with ID: ${docId}`);
  console.log(`Links reales:`);
  console.log(`- Variante Mínima: http://localhost:9002/v/${docId}?v=0`);
  console.log(`- Variante Equilibrada: http://localhost:9002/v/${docId}?v=1`);
  console.log(`- Variante Detallada: http://localhost:9002/v/${docId}?v=2`);
}

main().catch(console.error);
