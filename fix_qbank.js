import fs from 'fs';
let file = 'src/components/QBank.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `{mcq.examSource && (
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold border border-amber-100 dark:border-amber-900/50">
                          <BookOpen className="h-3 w-3" />
                          <span>Source: {mcq.examSource}</span>
                        </div>
                      )}`;

const newCode = `{mcq.sourceBook && (
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold border border-amber-100 dark:border-amber-900/50" title="Question Source">
                          <BookOpen className="h-3 w-3" />
                          <span>{mcq.sourceBook}</span>
                        </div>
                      )}
                      {mcq.targetExams && mcq.targetExams.length > 0 && (
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/50" title="Target Exams">
                          <Target className="h-3 w-3" />
                          <span>{mcq.targetExams.join(', ')}</span>
                        </div>
                      )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
