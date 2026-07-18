import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replaceAll('topic: topic || undefined', 'topic: topic || undefined,\n                    sourceName');

fs.writeFileSync(file, code);
