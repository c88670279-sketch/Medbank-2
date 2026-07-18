import fs from 'fs';
let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `const { pdfBase64, textBatch, mode, subject, chapter, topic } = req.body;`;
const r = `const { pdfBase64, textBatch, mode, subject, chapter, topic, sourceName } = req.body;`;
code = code.replace(t, r);
fs.writeFileSync(file, code);
