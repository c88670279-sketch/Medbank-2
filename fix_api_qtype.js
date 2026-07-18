import fs from 'fs';
let file = 'src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

const t = `  topic?: string;
  sourceName?: string;
}): Promise<{ mcqs: any[]; duplicateSkippedCount: number; subjectVerification?: any }> {`;

const r = `  topic?: string;
  sourceName?: string;
  questionTypes?: string[];
}): Promise<{ mcqs: any[]; duplicateSkippedCount: number; subjectVerification?: any }> {`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
