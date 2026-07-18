import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `  chapter?: string;
  topic?: string;
}): Promise<{ mcqs: any[]; duplicateSkippedCount: number; subjectVerification?: any }> {`;

const r = `  chapter?: string;
  topic?: string;
  sourceName?: string;
}): Promise<{ mcqs: any[]; duplicateSkippedCount: number; subjectVerification?: any }> {`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
