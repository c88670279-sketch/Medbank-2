import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, BookOpen, Clock, Activity, CheckCircle, TrendingUp, Sparkles, ChevronRight, AlertTriangle, HelpCircle } from 'lucide-react';
import { User, StudyStreak, UserStats, RecentActivity } from '../types';
import { fetchDBSubjects, fetchDBChapters } from '../lib/api';

interface DashboardProps {
  user: User;
  streak: StudyStreak;
  stats: UserStats;
  recentActivities: RecentActivity[];
  onNavigateToSubject: (subjectName: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function Dashboard({
  user,
  streak,
  stats,
  recentActivities,
  onNavigateToSubject,
  onNavigateToTab
}: DashboardProps) {

  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetchDBSubjects(), fetchDBChapters()]).then(([subs, chaps]) => {
      setSubjectsList(subs);
      setChaptersList(chaps);
    }).catch(err => console.error("Error loading dashboard subjects:", err));
  }, []);

  // Formats time from seconds to a human-readable duration (e.g., "4h 15m")
  const formatStudyTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute right-0 bottom-0 top-0 opacity-5 pointer-events-none flex items-center justify-center">
          <Award className="w-48 h-48 translate-x-8 translate-y-8 text-[#18181b] dark:text-[#f4f4f5]" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold rounded uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Syllabus Progress Momentum</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#18181b] dark:text-white tracking-tight">
            Welcome back, {user.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            Your momentum is excellent. Today is ideal to master high-yield cellular pathology cells, receptor agonists, or bacteriology cultures.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateToTab('aitutor')}
              className="px-3.5 py-2 bg-[#18181b] hover:bg-black dark:bg-[#f4f4f5] dark:hover:bg-white text-white dark:text-[#18181b] transition-colors text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Consult AI Tutor Bot</span>
              <Sparkles className="h-3 w-3 text-amber-400 dark:text-amber-500" />
            </button>
            <button
              onClick={() => onNavigateToTab('qbank')}
              className="px-3.5 py-2 bg-white dark:bg-[#18181b] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-colors text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              <span>Browse Question Bank</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Study Streak</span>
              <span className="block text-xl font-bold text-[#18181b] dark:text-[#f4f4f5]">{streak.currentStreak} Days</span>
            </div>
            <span className="text-lg">🔥</span>
          </div>
          <div className="mt-4 text-[11px] text-slate-400 font-medium">
            Longest Streak: <span className="text-slate-700 dark:text-zinc-300 font-bold">{streak.longestStreak} days</span>
          </div>
        </div>

        {/* Solved Count Card */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Questions Solved</span>
              <span className="block text-xl font-bold text-[#18181b] dark:text-[#f4f4f5]">{stats.solvedCount}</span>
            </div>
            <span className="p-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-lg">
              <HelpCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 text-[11px] text-slate-400 font-medium">
            Correctly Answered: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.correctCount}</span>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Average Accuracy</span>
              <span className="block text-xl font-bold text-[#18181b] dark:text-[#f4f4f5]">{stats.accuracy}%</span>
            </div>
            <span className="p-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          {/* Visual progress bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div className="bg-[#18181b] dark:bg-zinc-300 h-full rounded-full" style={{ width: `${stats.accuracy}%` }}></div>
            </div>
          </div>
        </div>

        {/* Study Time Card */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Time Studied</span>
              <span className="block text-xl font-bold text-[#18181b] dark:text-[#f4f4f5]">{formatStudyTime(stats.studyTimeSeconds)}</span>
            </div>
            <span className="p-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 text-[11px] text-slate-400 font-medium">
            Daily Target: <span className="text-slate-700 dark:text-zinc-300 font-bold">45 mins</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Subjects & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Core Subjects Shortcuts & Continue Learning */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">MBBS core curriculum</h3>
            <span className="text-[11px] font-bold text-slate-400">2nd Professional Year</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectsList.map((sub: any, i: number) => {
              const count = chaptersList.filter((c: any) => c.subject?.toLowerCase() === sub.name?.toLowerCase()).length;
              const colors = [
                { bg: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' },
                { bg: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' },
                { bg: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400' },
                { bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' },
                { bg: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' }
              ];
              const col = colors[i % colors.length];
              const tag = (sub.name || 'SUB').substring(0, 3).toUpperCase();
              return (
                <div
                  key={sub.id || sub.name}
                  onClick={() => onNavigateToSubject(sub.name)}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:border-slate-400 dark:hover:border-zinc-500 transition-all cursor-pointer text-left space-y-3 group"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${col.bg}`}>
                    {tag}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#18181b] dark:text-[#f4f4f5] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{sub.name}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 line-clamp-2">
                      {sub.description || `Explore High-yield clinical outlines and practice active recall sessions.`}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-50 dark:border-zinc-800">
                    <span className="text-slate-400 font-semibold">Chapters: {count}</span>
                    <span className="text-slate-700 dark:text-zinc-300 font-bold flex items-center">
                      Study <ChevronRight className="h-3 w-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
            {subjectsList.length === 0 && (
              <div className="col-span-3 py-8 text-center text-slate-400 dark:text-zinc-500 text-xs font-semibold">
                No core subjects loaded. Go to Admin Panel to populate syllabus.
              </div>
            )}
          </div>

          {/* Weak / Strong Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Weak topics */}
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-bold text-xs text-[#18181b] dark:text-[#f4f4f5]">Requires Revision</h4>
              </div>
              <div className="space-y-2">
                {stats.weakTopics.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                    <div>
                      <span className="block font-semibold text-slate-800 dark:text-zinc-200">{item.topic}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">{item.subject}</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {item.accuracy}% Accuracy
                    </span>
                  </div>
                ))}
                {stats.weakTopics.length === 0 && (
                  <div className="text-center py-6 text-slate-400 space-y-1">
                    <p className="text-[11px] font-semibold">No revision items yet</p>
                    <p className="text-[9px] leading-tight">Your low-accuracy topic results will be aggregated here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Strong topics */}
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-500">
                <TrendingUp className="w-4 h-4" />
                <h4 className="font-bold text-xs text-[#18181b] dark:text-[#f4f4f5]">Mastered Topics</h4>
              </div>
              <div className="space-y-2">
                {stats.strongTopics.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                    <div>
                      <span className="block font-semibold text-slate-800 dark:text-zinc-200">{item.topic}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">{item.subject}</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {item.accuracy}% Accuracy
                    </span>
                  </div>
                ))}
                {stats.strongTopics.length === 0 && (
                  <div className="text-center py-6 text-slate-400 space-y-1">
                    <p className="text-[11px] font-semibold">No mastered topics yet</p>
                    <p className="text-[9px] leading-tight">High accuracy performance topics will be highlighted here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Activity Stream</h3>
            <span className="text-[10px] font-bold text-slate-400">Updates</span>
          </div>

          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-5">
            {recentActivities.map((activity, idx) => (
              <div key={activity.id || idx} className="flex items-start space-x-3 text-left">
                <div className="p-1 bg-slate-50 dark:bg-zinc-800 rounded text-slate-400 mt-0.5">
                  <Activity className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate">{activity.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{activity.subtitle}</p>
                  <span className="block text-[9px] text-slate-400 font-semibold pt-1">{activity.timestamp}</span>
                </div>
              </div>
            ))}

            {recentActivities.length === 0 && (
              <div className="text-center py-8 space-y-2 text-slate-400">
                <BookOpen className="h-6 w-6 mx-auto stroke-1" />
                <p className="text-[11px] font-medium">No recent activity. Solve a test to track your updates!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
