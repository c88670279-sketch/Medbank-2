import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, LogOut, Menu, X, Sun, Moon,
  Activity, BookOpen, Layers, Brain, Award, Settings,
  Sparkles, ShieldAlert, ChevronRight, User, HelpCircle, Image as ImageIcon, Upload
} from 'lucide-react';

import { User as UserType, SubjectName, MCQ } from './types';
import {
  getSavedUser, saveUser, clearUser, getStats,
  getRecentActivities, getStudyStreak, updateStudyStreak, getUserScopedKey, MOCK_CHAPTERS, MOCK_TOPICS
} from './lib/mockData';
import { fetchDBNotes, fetchDBQuestions, fetchDBTestResults, fetchDBChapters, fetchDBUser, fetchDBTopics, fetchDBSubjects, fetchDBQuestionCounts } from './lib/api';
import { safeStorage } from './lib/safeStorage';

// Component Imports
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SubjectDetail from './components/SubjectDetail';
import QBank from './components/QBank';
import TestSystem from './components/TestSystem';
import AITutor from './components/AITutor';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import AdminPanel from './components/AdminPanel';
import ImportMCQs from './components/ImportMCQs';
import QuestionDetail from './components/QuestionDetail';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName | null>(null);
  const [dbChapters, setDbChapters] = useState<any[]>([]);
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [iframeRestriction, setIframeRestriction] = useState(false);

  // Selected Question Details state
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<string | null>(null);

  // Active quiz state
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<MCQ[] | null>(null);
  const [activeQuizTitle, setActiveQuizTitle] = useState<string>('');

  // Mobile navigation drawer toggle
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Stats / streak state values bound to mock persistence
  const [streak, setStreak] = useState(getStudyStreak());
  const [stats, setStats] = useState(getStats());
  const [activities, setActivities] = useState(getRecentActivities());

  // Bootstrap Auth and initial streak active state
  useEffect(() => {
    const user = safeStorage.getItem('medbank_user');
    if (user) {
      const parsed = JSON.parse(user);
      setCurrentUser(parsed);
      
      // Fetch fresh user data from MongoDB to sync role and metadata
      fetchDBUser(parsed.email).then((updatedUser) => {
        if (updatedUser) {
          setCurrentUser(updatedUser);
          safeStorage.setItem('medbank_user', JSON.stringify(updatedUser));
          if (updatedUser.role === 'admin' && activeTab === 'dashboard') {
            setActiveTab('admin');
          }
        }
      }).catch((err) => {
        console.error('Failed to sync user role on boot:', err);
      });

      const updatedStreak = updateStudyStreak();
      setStreak(updatedStreak);
    }

    const savedTheme = safeStorage.getItem('medbank_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const handleRestriction = () => {
      setIframeRestriction(true);
    };
    window.addEventListener('iframe-cookie-restriction-detected', handleRestriction);
    return () => window.removeEventListener('iframe-cookie-restriction-detected', handleRestriction);
  }, []);

  // Update dynamic user stats when active quiz concludes or deletes
  const refreshStatsData = () => {
    setStats(getStats());
    setActivities(getRecentActivities());
    setStreak(getStudyStreak());
  };

  const syncData = async () => {
    try {
      console.log('Initiating background synchronization with MongoDB Atlas...');
      
      // Fetch items in parallel
      const [dbNotes, dbQuestions, dbResults, liveChapters, liveTopics, liveSubjects] = await Promise.all([
        fetchDBNotes(),
        fetchDBQuestions(undefined, { limit: 50 }),
        fetchDBTestResults(),
        fetchDBChapters(),
        fetchDBTopics(),
        fetchDBSubjects()
      ]);

      if (liveChapters) {
        setDbChapters(liveChapters);
        safeStorage.setItem('medbank_cached_chapters', JSON.stringify(liveChapters));
      }

      if (liveTopics) {
        setDbTopics(liveTopics);
        safeStorage.setItem('medbank_cached_topics', JSON.stringify(liveTopics));
      }

      if (liveSubjects) {
        setDbSubjects(liveSubjects);
        safeStorage.setItem('medbank_cached_subjects', JSON.stringify(liveSubjects));
      }

      setIsInitialSyncDone(true);

      // Prefetch question counts in background and cache
      const userStr = safeStorage.getItem('medbank_user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (userObj?.email) {
        fetchDBQuestionCounts(userObj.email).then((counts) => {
          if (counts) {
            safeStorage.setItem('medbank_cached_counts', JSON.stringify(counts));
          }
        }).catch((e) => {
          console.error('Failed to prefetch question counts:', e);
        });
      }

      let hasUpdates = false;

      if (dbNotes) {
        safeStorage.setItem(getUserScopedKey('medbank_custom_pdfs'), JSON.stringify(dbNotes));
        hasUpdates = true;
      }

      if (dbQuestions) {
        safeStorage.setItem(getUserScopedKey('medbank_custom_mcqs'), JSON.stringify(dbQuestions));
        hasUpdates = true;
      }

      if (dbResults) {
        safeStorage.setItem(getUserScopedKey('medbank_test_attempts'), JSON.stringify(dbResults));
        hasUpdates = true;
      }

      if (hasUpdates) {
        console.log('Synchronization complete. Refreshing local application state...');
        refreshStatsData();
      }
    } catch (err) {
      console.error('Failed to sync state from MongoDB:', err);
    }
  };

  // Synchronize MongoDB Atlas state with local storage cache on tab changes & startup
  useEffect(() => {
    syncData();
  }, [activeTab]);

  const handleLoginSuccess = async (user: UserType) => {
    try {
      // 1. Fetch live user record from MongoDB Atlas to read accurate roles
      const dbUser = await fetchDBUser(user.email);
      const finalUser = dbUser || user;

      // 2. Persist locally and update current user state
      saveUser(finalUser);
      setCurrentUser(finalUser);
      
      const updatedStreak = updateStudyStreak();
      setStreak(updatedStreak);
      refreshStatsData();
      
      // 3. Perform redirect based on role
      if (finalUser.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Login routing error:', err);
      // Fallback redirect with provided login user object
      saveUser(user);
      setCurrentUser(user);
      if (user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    }
  };

  const handleLogout = () => {
    clearUser();
    setCurrentUser(null);
    setSelectedSubject(null);
    setActiveQuizQuestions(null);
    setActiveTab('dashboard');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    safeStorage.setItem('medbank_theme', nextTheme);
  };

  const handleNavigateToSubject = (subjName: SubjectName) => {
    setSelectedSubject(subjName);
    setSelectedQuestionId(null);
    setActiveTab('subject-detail');
    setDrawerOpen(false);
  };

  const handleNavigateToTab = (tabName: string) => {
    setSelectedSubject(null);
    setSelectedQuestionId(null);
    setActiveTab(tabName);
    setDrawerOpen(false);
  };

  const handleViewQuestionDetail = (questionId: string) => {
    setPreviousTab(activeTab);
    setSelectedQuestionId(questionId);
    setActiveTab('question-detail');
    setDrawerOpen(false);
  };

  const handleStartQuiz = (mcqs: MCQ[], title: string) => {
    setActiveQuizQuestions(mcqs);
    setActiveQuizTitle(title);
    setDrawerOpen(false);
  };

  const handleFinishQuiz = () => {
    setActiveQuizQuestions(null);
    setActiveQuizTitle('');
    refreshStatsData();
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#121212] text-[#f4f4f5]' : 'bg-[#fafafa] text-[#18181b]'
    }`}>
      {/* Dynamic Iframe Cookie Block Banner */}
      <AnimatePresence>
        {iframeRestriction && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 max-w-lg w-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-xl shrink-0 text-blue-600 dark:text-blue-400">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-xs font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                Iframe Browser Restriction Detected
              </h4>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                Your browser's privacy settings are blocking secure authorization cookies in this iframe.
                To sync your clinical database and enable high-speed PDF/Image extraction, please open the app in a new tab.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-md hover:shadow-lg shadow-blue-500/25 animate-bounce"
                >
                  <span>Open in New Tab</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setIframeRestriction(false)}
                  className="px-2.5 py-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setIframeRestriction(false)}
              className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-1 shrink-0 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upper Navigation Header bar */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#121212]/95 border-[#27272a]' : 'bg-[#ffffff]/90 border-[#e4e4e7]'
      } backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Permanent Header Tabs */}
            <div className="flex items-center space-x-3 md:space-x-6 flex-1 min-w-0">
              {/* Logo */}
              <div
                onClick={() => handleNavigateToTab('dashboard')}
                className="flex items-center space-x-2 md:space-x-3 cursor-pointer group shrink-0"
              >
                <div className="bg-[#18181b] dark:bg-[#f4f4f5] text-white dark:text-[#18181b] p-1.5 sm:p-2 rounded-lg transition-transform group-hover:scale-102">
                  <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="text-left hidden md:block">
                  <span className={`text-sm sm:text-base font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#18181b]'}`}>
                    MedBank <span className="text-blue-600 dark:text-blue-400 font-extrabold">AI</span>
                  </span>
                  <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider leading-none">
                    MBBS 2nd Year
                  </span>
                </div>
              </div>

              {/* Permanent Header Tabs */}
              <div className="flex items-center bg-slate-100/50 dark:bg-zinc-900/40 p-1 rounded-xl border border-slate-100 dark:border-zinc-800/60 overflow-x-auto scrollbar-none max-w-full">
                <button
                  onClick={() => handleNavigateToTab('dashboard')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5]'
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => handleNavigateToTab('qbank')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'qbank'
                      ? 'bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5]'
                  }`}
                >
                  QBank
                </button>

                <button
                  onClick={() => handleNavigateToTab('import-mcqs')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'import-mcqs'
                      ? 'bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5]'
                  }`}
                >
                  <span className="sm:hidden">Import</span>
                  <span className="hidden sm:inline">Import Questions</span>
                </button>

                <button
                  onClick={() => handleNavigateToTab('admin')}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5]'
                  }`}
                >
                  <span className="sm:hidden">Admin</span>
                  <span className="hidden sm:inline">Admin Panel</span>
                </button>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex space-x-1">
              <button
                onClick={() => handleNavigateToTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b]'
                    : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                }`}
              >
                Dashboard
              </button>
              
              {(dbSubjects.length > 0 ? dbSubjects : [
                { id: 'subj-1', name: 'Pathology' },
                { id: 'subj-2', name: 'Pharmacology' },
                { id: 'subj-3', name: 'Microbiology' }
              ]).map((sub) => (
                <button
                  key={sub.id || sub.name}
                  onClick={() => handleNavigateToSubject(sub.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedSubject === sub.name
                      ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b]'
                      : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                >
                  {sub.name}
                </button>
              ))}

              <button
                onClick={() => handleNavigateToTab('qbank')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'qbank'
                    ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b]'
                    : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                }`}
              >
                QBank
              </button>

              <button
                onClick={() => handleNavigateToTab('import-mcqs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'import-mcqs'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50'
                    : 'text-emerald-600 hover:bg-emerald-50/50 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-emerald-500" />
                <span>Import MCQs</span>
              </button>

              <button
                onClick={() => handleNavigateToTab('aitutor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'aitutor'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50'
                    : 'text-blue-600 hover:bg-blue-50/50 dark:text-blue-400 dark:hover:bg-blue-950/20'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Tutor Lab</span>
              </button>

              <button
                onClick={() => handleNavigateToTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#18181b] text-white dark:bg-[#f4f4f5] dark:text-[#18181b]'
                    : 'text-slate-500 hover:text-[#18181b] dark:text-zinc-400 dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                }`}
              >
                Analytics
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleNavigateToTab('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50'
                      : 'text-red-500 hover:bg-red-50/50'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            {/* Right Quick Controls (Theme toggle, profile avatar, logout) */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-zinc-800 text-amber-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Toggle style theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Profile Avatar indicator */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
                <div className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 w-7.5 h-7.5 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="block text-xs font-semibold leading-tight truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                  <span className="block text-[8px] uppercase font-bold text-slate-400">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-zinc-800 text-rose-400' : 'hover:bg-slate-100 text-slate-500 hover:text-rose-600'
                }`}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile menu toggle button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="xl:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-slate-500"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Navigation */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden xl:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
              onClick={() => setDrawerOpen(false)}
            ></div>

            {/* Sidebar content */}
            <div className="absolute inset-y-0 right-0 max-w-xs w-full flex">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className={`w-full max-w-xs flex flex-col py-6 shadow-2xl overflow-y-auto text-left ${
                  theme === 'dark' ? 'bg-[#1e293b] text-slate-100' : 'bg-white text-slate-800'
                }`}
              >
                {/* Drawer Header */}
                <div className="px-6 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4 mb-4">
                  <span className="font-extrabold text-sm uppercase tracking-wider">Syllabus Navigator</span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="px-4 space-y-2 flex-1">
                  <button
                    onClick={() => handleNavigateToTab('dashboard')}
                    className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Award className="h-4 w-4 text-blue-500" />
                    <span>Dashboard Console</span>
                  </button>

                  <div className="pt-2">
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 px-4 mb-2">Subject Curricula</span>
                    {(dbSubjects.length > 0 ? dbSubjects : [
                      { id: 'subj-1', name: 'Pathology', color: 'text-red-500', icon: Layers },
                      { id: 'subj-2', name: 'Pharmacology', color: 'text-indigo-500', icon: Brain },
                      { id: 'subj-3', name: 'Microbiology', color: 'text-teal-500', icon: Stethoscope }
                    ]).map((sub) => {
                      const IconComp = sub.icon || Layers;
                      const iconColor = sub.color || 'text-indigo-500';
                      return (
                        <button
                          key={sub.id || sub.name}
                          onClick={() => handleNavigateToSubject(sub.name)}
                          className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <IconComp className={`h-4 w-4 ${iconColor}`} />
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800 mt-2 space-y-1">
                    <button
                      onClick={() => handleNavigateToTab('qbank')}
                      className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      <span>Question Bank</span>
                    </button>

                    <button
                      onClick={() => handleNavigateToTab('import-mcqs')}
                      className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer ${
                        activeTab === 'import-mcqs'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Upload className="h-4 w-4 text-emerald-500" />
                      <span>Import MCQs</span>
                    </button>

                    <button
                      onClick={() => handleNavigateToTab('aitutor')}
                      className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    >
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span>AI Study Tutor Bot</span>
                    </button>

                    <button
                      onClick={() => handleNavigateToTab('analytics')}
                      className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Activity className="h-4 w-4 text-slate-400" />
                      <span>Diagnostics</span>
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleNavigateToTab('admin')}
                        className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center space-x-2.5 cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile Drawer Footer info */}
                <div className="px-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Study Streak</span>
                  <span className="block text-sm font-black text-slate-900 dark:text-white mt-1">🔥 {streak.currentStreak} Days Current</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Layout Block */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          {activeQuizQuestions ? (
            /* Locked quiz session overrides standard tab panels */
            <TestSystem
              questions={activeQuizQuestions}
              testTitle={activeQuizTitle}
              onFinishQuiz={handleFinishQuiz}
            />
          ) : (
            <div className="transition-all duration-150">
              {activeTab === 'dashboard' && (
                <Dashboard
                  user={currentUser}
                  streak={streak}
                  stats={stats}
                  recentActivities={activities}
                  onNavigateToSubject={handleNavigateToSubject}
                  onNavigateToTab={handleNavigateToTab}
                />
              )}

              {activeTab === 'subject-detail' && selectedSubject && (
                <SubjectDetail
                  subjectName={selectedSubject}
                  chapters={isInitialSyncDone ? dbChapters : MOCK_CHAPTERS}
                  topics={isInitialSyncDone ? dbTopics : MOCK_TOPICS}
                  onStartQuiz={handleStartQuiz}
                  onQuestionClick={handleViewQuestionDetail}
                />
              )}

              {activeTab === 'qbank' && (
                <QBank
                  onStartQuiz={handleStartQuiz}
                  onQuestionClick={handleViewQuestionDetail}
                />
              )}

              {activeTab === 'question-detail' && selectedQuestionId && (
                <QuestionDetail
                  questionId={selectedQuestionId}
                  onBack={() => {
                    setActiveTab(previousTab || 'qbank');
                  }}
                  onStartQuiz={handleStartQuiz}
                />
              )}

              {activeTab === 'import-mcqs' && (
                <ImportMCQs onRefreshData={syncData} onStartQuiz={handleStartQuiz} />
              )}

              {activeTab === 'aitutor' && (
                <AITutor />
              )}

              {activeTab === 'analytics' && (
                <PerformanceAnalytics stats={stats} />
              )}

              {activeTab === 'admin' && (
                currentUser.role === 'admin' ? (
                  <AdminPanel onRefreshData={syncData} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 shadow-sm">
                    <ShieldAlert className="h-12 w-12 text-rose-500 animate-bounce" />
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Access Restricted</h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Only verified academic administrator accounts with authentic database approval are permitted to modify syllabus structures and MCQ datasets.
                    </p>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Return to Student Dashboard
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
