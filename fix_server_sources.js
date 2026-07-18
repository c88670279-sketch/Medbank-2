import fs from 'fs';

let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

// Add new endpoints before app.post('/api/questions')
const targetStr = `app.post('/api/questions', async (req, res) => {`;
const endpoints = `
app.get('/api/sources', async (req, res) => {
  try {
    await connectDB();
    const sources = await QuestionModel.distinct('sourceBook');
    const examSources = await QuestionModel.distinct('examSource');
    const combined = Array.from(new Set([...sources, ...examSources])).filter(Boolean);
    res.json(combined);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

app.put('/api/sources/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Missing oldName or newName' });
    }
    await connectDB();
    const result1 = await QuestionModel.updateMany({ sourceBook: oldName }, { $set: { sourceBook: newName } });
    const result2 = await QuestionModel.updateMany({ examSource: oldName }, { $set: { examSource: newName } });
    res.json({ success: true, modifiedCount: result1.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename source' });
  }
});

app.post('/api/questions', async (req, res) => {`;

code = code.replace(targetStr, endpoints);

// Modify req.body in /api/gemini/import-mcqs
code = code.replace(
  `const { fileType, pdfBase64, image, mimeType, textBatch, mode, subject, chapter, topic } = req.body;`,
  `const { fileType, pdfBase64, image, mimeType, textBatch, mode, subject, chapter, topic, sourceName } = req.body;`
);
code = code.replace(
  `sourceBook: m.examSource || 'Import MCQs',`,
  `sourceBook: m.examSource || sourceName || 'Import MCQs',`
);
code = code.replace(
  `examSource: m.examSource || 'NEET PG'`,
  `examSource: m.examSource || sourceName || 'NEET PG'`
);

// Fallback logic inside import-mcqs
code = code.replace(
  `sourceBook: 'Local Fallback Parser',`,
  `sourceBook: sourceName || 'Local Fallback Parser',`
);
code = code.replace(
  `examSource: 'Local Generated'`,
  `examSource: sourceName || 'Local Generated'`
);


// Modify req.body in /api/gemini/import-pdf-mcqs
code = code.replace(
  `const { fileType, pdfBase64, mimeType, textBatch, mode, subject, chapter, topic } = req.body;`,
  `const { fileType, pdfBase64, mimeType, textBatch, mode, subject, chapter, topic, sourceName } = req.body;`
);

// There's two places inside /api/gemini/import-pdf-mcqs
code = code.replace(
  `sourceBook: m.examSource || 'PDF Importer',`,
  `sourceBook: m.examSource || sourceName || 'PDF Importer',`
);
// replace multiple occurrences if any
code = code.replaceAll(
  `sourceBook: m.examSource || 'PDF Importer',`,
  `sourceBook: m.examSource || sourceName || 'PDF Importer',`
);
code = code.replaceAll(
  `examSource: m.examSource || 'NEET PG'`,
  `examSource: m.examSource || sourceName || 'NEET PG'`
);


// Modify req.body in /api/gemini/extract-image-mcq
code = code.replace(
  `const { image, mimeType, subject, chapter, topic } = req.body;`,
  `const { image, mimeType, subject, chapter, topic, sourceName } = req.body;`
);
code = code.replace(
  `sourceBook: m.examSource || 'Image Extraction',`,
  `sourceBook: m.examSource || sourceName || 'Image Extraction',`
);

fs.writeFileSync(file, code);
