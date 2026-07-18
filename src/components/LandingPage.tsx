import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Stethoscope, Shield, Brain, BookOpen, Layers, LogIn, Lock, Mail, User, Sparkles, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { registerUser, loginUser } from '../lib/api';

interface LandingPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && !name) {
      setError('Please provide your name.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Real MongoDB lookup
        const res = await loginUser(email, password);
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error || 'Invalid credentials or connection error.');
        }
      } else {
        // Real MongoDB registration write
        const res = await registerUser({
          email,
          name,
          role,
          password
        });
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'A network error occurred. Please verify your MongoDB connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="landing-page" className="min-h-screen bg-[#fafafa] text-slate-800 selection:bg-slate-900 selection:text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-[#e4e4e7] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-[#18181b] text-white p-2 rounded-lg">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold tracking-tight text-[#18181b]">
                  MedBank <span className="text-blue-600 font-extrabold">AI</span>
                </span>
                <span className="block text-[8px] uppercase font-semibold text-slate-400 tracking-wider leading-none">
                  MBBS 2ND YEAR
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#18181b] hover:bg-black transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-16 overflow-hidden bg-white border-b border-[#e4e4e7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-200">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Medical board learning platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#18181b] tracking-tight leading-tight">
              Master MBBS 2nd Year with <span className="text-blue-600 font-extrabold">AI-Powered</span> Learning
            </h1>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              An exclusive prep platform, reference notes library, and AI tutoring suite tailored specifically for 2nd Professional MBBS subjects: **Pathology**, **Pharmacology**, and **Microbiology**.
            </p>
            
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => {
                  setIsLogin(false);
                  setShowAuthModal(true);
                }}
                className="px-5 py-3 bg-[#18181b] hover:bg-black text-white text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Create Student Account</span>
                <Brain className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => {
                  setIsLogin(true);
                  setShowAuthModal(true);
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-all flex items-center cursor-pointer font-semibold"
              >
                <span>Sign In to Dashboard</span>
              </button>
            </div>

            <div className="pt-6 grid grid-cols-3 gap-6 border-t border-slate-100 max-w-sm">
              <div>
                <span className="block text-xl font-bold text-slate-900">1,200+</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High-Yield MCQs</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-slate-900">100%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MBBS Syllabus</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-slate-900">Real-Time</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Tutor</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative bg-white border border-[#e4e4e7] rounded-2xl shadow-sm p-5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                </div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Active MCQ Engine</span>
              </div>
              
              {/* Question Preview Card */}
              <div className="space-y-4">
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Pathology • Cell Injury</span>
                  <p className="text-xs font-bold text-slate-800 mt-2">
                    A 45-year-old chronic alcoholic presents with severe epigastric pain. Biopsy of pancreas reveals chalky-white fat necrosis. What is the process?
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center p-2.5 rounded-lg border border-slate-100 bg-slate-50/55 text-[11px] text-slate-500">
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold mr-2">A</span>
                    Coagulative necrosis
                  </div>
                  <div className="flex items-center p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50 text-[11px] font-semibold text-emerald-800">
                    <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold mr-2">✓</span>
                    Fat necrosis (Saponification)
                  </div>
                </div>
                
                <div className="bg-blue-50/30 p-3.5 rounded-xl border border-blue-100 text-left space-y-1.5">
                  <div className="flex items-center text-[11px] font-bold text-blue-700">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-500 animate-pulse" />
                    AI Explanations:
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Active pancreatic lipases digest parenchyma, transforming triglycerides into calcium soaps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Subjects Grid */}
      <section className="py-16 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Core MBBS Subjects</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">Master the second professional year curriculum built around high-yield syllabi.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pathology */}
            <div className="bg-white p-6 rounded-2xl border border-[#e4e4e7] text-left hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded bg-rose-50 text-rose-600 flex items-center justify-center mb-5 font-bold text-xs">
                PAT
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">1. Pathology</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Syllabus structured directly from **Robbins & Cotran**. Covers general adaptations, neoplasms, hemodynamics, systemic pathology, and haematology.
              </p>
              <ul className="text-[10px] space-y-1 text-slate-500 font-semibold uppercase tracking-wider">
                <li>✦ Cell Injury Processes</li>
                <li>✦ Robbins Highlight Outlines</li>
                <li>✦ Case-Based Practice</li>
              </ul>
            </div>

            {/* Pharmacology */}
            <div className="bg-white p-6 rounded-2xl border border-[#e4e4e7] text-left hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 font-bold text-xs">
                PHM
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">2. Pharmacology</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Syllabus mapped to **KDT (Tripathi)**. Covers ANS, CNS, Cardiovascular drugs, Antimicrobials, receptor kinetics, and drug interactions.
              </p>
              <ul className="text-[10px] space-y-1 text-slate-500 font-semibold uppercase tracking-wider">
                <li>✦ Drug Classification Flows</li>
                <li>✦ Receptor Kinematics</li>
                <li>✦ ADR Mnemonics</li>
              </ul>
            </div>

            {/* Microbiology */}
            <div className="bg-white p-6 rounded-2xl border border-[#e4e4e7] text-left hover:border-slate-400 transition-all">
              <div className="w-10 h-10 rounded bg-teal-50 text-teal-600 flex items-center justify-center mb-5 font-bold text-xs">
                MIC
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">3. Microbiology</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Syllabus tailored from **Apurba Sastry**. Master immunology, systemic bacteriology, virology, parasite lifecycles, and hospital infection control.
              </p>
              <ul className="text-[10px] space-y-1 text-slate-500 font-semibold uppercase tracking-wider">
                <li>✦ Gram-Staining Histological Views</li>
                <li>✦ High-Yield Immunity Lists</li>
                <li>✦ Pathogen Lifecycle Maps</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 bg-white border-t border-[#e4e4e7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Supercharged Learning Features</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Built precisely to increase active retention for medical boards exams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-slate-100 bg-[#fafafa] text-left space-y-3">
              <div className="p-2 bg-slate-200 text-slate-700 rounded w-fit">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Standard Textbook Notes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Robbins, KDT, Sastry, Ramdas outlines organized subject → chapter → topic. Read reference briefs and instantly launch quizzes.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-[#fafafa] text-left space-y-3">
              <div className="p-2 bg-slate-200 text-slate-700 rounded w-fit">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Interactive AI Study Tutor</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Request custom mnemonics, clarify high-yield concepts, or generate randomized custom practice board exams instantly.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-[#fafafa] text-left space-y-3">
              <div className="p-2 bg-slate-200 text-slate-700 rounded w-fit">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Durable Analytics Dashboard</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pinpoint weak topics, save key cards, monitor streaks, and review your historical board question practice records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-[#121212]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#e4e4e7] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">MBBS study panel</p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-4 text-left">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {error}
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Dr. Mohit Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#18181b] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#18181b] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#18181b] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#18181b] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="student">Student Profile</option>
                    <option value="admin">Admin Professor</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#18181b] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[11px] text-blue-600 font-semibold hover:underline"
                >
                  {isLogin ? "Create an account" : "Already registered? Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#18181b] text-zinc-400 py-10 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <Stethoscope className="h-4 w-4 text-slate-400" />
            <span className="font-bold text-white text-sm">MedBank AI</span>
          </div>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            High-fidelity medical board question libraries, notes summaries, and interactive AI-tutor systems supporting active candidate preparation.
          </p>
          <p className="text-[9px] text-zinc-600">
            &copy; 2026 MedBank AI. Built exclusively for education utility.
          </p>
        </div>
      </footer>
    </div>
  );
}
