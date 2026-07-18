import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

const t = `interface ImportMCQsProps {
  onRefreshData?: () => void;
  onStartQuiz?: (mcqs: any[], testMode: boolean) => void;
}`;

const r = `interface ImportMCQsProps {
  onRefreshData?: () => void;
  onStartQuiz?: (mcqs: any[], testMode: boolean) => void;
}

const QUESTION_TYPE_OPTIONS = [
  'All Question Types',
  'Single Best Answer (SBA)',
  'Multiple Correct Answers (MCMA)',
  'Clinical Scenario / Case-Based',
  'Image-Based Questions',
  'Assertion & Reason',
  'Match the Columns',
  'True/False',
  'Sequential Arrangement',
  'Fill in the Blank',
  'One-Liner / Recall',
  'Integrated / Multidisciplinary',
  'Numerical / Calculation-Based',
  'Diagram / Label-Based',
  'Table / Graph Interpretation',
  'Previous Year Question (PYQ)',
  'AI-Generated Concept-Based'
];`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
