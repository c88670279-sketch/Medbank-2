import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Layers, Brain, BookOpen, FileText, Play, ChevronRight, HelpCircle, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { SubjectName, Chapter, Topic, PDFNote, MCQ } from '../types';
import { getCustomPDFs, getAllPDFs, getAllMCQs } from '../lib/mockData';
import { summarizeTopic } from '../lib/api';

interface SubjectDetailProps {
  subjectName: SubjectName;
  chapters: Chapter[];
  topics: Topic[];
  onStartQuiz: (mcqsToSolve: MCQ[], testTitle: string) => void;
  onQuestionClick?: (questionId: string) => void;
}

export default function SubjectDetail({
  subjectName,
  chapters,
  topics,
  onStartQuiz,
  onQuestionClick
}: SubjectDetailProps) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'pdfs' | 'mcqs'>('topics');
  
  // AI summary states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [activeSummaryTopic, setActiveSummaryTopic] = useState<string | null>(null);

  const filteredChapters = chapters.filter(c => c && c.subject === subjectName && c.isActive !== false);
  
  // Select first chapter by default or when subject/filtered chapters change
  React.useEffect(() => {
    if (filteredChapters.length > 0) {
      const isStillValid = selectedChapter && filteredChapters.some(c => c.id === selectedChapter.id);
      if (!isStillValid) {
        setSelectedChapter(filteredChapters[0]);
      }
    } else {
      setSelectedChapter(null);
    }
  }, [subjectName, filteredChapters, selectedChapter]);

  const currentTopics = selectedChapter
    ? topics.filter(t => t.chapterId === selectedChapter.id)
    : [];

  const currentPDFs = getAllPDFs().filter(
    pdf => pdf.subject === subjectName && (selectedChapter ? pdf.chapter === selectedChapter.name : true)
  );

  const currentMCQs = getAllMCQs().filter(
    q => q.subject === subjectName && (selectedChapter ? q.chapter === selectedChapter.name : true)
  );

  // Starts quiz for the selected chapter
  const handleStartChapterTest = () => {
    if (!selectedChapter) return;
    if (currentMCQs.length === 0) {
      alert('No MCQs available in this chapter yet.');
      return;
    }
    onStartQuiz(currentMCQs, `${selectedChapter.name} Chapter Test`);
  };

  // Starts quiz for a specific topic
  const handleStartTopicTest = (topic: Topic) => {
    const topicMCQs = getAllMCQs().filter(
      q => q.subject === subjectName && q.topic === topic.name
    );
    if (topicMCQs.length === 0) {
      alert(`No pre-set MCQs found for "${topic.name}". Generating custom test using Question Bank baseline...`);
      // Fallback: take general questions from this chapter
      onStartQuiz(currentMCQs.slice(0, 5), `${topic.name} Practice Test`);
      return;
    }
    onStartQuiz(topicMCQs, `${topic.name} Practice Test`);
  };

  // Calls the server-side Gemini summary endpoint
  const handleAISummarize = async (topicName: string, description: string) => {
    setSummaryLoading(true);
    setActiveSummaryTopic(topicName);
    setSummaryResult(null);

    try {
      const summaryText = await summarizeTopic({
        topic: topicName,
        contextText: description,
        subject: subjectName
      });
      setSummaryResult(summaryText);
    } catch (err: any) {
      console.error(err);
      setSummaryResult(`### ❌ AI Summarization Failed\n\nCould not fetch response from server. Error: ${err.message || 'Unknown network error'}. Please verify that your dev server is active and the API key is configured correctly.`);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Subject Header */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            {subjectName === 'Pathology' && <Layers className="w-6 h-6" />}
            {subjectName === 'Pharmacology' && <Brain className="w-6 h-6" />}
            {subjectName === 'Microbiology' && <Stethoscope className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{subjectName}</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">MBBS 2nd Professional Curriculum Integration</p>
          </div>
        </div>

        {selectedChapter && currentMCQs.length > 0 && (
          <button
            onClick={handleStartChapterTest}
            className="w-full md:w-auto px-4 py-2.5 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Launch Chapter Test ({currentMCQs.length} Qs)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chapters Left Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Course Chapters</h3>
          
          {/* Mobile horizontal scrolling list of chapters */}
          <div className="flex lg:hidden overflow-x-auto pb-2 gap-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {filteredChapters.map((chapter) => {
              const isActive = selectedChapter?.id === chapter.id;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setSummaryResult(null);
                    setActiveSummaryTopic(null);
                  }}
                  className={`snap-center shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b] border-[#18181b] dark:border-[#f4f4f5] shadow-sm'
                      : 'bg-white dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {chapter.name}
                </button>
              );
            })}
          </div>

          {/* Desktop vertical list of chapters */}
          <div className="hidden lg:block space-y-2">
            {filteredChapters.map((chapter) => {
              const isActive = selectedChapter?.id === chapter.id;
              return (
                <div
                  key={chapter.id}
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setSummaryResult(null);
                    setActiveSummaryTopic(null);
                  }}
                  className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b] border-[#18181b] dark:border-[#f4f4f5]'
                      : 'bg-white dark:bg-[#18181b] border-[#e4e4e7] dark:border-[#27272a] hover:border-slate-400 dark:hover:border-zinc-500 text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  <h4 className="font-bold text-xs leading-tight">{chapter.name}</h4>
                  <p className={`text-[11px] mt-1.5 leading-relaxed line-clamp-2 ${isActive ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500'}`}>
                    {chapter.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Chapter tabs & content */}
        <div className="lg:col-span-8 space-y-6 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6">
          {selectedChapter ? (
            <div className="space-y-6">
              {/* Active Chapter Intro */}
              <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Active Chapter Study Space</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedChapter.name}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{selectedChapter.description}</p>
              </div>

              {/* Study Area Navigation Tabs */}
              <div className="flex border-b border-[#e4e4e7] dark:border-[#27272a]">
                <button
                  onClick={() => setActiveTab('topics')}
                  className={`pb-3 text-xs font-bold border-b-2 px-4 transition-all cursor-pointer ${
                    activeTab === 'topics'
                      ? 'border-[#18181b] dark:border-white text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Topic Notes & Tests
                </button>
                <button
                  onClick={() => setActiveTab('pdfs')}
                  className={`pb-3 text-xs font-bold border-b-2 px-4 transition-all cursor-pointer ${
                    activeTab === 'pdfs'
                      ? 'border-[#18181b] dark:border-white text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Reference PDFs ({currentPDFs.length})
                </button>
                <button
                  onClick={() => setActiveTab('mcqs')}
                  className={`pb-3 text-xs font-bold border-b-2 px-4 transition-all cursor-pointer ${
                    activeTab === 'mcqs'
                      ? 'border-[#18181b] dark:border-white text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Chapter MCQs ({currentMCQs.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[280px]">
                {/* 1. Topics Tab */}
                {activeTab === 'topics' && (
                  <div className="space-y-3">
                    {currentTopics.length > 0 ? (
                      currentTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-200 transition-colors"
                        >
                          <div className="space-y-1 max-w-lg">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">{topic.name}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">{topic.description}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleAISummarize(topic.name, topic.description)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer border border-transparent"
                            >
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              <span>AI Study summary</span>
                            </button>
                            <button
                              onClick={() => handleStartTopicTest(topic)}
                              className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              <Play className="h-2.5 w-2.5 fill-current stroke-none" />
                              <span>Practice Qs</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <BookOpen className="h-8 w-8 mx-auto stroke-1" />
                        <p className="text-xs font-medium">No custom topics populated under this chapter yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PDFs Tab */}
                {activeTab === 'pdfs' && (
                  <div className="space-y-3">
                    {currentPDFs.length > 0 ? (
                      currentPDFs.map((pdf) => (
                        <div
                          key={pdf.id}
                          className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-start sm:items-center space-x-3 text-left">
                            <div className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{pdf.title}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Source: <span className="font-semibold text-slate-600 dark:text-zinc-300">{pdf.sourceBook}</span> • {pdf.pagesCount} pages • {pdf.fileSize}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => handleAISummarize(pdf.title, `Subject: ${pdf.subject}, Chapter: ${pdf.chapter}, Topic: ${pdf.topic}, Book Source: ${pdf.sourceBook}`)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              <span>AI Extract</span>
                            </button>
                            <a
                              href={pdf.downloadUrl}
                              onClick={(e) => {
                                e.preventDefault();
                                alert(`Simulating PDF download for "${pdf.title}" from storage bucket. Integrations are fully prepared in our Supabase schema.`);
                              }}
                              className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors rounded-lg text-[11px] font-semibold cursor-pointer"
                            >
                              Open PDF
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <FileText className="h-8 w-8 mx-auto stroke-1" />
                        <p className="text-xs font-medium">No custom notes uploaded for this chapter yet.</p>
                        <p className="text-[11px]">Log in as Admin to upload class notes or textbook references!</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MCQs Tab */}
                {activeTab === 'mcqs' && (
                  <div className="space-y-3">
                    {currentMCQs.length > 0 ? (
                      currentMCQs.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => onQuestionClick && onQuestionClick(q.id)}
                          className={`p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-left space-y-2 bg-slate-50/30 dark:bg-zinc-900/10 transition-all ${
                            onQuestionClick ? 'cursor-pointer hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800' : ''
                          }`}
                          title={onQuestionClick ? 'Click to view complete details, explanations & AI Tutor' : undefined}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{q.type}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-bold text-slate-400">{q.difficulty}</span>
                              {onQuestionClick && (
                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5">
                                  <span>View</span>
                                  <ChevronRight className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">{q.question}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Source Book: {q.sourceBook}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <HelpCircle className="h-8 w-8 mx-auto stroke-1" />
                        <p className="text-xs font-medium">No MCQs available under this chapter selection.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <Loader2 className="h-6 w-6 mx-auto stroke-1 animate-spin" />
              <p className="text-xs font-medium">Loading Course Chapter Content...</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary Result Modal */}
      <AnimatePresence>
        {(summaryLoading || summaryResult) && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1c1c1e] w-full max-w-xl rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/20">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <div>
                    <h4 className="font-bold text-slate-950 dark:text-white text-xs">AI Study summary helper</h4>
                    <p className="text-[10px] text-slate-400">Subject: {subjectName} • Topic: {activeSummaryTopic}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSummaryResult(null);
                    setSummaryLoading(false);
                    setActiveSummaryTopic(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 text-left space-y-4">
                {summaryLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 className="h-8 w-8 text-[#18181b] dark:text-[#f4f4f5] animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Consulting Professor Gemini-3.5-flash...</p>
                  </div>
                ) : (
                  <div className="prose prose-blue max-w-none text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {summaryResult}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-900/10 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => {
                    setSummaryResult(null);
                    setSummaryLoading(false);
                    setActiveSummaryTopic(null);
                  }}
                  className="px-4 py-2 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-xs cursor-pointer"
                >
                  I've Memorized This!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
