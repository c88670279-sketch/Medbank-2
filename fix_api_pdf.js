import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `export async function importPDFMCQs(params: {
  pdfBase64?: string;
  textBatch?: string;
  mode: 'extract' | 'generate';
  subject: string;
  chapter?: string;
  topic?: string;
}): Promise<any[]> {`;

const r = `export async function importPDFMCQs(params: {
  pdfBase64?: string;
  textBatch?: string;
  mode: 'extract' | 'generate';
  subject: string;
  chapter?: string;
  topic?: string;
  sourceName?: string;
}): Promise<any[]> {`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
