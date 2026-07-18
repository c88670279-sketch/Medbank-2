import fs from 'fs';
let file = 'src/db/mongoose.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `  examSource: { type: String, default: '' },
  type: { type: String, enum:`;

const r = `  examSource: { type: String, default: '' },
  targetExams: { type: [String], default: [] },
  type: { type: String, enum:`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
