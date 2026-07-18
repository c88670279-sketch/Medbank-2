import fs from 'fs';
let file = 'src/components/QBank.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `{mcq.examSource && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Source: {mcq.examSource}
                        </div>
                      )}`;

const newCode = `{mcq.sourceBook && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {mcq.sourceBook}
                        </div>
                      )}
                      {mcq.targetExams && mcq.targetExams.length > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider ml-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {mcq.targetExams.join(', ')}
                        </div>
                      )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
