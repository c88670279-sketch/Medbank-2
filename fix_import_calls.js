import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `result = await importMCQs({
                  fileType: 'image',`,
  `result = await importMCQs({
                  fileType: 'image',
                  questionTypes: selectedQuestionTypes,`
);

code = code.replace(
  `result = await importMCQs({
                    fileType: 'pdf',
                    pdfBase64,`,
  `result = await importMCQs({
                    fileType: 'pdf',
                    pdfBase64,
                    questionTypes: selectedQuestionTypes,`
);

code = code.replace(
  `result = await importMCQs({
                      fileType: 'pdf',
                      textBatch: textBatch.trim().length > 100 ? textBatch : undefined,`,
  `result = await importMCQs({
                      fileType: 'pdf',
                      textBatch: textBatch.trim().length > 100 ? textBatch : undefined,
                      questionTypes: selectedQuestionTypes,`
);

fs.writeFileSync(file, code);
