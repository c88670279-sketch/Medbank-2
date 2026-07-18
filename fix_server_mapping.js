import fs from 'fs';
let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace manual parsing defaults:
code = code.replaceAll(`examSource: 'NEET PG'`, `targetExams: []`);

// Line 724
code = code.replace(
  `examSource: 'NEET PG',`,
  `targetExams: [],`
);

// Line 1058
code = code.replace(
  `sourceBook: m.examSource || sourceName || 'Import MCQs',`,
  `sourceBook: sourceName || 'Import MCQs',`
);
code = code.replace(
  `examSource: m.examSource || sourceName || 'NEET PG'`,
  `targetExams: m.targetExams || [],`
);

// Line 1426
code = code.replace(
  `sourceBook: m.examSource || sourceName || 'PDF Importer',`,
  `sourceBook: sourceName || 'PDF Importer',`
);
code = code.replace(
  `examSource: m.examSource || sourceName || 'NEET PG'`,
  `targetExams: m.targetExams || [],`
);

// Line 1764
code = code.replace(
  `sourceBook: m.examSource || sourceName || 'Image Extraction',`,
  `sourceBook: sourceName || 'Image Extraction',`
);
code = code.replace(
  `examSource: m.examSource || sourceName || 'NEET PG',`,
  `targetExams: m.targetExams || [],`
);

// Remove the examSource tag pushing logic
//    if (compiledMcq.examSource && !compiledMcq.tags.includes(compiledMcq.examSource)) {
//      compiledMcq.tags.push(compiledMcq.examSource);
//    }

code = code.replaceAll(
  `      // Ensure tags contains examSource if available
      if (compiledMcq.examSource && !compiledMcq.tags.includes(compiledMcq.examSource)) {
        compiledMcq.tags.push(compiledMcq.examSource);
      }`,
  `      // Ensure tags contains targetExams if available
      if (compiledMcq.targetExams && Array.isArray(compiledMcq.targetExams)) {
        compiledMcq.targetExams.forEach(te => {
          if (!compiledMcq.tags.includes(te)) {
            compiledMcq.tags.push(te);
          }
        });
      }`
);

fs.writeFileSync(file, code);
