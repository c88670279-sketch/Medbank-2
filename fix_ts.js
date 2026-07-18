import fs from 'fs';
let file = 'src/components/TestSystem.tsx';
let code = fs.readFileSync(file, 'utf8');

const t1 = `{q.examSource && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      Source: {q.examSource}
                    </div>
                  )}`;
const r1 = `{q.sourceBook && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {q.sourceBook}
                    </div>
                  )}
                  {q.targetExams && q.targetExams.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider mb-1 ml-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {q.targetExams.join(', ')}
                    </div>
                  )}`;
code = code.replace(t1, r1);
fs.writeFileSync(file, code);

file = 'src/components/QuestionDetail.tsx';
code = fs.readFileSync(file, 'utf8');
const t2 = `{question.examSource && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source: {question.examSource}
            </div>
          )}`;
const r2 = `{question.sourceBook && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {question.sourceBook}
            </div>
          )}
          {question.targetExams && question.targetExams.length > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {question.targetExams.join(', ')}
            </div>
          )}`;
code = code.replace(t2, r2);
fs.writeFileSync(file, code);
