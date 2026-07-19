import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bookmark, BookOpen, Target, ChevronDown, ChevronRight, 
  Check, X, Sparkles, Loader2, Play, AlertCircle, Folder, 
  FolderOpen, FileText, Award, Layers, Flame, RefreshCw,
  Image as ImageIcon, Brain, Stethoscope, ArrowRight,
  Bone, Pill, Microscope, Dna, Users, Scale, Eye, Scissors, Baby, HeartPulse, Ear
} from 'lucide-react';
import { MCQ, SubjectName } from '../types';
import { safeStorage } from '../lib/safeStorage';
import { getAllMCQs, getBookmarks, toggleBookmark, getTestAttempts, MOCK_CHAPTERS } from '../lib/mockData';
import { explainAnswer, fetchDBQuestions, fetchDBSubjects, fetchDBChapters, fetchDBTopics, fetchDBQuestionCounts } from '../lib/api';

const subjectConfigs: {
  [key: string]: {
    icon: React.ComponentType<any>;
    colorClass: string;
    badgeClass: string;
    glowClass: string;
    bgGradient: string;
    description: string;
    accentHex: string;
    hoverText: string;
    hoverBg: string;
    hoverBorder: string;
  }
} = {
  'Anatomy': {
    icon: Bone,
    colorClass: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
    glowClass: 'hover:border-blue-500/50 hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.25)]',
    bgGradient: 'from-blue-500/20 to-blue-600/5 dark:from-blue-500/15 dark:to-transparent',
    description: 'Study of human structure, gross anatomy, osteology, and developmental biology.',
    accentHex: '#3b82f6',
    hoverText: 'group-hover:text-blue-500 dark:group-hover:text-blue-400',
    hoverBg: 'group-hover:bg-blue-50/50 dark:group-hover:bg-blue-950/10',
    hoverBorder: 'group-hover:border-blue-500/30 dark:group-hover:border-blue-400/20'
  },
  'Physiology': {
    icon: HeartPulse,
    colorClass: 'text-green-500',
    badgeClass: 'bg-green-500/10 text-green-500 dark:text-green-400',
    glowClass: 'hover:border-green-500/50 hover:shadow-[0_0_20px_-3px_rgba(34,197,94,0.25)]',
    bgGradient: 'from-green-500/20 to-green-600/5 dark:from-green-500/15 dark:to-transparent',
    description: 'Explore cell physiology, organ systems, biophysics, and homeostatic mechanisms.',
    accentHex: '#22c55e',
    hoverText: 'group-hover:text-green-500 dark:group-hover:text-green-400',
    hoverBg: 'group-hover:bg-green-50/50 dark:group-hover:bg-green-950/10',
    hoverBorder: 'group-hover:border-green-500/30 dark:group-hover:border-green-400/20'
  },
  'Biochemistry': {
    icon: Dna,
    colorClass: 'text-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-500 dark:text-purple-400',
    glowClass: 'hover:border-purple-500/50 hover:shadow-[0_0_20px_-3px_rgba(168,85,247,0.25)]',
    bgGradient: 'from-purple-500/20 to-purple-600/5 dark:from-purple-500/15 dark:to-transparent',
    description: 'Biomolecules, metabolic pathways, molecular genetics, and clinical chemistry.',
    accentHex: '#a855f7',
    hoverText: 'group-hover:text-purple-500 dark:group-hover:text-purple-400',
    hoverBg: 'group-hover:bg-purple-50/50 dark:group-hover:bg-purple-950/10',
    hoverBorder: 'group-hover:border-purple-500/30 dark:group-hover:border-purple-400/20'
  },
  'Pathology': {
    icon: Brain,
    colorClass: 'text-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
    glowClass: 'hover:border-rose-500/50 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.25)]',
    bgGradient: 'from-rose-500/20 to-rose-600/5 dark:from-rose-500/15 dark:to-transparent',
    description: 'General pathology, hematology, systemic pathology, and diagnostic cytopathology.',
    accentHex: '#f43f5e',
    hoverText: 'group-hover:text-rose-500 dark:group-hover:text-rose-400',
    hoverBg: 'group-hover:bg-rose-50/50 dark:group-hover:bg-rose-950/10',
    hoverBorder: 'group-hover:border-rose-500/30 dark:group-hover:border-rose-400/20'
  },
  'Pharmacology': {
    icon: Pill,
    colorClass: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    glowClass: 'hover:border-amber-500/50 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.25)]',
    bgGradient: 'from-amber-500/20 to-amber-600/5 dark:from-amber-500/15 dark:to-transparent',
    description: 'Pharmacokinetics, pharmacodynamics, therapeutics, and drug interactions.',
    accentHex: '#f59e0b',
    hoverText: 'group-hover:text-amber-500 dark:group-hover:text-amber-400',
    hoverBg: 'group-hover:bg-amber-50/50 dark:group-hover:bg-amber-950/10',
    hoverBorder: 'group-hover:border-amber-500/30 dark:group-hover:border-amber-400/20'
  },
  'Microbiology': {
    icon: Microscope,
    colorClass: 'text-cyan-500',
    badgeClass: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400',
    glowClass: 'hover:border-cyan-500/50 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.25)]',
    bgGradient: 'from-cyan-500/20 to-cyan-600/5 dark:from-cyan-500/15 dark:to-transparent',
    description: 'Bacteriology, virology, mycology, parasitology, and immunology.',
    accentHex: '#06b6d4',
    hoverText: 'group-hover:text-cyan-500 dark:group-hover:text-cyan-400',
    hoverBg: 'group-hover:bg-cyan-50/50 dark:group-hover:bg-cyan-950/10',
    hoverBorder: 'group-hover:border-cyan-500/30 dark:group-hover:border-cyan-400/20'
  },
  'Community Medicine': {
    icon: Users,
    colorClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    glowClass: 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.25)]',
    bgGradient: 'from-emerald-500/20 to-emerald-600/5 dark:from-emerald-500/15 dark:to-transparent',
    description: 'Epidemiology, biostatistics, public health, and preventive medicine.',
    accentHex: '#10b89d',
    hoverText: 'group-hover:text-emerald-500 dark:group-hover:text-emerald-400',
    hoverBg: 'group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-950/10',
    hoverBorder: 'group-hover:border-emerald-500/30 dark:group-hover:border-emerald-400/20'
  },
  'Forensic Medicine': {
    icon: Scale,
    colorClass: 'text-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
    glowClass: 'hover:border-indigo-500/50 hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.25)]',
    bgGradient: 'from-indigo-500/20 to-indigo-600/5 dark:from-indigo-500/15 dark:to-transparent',
    description: 'Medical jurisprudence, toxicology, forensic pathology, and legal procedures.',
    accentHex: '#6366f1',
    hoverText: 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400',
    hoverBg: 'group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/10',
    hoverBorder: 'group-hover:border-indigo-500/30 dark:group-hover:border-indigo-400/20'
  },
  'Ophthalmology': {
    icon: Eye,
    colorClass: 'text-teal-500',
    badgeClass: 'bg-teal-500/10 text-teal-500 dark:text-teal-400',
    glowClass: 'hover:border-teal-500/50 hover:shadow-[0_0_20px_-3px_rgba(20,184,166,0.25)]',
    bgGradient: 'from-teal-500/20 to-teal-600/5 dark:from-teal-500/15 dark:to-transparent',
    description: 'Ocular diseases, refraction, ophthalmic surgery, and visual pathways.',
    accentHex: '#14b8a6',
    hoverText: 'group-hover:text-teal-500 dark:group-hover:text-teal-400',
    hoverBg: 'group-hover:bg-teal-50/50 dark:group-hover:bg-teal-950/10',
    hoverBorder: 'group-hover:border-teal-500/30 dark:group-hover:border-teal-400/20'
  },
  'ENT': {
    icon: Ear,
    colorClass: 'text-amber-600',
    badgeClass: 'bg-amber-600/10 text-amber-600 dark:text-amber-400',
    glowClass: 'hover:border-amber-600/50 hover:shadow-[0_0_20px_-3px_rgba(217,119,6,0.25)]',
    bgGradient: 'from-amber-600/20 to-amber-700/5 dark:from-amber-600/15 dark:to-transparent',
    description: 'Diseases of ear, nose, throat, and head & neck surgery.',
    accentHex: '#d97706',
    hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    hoverBg: 'group-hover:bg-amber-50/50 dark:group-hover:bg-amber-950/10',
    hoverBorder: 'group-hover:border-amber-600/30 dark:group-hover:border-amber-400/20'
  },
  'Medicine': {
    icon: Stethoscope,
    colorClass: 'text-sky-500',
    badgeClass: 'bg-sky-500/10 text-sky-500 dark:text-sky-400',
    glowClass: 'hover:border-sky-500/50 hover:shadow-[0_0_20px_-3px_rgba(14,165,233,0.25)]',
    bgGradient: 'from-sky-500/20 to-sky-600/5 dark:from-sky-500/15 dark:to-transparent',
    description: 'Internal medicine, cardiology, neurology, nephrology, and clinical diagnosis.',
    accentHex: '#0ea5e9',
    hoverText: 'group-hover:text-sky-500 dark:group-hover:text-sky-400',
    hoverBg: 'group-hover:bg-sky-50/50 dark:group-hover:bg-sky-950/10',
    hoverBorder: 'group-hover:border-sky-500/30 dark:group-hover:border-sky-400/20'
  },
  'Surgery': {
    icon: Scissors,
    colorClass: 'text-red-650',
    badgeClass: 'bg-red-500/10 text-red-650 dark:text-red-400',
    glowClass: 'hover:border-red-500/50 hover:shadow-[0_0_20px_-3px_rgba(239,68,68,0.25)]',
    bgGradient: 'from-red-500/20 to-red-600/5 dark:from-red-500/15 dark:to-transparent',
    description: 'General surgical principles, trauma, gastrointestinal and endocrine surgery.',
    accentHex: '#ef4444',
    hoverText: 'group-hover:text-red-500 dark:group-hover:text-red-400',
    hoverBg: 'group-hover:bg-red-50/50 dark:group-hover:bg-red-950/10',
    hoverBorder: 'group-hover:border-red-500/30 dark:group-hover:border-red-400/20'
  },
  'Pediatrics': {
    icon: Baby,
    colorClass: 'text-pink-500',
    badgeClass: 'bg-pink-500/10 text-pink-500 dark:text-pink-400',
    glowClass: 'hover:border-pink-500/50 hover:shadow-[0_0_20px_-3px_rgba(236,72,153,0.25)]',
    bgGradient: 'from-pink-500/20 to-pink-600/5 dark:from-pink-500/15 dark:to-transparent',
    description: 'Neonatology, growth & development, pediatric nutrition, and systemic disorders.',
    accentHex: '#ec4899',
    hoverText: 'group-hover:text-pink-500 dark:group-hover:text-pink-400',
    hoverBg: 'group-hover:bg-pink-50/50 dark:group-hover:bg-pink-950/10',
    hoverBorder: 'group-hover:border-pink-500/30 dark:group-hover:border-pink-400/20'
  },
  'Obstetrics & Gynaecology': {
    icon: Sparkles,
    colorClass: 'text-rose-600',
    badgeClass: 'bg-rose-600/10 text-rose-600 dark:text-rose-400',
    glowClass: 'hover:border-rose-600/50 hover:shadow-[0_0_20px_-3px_rgba(225,29,72,0.25)]',
    bgGradient: 'from-rose-600/20 to-rose-700/5 dark:from-rose-600/15 dark:to-transparent',
    description: 'Antenatal care, labor management, gynecological disorders, and reproductive health.',
    accentHex: '#e11d48',
    hoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    hoverBg: 'group-hover:bg-rose-50/50 dark:group-hover:bg-rose-950/10',
    hoverBorder: 'group-hover:border-rose-600/30 dark:group-hover:border-rose-400/20'
  }
};

function getSubjectConfig(subjectName: string) {
  const config = subjectConfigs[subjectName];
  if (config) return config;
  
  return {
    icon: BookOpen,
    colorClass: 'text-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
    glowClass: 'hover:border-indigo-500/50 hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.25)]',
    bgGradient: 'from-indigo-500/20 to-indigo-600/5 dark:from-indigo-500/15 dark:to-transparent',
    description: `Comprehensive syllabus and practice questions for ${subjectName}.`,
    accentHex: '#6366f1',
    hoverText: 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400',
    hoverBg: 'group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/10',
    hoverBorder: 'group-hover:border-indigo-500/30 dark:group-hover:border-indigo-400/20'
  };
}

const shouldCategorizeSection = (sectionName: string) => {
  const normalized = sectionName.toLowerCase();
  return (
    normalized.includes('section 4') ||
    normalized.includes('section 5') ||
    normalized.includes('section 6') ||
    normalized.includes('section 7') ||
    normalized.includes('section 8') ||
    normalized.includes('section 9') ||
    normalized.includes('section 10') ||
    normalized.includes('section 11')
  );
};

const getChapterCategory = (chapterName: string, chapterDesc: string): string => {
  const name = chapterName.toLowerCase();
  const desc = chapterDesc.toLowerCase();
  
  if (
    name.includes('infective syndromes of') || 
    name.includes('infective syndromes') || 
    name.includes('gastrointestinal infective') ||
    name.includes('bloodstream infections') ||
    name.includes('ocular and ear') ||
    name.includes('congenital infections') ||
    name.includes('organism with oncogenic') ||
    name.includes('zoonotic infections')
  ) {
    return 'General Infective Syndromes';
  }

  if (
    name.includes('fungal') || 
    name.includes('mycoses') || 
    name.includes('candidiasis') || 
    name.includes('candida') ||
    name.includes('histoplasmosis') ||
    name.includes('coccioidomycosis') ||
    name.includes('dermatophytosis') ||
    name.includes('mycetoma') ||
    name.includes('sporotrichosis') ||
    name.includes('cryptococcal') ||
    name.includes('aspergillosis') ||
    name.includes('pneumocystis') ||
    desc.includes('fungal') ||
    desc.includes('mycoses') ||
    desc.includes('candida')
  ) {
    return 'Fungal Infections';
  }

  if (
    name.includes('parasitic') || 
    name.includes('malaria') || 
    name.includes('babesiosis') || 
    name.includes('plasmodium') || 
    name.includes('leishmaniasis') || 
    name.includes('trypanosomiasis') || 
    name.includes('leishmania') || 
    name.includes('kala-azar') || 
    name.includes('filariasis') || 
    name.includes('protozoan') || 
    name.includes('amoebiasis') || 
    name.includes('giardiasis') || 
    name.includes('coccidian') || 
    name.includes('balantidiasis') || 
    name.includes('blastocystosis') || 
    name.includes('helminthic') || 
    name.includes('cestodes') || 
    name.includes('nematodes') || 
    name.includes('trematodes') || 
    name.includes('hydatid') || 
    name.includes('echinococcus') || 
    name.includes('fasciola') || 
    name.includes('clonorchis') || 
    name.includes('scabies') || 
    name.includes('guinea worm') || 
    name.includes('neurocysticercosis') || 
    name.includes('toxoplasmosis') ||
    desc.includes('parasitic') ||
    desc.includes('parasite') ||
    desc.includes('protozoa') ||
    desc.includes('helminth')
  ) {
    return 'Parasitic Infections';
  }

  if (
    name.includes('viral') || 
    name.includes('virus') || 
    name.includes('hiv') || 
    name.includes('aids') || 
    name.includes('hemorrhagic fever') || 
    name.includes('vhf') || 
    name.includes('dengue') || 
    name.includes('chikungunya') || 
    name.includes('ebola') || 
    name.includes('yellow fever') || 
    name.includes('rotaviruses') || 
    name.includes('gastroenteritis') || 
    name.includes('hepatitis') || 
    name.includes('exanthems') || 
    name.includes('measles') || 
    name.includes('rubella') || 
    name.includes('varicella') || 
    name.includes('hpv') || 
    name.includes('molluscum') || 
    name.includes('influenza') || 
    name.includes('parainfluenza') || 
    name.includes('mumps') || 
    name.includes('rsv') || 
    name.includes('coronavirus') || 
    name.includes('covid') || 
    name.includes('rhinovirus') || 
    name.includes('adenovirus') || 
    name.includes('ebv') || 
    name.includes('poliomyelitis') || 
    name.includes('rabies') || 
    name.includes('hsv') || 
    name.includes('encephalitis') || 
    name.includes('arboviral') || 
    name.includes('japanese encephalitis') || 
    name.includes('nipah') ||
    desc.includes('viral') ||
    desc.includes('virus') ||
    desc.includes('hiv')
  ) {
    return 'Viral Infections';
  }

  return 'Bacterial Infections';
};

const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'Bacterial Infections':
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30',
        dot: 'bg-emerald-500',
        text: 'text-emerald-800 dark:text-emerald-300'
      };
    case 'Viral Infections':
      return {
        badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-100/60 dark:border-purple-900/30',
        dot: 'bg-purple-500',
        text: 'text-purple-800 dark:text-purple-300'
      };
    case 'Parasitic Infections':
      return {
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/30',
        dot: 'bg-rose-500',
        text: 'text-rose-800 dark:text-rose-300'
      };
    case 'Fungal Infections':
      return {
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/60 dark:border-amber-900/30',
        dot: 'bg-amber-500',
        text: 'text-amber-800 dark:text-amber-300'
      };
    default:
      return {
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30',
        dot: 'bg-blue-500',
        text: 'text-blue-800 dark:text-blue-300'
      };
  }
};

interface QBankProps {
  onStartQuiz: (mcqsToSolve: MCQ[], testTitle: string) => void;
  onQuestionClick?: (questionId: string) => void;
}

const DEFAULT_SUBJECTS = [
  { id: 'subj-anatomy', name: 'Anatomy', description: 'Study of human structure, gross anatomy, osteology, and developmental biology.', icon: 'Bone' },
  { id: 'subj-physiology', name: 'Physiology', description: 'Explore cell physiology, organ systems, biophysics, and homeostatic mechanisms.', icon: 'HeartPulse' },
  { id: 'subj-biochemistry', name: 'Biochemistry', description: 'Biomolecules, metabolic pathways, molecular genetics, and clinical chemistry.', icon: 'Dna' },
  { id: 'subj-pathology', name: 'Pathology', description: 'General pathology, hematology, systemic pathology, and diagnostic cytopathology.', icon: 'Brain' },
  { id: 'subj-pharmacology', name: 'Pharmacology', description: 'Pharmacokinetics, pharmacodynamics, therapeutics, and drug interactions.', icon: 'Pill' },
  { id: 'subj-microbiology', name: 'Microbiology', description: 'Bacteriology, virology, mycology, parasitology, and immunology.', icon: 'Microscope' },
  { id: 'subj-commmedicine', name: 'Community Medicine', description: 'Epidemiology, biostatistics, public health, and preventive medicine.', icon: 'Users' },
  { id: 'subj-forensic', name: 'Forensic Medicine', description: 'Medical jurisprudence, toxicology, forensic pathology, and legal procedures.', icon: 'Scale' },
  { id: 'subj-ophthal', name: 'Ophthalmology', description: 'Ocular diseases, refraction, ophthalmic surgery, and visual pathways.', icon: 'Eye' },
  { id: 'subj-ent', name: 'ENT', description: 'Diseases of ear, nose, throat, and head & neck surgery.', icon: 'Ear' },
  { id: 'subj-medicine', name: 'Medicine', description: 'Internal medicine, cardiology, neurology, nephrology, and clinical diagnosis.', icon: 'Stethoscope' },
  { id: 'subj-surgery', name: 'Surgery', description: 'General surgical principles, trauma, gastrointestinal and endocrine surgery.', icon: 'Scissors' },
  { id: 'subj-pediatrics', name: 'Pediatrics', description: 'Neonatology, growth & development, pediatric nutrition, and systemic disorders.', icon: 'Baby' },
  { id: 'subj-obg', name: 'Obstetrics & Gynaecology', description: 'Antenatal care, labor management, gynecological disorders, and reproductive health.', icon: 'Sparkles' }
];

export default function QBank({ onStartQuiz, onQuestionClick }: QBankProps) {
  // Current user state from localStorage (role check authorization)
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [subjectsList, setSubjectsList] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('medbank_cached_subjects');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached subjects:', e);
    }
    return DEFAULT_SUBJECTS;
  });

  const [chaptersList, setChaptersList] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('medbank_cached_chapters');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached chapters:', e);
    }
    return [];
  });

  const [topicsList, setTopicsList] = useState<any[]>(() => {
    try {
      const cached = safeStorage.getItem('medbank_cached_topics');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached topics:', e);
    }
    return [];
  });

  const [dbQuestionCounts, setDbQuestionCounts] = useState<{
    total: number;
    subjects: { [key: string]: number };
    chapters: { [key: string]: number };
    topics: { [key: string]: number };
  }>(() => {
    try {
      const cached = safeStorage.getItem('medbank_cached_counts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached counts:', e);
    }
    return { total: 0, subjects: {}, chapters: {}, topics: {} };
  });

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
    setCountsError(null);
    
    // Fetch subjects, chapters, and topics in parallel (fast metadata)
    Promise.all([
      fetchDBSubjects(),
      fetchDBChapters(),
      fetchDBTopics()
    ]).then(([subs, chaps, tops]) => {
      if (subs && subs.length > 0) {
        setSubjectsList(subs);
        safeStorage.setItem('medbank_cached_subjects', JSON.stringify(subs));
        
        setExpandedSubjects(prev => {
          const init: { [sub: string]: boolean } = {};
          subs.forEach((s, idx) => {
            init[s.name] = idx === 0;
          });
          return init;
        });
      }
      if (chaps && chaps.length > 0) {
        setChaptersList(chaps);
        safeStorage.setItem('medbank_cached_chapters', JSON.stringify(chaps));
      }
      if (tops && tops.length > 0) {
        setTopicsList(tops);
        safeStorage.setItem('medbank_cached_topics', JSON.stringify(tops));
      }
    }).catch(err => {
      console.error("Error loading QBank dynamic syllabus options:", err);
    });

    // Fetch counts independently in background (slower statistics query)
    fetchDBQuestionCounts(currentUser?.email)
      .then((counts) => {
        if (counts) {
          setDbQuestionCounts(counts);
          safeStorage.setItem('medbank_cached_counts', JSON.stringify(counts));
        }
      })
      .catch((err) => {
        console.error("Error loading dynamic question counts:", err);
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
  const [expandedSections, setExpandedSections] = useState<{ [sec: string]: boolean }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [cat: string]: boolean }>({});

  useEffect(() => {
    setExpandedSections({});
    setExpandedCategories({});
    setExpandedChapters({});
  }, [selectedSubject]);

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

  // QBank navigation / UI state machine
  const [viewState, setViewState] = useState<'SUBJECTS' | 'CHAPTERS' | 'CHAPTER_DASHBOARD' | 'QUESTIONS_LIST'>('SUBJECTS');
  const [chapterFilterMode, setChapterFilterMode] = useState<'all' | 'topic' | 'image' | 'clinical' | 'pyq'>('all');
  const [showTopicSelector, setShowTopicSelector] = useState(false);

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
    // If on main subjects list and not searching or showing bookmarks/incorrects, we don't need the heavy questions array
    if (selectedSubject === 'All' && !search && !showBookmarkedOnly && !showIncorrectOnly) {
      setQuestions([]);
      setTotalQuestions(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[QBank] Lazy loading questions from MongoDB Atlas...');
      const email = currentUser?.email || '';
      
      const isClientFiltering = showBookmarkedOnly || showIncorrectOnly || (viewState === 'QUESTIONS_LIST' && chapterFilterMode !== 'all');
      const page = isClientFiltering ? undefined : (viewMode === 'paginated' ? currentPage : 1);
      const limit = isClientFiltering ? undefined : (viewMode === 'paginated' ? 20 : scrollLimit);

      const res = await fetchDBQuestions(email, {
        page,
        limit,
        subject: selectedSubject,
        chapter: selectedChapter,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        type: selectedType,
        search: search
      });

      if (res && typeof res === 'object' && 'questions' in res) {
        setQuestions(res.questions || []);
        setTotalQuestions(res.total || 0);
      } else if (Array.isArray(res)) {
        setQuestions(res);
        setTotalQuestions(res.length);
      } else {
        console.warn('[QBank Rendering] Questions collection empty, falling back to local MCQs.');
        setQuestions(getAllMCQs());
        setTotalQuestions(getAllMCQs().length);
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
    showIncorrectOnly,
    viewState,
    chapterFilterMode
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

  const chaptersInSubject = useMemo(() => {
    return chaptersList.filter(c => c && c.subject === selectedSubject && c.isActive !== false);
  }, [chaptersList, selectedSubject]);

  const sectionsMap = useMemo(() => {
    const map: { [key: string]: any[] } = {};
    chaptersInSubject.forEach(chapter => {
      const secName = chapter.section || 'General';
      if (!map[secName]) {
        map[secName] = [];
      }
      map[secName].push(chapter);
    });
    return map;
  }, [chaptersInSubject]);

  const sectionKeys = useMemo(() => {
    return Object.keys(sectionsMap).sort((a, b) => {
      const getNum = (s: string) => {
        const match = s.match(/Section\s+(\d+)/i);
        if (match) return parseInt(match[1], 10);
        
        const unitMatch = s.match(/Unit\s+([IVXLCDM]+)/i);
        if (unitMatch) {
          const roman = unitMatch[1].toUpperCase();
          const romanMap: { [key: string]: number } = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
            'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
            'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15
          };
          if (romanMap[roman]) return romanMap[roman];
        }

        if (s.toLowerCase().includes('annexure')) return 98;
        if (s.toLowerCase().includes('unassigned')) return 99;
        if (s === 'General') return 0;
        return 100;
      };
      return getNum(a) - getNum(b);
    });
  }, [sectionsMap]);

  const sectionCountsMap = useMemo(() => {
    const counts: { [sec: string]: number } = {};
    chaptersInSubject.forEach(chapter => {
      const sec = chapter.section || 'General';
      const chCount = syllabusCounts.chapters[chapter.name] || 0;
      counts[sec] = (counts[sec] || 0) + chCount;
    });
    return counts;
  }, [chaptersInSubject, syllabusCounts.chapters]);

  const categoryCountsMap = useMemo(() => {
    const counts: { [secCat: string]: number } = {};
    chaptersInSubject.forEach(chapter => {
      const sec = chapter.section || 'General';
      if (selectedSubject === 'Microbiology' && shouldCategorizeSection(sec)) {
        const cat = getChapterCategory(chapter.name, chapter.description || '');
        const chCount = syllabusCounts.chapters[chapter.name] || 0;
        const key = `${sec}-${cat}`;
        counts[key] = (counts[key] || 0) + chCount;
      }
    });
    return counts;
  }, [chaptersInSubject, syllabusCounts.chapters, selectedSubject]);

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

    // 3.5 Chapter dashboard custom modes
    if (viewState === 'QUESTIONS_LIST') {
      if (chapterFilterMode === 'image') {
        list = list.filter(item => !!item.image || ['Image Based', 'Image-based MCQ'].includes(item.type) || (item.tags && item.tags.some(tag => tag.toLowerCase().includes('image'))));
      } else if (chapterFilterMode === 'clinical') {
        list = list.filter(item => ['Clinical Scenario', 'Clinical Case Based', 'Case-based MCQ'].includes(item.type) || (item.tags && item.tags.some(tag => tag.toLowerCase().includes('clinical'))) || item.question.toLowerCase().includes('old') || item.question.toLowerCase().includes('presents with'));
      } else if (chapterFilterMode === 'pyq') {
        list = list.filter(item => (item.targetExams && item.targetExams.length > 0) || (item.tags && item.tags.some(t => ['pyq', 'neet', 'ini-cet', 'fmge', 'exam', 'previous year'].includes(t.toLowerCase()))) || !!item.examSource);
      }
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
    bookmarks, incorrectQuestionIds, viewState, chapterFilterMode
  ]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
    setScrollLimit(10);
  }, [
    search, selectedSubject, selectedChapter, selectedTopic, 
    selectedDifficulty, selectedType, showBookmarkedOnly, showIncorrectOnly,
    viewState, chapterFilterMode
  ]);

  // Paginated questions variables
  const totalPages = useMemo(() => {
    const isClientFiltering = showBookmarkedOnly || showIncorrectOnly || (viewState === 'QUESTIONS_LIST' && chapterFilterMode !== 'all');
    const total = isClientFiltering ? filteredMCQs.length : totalQuestions;
    return Math.max(1, Math.ceil(total / (viewMode === 'paginated' ? 20 : scrollLimit)));
  }, [totalQuestions, showBookmarkedOnly, showIncorrectOnly, filteredMCQs.length, viewMode, scrollLimit, viewState, chapterFilterMode]);

  const paginatedMCQs = useMemo(() => {
    const isClientFiltering = showBookmarkedOnly || showIncorrectOnly || (viewState === 'QUESTIONS_LIST' && chapterFilterMode !== 'all');
    if (isClientFiltering) {
      if (viewMode === 'scroll') {
        return filteredMCQs.slice(0, scrollLimit);
      }
      const sIdx = (currentPage - 1) * 20;
      return filteredMCQs.slice(sIdx, sIdx + 20);
    }
    return filteredMCQs;
  }, [filteredMCQs, showBookmarkedOnly, showIncorrectOnly, viewMode, scrollLimit, currentPage, viewState, chapterFilterMode]);

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
    if (sub === 'All') {
      setViewState('SUBJECTS');
      setChapterFilterMode('all');
    } else if (chap === 'All') {
      setViewState('CHAPTERS');
      setChapterFilterMode('all');
    } else if (top === 'All') {
      setViewState('CHAPTER_DASHBOARD');
    } else {
      setViewState('QUESTIONS_LIST');
      setChapterFilterMode('topic');
    }
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
      </div>      {/* Breadcrumb Navigation Trail */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200 font-bold">
          <button 
            type="button"
            onClick={() => handleSelectSyllabusNode('All')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            QBank Dashboard
          </button>
          
          {selectedSubject !== 'All' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <button 
                type="button"
                onClick={() => handleSelectSyllabusNode(selectedSubject)}
                className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer ${viewState === 'CHAPTERS' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
              >
                {selectedSubject}
              </button>
            </>
          )}
          
          {selectedSubject !== 'All' && selectedChapter !== 'All' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <button 
                type="button"
                onClick={() => handleSelectSyllabusNode(selectedSubject, selectedChapter)}
                className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer ${viewState === 'CHAPTER_DASHBOARD' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
              >
                {selectedChapter}
              </button>
            </>
          )}

          {selectedSubject !== 'All' && selectedChapter !== 'All' && selectedTopic !== 'All' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[#18181b] dark:text-white underline decoration-wavy decoration-indigo-400">
                {selectedTopic}
              </span>
            </>
          )}

          {selectedSubject !== 'All' && selectedChapter !== 'All' && viewState === 'QUESTIONS_LIST' && chapterFilterMode !== 'all' && chapterFilterMode !== 'topic' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">
                {chapterFilterMode === 'image' ? 'Image-based MCQs' : 
                 chapterFilterMode === 'clinical' ? 'Clinical Case MCQs' : 
                 chapterFilterMode === 'pyq' ? 'Previous Year MCQs' : ''}
              </span>
            </>
          )}
        </div>

        {viewState !== 'SUBJECTS' && (
          <button
            type="button"
            onClick={() => {
              if (viewState === 'QUESTIONS_LIST') {
                if (chapterFilterMode === 'topic') {
                  setSelectedTopic('All');
                }
                setViewState('CHAPTER_DASHBOARD');
              } else if (viewState === 'CHAPTER_DASHBOARD') {
                setSelectedChapter('All');
                setViewState('CHAPTERS');
              } else if (viewState === 'CHAPTERS') {
                setSelectedSubject('All');
                setViewState('SUBJECTS');
              }
            }}
            className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>← Go Back</span>
          </button>
        )}
      </div>

      {/* State Render Blocks */}
      {viewState === 'SUBJECTS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              Select a Subject to Begin
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Total {syllabusCounts.total || questions.length} MCQs Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {(Object.keys(dynamicSyllabus) as SubjectName[]).map((sub) => {
              const count = syllabusCounts.subjects[sub] || 0;
              const chapters = Object.keys(dynamicSyllabus[sub] || {});
              const chapterCount = chapters.length;
              const config = getSubjectConfig(sub);
              const IconComponent = config.icon;

              return (
                <div
                  key={sub}
                  onClick={() => handleSelectSyllabusNode(sub)}
                  className={`bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-4 hover:-translate-y-1 hover:scale-[1.02] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between h-[165px] relative overflow-hidden group ${config.glowClass}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8.5 h-8.5 rounded-full bg-gradient-to-br ${config.bgGradient} flex items-center justify-center shrink-0 border border-slate-100 dark:border-zinc-800/55 shadow-sm`}>
                        <IconComponent className={`h-4.5 w-4.5 ${config.colorClass}`} />
                      </div>
                      <h4 className="font-bold text-[13px] text-slate-900 dark:text-zinc-100 tracking-tight leading-tight truncate">
                        {sub}
                      </h4>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal font-medium line-clamp-2 min-h-[30px] pr-1">
                      {config.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800/60 pt-2 font-semibold">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong className="text-slate-800 dark:text-zinc-300 font-bold">{chapterCount}</strong> Chapters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong className="text-slate-800 dark:text-zinc-300 font-bold">{count}</strong> MCQs</span>
                      </div>
                    </div>

                    <div className={`w-full py-1.5 px-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-850 text-[10px] font-bold rounded-lg transition-all duration-300 flex items-center justify-between ${config.hoverBg} ${config.hoverBorder}`}>
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-zinc-400 ${config.hoverText} transition-colors`}>Explore Chapters</span>
                      <ArrowRight className={`h-3 w-3 text-slate-400 ${config.hoverText} transition-all transform group-hover:translate-x-1 duration-300`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewState === 'CHAPTERS' && selectedSubject !== 'All' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                <Microscope className="h-5 w-5 text-indigo-500" />
                <span>{selectedSubject} Syllabus Curriculum</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {selectedSubject === 'Microbiology' || selectedSubject === 'Pharmacology' || selectedSubject === 'Physiology'
                  ? 'Official book hierarchy with units, sections, chapters, and topics.' 
                  : `Select a chapter under ${selectedSubject} to open its practice dashboard.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSyllabusNode('All')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 text-left cursor-pointer"
            >
              ← Back to All Subjects
            </button>
          </div>

          {Object.keys(dynamicSyllabus[selectedSubject] || {}).length === 0 ? (
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-16 text-center text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto text-slate-300 stroke-1 mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">No Chapters Registered</h4>
              <p className="text-[11px]">There are no chapters or questions imported for {selectedSubject} yet.</p>
            </div>
          ) : (selectedSubject === 'Microbiology' || selectedSubject === 'Pharmacology' || selectedSubject === 'Physiology') ? (
            /* Brand New Hierarchical Navigation for Microbiology, Pharmacology, and Physiology QBank */
            <div className="space-y-4">
              {sectionKeys.map((sec) => {
                const isSectionExpanded = !!expandedSections[sec];
                const sectionChapters = sectionsMap[sec] || [];
                const secCount = sectionCountsMap[sec] || 0;
                
                // Helper to strip prefix for clean display
                const cleanSecName = sec.toLowerCase().includes('section 12') || sec.toLowerCase() === 'annexures' 
                  ? 'Annexures' 
                  : sec.toLowerCase().includes('section 13') 
                    ? 'Unassigned Questions' 
                    : sec;

                return (
                  <div 
                    key={sec} 
                    className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }))}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3 pr-4 min-w-0">
                        <div className={`p-2 rounded-xl transition-colors ${
                          isSectionExpanded 
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          <Folder className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate">
                            {cleanSecName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {sectionChapters.length} {sectionChapters.length === 1 ? 'Chapter' : 'Chapters'} defined
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                          {secCount} Qs
                        </span>
                        {isSectionExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400 rotate-180 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform" />
                        )}
                      </div>
                    </div>

                    {/* Section Content Accordion */}
                    <AnimatePresence initial={false}>
                      {isSectionExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-slate-100 dark:border-zinc-800/50 bg-slate-50/20 dark:bg-zinc-950/10 space-y-4">
                            {selectedSubject === 'Microbiology' && shouldCategorizeSection(sec) ? (
                              /* Categorized Sections (Section 4 to 11) - Display Category Headings First */
                              (() => {
                                const categorized: { [key: string]: any[] } = {
                                  'Bacterial Infections': [],
                                  'Viral Infections': [],
                                  'Fungal Infections': [],
                                  'Parasitic Infections': [],
                                  'General Infective Syndromes': []
                                };
                                
                                sectionChapters.forEach(ch => {
                                  const cat = getChapterCategory(ch.name, ch.description || '');
                                  if (categorized[cat]) {
                                    categorized[cat].push(ch);
                                  } else {
                                    categorized['Bacterial Infections'].push(ch);
                                  }
                                });

                                const activeCategories = Object.keys(categorized).filter(cat => categorized[cat].length > 0);

                                return (
                                  <div className="space-y-3 pl-2">
                                    {activeCategories.map(cat => {
                                      const isCatExpanded = !!expandedCategories[`${sec}-${cat}`];
                                      const catChapters = categorized[cat];
                                      const catCount = categoryCountsMap[`${sec}-${cat}`] || 0;
                                      const catStyle = getCategoryStyle(cat);

                                      return (
                                        <div key={cat} className="border border-slate-200/60 dark:border-zinc-800/50 rounded-xl overflow-hidden bg-white dark:bg-[#18181b]">
                                          {/* Category Header */}
                                          <div
                                            onClick={() => setExpandedCategories(prev => ({ ...prev, [`${sec}-${cat}`]: !prev[`${sec}-${cat}`] }))}
                                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-colors"
                                          >
                                            <div className="flex items-center space-x-2.5 min-w-0 pr-4">
                                              <span className={`h-2 w-2 rounded-full ${catStyle.dot}`} />
                                              <span className={`text-xs font-bold leading-tight ${catStyle.text} truncate`}>
                                                {cat}
                                              </span>
                                            </div>
                                            <div className="flex items-center space-x-2 shrink-0">
                                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${catStyle.badge}`}>
                                                {catCount} Qs
                                              </span>
                                              {isCatExpanded ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-slate-400 rotate-180" />
                                              ) : (
                                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                              )}
                                            </div>
                                          </div>

                                          {/* Category Chapters Content */}
                                          <AnimatePresence initial={false}>
                                            {isCatExpanded && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                              >
                                                <div className="p-3 bg-slate-50/40 dark:bg-zinc-900/10 border-t border-slate-100 dark:border-zinc-800/40 space-y-2">
                                                  {catChapters.map(chapter => {
                                                    const isChapExpanded = !!expandedChapters[chapter.name];
                                                    const chapCount = syllabusCounts.chapters[chapter.name] || 0;
                                                    const chapTopics = dynamicSyllabus[selectedSubject]?.[chapter.name] || [];

                                                    return (
                                                      <div key={chapter.name} className="border border-slate-200/50 dark:border-zinc-800/30 rounded-lg bg-white dark:bg-[#141417] overflow-hidden">
                                                        {/* Chapter Header */}
                                                        <div
                                                          onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.name]: !prev[chapter.name] }))}
                                                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors"
                                                        >
                                                          <div className="min-w-0 pr-4">
                                                            <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 leading-tight">
                                                              {chapter.name}
                                                            </h5>
                                                            {chapter.description && (
                                                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-lg">
                                                                {chapter.description}
                                                              </p>
                                                            )}
                                                          </div>
                                                          <div className="flex items-center space-x-2 shrink-0">
                                                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                                                              {chapCount} Qs
                                                            </span>
                                                            {isChapExpanded ? (
                                                              <ChevronDown className="h-3.5 w-3.5 text-slate-400 rotate-180" />
                                                            ) : (
                                                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                            )}
                                                          </div>
                                                        </div>

                                                        {/* Subchapters / Topics List */}
                                                        <AnimatePresence initial={false}>
                                                          {isChapExpanded && (
                                                            <motion.div
                                                              initial={{ height: 0, opacity: 0 }}
                                                              animate={{ height: "auto", opacity: 1 }}
                                                              exit={{ height: 0, opacity: 0 }}
                                                              transition={{ duration: 0.15 }}
                                                              className="overflow-hidden"
                                                            >
                                                              <div className="p-2 bg-slate-50 dark:bg-zinc-900/20 border-t border-slate-100 dark:border-zinc-800/30 space-y-1">
                                                                {/* Launch All Row */}
                                                                <div
                                                                  onClick={() => {
                                                                    setSelectedChapter(chapter.name);
                                                                    setSelectedTopic('All');
                                                                    setChapterFilterMode('all');
                                                                    setViewState('QUESTIONS_LIST');
                                                                  }}
                                                                  className="p-2 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-md flex items-center justify-between text-[11px] transition-colors cursor-pointer"
                                                                >
                                                                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                                                    <Layers className="h-3 w-3" />
                                                                    📚 Complete Chapter Qs (All Topics)
                                                                  </span>
                                                                  <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                                    {chapCount} Qs
                                                                  </span>
                                                                </div>

                                                                {/* Individual Subtopics */}
                                                                {chapTopics.map(topic => {
                                                                  const topicCount = questions.filter(q => q.subject === selectedSubject && q.chapter === chapter.name && q.topic === topic).length;
                                                                  return (
                                                                    <div
                                                                      key={topic}
                                                                      onClick={() => {
                                                                        setSelectedChapter(chapter.name);
                                                                        setSelectedTopic(topic);
                                                                        setChapterFilterMode('topic');
                                                                        setViewState('QUESTIONS_LIST');
                                                                      }}
                                                                      className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-md flex items-center justify-between text-[11px] transition-colors cursor-pointer text-slate-700 dark:text-zinc-300"
                                                                    >
                                                                      <span className="truncate pr-4 font-medium flex items-center gap-1.5">
                                                                        <FileText className="h-3 w-3 text-slate-400" />
                                                                        {topic}
                                                                      </span>
                                                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                                                        {topicCount} Qs
                                                                      </span>
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()
                            ) : (
                              /* Standard/Uncategorized Sections (Section 1, 2, 3 and Annexures) - Display Chapters Directly */
                              <div className="space-y-2.5 pl-2">
                                {sectionChapters.map((chapter) => {
                                  const isChapExpanded = !!expandedChapters[chapter.name];
                                  const chapCount = syllabusCounts.chapters[chapter.name] || 0;
                                  const chapTopics = dynamicSyllabus[selectedSubject]?.[chapter.name] || [];

                                  return (
                                    <div key={chapter.name} className="border border-slate-200/60 dark:border-zinc-800/50 rounded-xl bg-white dark:bg-[#18181b] overflow-hidden">
                                      {/* Chapter Header */}
                                      <div
                                        onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.name]: !prev[chapter.name] }))}
                                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-colors"
                                      >
                                        <div className="min-w-0 pr-4">
                                          <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 leading-tight">
                                            {chapter.name}
                                          </h5>
                                          {chapter.description && (
                                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-lg">
                                              {chapter.description}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0">
                                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                                            {chapCount} Qs
                                          </span>
                                          {isChapExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 rotate-180" />
                                          ) : (
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Subchapters / Topics List */}
                                      <AnimatePresence initial={false}>
                                        {isChapExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="p-2 bg-slate-50 dark:bg-zinc-900/20 border-t border-slate-100 dark:border-zinc-800/30 space-y-1">
                                              {/* Launch All Row */}
                                              <div
                                                onClick={() => {
                                                  setSelectedChapter(chapter.name);
                                                  setSelectedTopic('All');
                                                  setChapterFilterMode('all');
                                                  setViewState('QUESTIONS_LIST');
                                                }}
                                                className="p-2 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-md flex items-center justify-between text-[11px] transition-colors cursor-pointer"
                                              >
                                                <span className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                                  <Layers className="h-3 w-3" />
                                                  📚 Complete Chapter Qs (All Topics)
                                                </span>
                                                <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                  {chapCount} Qs
                                                </span>
                                              </div>

                                              {/* Individual Subtopics */}
                                              {chapTopics.map(topic => {
                                                const topicCount = questions.filter(q => q.subject === selectedSubject && q.chapter === chapter.name && q.topic === topic).length;
                                                return (
                                                  <div
                                                    key={topic}
                                                    onClick={() => {
                                                      setSelectedChapter(chapter.name);
                                                      setSelectedTopic(topic);
                                                      setChapterFilterMode('topic');
                                                      setViewState('QUESTIONS_LIST');
                                                    }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800/50 rounded-md flex items-center justify-between text-[11px] transition-colors cursor-pointer text-slate-700 dark:text-zinc-300"
                                                  >
                                                    <span className="truncate pr-4 font-medium flex items-center gap-1.5">
                                                      <FileText className="h-3 w-3 text-slate-400" />
                                                      {topic}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                                      {topicCount} Qs
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback Grid View for Non-Hierarchical Subjects (Anatomy, Physiology, Pathology, Pharmacology) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(dynamicSyllabus[selectedSubject] || {}).map((chap, cIdx) => {
                const count = syllabusCounts.chapters[chap] || 0;
                const topicsCount = dynamicSyllabus[selectedSubject][chap]?.length || 0;

                return (
                  <div
                    key={chap}
                    onClick={() => handleSelectSyllabusNode(selectedSubject, chap)}
                    className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left animate-fade-in"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                          Chapter {cIdx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {count} Questions
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white leading-snug">
                        {chap}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-50 dark:border-zinc-800/60 flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {topicsCount} Topics Defined
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group flex items-center">
                        Open Dashboard →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewState === 'CHAPTER_DASHBOARD' && selectedSubject !== 'All' && selectedChapter !== 'All' && (
        <div className="space-y-6">
          {showTopicSelector ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                    Select a Topic under {selectedChapter}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Practice focused MCQs for a specific sub-topic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopicSelector(false)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  ← Back to Chapter Dashboard
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dynamicSyllabus[selectedSubject]?.[selectedChapter] || []).map((topic) => {
                  const topicCount = questions.filter(q => q.subject === selectedSubject && q.chapter === selectedChapter && q.topic === topic).length;
                  return (
                    <div
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setChapterFilterMode('topic');
                        setViewState('QUESTIONS_LIST');
                        setShowTopicSelector(false);
                      }}
                      className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between text-left"
                    >
                      <div className="space-y-0.5 pr-2 min-w-0">
                        <h5 className="font-bold text-xs text-slate-800 dark:text-zinc-200 truncate">{topic}</h5>
                        <span className="text-[10px] font-semibold text-slate-400">Focused practice pool</span>
                      </div>
                      <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full shrink-0">
                        {topicCount} Qs
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                    {selectedChapter} Dashboard
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a high-yield learning mode to start practicing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapter('All');
                    setViewState('CHAPTERS');
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  ← Back to Chapter List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mode 1: Solve Chapter MCQs */}
                <div
                  onClick={() => {
                    setChapterFilterMode('all');
                    setSelectedTopic('All');
                    setViewState('QUESTIONS_LIST');
                  }}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-blue-100/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                        {questions.filter(q => q.subject === selectedSubject && q.chapter === selectedChapter).length} Qs
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">
                        Solve Chapter MCQs
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                        Practice all available clinical and one-liner board questions within this chapter sequentially.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    Start Solving →
                  </span>
                </div>

                {/* Mode 2: Topic-wise MCQs */}
                <div
                  onClick={() => {
                    setShowTopicSelector(true);
                  }}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Layers className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                        {(dynamicSyllabus[selectedSubject]?.[selectedChapter] || []).length} Topics
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">
                        Topic-wise MCQs
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                        Drill down into highly specific pathological, pharmacological, or microbiological sub-topics.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    Select Topic →
                  </span>
                </div>

                {/* Mode 3: Image-based Questions */}
                <div
                  onClick={() => {
                    setChapterFilterMode('image');
                    setSelectedTopic('All');
                    setViewState('QUESTIONS_LIST');
                  }}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-amber-100/50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                        {questions.filter(q => q.subject === selectedSubject && q.chapter === selectedChapter && (!!q.image || ['Image Based', 'Image-based MCQ'].includes(q.type) || (q.tags && q.tags.some(tag => tag.toLowerCase().includes('image'))))).length} Qs
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">
                        Image-based Questions
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                        Focus purely on diagnostic illustrations, histopathology microphotographs, and clinical slides.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    Practice Images →
                  </span>
                </div>

                {/* Mode 4: Clinical Case Questions */}
                <div
                  onClick={() => {
                    setChapterFilterMode('clinical');
                    setSelectedTopic('All');
                    setViewState('QUESTIONS_LIST');
                  }}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-rose-100/50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full">
                        {questions.filter(q => q.subject === selectedSubject && q.chapter === selectedChapter && (['Clinical Scenario', 'Clinical Case Based', 'Case-based MCQ'].includes(q.type) || (q.tags && q.tags.some(tag => tag.toLowerCase().includes('clinical'))) || q.question.toLowerCase().includes('old') || q.question.toLowerCase().includes('presents with'))).length} Qs
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">
                        Clinical Case Questions
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                        Master complex patient case histories, pathology lab panels, and critical diagnostic scenarios.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    Solve Cases →
                  </span>
                </div>

                {/* Mode 5: Previous Year Questions */}
                <div
                  onClick={() => {
                    setChapterFilterMode('pyq');
                    setSelectedTopic('All');
                    setViewState('QUESTIONS_LIST');
                  }}
                  className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Award className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-extrabold bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
                        {questions.filter(q => q.subject === selectedSubject && q.chapter === selectedChapter && ((q.targetExams && q.targetExams.length > 0) || !!q.examSource || (q.tags && q.tags.some(t => ['pyq', 'neet', 'ini-cet', 'fmge'].includes(t.toLowerCase()))))).length} Qs
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white">
                        Previous Year Questions (PYQs)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                        Analyze authentic questions straight from previous NEET PG, INI-CET, FMGE, and university exams.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    Practice PYQs →
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewState === 'QUESTIONS_LIST' && (
        <div className="space-y-5">
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
                      {mcq.images && Array.isArray(mcq.images) && mcq.images.length > 0 ? (
                        <div className="flex flex-col gap-2.5 my-3">
                          {mcq.images.map((imgUrl, idx) => (
                            <div key={idx} className="max-w-sm rounded-lg overflow-hidden border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50 dark:bg-black flex justify-center">
                              <img 
                                src={imgUrl} 
                                alt={`Medical clinical clue ${idx}`} 
                                className="object-contain max-h-[300px] w-full" 
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : mcq.image && (
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
      )}

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
