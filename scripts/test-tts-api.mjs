import fs from 'fs';
import https from 'https';

const apiKey = "AIzaSyB4t3jjK0ZdydDWjjwxdKMrYkelyLAtp-o"; // La clave actual en tu .env

const postData = JSON.stringify({
  input: { text: "Prueba técnica" },
  voice: { languageCode: "es-ES", name: "es-ES-Neural2-A", ssmlGender: "FEMALE" },
  audioConfig: { audioEncoding: "MP3" }
});

const options = {
  hostname: 'texttospeech.googleapis.com',
  path: `/v1/text:synthesize?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`ERROR DE RED: ${e.message}`);
});

req.write(postData);
req.end();
