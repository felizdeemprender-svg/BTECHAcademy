const fs = require('fs');
const file = 'src/app/api/video/render/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Find and replace the finalFilters block using line-based approach
const lines = content.split('\n');
let startLine = -1, endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('FIX CRASH WINDOWS') || lines[i].includes('rgb24 como pivote')) {
    startLine = i;
  }
  if (startLine >= 0 && lines[i].includes("], `plate_${i}`);") && i > startLine) {
    endLine = i;
    break;
  }
}

console.log('Found block at lines:', startLine, '-', endLine);

if (startLine < 0 || endLine < 0) {
  console.error('Could not find block');
  process.exit(1);
}

const newLines = [
  "      // FIX DEFINITIVO: setrange=limited cambia metadata yuvj420p->yuv420p SIN invocar swscaler.",
  "      // format=rgb24 y format=yuv420p ambos usan swscaler y crashean con yuvj420p en Windows.",
  "      const finalFilters = [",
  "        'setrange=limited', // Cambia metadata color range. NO usa swscaler. NO crashea.",
  "        scaleFilter,        // swscaler recibe yuv420p limpio, sin crash",
  "        'format=yuv420p',   // Garantizar formato de salida",
  "        drawtext            // Texto sobre yuv420p",
  "      ];",
  "      if (postFX) finalFilters.push(postFX);",
  "",
  "      console.log(`[Render:Plate${i}] text='${(scene.text||'').substring(0,40)}' segment='${scene.segment_label}'`);",
  "      await runFfmpeg([",
  "        '-loop', '1', '-framerate', '30', '-i', assembledImg.replace(/\\\\/g, '/'),",
  "        '-t', String(sceneDuration.toFixed(2)),",
  "        '-vf', finalFilters.join(','),",
  "        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-an', '-y', outputClip.replace(/\\\\/g, '/')",
  "      ], `plate_${i}`);",
  "    }"
];

lines.splice(startLine, endLine - startLine + 1, ...newLines);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Done! Replaced lines', startLine, 'to', endLine);
