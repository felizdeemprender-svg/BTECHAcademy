const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/mentoria/marketing/pages/build/components/TemplateEditor.tsx');
let content = fs.readFileSync(file, 'utf8');

// The Select component uses `prodNotes` which is out of scope in JSX.
// We need to replace `prodNotes` with `s.production_notes || {}` references in the render panel block.
// The Select block spans lines ~1066-1087. We'll do a targeted replacement.

// Replace the specific Select block that uses prodNotes (in render, not in handler functions)
const oldSelect = `                                        <Select
                                          value={prodNotes.enable_tts ? (prodNotes.voice_id || 'mateo') : 'off'}
                                          onValueChange={(val) => {
                                            updateAsset('socials', sIdx, 'production_notes', {
                                              ...prodNotes,
                                              enable_tts: val !== 'off',
                                              voice_id: val === 'off' ? (prodNotes.voice_id || 'mateo') : val
                                            });
                                          }}
                                        >`;

const newSelect = `                                        <Select
                                          value={s.production_notes?.enable_tts ? (s.production_notes?.voice_id || 'mateo') : 'off'}
                                          onValueChange={(val) => {
                                            updateAsset('socials', sIdx, 'production_notes', {
                                              ...(s.production_notes || {}),
                                              enable_tts: val !== 'off',
                                              voice_id: val === 'off' ? (s.production_notes?.voice_id || 'mateo') : val
                                            });
                                          }}
                                        >`;

if (content.includes(oldSelect)) {
  content = content.replace(oldSelect, newSelect);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Fixed: prodNotes -> s.production_notes in render JSX');
} else {
  console.error('❌ Pattern not found! Check manually.');
}
