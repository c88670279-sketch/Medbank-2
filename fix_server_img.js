import fs from 'fs';
let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `const { image, mimeType, subject, chapter, topic, sourceName } = req.body;`;
const r = `const { image, mimeType, subject, chapter, topic, sourceName, questionTypes } = req.body;`;
code = code.replace(t, r);
fs.writeFileSync(file, code);
