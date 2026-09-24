import { extractDocumentText } from '../src/ai/flows/extract-document-text-flow';

async function verifyLecturaProfunda() {
  console.log('🚀 Iniciando Prueba de Lectura Profunda...\n');

  // 1. Prueba con TXT
  console.log('📄 1. Probando archivo TXT (manua_Ecas_CM.txt)');
  const txtContent = 'Este es el contenido de prueba del Documento Maestro para entrenar a la IA. Tema: Estrategias de Comercialización (CM).';
  const txtBase64 = Buffer.from(txtContent).toString('base64');
  const txtDataUri = `data:text/plain;base64,${txtBase64}`;

  try {
    const txtResult = await extractDocumentText({
      documentName: 'manua_Ecas_CM.txt',
      documentDataUri: txtDataUri
    });
    
    if (txtResult.error) {
      console.error('❌ Error en TXT:', txtResult.error);
    } else {
      console.log('✅ Éxito en TXT. Texto extraído:');
      console.log(txtResult.extractedText?.substring(0, 150) + '...\n');
    }
  } catch (error) {
    console.error('❌ Excepción atrapada en TXT:', error);
  }

  // 2. Prueba con PDF básico (PDF mínimo válido)
  console.log('📑 2. Probando archivo PDF (manua_Ecas_CM.pdf)');
  
  // Minimal valid PDF structure with 'Hello World'
  const minimalPdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL1R5cGUgL0ZvbnQKICAvU3VidHlwZSAvVHlwZTUKICAvQmFzZUZvbnQgL1RpbWVzLVJvbWFuCj4+CmVuZG9iagoKNSAwIG9iago8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDE2NyAwMDAwMCBuIAowMDAwMDAwMjg3IDAwMDAwIG4gCjAwMDAwMDAzNzYgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDY5CiUlRU9GCg==";
  
  const pdfDataUri = `data:application/pdf;base64,${minimalPdfBase64}`;

  try {
    const pdfResult = await extractDocumentText({
      documentName: 'manua_Ecas_CM.pdf',
      documentDataUri: pdfDataUri
    });
    
    if (pdfResult.error) {
      console.error('❌ Error en PDF:', pdfResult.error);
    } else {
      console.log('✅ Éxito en PDF. Texto extraído:');
      console.log(pdfResult.extractedText?.substring(0, 150) + '...\n');
    }
  } catch (error) {
    console.error('❌ Excepción atrapada en PDF:', error);
  }

  console.log('🏁 Prueba de Lectura Profunda finalizada.');
  process.exit(0);
}

verifyLecturaProfunda();
