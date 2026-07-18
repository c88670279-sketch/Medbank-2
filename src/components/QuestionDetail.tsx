import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronRight, HelpCircle, Sparkles, Loader2, AlertCircle, CheckCircle, Brain, Bookmark } from 'lucide-react';
import { MCQ } from '../types';
import { fetchDBQuestion, explainAnswer } from '../lib/api';
import { safeStorage } from '../lib/safeStorage';

interface QuestionDetailProps {
  questionId: string;
  onBack: () => void;
  onStartQuiz?: (questions: MCQ[], title: string) => void;
}

export default function QuestionDetail({ questionId, onBack, onStartQuiz }: QuestionDetailProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<MCQ | null>(null);
  
  // Interactive Solving State on detail page
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [hasSolved, setHasSolved] = useState<boolean>(false);
  
  // Bookmarks state (sync with localStorage)
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  
  // AI Tutor Integration
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadQuestion() {
      if (!questionId) {
        console.error("[QuestionDetail] Error: questionId is missing");
        setError("Question ID is null or undefined.");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log(`[QuestionDetail Log] Fetching question by ID: ${questionId}`);
        
        let found = null;
        try {
          found = await fetchDBQuestion(questionId);
          if (found) {
            console.log(`[QuestionDetail Log] Successfully fetched single question from DB.`);
          }
        } catch (dbErr) {
          console.error('[QuestionDetail Log] MongoDB fetch error, trying mockData fallback:', dbErr);
        }

        if (!found) {
          console.log(`[QuestionDetail Log] Question not found in database. Searching local mock data/custom questions fallback...`);
          const { getAllMCQs } = await import('../lib/mockData');
          const mockList = getAllMCQs();
          console.log(`[QuestionDetail Log] Loaded ${mockList.length} mock questions.`);
          found = mockList.find(q => q && (q.id === questionId || (q as any)._id === questionId));
        }
        
        if (isMounted) {
          if (found) {
            console.log(`[QuestionDetail Log] Successfully located question:`, found);
            setQuestion(found);
            
            const qKey = found.id || (found as any)._id;
            
            // Sync Bookmark status
            const savedBookmarks = JSON.parse(safeStorage.getItem('medbank_bookmarks') || '[]');
            setIsBookmarked(savedBookmarks.includes(qKey));
            
            // Sync solving state if user already answered this question in QBank
            const solvedAnswers = JSON.parse(safeStorage.getItem('medbank_solved_mcqs') || '{}');
            if (solvedAnswers[qKey] !== undefined) {
              setUserChoice(solvedAnswers[qKey]);
              setHasSolved(true);
            }
          } else {
            console.warn(`[QuestionDetail Log] Question ID "${questionId}" was not found in any dataset.`);
            setError("Question not found");
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[QuestionDetail Log] Critical failure loading question:', err);
        if (isMounted) {
          setError(err.message || "Failed to load question details.");
          setLoading(false);
        }
      }
    }
    
    loadQuestion();
    return () => {
      isMounted = false;
    };
  }, [questionId]);

  const handleToggleBookmark = () => {
    if (!question) return;
    const qKey = question.id || question._id;
    if (!qKey) return;
    
    const savedBookmarks = JSON.parse(safeStorage.getItem('medbank_bookmarks') || '[]');
    let updated;
    if (isBookmarked) {
      updated = savedBookmarks.filter((id: string) => id !== qKey);
      setIsBookmarked(false);
    } else {
      updated = [...savedBookmarks, qKey];
      setIsBookmarked(true);
    }
    safeStorage.setItem('medbank_bookmarks', JSON.stringify(updated));
  };

  const handleSelectOption = (oIdx: number) => {
    if (hasSolved || !question) return;
    const qKey = question.id || question._id;
    if (!qKey) return;

    setUserChoice(oIdx);
    setHasSolved(true);
    
    // Save solving status to local storage
    const solvedAnswers = JSON.parse(safeStorage.getItem('medbank_solved_mcqs') || '{}');
    solvedAnswers[qKey] = oIdx;
    safeStorage.setItem('medbank_solved_mcqs', JSON.stringify(solvedAnswers));
  };

  const handleConsultAI = async () => {
    if (!question || userChoice === null) return;
    try {
      setAiLoading(true);
      setAiResult(null);
      const explanation = await explainAnswer({
        question: question.question,
        optionSelected: question.options[userChoice],
        isCorrect: userChoice === question.correctAnswer,
        correctAnswer: question.options[question.correctAnswer],
        explanation: question.explanation,
        subject: question.subject
      });
      setAiResult(explanation);
    } catch (err: any) {
      console.error('Failed to load AI explanation:', err);
      setAiResult(`### ❌ AI Board Tutor error\n\nCould not fetch response. details: ${err.message || 'unknown'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetQuestion = () => {
    if (!question) return;
    const qKey = question.id || question._id;
    if (!qKey) return;

    setUserChoice(null);
    setHasSolved(false);
    
    // Remove solved status
    const solvedAnswers = JSON.parse(safeStorage.getItem('medbank_solved_mcqs') || '{}');
    delete solvedAnswers[qKey];
    safeStorage.setItem('medbank_solved_mcqs', JSON.stringify(solvedAnswers));
    setAiResult(null);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-16 text-center space-y-4 shadow-sm max-w-3xl mx-auto my-8">
        <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Retrieving Clinical MCQ Profile</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 animate-pulse">Querying database, verifying curriculum indexes, and loading resources...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-12 text-center shadow-sm max-w-3xl mx-auto my-8 space-y-6">
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Question not found</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            {error || "The selected question could not be located in our active clinical database. It may have been modified or deleted by an administrator."}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 mx-auto shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Question Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left my-4">
      {/* Back Button Header Strip */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#18181b] dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isBookmarked
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400 dark:bg-[#18181b] dark:border-zinc-700 dark:hover:bg-zinc-800'
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Bookmark Question"}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Question Detail Card */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        {/* Topic & Difficulty Metadata pill bar */}
        <div className="flex flex-wrap gap-2 items-center border-b border-slate-100 dark:border-zinc-800 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded">
            {question.subject}
          </span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 px-2.5 py-0.5 rounded-md">
            {question.chapter}
          </span>
          {question.topic && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-0.5 rounded-md">
              {question.topic}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            question.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400' :
            question.difficulty === 'Medium' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/10 dark:text-indigo-400' :
            'bg-rose-50 text-rose-700 dark:bg-rose-950/10 dark:text-rose-400'
          }`}>
            {question.difficulty}
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-zinc-850 px-2 py-0.5 rounded ml-auto">
            {question.type || "Single Best Answer"}
          </span>
        </div>

        {/* Question Stem Text */}
        <div className="space-y-4">
          {question.examSource && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source: {question.examSource}
            </div>
          )}
          <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
            {question.question}
          </h2>

          {question.image && (
            <div className="rounded-xl overflow-hidden border border-[#e4e4e7] dark:border-[#27272a] max-w-lg bg-slate-50 dark:bg-black flex justify-center">
              <img 
                src={question.image} 
                alt="Clinical Clue Media" 
                className="w-full h-auto object-contain max-h-[400px]"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Options Selection Layout */}
        <div className="space-y-2.5 pt-2">
          {question.options.map((option, oIdx) => {
            const isSelected = userChoice === oIdx;
            const isCorrectOption = oIdx === question.correctAnswer;
            
            let optionStyle = 'border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/20 dark:bg-[#18181b]/30 hover:bg-slate-50 dark:hover:bg-zinc-800';
            if (hasSolved) {
              if (isCorrectOption) {
                optionStyle = 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/15 text-emerald-950 dark:text-emerald-300 font-semibold';
              } else if (isSelected) {
                optionStyle = 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/15 text-rose-950 dark:text-rose-300';
              } else {
                optionStyle = 'border-slate-100 dark:border-zinc-800 opacity-50';
              }
            }

            return (
              <button
                key={oIdx}
                onClick={() => handleSelectOption(oIdx)}
                disabled={hasSolved}
                className={`w-full p-4 rounded-xl border text-xs text-left transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold border ${
                    isSelected ? 'bg-indigo-600 text-white border-transparent' : 'bg-white dark:bg-[#18181b] text-slate-500 border-slate-200 dark:border-zinc-800'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </div>
                
                {hasSolved && isCorrectOption && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 ml-2">✓ Correct Answer</span>
                )}
                {hasSolved && isSelected && !isCorrectOption && (
                  <span className="text-rose-500 font-bold text-xs shrink-0 ml-2">✗ Incorrect Selection</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation fold */}
        <AnimatePresence>
          {hasSolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-slate-50/70 dark:bg-zinc-900/30 rounded-xl border border-slate-100 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed space-y-4 pt-5"
            >
              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs block">Clinical High-Yield Explanation</span>
                <p>{question.explanation}</p>
              </div>

              {/* Source citation */}
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 dark:border-zinc-800/60 pt-3">
                <span>Book Source: {question.sourceBook || 'Verified Medical Textbook'}</span>
                {question.tags && question.tags.length > 0 && (
                  <div className="flex gap-1.5 ml-auto">
                    {question.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset and AI study companion button bar */}
              <div className="pt-2 flex flex-wrap gap-2 justify-between items-center border-t border-slate-100 dark:border-zinc-800/60 pt-4">
                <button
                  onClick={handleResetQuestion}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Reset & Try Again
                </button>

                <button
                  onClick={handleConsultAI}
                  disabled={aiLoading}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-[10px] flex items-center space-x-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  <span>Consult AI Board Tutor</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Tutor Panel */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 text-left space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-indigo-100/40 dark:border-indigo-950/20">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span className="font-extrabold text-[10px] uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">Dynamic Medical Study Pearl</span>
                </div>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <div className="prose prose-indigo dark:prose-invert text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {aiResult}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
