import fs from 'fs';
let file = 'src/types.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `  image?: string;
  examSource?: string;
  type: 'Single Best Answer' |`;

const r = `  image?: string;
  examSource?: string; // deprecated
  targetExams?: string[];
  type: 'Single Best Answer' |`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
