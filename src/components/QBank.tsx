import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bookmark, BookOpen, Target, ChevronDown, ChevronRight, 
  Check, X, Sparkles, Loader2, Play, AlertCircle, Folder, 
  FolderOpen, FileText, Award, Layers, Flame, RefreshCw 
} from 'lucide-react';
import { MCQ, SubjectName } from '../types';
import { safeStorage } from '../lib/safeStorage';
import { getAllMCQs, getBookmarks, toggleBookmark, getTestAttempts } from '../lib/mockData';
import { explainAnswer, fetchDBQuestions, fetchDBSubjects, fetchDBChapters, fetchDBTopics, fetchDBQuestionCounts } from '../lib/api';

interface QBankProps {
  onStartQuiz: (mcqsToSolve: MCQ[], testTitle: string) => void;
  onQuestionClick?: (questionId: string) => void;
}

export default function QBank({ onStartQuiz, onQuestionClick }: QBankProps) {
  // Current user state from localStorage (role check authorization)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [dbQuestionCounts, setDbQuestionCounts] = useState<{
    total: number;
    subjects: { [key: string]: number };
    chapters: { [key: string]: number };
    topics: { [key: string]: number };
  }>({ total: 0, subjects: {}, chapters: {}, topics: {} });
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = safeStorage.getItem('medbank_user');
      if (u) {
        setCurrentUser(JSON.parse(u));
      }
    } catch (e) {
      console.error('Error loading current user in QBank:', e);
    }
  }, []);

  useEffect(() => {
    setCountsLoading(true);
    setCountsError(null);
    Promise.all([
      fetchDBSubjects(),
      fetchDBChapters(),
      fetchDBTopics(),
      fetchDBQuestionCounts(currentUser?.email)
    ]).then(([subs, chaps, tops, counts]) => {
      setSubjectsList(subs);
      setChaptersList(chaps);
      setTopicsList(tops);
      setDbQuestionCounts(counts);
      if (subs.length > 0) {
        setExpandedSubjects(prev => {
          const init: { [sub: string]: boolean } = {};
          subs.forEach((s, idx) => {
            init[s.name] = idx === 0;
          });
          return init;
        });
      }
    }).catch(err => {
      console.error("Error loading QBank dynamic syllabus options:", err);
      setCountsError(err.message || "Failed to load curriculum counts");
    }).finally(() => {
      setCountsLoading(false);
    });
  }, [currentUser]);

  // Database State
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State (Taxonomy Navigation)
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName | 'All'>('All');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);
  
  // UI Sidebar Tree States
  const [expandedSubjects, setExpandedSubjects] = useState<{ [sub: string]: boolean }>({});
  const [expandedChapters, setExpandedChapters] = useState<{ [chap: string]: boolean }>({});

  // Bookmarks state (bound to localStorage)
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks());

  // Question solving state (per question ID)
  const [solvedAnswers, setSolvedAnswers] = useState<{ [qId: string]: number }>({});
  
  // AI tutor explains state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiActiveQId, setAiActiveQId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;

  // Responsive mobile optimization states
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'paginated' | 'scroll'>('scroll');
  const [scrollLimit, setScrollLimit] = useState(10);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setIsCurriculumOpen(true);
        setViewMode('paginated');
      } else {
        setIsCurriculumOpen(false);
        setViewMode('scroll');
      }
    }
  }, []);

  // Load questions on mount and when user logs in/changes
  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[QBank Rendering] Loading questions from MongoDB Atlas...');
      const email = currentUser?.email || '';
      
      const isClientFiltering = showBookmarkedOnly || showIncorrectOnly;
      const page = isClientFiltering ? undefined : (viewMode === 'paginated' ? currentPage : 1);
      const limit = isClientFiltering ? undefined : (viewMode === 'paginated' ? 20 : scrollLimit);

      const [res, countsData] = await Promise.all([
        fetchDBQuestions(email, {
          page,
          limit,
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          type: selectedType,
          search: search
        }),
        fetchDBQuestionCounts(email)
      ]);

      if (res && typeof res === 'object' && 'questions' in res) {
        setQuestions(res.questions || []);
        setTotalQuestions(res.total || 0);
      } else if (Array.isArray(res)) {
        setQuestions(res);
        setTotalQuestions(res.length);
      } else {
        console.warn('[QBank Rendering] Questions collection is empty or invalid. Falling back to local mock MCQs.');
        setQuestions(getAllMCQs());
        setTotalQuestions(getAllMCQs().length);
      }

      if (countsData) {
        setDbQuestionCounts(countsData);
      }
    } catch (err: any) {
      console.error('[QBank Rendering] Failed to fetch questions from MongoDB:', err);
      setError(err.message || 'Failed to load questions from database.');
      setQuestions(getAllMCQs());
      setTotalQuestions(getAllMCQs().length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadQuestions();
    }, 300);
    return () => clearTimeout(handler);
  }, [
    currentUser, 
    currentPage, 
    scrollLimit, 
    viewMode, 
    selectedSubject, 
    selectedChapter, 
    selectedTopic, 
    selectedDifficulty, 
    selectedType, 
    search,
    showBookmarkedOnly,
    showIncorrectOnly
  ]);

  // Read all incorrect question IDs from previous attempts
  const incorrectQuestionIds = useMemo(() => {
    const attempts = getTestAttempts();
    const ids = new Set<string>();
    attempts.forEach(att => {
      if (att && att.selectedAnswers) {
        Object.entries(att.selectedAnswers).forEach(([qId, selected]) => {
          const question = questions.find(q => q.id === qId);
          if (question) {
            if (Array.isArray(selected)) {
              const isCorrect = selected.length === 1 && selected[0] === question.correctAnswer;
              if (!isCorrect) ids.add(qId);
            } else {
              if (selected !== question.correctAnswer) ids.add(qId);
            }
          }
        });
      }
    });
    return ids;
  }, [questions]);

  // Dynamic Syllabus Tree Structure extracted straight from MongoDB questions data
  const dynamicSyllabus = useMemo(() => {
    const defaultSyllabus: { [sub: string]: { [chap: string]: string[] } } = {};

    // 1. Initialize from database subjects and chapters
    subjectsList.forEach(sub => {
      if (sub && sub.name) {
        defaultSyllabus[sub.name] = {};
        chaptersList
          .filter(c => c.subject?.toLowerCase() === sub.name?.toLowerCase())
          .forEach(c => {
            if (c && c.name) {
              defaultSyllabus[sub.name][c.name] = [];
            }
          });
      }
    });

    // 2. Enrich with database-fetched topicsList
    topicsList.forEach(top => {
      if (!top || !top.name) return;
      const ch = chaptersList.find(c => c.id === top.chapterId || c._id === top.chapterId);
      if (ch && ch.name) {
        const subName = ch.subject || top.subject;
        if (subName && defaultSyllabus[subName] && defaultSyllabus[subName][ch.name]) {
          if (!defaultSyllabus[subName][ch.name].includes(top.name)) {
            defaultSyllabus[subName][ch.name].push(top.name);
          }
        }
      }
    });

    // 3. Fallback: Enrich with actual questions' unique subjects, chapters, and topics
    questions.forEach(q => {
      const sub = q.subject || (subjectsList[0]?.name || 'Pathology');
      const chap = q.chapter || 'General Medicine';
      const top = q.topic || 'General Concepts';

      if (!defaultSyllabus[sub]) {
        defaultSyllabus[sub] = {};
      }
      if (!defaultSyllabus[sub][chap]) {
        defaultSyllabus[sub][chap] = [];
      }
      if (!defaultSyllabus[sub][chap].includes(top)) {
        defaultSyllabus[sub][chap].push(top);
      }
    });

    return defaultSyllabus;
  }, [questions, subjectsList, chaptersList, topicsList]);

  // Compute counts for subjects, chapters, and topics to display in the tree selector
  const syllabusCounts = useMemo(() => {
    if (dbQuestionCounts && dbQuestionCounts.total > 0) {
      return dbQuestionCounts;
    }

    const counts: {
      total: number;
      subjects: { [sub: string]: number };
      chapters: { [chap: string]: number };
      topics: { [top: string]: number };
    } = {
      total: questions.length,
      subjects: {},
      chapters: {},
      topics: {}
    };

    questions.forEach(q => {
      const sub = q.subject || 'Pathology';
      const chap = q.chapter || 'General Medicine';
      const top = q.topic || 'General Concepts';

      counts.subjects[sub] = (counts.subjects[sub] || 0) + 1;
      counts.chapters[chap] = (counts.chapters[chap] || 0) + 1;
      counts.topics[top] = (counts.topics[top] || 0) + 1;
    });

    return counts;
  }, [questions, dbQuestionCounts]);

  // Filtered MCQs list based on all filters + tree navigation selections
  const filteredMCQs = useMemo(() => {
    let list = questions;

    // 1. Sidebar Tree Subject Filter
    if (selectedSubject !== 'All') {
      list = list.filter(item => item.subject === selectedSubject);
    }

    // 2. Sidebar Tree Chapter Filter
    if (selectedChapter !== 'All') {
      list = list.filter(item => item.chapter === selectedChapter);
    }

    // 3. Sidebar Tree Topic Filter
    if (selectedTopic !== 'All') {
      list = list.filter(item => item.topic === selectedTopic);
    }

    // 4. Full-text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        item =>
          item.question.toLowerCase().includes(q) ||
          item.explanation.toLowerCase().includes(q) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q))) ||
          (item.chapter && item.chapter.toLowerCase().includes(q)) ||
          (item.topic && item.topic.toLowerCase().includes(q))
      );
    }

    // 5. Difficulty filter
    if (selectedDifficulty !== 'All') {
      list = list.filter(item => item.difficulty === selectedDifficulty);
    }

    // 6. Type filter
    if (selectedType !== 'All') {
      list = list.filter(item => item.type === selectedType);
    }

    // 7. Bookmarked only filter
    if (showBookmarkedOnly) {
      list = list.filter(item => bookmarks.includes(item.id));
    }

    // 8. Incorrect only filter
    if (showIncorrectOnly) {
      list = list.filter(item => incorrectQuestionIds.has(item.id));
    }

    return list;
  }, [
    questions, search, selectedSubject, selectedChapter, selectedTopic, 
    selectedDifficulty, selectedType, showBookmarkedOnly, showIncorrectOnly, 
    bookmarks, incorrectQuestionIds
  ]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
    setScrollLimit(10);
  }, [
    search, selectedSubject, selectedChapter, selectedTopic, 
    selectedDifficulty, selectedType, showBookmarkedOnly, showIncorrectOnly
  ]);

  // Paginated questions variables
  const totalPages = useMemo(() => {
    const isClientFiltering = showBookmarkedOnly || showIncorrectOnly;
    const total = isClientFiltering ? filteredMCQs.length : totalQuestions;
    return Math.max(1, Math.ceil(total / (viewMode === 'paginated' ? 20 : scrollLimit)));
  }, [totalQuestions, showBookmarkedOnly, showIncorrectOnly, filteredMCQs.length, viewMode, scrollLimit]);

  const paginatedMCQs = useMemo(() => {
    const isClientFiltering = showBookmarkedOnly || showIncorrectOnly;
    if (isClientFiltering) {
      if (viewMode === 'scroll') {
        return filteredMCQs.slice(0, scrollLimit);
      }
      const sIdx = (currentPage - 1) * 20;
      return filteredMCQs.slice(sIdx, sIdx + 20);
    }
    return filteredMCQs;
  }, [filteredMCQs, showBookmarkedOnly, showIncorrectOnly, viewMode, scrollLimit, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleToggleBookmark = (id: string) => {
    const nextBks = toggleBookmark(id);
    setBookmarks(nextBks);
  };

  const handleSelectOption = (qId: string, optionIdx: number) => {
    if (solvedAnswers[qId] !== undefined) return; // Prevent double answer
    setSolvedAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleConsultAI = async (mcq: MCQ, selectedOptionIdx: number) => {
    setAiLoading(true);
    setAiActiveQId(mcq.id);
    setAiResult(null);

    const isCorrect = selectedOptionIdx === mcq.correctAnswer;
    try {
      const text = await explainAnswer({
        question: mcq.question,
        optionSelected: mcq.options[selectedOptionIdx],
        isCorrect,
        correctAnswer: mcq.options[mcq.correctAnswer],
        explanation: mcq.explanation,
        subject: mcq.subject
      });
      setAiResult(text);
    } catch (err: any) {
      console.error(err);
      setAiResult(`### ❌ AI Consulting Error\n\nCould not fetch response. error: ${err.message || 'Unknown network error'}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Launch dynamic customized tests
  const launchCustomQuiz = (questionsList: MCQ[], title: string) => {
    if (questionsList.length === 0) {
      alert('There are no questions in this category yet to generate a test.');
      return;
    }
    onStartQuiz(questionsList.slice(0, 10), title);
  };

  const launchExamMode = (questionsList: MCQ[], title: string) => {
    if (questionsList.length === 0) {
      alert('There are no questions in this category yet to generate an exam.');
      return;
    }
    // Exam mode launches up to 25 items
    onStartQuiz(questionsList.slice(0, 25), `${title} - Mock Exam`);
  };

  const handleToggleSubjectCollapse = (sub: string) => {
    setExpandedSubjects(prev => ({ ...prev, [sub]: !prev[sub] }));
  };

  const handleToggleChapterCollapse = (chap: string) => {
    setExpandedChapters(prev => ({ ...prev, [chap]: !prev[chap] }));
  };

  // Navigate standard path
  const handleSelectSyllabusNode = (sub: SubjectName | 'All', chap: string = 'All', top: string = 'All') => {
    setSelectedSubject(sub);
    setSelectedChapter(chap);
    setSelectedTopic(top);
  };

  // Pre-compiled Mock Tests
  const individualTests = [
    { name: 'Pathology Comprehensive Mock', subject: 'Pathology', count: 25 },
    { name: 'Pharmacology Board Simulator', subject: 'Pharmacology', count: 25 },
    { name: 'Microbiology Infection Control', subject: 'Microbiology', count: 25 }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Dynamic Status / Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-extrabold tracking-tight">University Medical QBank</h2>
          </div>
          <p className="text-xs text-indigo-200/80 font-medium max-w-xl">
            MBBS Professional Exam Prep platform. Use the curriculum tree navigator below to filter questions by Subject, Chapter, and Topic instantly.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadQuestions}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700/50 transition-colors flex items-center justify-center cursor-pointer"
            title="Reload QBank from Atlas"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {filteredMCQs.length > 0 && (
            <button
              onClick={() => launchCustomQuiz(filteredMCQs, 'Filtered QBank Practice')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Launch Quiz ({Math.min(filteredMCQs.length, 10)} Qs)</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Toggle for Curriculum Explorer */}
      <div className="lg:hidden w-full">
        <button
          type="button"
          onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-sm"
        >
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <span>Curriculum Explorer & Mock Tests</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {selectedSubject === 'All' ? 'All Questions' : selectedSubject}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isCurriculumOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Interactive Curriculum Tree Selector */}
        {isCurriculumOpen && (
          <div className="lg:col-span-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Curriculum Explorer</span>
            </div>
            <button 
              onClick={() => handleSelectSyllabusNode('All')}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Clear Navigation
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* All Subjects Root Node */}
            <button
              onClick={() => handleSelectSyllabusNode('All')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all text-left border ${
                selectedSubject === 'All' 
                  ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-950/40' 
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Show All Questions</span>
              </div>
              <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500">
                {syllabusCounts.total}
              </span>
            </button>

            {/* Subject Nodes */}
            <div className="space-y-2 border-t border-slate-50 dark:border-zinc-850 pt-3">
              {(Object.keys(dynamicSyllabus) as SubjectName[]).map(sub => {
                const isSubjectActive = selectedSubject === sub;
                const isSubjectExpanded = expandedSubjects[sub];
                const chapters = dynamicSyllabus[sub];
                const subCount = syllabusCounts.subjects[sub] || 0;

                return (
                  <div key={sub} className="space-y-1">
                    <div className="flex items-center justify-between w-full">
                      <button
                        onClick={() => {
                          handleSelectSyllabusNode(sub);
                          handleToggleSubjectCollapse(sub);
                        }}
                        className={`flex-1 flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all text-left ${
                          isSubjectActive && selectedChapter === 'All'
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          {isSubjectExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                          <span className="truncate">{sub}</span>
                        </div>
                        <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-slate-500 shrink-0 ml-1">
                          {subCount}
                        </span>
                      </button>
                    </div>

                    {/* Chapter Dropdown under Subject */}
                    {isSubjectExpanded && (
                      <div className="pl-4 border-l border-slate-100 dark:border-zinc-850 space-y-1 ml-3 mt-1">
                        {Object.keys(chapters).map(chap => {
                          const isChapterActive = selectedSubject === sub && selectedChapter === chap;
                          const isChapterExpanded = expandedChapters[chap];
                          const topics = chapters[chap];
                          const chapCount = syllabusCounts.chapters[chap] || 0;

                          return (
                            <div key={chap} className="space-y-1">
                              <button
                                onClick={() => {
                                  handleSelectSyllabusNode(sub, chap);
                                  handleToggleChapterCollapse(chap);
                                }}
                                className={`w-full flex items-center justify-between p-1.5 rounded-md text-[11px] font-semibold transition-all text-left ${
                                  isChapterActive && selectedTopic === 'All'
                                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold'
                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  {isChapterExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                                  <span className="truncate">{chap}</span>
                                </div>
                                <span className="text-[9px] text-slate-400 shrink-0 ml-1 font-bold">
                                  ({chapCount})
                                </span>
                              </button>

                              {/* Topics Dropdown under Chapter */}
                              {isChapterExpanded && (
                                <div className="pl-3 border-l border-slate-100 dark:border-zinc-800 space-y-1 ml-2.5">
                                  {topics.map(top => {
                                    const isTopicActive = selectedSubject === sub && selectedChapter === chap && selectedTopic === top;
                                    const topCount = syllabusCounts.topics[top] || 0;

                                    return (
                                      <button
                                        key={top}
                                        onClick={() => handleSelectSyllabusNode(sub, chap, top)}
                                        className={`w-full flex items-center justify-between p-1 rounded-md text-[10px] transition-all text-left ${
                                          isTopicActive
                                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-1 min-w-0">
                                          <div className={`w-1 h-1 rounded-full ${isTopicActive ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                          <span className="truncate">{top}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 shrink-0">
                                          {topCount}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Individual Mock Tests Section */}
            <div className="border-t border-[#e4e4e7] dark:border-[#27272a] pt-4 space-y-2">
              <span className="font-extrabold text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Individual Mock Tests</span>
              <div className="space-y-1.5">
                {individualTests.map(test => {
                  const testQs = questions.filter(q => q.subject === test.subject);
                  
                  return (
                    <button
                      key={test.name}
                      onClick={() => launchExamMode(testQs, test.name)}
                      className="w-full text-left p-2 border border-dashed border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg flex items-center justify-between text-[11px] transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-700 dark:text-zinc-300 truncate">{test.name}</span>
                      </div>
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded">
                        Exam Mode
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Right Side: Questions list and interactive filters */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active navigation state overview */}
          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Selection</span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200 font-bold">
                <span>Question Bank</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className={selectedSubject !== 'All' ? 'text-indigo-600 dark:text-indigo-400' : ''}>{selectedSubject === 'All' ? 'All Subjects' : selectedSubject}</span>
                {selectedChapter !== 'All' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-indigo-600 dark:text-indigo-400">{selectedChapter}</span>
                  </>
                )}
                {selectedTopic !== 'All' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[#18181b] dark:text-white underline decoration-wavy decoration-indigo-400">{selectedTopic}</span>
                  </>
                )}
              </div>
            </div>

            {filteredMCQs.length > 0 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => launchCustomQuiz(filteredMCQs, `Practice Test: ${selectedTopic !== 'All' ? selectedTopic : selectedChapter !== 'All' ? selectedChapter : selectedSubject}`)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Layers className="h-3 w-3" />
                  <span>Start Topic Quiz ({Math.min(filteredMCQs.length, 10)} Qs)</span>
                </button>

                <button
                  onClick={() => launchExamMode(filteredMCQs, `Exam Simulator: ${selectedSubject}`)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#18181b] dark:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-[11px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Flame className="h-3 w-3" />
                  <span>Simulate Exam (25 Qs)</span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic search & metadata filters */}
          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search keywords, diagnosis, chapter topic or book source..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg text-xs focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedDifficulty}
                  onChange={(e: any) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg text-xs focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Question Type Filter */}
              <div className="md:col-span-3">
                <select
                  value={selectedType}
                  onChange={(e: any) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg text-xs focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
                >
                  <option value="All">All Question Types</option>
                  <option value="Single Best Answer">Single Best Answer</option>
                  <option value="Clinical Scenario">Clinical Scenario</option>
                  <option value="Assertion & Reason">Assertion & Reason</option>
                  <option value="Clinical Case Based">Clinical Case Based</option>
                  <option value="Image-based MCQ">Image Based</option>
                </select>
              </div>
            </div>

            {/* Toggle review filters */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  setShowBookmarkedOnly(!showBookmarkedOnly);
                  if (showIncorrectOnly) setShowIncorrectOnly(false);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                  showBookmarkedOnly
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
                    : 'bg-white dark:bg-[#18181b] text-slate-500 border-[#e4e4e7] dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
              >
                <Bookmark className={`h-3 w-3 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
                <span>Bookmarked Only ({bookmarks.length})</span>
              </button>

              <button
                onClick={() => {
                  setShowIncorrectOnly(!showIncorrectOnly);
                  if (showBookmarkedOnly) setShowBookmarkedOnly(false);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                  showIncorrectOnly
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/50'
                    : 'bg-white dark:bg-[#18181b] text-slate-500 border-[#e4e4e7] dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
              >
                <X className="h-3.5 w-3.5 text-rose-500" />
                <span>Review Incorrect Qs ({incorrectQuestionIds.size})</span>
              </button>

              {(selectedSubject !== 'All' || selectedChapter !== 'All' || selectedTopic !== 'All' || selectedDifficulty !== 'All' || selectedType !== 'All' || search || showBookmarkedOnly || showIncorrectOnly) && (
                <button
                  onClick={() => {
                    setSelectedSubject('All');
                    setSelectedChapter('All');
                    setSelectedTopic('All');
                    setSelectedDifficulty('All');
                    setSelectedType('All');
                    setSearch('');
                    setShowBookmarkedOnly(false);
                    setShowIncorrectOnly(false);
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer ml-auto"
                >
                  Reset Active Filters
                </button>
              )}
            </div>

            {/* View Mode Settings Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Paging & Lazy-Load Settings:</span>
              <div className="flex items-center space-x-1 bg-slate-100/70 dark:bg-zinc-800/50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('scroll')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    viewMode === 'scroll'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-850 dark:hover:text-zinc-200'
                  }`}
                >
                  Thumb Scroll (Continuous)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('paginated')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    viewMode === 'paginated'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-850 dark:hover:text-zinc-200'
                  }`}
                >
                  Page-by-Page (Classic)
                </button>
              </div>
            </div>
          </div>

          {/* MCQ list display */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4 shadow-sm animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/4"></div>
                      <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-16"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-5/6"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {[1, 2, 3, 4].map((o) => (
                        <div key={o} className="h-10 bg-slate-100/70 dark:bg-zinc-900/60 rounded border border-slate-200/30 dark:border-zinc-800/30"></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-20"></div>
                      <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error && questions.length === 0 ? (
              <div className="bg-white dark:bg-[#18181b] border border-red-200 dark:border-red-950/20 rounded-2xl p-12 text-center text-red-500 space-y-3">
                <AlertCircle className="h-10 w-10 mx-auto text-red-400" />
                <h4 className="font-bold text-xs">Failed to Sync Database Connection</h4>
                <p className="text-[11px] max-w-sm mx-auto text-slate-500">{error}</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-16 text-center text-slate-400 space-y-3">
                <BookOpen className="h-12 w-12 mx-auto stroke-1 text-slate-300" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">No MCQ Library Found</h4>
                <p className="text-xs max-w-md mx-auto leading-relaxed text-slate-500">
                  The system database is empty. Go to the Admin Panel (top-right navigation) to upload medical notes or board exam PDFs to extract high-yield questions immediately!
                </p>
              </div>
            ) : filteredMCQs.length > 0 ? (
              paginatedMCQs.map((mcq, idx) => {
                const isBookmarked = bookmarks.includes(mcq.id);
                const userChoice = solvedAnswers[mcq.id];
                const hasSolved = userChoice !== undefined;

                return (
                  <div
                    key={mcq.id || idx}
                    className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-4 shadow-sm"
                  >
                    {/* Meta information strip */}
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-0.5 rounded-md">
                          {mcq.subject}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 px-2.5 py-0.5 rounded-md max-w-[150px] truncate">
                          {mcq.chapter}
                        </span>
                        {mcq.topic && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-0.5 rounded-md max-w-[150px] truncate">
                            {mcq.topic}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          mcq.difficulty === 'Easy' ? 'text-emerald-600' :
                          mcq.difficulty === 'Medium' ? 'text-indigo-600' : 'text-rose-500'
                        }`}>
                          {mcq.difficulty}
                        </span>
                        {mcq.source && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">
                            {mcq.source}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {onQuestionClick && (
                          <button
                            onClick={() => onQuestionClick(mcq.id || mcq._id)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 cursor-pointer mr-1"
                          >
                            <span>View Details</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleBookmark(mcq.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors cursor-pointer"
                          title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                        >
                          <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? 'fill-current text-indigo-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* MCQ stem body */}
                    <div className="space-y-3 text-left">
                      {mcq.sourceBook && (
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
                      )}
                      <h3
                        onClick={() => onQuestionClick && onQuestionClick(mcq.id || mcq._id)}
                        className={`font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap ${
                          onQuestionClick ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors' : ''
                        }`}
                        title={onQuestionClick ? 'Click to view complete details, explanations & AI Tutor' : undefined}
                      >
                        {mcq.question}
                      </h3>
                      {mcq.image && (
                        <div className="my-3 max-w-sm rounded-lg overflow-hidden border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50 dark:bg-black flex justify-center">
                          <img 
                            src={mcq.image} 
                            alt="Medical clinical clue" 
                            className="object-contain max-h-[300px] w-full" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {mcq.options.map((option, oIdx) => {
                        const isSelected = userChoice === oIdx;
                        const isCorrectOption = oIdx === mcq.correctAnswer;
                        
                        let optionStyle = 'border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/20 dark:bg-[#18181b]/30 hover:bg-slate-50 dark:hover:bg-zinc-800';
                        if (hasSolved) {
                          if (isCorrectOption) {
                            optionStyle = 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-950 dark:text-emerald-300 font-semibold';
                          } else if (isSelected) {
                            optionStyle = 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/10 text-rose-950 dark:text-rose-300';
                          } else {
                            optionStyle = 'border-slate-100 dark:border-zinc-800 opacity-50';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectOption(mcq.id, oIdx)}
                            disabled={hasSolved}
                            className={`w-full p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <div className="flex items-center space-x-3 text-left">
                              <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                isSelected ? 'bg-indigo-600 text-white border-transparent' : 'bg-white dark:bg-[#18181b] text-slate-500 border-slate-200 dark:border-zinc-800'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="leading-relaxed">{option}</span>
                            </div>
                            
                            {hasSolved && isCorrectOption && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs shrink-0 ml-2">✓ Correct</span>
                            )}
                            {hasSolved && isSelected && !isCorrectOption && (
                              <span className="text-rose-500 font-extrabold text-xs shrink-0 ml-2">✗ Incorrect</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanations fold */}
                    {hasSolved && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-slate-50/80 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed space-y-4"
                      >
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 dark:text-white block">Medical Review Explanation</span>
                          <p>{mcq.explanation}</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                          <span>Syllabus Source: {mcq.sourceBook || 'Clinical Syllabus'}</span>
                          {mcq.tags && mcq.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>

                        <div className="border-t border-slate-200 dark:border-zinc-800 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold">Need further clinical clarification?</span>
                          <button
                            onClick={() => handleConsultAI(mcq, userChoice)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Ask AI Board Tutor</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-16 text-center text-slate-400 space-y-3">
                <BookOpen className="h-10 w-10 mx-auto stroke-1 text-slate-300" />
                <h4 className="font-bold text-slate-800 dark:text-white text-xs">No Matching Questions Found</h4>
                <p className="text-[11px] max-w-sm mx-auto">
                  No MCQs matched your active curriculum navigation and filters. Try clicking "Show All Questions" or resetting difficulty parameters.
                </p>
              </div>
            )}
          </div>

          {/* Continuous Scroll Load More Trigger */}
          {!loading && viewMode === 'scroll' && scrollLimit < (showBookmarkedOnly || showIncorrectOnly ? filteredMCQs.length : totalQuestions) && (
            <div className="pt-2 pb-6 text-center">
              <button
                type="button"
                onClick={() => setScrollLimit(prev => prev + 12)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md inline-flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Load More Questions</span>
              </button>
            </div>
          )}

          {/* Pagination bar */}
          {!loading && viewMode === 'paginated' && (showBookmarkedOnly || showIncorrectOnly ? filteredMCQs.length : totalQuestions) > 20 && (
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-white">{((currentPage - 1) * 20) + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * 20, showBookmarkedOnly || showIncorrectOnly ? filteredMCQs.length : totalQuestions)}</span> of <span className="font-bold text-slate-900 dark:text-white">{showBookmarkedOnly || showIncorrectOnly ? filteredMCQs.length : totalQuestions}</span> questions
              </span>
              
              <div className="flex flex-wrap items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-[10px] font-bold text-slate-700 dark:text-zinc-300 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                
                {getPageNumbers().map((pageNum, i) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${i}`} className="w-7 h-7 text-[10px] flex items-center justify-center text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const isSelected = pageNum === currentPage;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum as number)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-[10px] font-bold text-slate-700 dark:text-zinc-300 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Diagnostic Tutor Modal */}
      <AnimatePresence>
        {(aiLoading || aiResult) && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1c1c1e] w-full max-w-xl rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/20">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span className="font-extrabold text-xs text-slate-950 dark:text-white uppercase tracking-wider">AI Medical Tutor</span>
                </div>
                <button
                  onClick={() => {
                    setAiResult(null);
                    setAiLoading(false);
                    setAiActiveQId(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 text-left space-y-4">
                {aiLoading ? (
                  <div className="py-16 text-center space-y-3">
                    <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Synthesizing clinical response, pathological pathways, and MBBS study references...</p>
                  </div>
                ) : (
                  <div className="prose prose-indigo text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
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
                  className="px-4 py-2 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  Understood, close Tutor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
