import sys

with open('src/components/ImportMCQs.tsx', 'r') as f:
    content = f.read()

target = """                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 space-y-2">"""

replacement = """                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Source Name</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceDropdown(!showSourceDropdown);
                    setShowSubjectDropdown(false);
                    setShowChapterDropdown(false);
                  }}
                  className="flex-1 flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <span className={sourceName ? '' : 'text-slate-400 font-normal'}>{sourceName || 'Select or Create Source...'}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
                {sourceName && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceRenameOld(sourceName);
                      setSourceRenameNew(sourceName);
                      setIsRenamingSource(true);
                    }}
                    className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                    title="Edit/Rename Source"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showSourceDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 space-y-2 max-h-[250px] overflow-y-auto">
                  <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search or create source..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="w-full bg-transparent border-none text-[11px] focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    {sourcesList
                      .filter(s => s.toLowerCase().includes(sourceSearch.toLowerCase()))
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSourceName(s);
                            setShowSourceDropdown(false);
                            setSourceSearch('');
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg flex items-center justify-between group"
                        >
                          <span className="font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{s}</span>
                        </button>
                      ))}
                    {sourceSearch && !sourcesList.find(s => s.toLowerCase() === sourceSearch.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourceName(sourceSearch);
                          setSourcesList(prev => [...prev, sourceSearch]);
                          setShowSourceDropdown(false);
                          setSourceSearch('');
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center space-x-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="font-semibold">Create "{sourceSearch}"</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rename Modal */}
            <AnimatePresence>
              {isRenamingSource && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-emerald-500" />
                        Edit / Rename Source
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Current Name</label>
                        <input
                          type="text"
                          value={sourceRenameOld}
                          disabled
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Name</label>
                        <input
                          type="text"
                          value={sourceRenameNew}
                          onChange={(e) => setSourceRenameNew(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Enter new source name"
                        />
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          This will update the source name for <strong>all MCQs</strong> currently assigned to "{sourceRenameOld}". Other fields like chapter mapping, tags, and progress will remain exactly the same.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end space-x-2">
                      <button
                        onClick={() => setIsRenamingSource(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!sourceRenameNew || sourceRenameNew === sourceRenameOld) {
                            setIsRenamingSource(false);
                            return;
                          }
                          try {
                            await renameSource(sourceRenameOld, sourceRenameNew);
                            setSourcesList(prev => prev.map(s => s === sourceRenameOld ? sourceRenameNew : s));
                            setSourceName(sourceRenameNew);
                            if (onRefreshData) onRefreshData();
                            setIsRenamingSource(false);
                          } catch (err) {
                            alert("Failed to rename source.");
                          }
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                      >
                        Rename Source
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 space-y-2">"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/ImportMCQs.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")

