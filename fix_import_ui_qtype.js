import fs from 'fs';
let file = 'src/components/ImportMCQs.tsx';
let code = fs.readFileSync(file, 'utf8');

const t = `            </AnimatePresence>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Operation Mode</label>`;

const r = `            </AnimatePresence>

            {/* Question Types Filter */}
            <div className="relative pt-2 border-t border-slate-100 dark:border-zinc-900">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Question Types to Extract</label>
              <button
                type="button"
                onClick={() => {
                  setShowQuestionTypesDropdown(!showQuestionTypesDropdown);
                  setShowSourceDropdown(false);
                  setShowSubjectDropdown(false);
                  setShowChapterDropdown(false);
                }}
                className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <span className="truncate pr-2">
                  {selectedQuestionTypes.includes('All Question Types') 
                    ? 'All Question Types' 
                    : \`\${selectedQuestionTypes.length} type\${selectedQuestionTypes.length > 1 ? 's' : ''} selected\`}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </button>

              {showQuestionTypesDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 max-h-[250px] overflow-y-auto">
                  <div className="space-y-1">
                    {QUESTION_TYPE_OPTIONS.map((type) => {
                      const isSelected = selectedQuestionTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (type === 'All Question Types') {
                              setSelectedQuestionTypes(['All Question Types']);
                            } else {
                              let newSelected = selectedQuestionTypes.filter(t => t !== 'All Question Types');
                              if (newSelected.includes(type)) {
                                newSelected = newSelected.filter(t => t !== type);
                              } else {
                                newSelected.push(type);
                              }
                              if (newSelected.length === 0) {
                                newSelected = ['All Question Types'];
                              }
                              setSelectedQuestionTypes(newSelected);
                            }
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-zinc-900"
                        >
                          <span className={\`font-medium \${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}\`}>
                            {type}
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Operation Mode</label>`;

code = code.replace(t, r);
fs.writeFileSync(file, code);
