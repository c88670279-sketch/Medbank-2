import fs from 'fs';
let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

// Update prompts:
code = code.replaceAll(
  `- Exam Source (examSource - detect if any source name, brand, or exam name is mentioned, e.g., PrepLadder, INICET, FMGE, Marrow, DAMS, Cerebellum, NEET PG, NEXT, etc. If present, extract it!)`,
  `- Target Exams (targetExams - detect if any target exams are mentioned, e.g., NEET PG, INICET, FMGE, AIIMS, NEXT, University PCT. Leave empty if none detected. NEVER automatically assign NEET PG to questions from textbooks.)`
);

code = code.replaceAll(
  `- Exam Source (examSource): Extract any source name or exam mention like PrepLadder, Marrow, INICET, FMGE, DAMS, Cerebellum, NEET PG, etc. If detected in the text or page context, set this field (e.g. "PrepLadder"). If not found, default to "NEET PG".`,
  `- Target Exams (targetExams): Extract any target exams mentioned (e.g. NEET PG, INICET, FMGE, AIIMS, NEXT). If not found, leave as an empty array. Never default to NEET PG.`
);

code = code.replaceAll(
  `"examSource": "Exam Source or brand name detected",`,
  `"targetExams": ["NEET PG", "INICET"],`
);

code = code.replaceAll(
  `examSource: { type: Type.STRING },`,
  `targetExams: { type: Type.ARRAY, items: { type: Type.STRING } },`
);

fs.writeFileSync(file, code);
