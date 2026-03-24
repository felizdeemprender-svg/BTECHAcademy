async function testLexica() {
    const prompt = "professional marketing photo online course business";
    const res = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
    const data = await res.json();
    console.log("Lexica images found:", data.images?.length);
    if(data.images?.length > 0) {
        console.log("First image URL:", data.images[0].src);
    }
}
testLexica();
