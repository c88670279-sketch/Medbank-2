import fs from 'fs';

// Fix TestSystem.tsx
let file = 'src/components/TestSystem.tsx';
let code = fs.readFileSync(file, 'utf8');

const t1 = `{q.examSource && (
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-slate-500 uppercase">
                      <BookOpen className="h-3 w-3" />
                      Source: {q.examSource}
                    </div>
                  )}`;
const r1 = `{q.sourceBook && (
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-amber-600 uppercase">
                      <BookOpen className="h-3 w-3" />
                      {q.sourceBook}
                    </div>
                  )}
                  {q.targetExams && q.targetExams.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-500 uppercase">
                      <Target className="h-3 w-3" />
                      {q.targetExams.join(', ')}
                    </div>
                  )}`;
code = code.replace(t1, r1);

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

// Fix QuestionDetail.tsx
file = 'src/components/QuestionDetail.tsx';
code = fs.readFileSync(file, 'utf8');

const t3 = `{question.examSource && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source: {question.examSource}
            </div>
          )}`;
const r3 = `{question.sourceBook && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {question.sourceBook}
            </div>
          )}
          {question.targetExams && question.targetExams.length > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {question.targetExams.join(', ')}
            </div>
          )}`;
code = code.replace(t3, r3);
fs.writeFileSync(file, code);

