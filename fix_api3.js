import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `  topic?: string;
}) {`;
const replace1 = `  topic?: string;
  sourceName?: string;
}) {`;
// Use replaceAll because it exists in both importMCQs and importPDFMCQs
code = code.replaceAll(target1, replace1);

fs.writeFileSync(file, code);
