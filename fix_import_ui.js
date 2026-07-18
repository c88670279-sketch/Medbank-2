import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace badge
code = code.replaceAll(
  `{mcq.examSource && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-300 shrink-0 uppercase">
                          {mcq.examSource}
                        </span>
                      )}`,
  `{mcq.sourceBook && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/55 dark:text-amber-300 shrink-0 uppercase" title="Question Source">
                          {mcq.sourceBook}
                        </span>
                      )}
                      {mcq.targetExams && mcq.targetExams.length > 0 && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-300 shrink-0 uppercase" title="Target Exams">
                          {mcq.targetExams.join(', ')}
                        </span>
                      )}`
);

// Replace editor fields
const oldEditor = `                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exam Source Target</label>
                              <input
                                type="text"
                                placeholder="e.g. NEET PG, INICET, FMGE"
                                value={mcq.examSource || ''}
                                onChange={(e) => handleEditDraftField(idx, 'examSource', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                              />
                            </div>`;

const newEditor = `                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Source (Origin)</label>
                              <input
                                type="text"
                                placeholder="e.g. Robbins Pathology, Apurba Sastry"
                                value={mcq.sourceBook || ''}
                                onChange={(e) => handleEditDraftField(idx, 'sourceBook', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Exams</label>
                              <input
                                type="text"
                                placeholder="e.g. NEET PG, INICET (comma separated)"
                                value={mcq.targetExams ? mcq.targetExams.join(', ') : ''}
                                onChange={(e) => handleEditDraftField(idx, 'targetExams', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                              />
                            </div>`;

code = code.replace(oldEditor, newEditor);

fs.writeFileSync(file, code);
