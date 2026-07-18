import fs from 'fs';
let file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const t1 = `  try {
    let systemPrompt = \`You are an expert medical MCQ extraction engine. Your only task is to convert PDFs or images into a clean, structured question bank. Accuracy is more important than speed.

Rules:
1. Extract only:`;

const r1 = `  try {
    const typeFilterText = questionTypes && questionTypes.length > 0 && !questionTypes.includes('All Question Types')
      ? \`\\n\\nCRITICAL INSTRUCTION: You MUST ONLY extract or generate questions that fall into the following types: \${questionTypes.join(', ')}. Ignore ALL other question types completely.\`
      : '';

    let systemPrompt = \`You are an expert medical MCQ extraction engine. Your only task is to convert PDFs or images into a clean, structured question bank. Accuracy is more important than speed.\${typeFilterText}

Rules:
1. Extract only:`;

code = code.replace(t1, r1);

const t2 = `  try {
    const prompt = \`You are an expert medical MCQ extraction engine. Your task is to convert images into a clean, structured question bank with >99% extraction accuracy.

You must use your Vision capabilities to carefully detect both text and visual elements in the input image.

Rules:
1. Extract only:`;

const r2 = `  try {
    const typeFilterText = questionTypes && questionTypes.length > 0 && !questionTypes.includes('All Question Types')
      ? \`\\n\\nCRITICAL INSTRUCTION: You MUST ONLY extract or generate questions that fall into the following types: \${questionTypes.join(', ')}. Ignore ALL other question types completely.\`
      : '';

    const prompt = \`You are an expert medical MCQ extraction engine. Your task is to convert images into a clean, structured question bank with >99% extraction accuracy.\${typeFilterText}

You must use your Vision capabilities to carefully detect both text and visual elements in the input image.

Rules:
1. Extract only:`;

code = code.replace(t2, r2);

fs.writeFileSync(file, code);
