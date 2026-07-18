import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, HelpCircle, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle, Award, Sparkles, Loader2, Bookmark, X } from 'lucide-react';
import { MCQ, TestAttempt } from '../types';
import { saveTestAttempt, getBookmarks, toggleBookmark } from '../lib/mockData';
import { explainAnswer } from '../lib/api';

interface TestSystemProps {
  questions: MCQ[];
  testTitle: string;
  onFinishQuiz: () => void;
}

export default function TestSystem({ questions, testTitle, onFinishQuiz }: TestSystemProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: string]: number }>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  
  // Bookmarks bound to localStorage
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks());

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(questions.length * 60); // 60s per question
  const [timeTaken, setTimeTaken] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // AI explanation states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiActiveQId, setAiActiveQId] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishTest();
          return 0;
        }
        return prev - 1;
      });
      setTimeTaken(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIdx: number) => {
    const currentQ = questions[currentIdx];
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: optionIdx }));
  };

  const handleToggleReview = () => {
    const qId = questions[currentIdx].id;
    setMarkedForReview(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleToggleBookmark = (id: string) => {
    const nextBks = toggleBookmark(id);
    setBookmarks(nextBks);
  };

  const handleFinishTest = () => {
    clearInterval(timerRef.current);
    setIsFinished(true);

    // Compute metrics
    let correctCount = 0;
    questions.forEach(q => {
      const selected = selectedAnswers[q.id];
      if (selected === q.correctAnswer) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);

    const attempt: TestAttempt = {
      id: `att-${Date.now()}`,
      title: testTitle,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      score: scorePercent,
      timeTakenSeconds: timeTaken,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      questions,
      selectedAnswers
    };

    saveTestAttempt(attempt);
  };

  const activeQuestion = questions[currentIdx];
  const isMarked = markedForReview.includes(activeQuestion?.id);
  const isBookmarked = bookmarks.includes(activeQuestion?.id);

  // Calculate results data
  const totalQs = questions.length;
  let correctQs = 0;
  questions.forEach(q => {
    if (selectedAnswers[q.id] === q.correctAnswer) correctQs++;
  });
  const scorePercent = Math.round((correctQs / totalQs) * 100) || 0;

  // Review questions AI trigger
  const handleConsultAI = async (mcq: MCQ, selectedIdx: number) => {
    setAiLoading(true);
    setAiActiveQId(mcq.id);
    setAiResult(null);

    const isCorrect = selectedIdx === mcq.correctAnswer;
    try {
      const text = await explainAnswer({
        question: mcq.question,
        optionSelected: selectedIdx !== undefined ? mcq.options[selectedIdx] : 'None Selected',
        isCorrect,
        correctAnswer: mcq.options[mcq.correctAnswer],
        explanation: mcq.explanation,
        subject: mcq.subject
      });
      setAiResult(text);
    } catch (err: any) {
      console.error(err);
      setAiResult(`### ❌ AI Clinical Tutor error\n\nCould not fetch response. details: ${err.message || 'unknown'}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (isFinished) {
    // Score results screen
    return (
      <div className="max-w-2xl mx-auto text-left space-y-8 py-4">
        {/* Scoreboard Card */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="text-2xl">🏆</div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Quiz Completed</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{testTitle} Results</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              This score card has been recorded into your student profile. Practice regularly to target weak topics!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <span className="block text-xl font-bold text-slate-900 dark:text-white">{scorePercent}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Final Score</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-slate-900 dark:text-white">{correctQs}/{totalQs}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Solved Right</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-slate-900 dark:text-white">{formatTime(timeTaken)}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Time Spent</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onFinishQuiz}
              className="px-4 py-2 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">Review Solved Answers</h3>
          
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAns = selectedAnswers[q.id];
              const isCorrect = userAns === q.correctAnswer;

              return (
                <div
                  key={q.id || idx}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4 text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400">Question {idx + 1} of {totalQs}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                    }`}>
                      {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>

                  {q.sourceBook && (
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
                  )}

                  <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed">{q.question}</p>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const wasSelected = userAns === optIdx;
                      const isTrueAnswer = optIdx === q.correctAnswer;

                      let itemStyle = 'border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/10 text-slate-600 dark:text-zinc-400';
                      if (isTrueAnswer) {
                        itemStyle = 'border-emerald-500 bg-emerald-50/55 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-semibold';
                      } else if (wasSelected) {
                        itemStyle = 'border-rose-300 bg-rose-50/55 dark:bg-rose-950/20 text-rose-950 dark:text-rose-300';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-lg border text-xs text-left transition-colors flex items-center space-x-2 ${itemStyle}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            wasSelected ? 'bg-[#18181b] dark:bg-white text-white dark:text-[#18181b]' : 'bg-white dark:bg-[#18181b] text-slate-500 border border-slate-200'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanations */}
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800 rounded-xl text-xs space-y-4 text-slate-700 dark:text-zinc-300 leading-relaxed">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">Answer Explanation:</span>
                      <p>{q.explanation}</p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-zinc-800 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex space-x-3 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Book Source: {q.sourceBook}</span>
                        <span>{q.difficulty}</span>
                      </div>

                      <button
                        onClick={() => handleConsultAI(q, userAns)}
                        className="px-3 py-1.5 bg-[#18181b] dark:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 animate-pulse text-amber-500" />
                        <span>Consult AI On This Concept</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI explain details modal */}
        <AnimatePresence>
          {(aiLoading || aiResult) && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1c1c1e] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/20">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                    <span className="font-bold text-xs text-slate-950 dark:text-white">AI Diagnostic Tutor</span>
                  </div>
                  <button
                    onClick={() => {
                      setAiResult(null);
                      setAiLoading(false);
                      setAiActiveQId(null);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 text-left space-y-4">
                  {aiLoading ? (
                    <div className="py-16 text-center space-y-3">
                      <Loader2 className="h-8 w-8 text-[#18181b] dark:text-white animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Generating AI Tutor explanation...</p>
                    </div>
                  ) : (
                    <div className="prose prose-blue text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {aiResult}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-zinc-900/10 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => {
                      setAiResult(null);
                      setAiLoading(false);
                      setAiActiveQId(null);
                    }}
                    className="px-4 py-2 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-xs cursor-pointer"
                  >
                    I understand
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Active testing screen
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === questions.length - 1;
  const selectedAnswerIdx = selectedAnswers[activeQuestion.id];

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6 py-4">
      {/* Test Controls / Timer Bar */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">{testTitle}</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time spent */}
          <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-zinc-400 font-bold">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          <button
            onClick={handleFinishTest}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Progress index row */}
      <div className="flex overflow-x-auto gap-1.5 items-center p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl scrollbar-none snap-x">
        {questions.map((q, idx) => {
          const isCurrent = currentIdx === idx;
          const wasSolved = selectedAnswers[q.id] !== undefined;
          const isReview = markedForReview.includes(q.id);

          let circleStyle = 'bg-slate-50 dark:bg-zinc-900/30 text-slate-600 dark:text-zinc-400 border-[#e4e4e7] dark:border-[#27272a]';
          if (isCurrent) {
            circleStyle = 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] border-[#18181b] dark:border-white ring-2 ring-indigo-500/30';
          } else if (isReview) {
            circleStyle = 'bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-300/45';
          } else if (wasSolved) {
            circleStyle = 'bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg border text-[10px] font-bold flex items-center justify-center shrink-0 snap-center transition-all cursor-pointer ${circleStyle}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Primary Question Box */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-wider">
              {activeQuestion.subject}
            </span>
            <span className="text-[9px] text-slate-400 font-bold">
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mark for review */}
            <button
              onClick={handleToggleReview}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
                isMarked
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200'
                  : 'bg-white dark:bg-[#18181b] text-slate-500 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900'
              }`}
            >
              {isMarked ? '✓ Review list' : 'Mark for Review'}
            </button>

            {/* Bookmark inside quiz */}
            <button
              onClick={() => handleToggleBookmark(activeQuestion.id)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <Bookmark className={`w-4.5 h-4.5 ${isBookmarked ? 'fill-current text-slate-700 dark:text-zinc-300' : ''}`} />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="space-y-4">
          {activeQuestion.examSource && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source: {activeQuestion.examSource}
            </div>
          )}
          <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-relaxed whitespace-pre-wrap">
            {activeQuestion.question}
          </h3>
          {activeQuestion.image && (
            <div className="my-4 max-w-full sm:max-w-md rounded-lg overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-black flex justify-center">
              <img src={activeQuestion.image} alt="clue" className="object-contain max-h-[400px] w-full" />
            </div>
          )}
        </div>

        {/* Option Selection Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {activeQuestion.options.map((option, oIdx) => {
            const isSelected = selectedAnswerIdx === oIdx;

            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleSelectOption(oIdx)}
                className={`w-full p-3.5 rounded-xl border text-xs text-left transition-all flex items-start justify-between cursor-pointer gap-3 ${
                  isSelected
                    ? 'border-[#18181b] dark:border-white bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white font-semibold'
                    : 'border-[#e4e4e7] dark:border-[#27272a] bg-[#18181b]/10 dark:bg-[#18181b]/30 hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 mt-0.5 ${
                    isSelected ? 'bg-[#18181b] dark:bg-white text-white dark:text-[#18181b]' : 'bg-white dark:bg-[#18181b] text-slate-500 border-slate-200'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="break-words flex-1">{option}</span>
                </div>

                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#18181b] dark:bg-white shrink-0 mt-2"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next / Previous Footer Panel */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={isFirst}
          className="px-4 py-2 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {isLast ? (
          <button
            onClick={handleFinishTest}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Submit Exam
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
            className="px-4 py-2.5 bg-[#18181b] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#18181b] rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>Next Question</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
