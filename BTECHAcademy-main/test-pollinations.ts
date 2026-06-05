async function test() {
  const prompt = "High quality marketing photo for an online course about business, professional. Context: Imagen 1. Photorealistic, clean background, professional lighting, 4:3 aspect ratio. No text overlays.";
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&seed=123&nologo=true`;
  
  try {
    const res = await fetch(url);
    console.log(res.status, res.statusText);
    if (!res.ok) {
        console.log("Body:", await res.text());
    } else {
        console.log("OK, Got image.");
    }
  } catch(e) {
    console.log("Error:", e);
  }
}
test();
