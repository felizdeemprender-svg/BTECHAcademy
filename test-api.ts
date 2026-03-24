import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Responde solo con la palabra: HOLA" }] }] })
    });
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Raw API Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testGemini();
