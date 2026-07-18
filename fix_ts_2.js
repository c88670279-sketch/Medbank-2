import fs from 'fs';
let file = 'src/components/TestSystem.tsx';
let code = fs.readFileSync(file, 'utf8');

const t2 = `{activeQuestion.examSource && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source: {activeQuestion.examSource}
            </div>
          )}`;
const r2 = `{activeQuestion.sourceBook && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {activeQuestion.sourceBook}
            </div>
          )}
          {activeQuestion.targetExams && activeQuestion.targetExams.length > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider mb-2 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {activeQuestion.targetExams.join(', ')}
            </div>
          )}`;
code = code.replace(t2, r2);
fs.writeFileSync(file, code);
