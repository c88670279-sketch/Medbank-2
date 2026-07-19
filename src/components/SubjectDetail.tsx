import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  Layers, 
  Brain, 
  BookOpen, 
  FileText, 
  Play, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  X, 
  Loader2, 
  Folder, 
  FolderOpen 
} from 'lucide-react';
import { SubjectName, Chapter, Topic, PDFNote, MCQ } from '../types';
import { getAllPDFs, getAllMCQs } from '../lib/mockData';
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
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'pdfs' | 'mcqs'>('topics');
  
  // Accordion states
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({});
  
  // AI summary states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [activeSummaryTopic, setActiveSummaryTopic] = useState<string | null>(null);

  // Clear states when subject changes to avoid bleeding state
  React.useEffect(() => {
    setSelectedChapter(null);
    setSelectedTopic(null);
    setExpandedSections({});
    setExpandedCategories({});
    setExpandedChapters({});
    setSummaryResult(null);
    setActiveSummaryTopic(null);
    setActiveTab('topics');
  }, [subjectName]);

  const filteredChapters = chapters.filter(c => c && c.subject === subjectName && c.isActive !== false);

  // Helper to strip out serial prefix of sections for clean comparison and display
  const displaySectionName = (sec: string) => {
    if (subjectName === 'Microbiology') {
      if (sec.toLowerCase().includes('section 12') || sec.toLowerCase() === 'annexures') return 'Annexures';
      if (sec.toLowerCase().includes('section 13')) return 'Unassigned Questions';
    }
    return sec;
  };

  // Group chapters by section if available
  const sectionsMap = React.useMemo(() => {
    const map: { [key: string]: Chapter[] } = {};
    filteredChapters.forEach(chapter => {
      const secName = chapter.section || 'General';
      if (!map[secName]) {
        map[secName] = [];
      }
      map[secName].push(chapter);
    });
    return map;
  }, [filteredChapters]);

  const sectionKeys = React.useMemo(() => {
    return Object.keys(sectionsMap).sort((a, b) => {
      const getNum = (s: string) => {
        const match = s.match(/Section\s+(\d+)/i);
        if (match) return parseInt(match[1], 10);
        if (s.toLowerCase().includes('annexure')) return 98;
        if (s.toLowerCase().includes('unassigned')) return 99;
        if (s === 'General') return 0;
        return 100;
      };
      return getNum(a) - getNum(b);
    });
  }, [sectionsMap]);

  // Select first chapter by default on initial render of subject
  React.useEffect(() => {
    if (filteredChapters.length > 0 && !selectedChapter) {
      setSelectedChapter(filteredChapters[0]);
    }
  }, [subjectName, filteredChapters, selectedChapter]);

  // Expand active chapter's section and category on selection load
  React.useEffect(() => {
    if (selectedChapter) {
      const sec = selectedChapter.section || 'General';
      setExpandedSections(prev => ({ ...prev, [sec]: true }));
      
      if (subjectName === 'Microbiology' && shouldCategorizeSection(sec)) {
        const cat = getChapterCategory(selectedChapter.name, selectedChapter.description);
        setExpandedCategories(prev => ({ ...prev, [`${sec}-${cat}`]: true }));
      }
    }
  }, [selectedChapter, subjectName]);

  // Help determine if a section qualifies for system-based pathogen categorization
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

  // Textbook-based dynamic pathogen/topic classifier
  const getChapterCategory = (chapterName: string, chapterDesc: string): string => {
    const name = chapterName.toLowerCase();
    const desc = chapterDesc.toLowerCase();
    
    // Check for general clinical approaches & syndromes
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

    // Fungal
    if (
      name.includes('fungal') || 
      name.includes('mycoses') || 
      name.includes('candidiasis') || 
      name.includes('candida') ||
      name.includes('histoplasmosis') ||
      name.includes('coccidioidomycosis') ||
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

    // Parasitic
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

    // Viral
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

    // Bacterial (Fallback)
    return 'Bacterial Infections';
  };

  // Pathogen style guide for high-end visual scanning
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'Bacterial Infections':
        return {
          badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100/60 dark:border-emerald-900/30',
          dot: 'bg-emerald-500',
          hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10'
        };
      case 'Viral Infections':
        return {
          badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-100/60 dark:border-purple-900/30',
          dot: 'bg-purple-500',
          hoverBg: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/10'
        };
      case 'Parasitic Infections':
        return {
          badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100/60 dark:border-rose-900/30',
          dot: 'bg-rose-500',
          hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/10'
        };
      case 'Fungal Infections':
        return {
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100/60 dark:border-amber-900/30',
          dot: 'bg-amber-500',
          hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/10'
        };
      default:
        return {
          badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-100/60 dark:border-cyan-900/30',
          dot: 'bg-cyan-500',
          hoverBg: 'hover:bg-cyan-50/50 dark:hover:bg-cyan-950/10'
        };
    }
  };

  // Parse exercise labels out of topics (e.g. "3.1. Bacterial Taxonomy" -> "Exercise 3.1")
  const parseTopicName = (name: string) => {
    const match = name.match(/^(\d+(?:\.\d+)+)\.?\s*(.*)$/);
    if (match) {
      return {
        prefix: `Exercise ${match[1]}`,
        title: match[2]
      };
    }
    return {
      prefix: null,
      title: name
    };
  };

  // Filter content based on active selections
  const currentTopics = selectedChapter
    ? topics.filter(t => t.chapterId === selectedChapter.id)
    : [];

  const currentPDFs = React.useMemo(() => {
    if (selectedTopic) {
      return getAllPDFs().filter(
        pdf => pdf.subject === subjectName && pdf.topic === selectedTopic.name
      );
    }
    if (selectedChapter) {
      return getAllPDFs().filter(
        pdf => pdf.subject === subjectName && (pdf.chapter === selectedChapter.name || pdf.topic === '')
      );
    }
    return [];
  }, [subjectName, selectedChapter, selectedTopic]);

  const currentMCQs = React.useMemo(() => {
    if (selectedTopic) {
      return getAllMCQs().filter(
        q => q.subject === subjectName && q.topic === selectedTopic.name
      );
    }
    if (selectedChapter) {
      return getAllMCQs().filter(
        q => q.subject === subjectName && q.chapter === selectedChapter.name
      );
    }
    return [];
  }, [subjectName, selectedChapter, selectedTopic]);

  // Practice session launchers
  const handleStartChapterTest = () => {
    if (!selectedChapter) return;
    if (currentMCQs.length === 0) {
      alert('No MCQs available in this chapter yet.');
      return;
    }
    onStartQuiz(currentMCQs, `${selectedChapter.name} Chapter Test`);
  };

  const handleStartTopicTest = (topic: Topic) => {
    const topicMCQs = getAllMCQs().filter(
      q => q.subject === subjectName && q.topic === topic.name
    );
    if (topicMCQs.length === 0) {
      alert(`No direct MCQs for "${topic.name}". Launching general Practice session using Chapter questions...`);
      onStartQuiz(currentMCQs.slice(0, 5), `${topic.name} Practice Test`);
      return;
    }
    onStartQuiz(topicMCQs, `${topic.name} Practice Test`);
  };

  // AI study helper
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
      setSummaryResult(`### ❌ AI Summarization Failed\n\nCould not fetch response. Error: ${err.message || 'Unknown network error'}. Please verify that your dev server is active and the API key is configured correctly.`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Breadcrumbs generator
  const getBreadcrumbs = () => {
    const crumbs = ['QBank', subjectName];
    if (selectedChapter) {
      const secName = displaySectionName(selectedChapter.section || 'General');
      crumbs.push(secName);
      
      if (subjectName === 'Microbiology' && shouldCategorizeSection(selectedChapter.section || '')) {
        crumbs.push(getChapterCategory(selectedChapter.name, selectedChapter.description));
      }
      crumbs.push(selectedChapter.name);
    }
    if (selectedTopic) {
      const parsed = parseTopicName(selectedTopic.name);
      crumbs.push(parsed.prefix ? `${parsed.prefix}: ${parsed.title}` : selectedTopic.name);
    }
    return crumbs;
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
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Textbook Index Integration & Study Board</p>
          </div>
        </div>

        {selectedChapter && currentMCQs.length > 0 && !selectedTopic && (
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
        {/* Course Curriculum Tree Navigator */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Textbook Syllabus Tree</h3>
          
          <div className="space-y-2.5 max-h-[75vh] lg:max-h-[85vh] overflow-y-auto pr-1 scrollbar-thin">
            {sectionKeys.map((sectionName) => {
              const isSectionActive = selectedChapter && (selectedChapter.section === sectionName || (!selectedChapter.section && sectionName === 'General'));
              const isSectionExpanded = !!expandedSections[sectionName];
              const sectionChapters = sectionsMap[sectionName];
              const isOnlyGeneral = sectionKeys.length === 1 && sectionName === 'General';

              const renderChapterNode = (chapter: Chapter) => {
                const isChapterActive = selectedChapter?.id === chapter.id;
                const isChapterExpanded = !!expandedChapters[chapter.id];
                const chapterTopics = topics.filter(t => t.chapterId === chapter.id);
                const hasTopics = chapterTopics.length > 0;

                return (
                  <div key={chapter.id} className="space-y-1">
                    {/* Chapter Row */}
                    <div
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setSelectedTopic(null);
                        setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }));
                        setSummaryResult(null);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isChapterActive && !selectedTopic
                          ? 'bg-slate-50 dark:bg-zinc-800/80 border-[#18181b] dark:border-zinc-300'
                          : isChapterActive 
                            ? 'bg-slate-50/50 dark:bg-zinc-900/30 border-slate-300 dark:border-zinc-700'
                            : 'bg-white dark:bg-[#18181b] border-slate-100 dark:border-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <h5 className={`font-bold text-[11px] leading-tight ${isChapterActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                          {chapter.name}
                        </h5>
                        {hasTopics && (
                          <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isChapterExpanded ? 'rotate-90' : ''}`} />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 line-clamp-1 leading-normal">
                        {chapter.description}
                      </p>
                    </div>

                    {/* Subchapters / Exercises (collapsible) */}
                    {hasTopics && (
                      <AnimatePresence initial={false}>
                        {isChapterExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden pl-3 border-l border-slate-100 dark:border-zinc-800/60 ml-2 space-y-1 py-1"
                          >
                            {chapterTopics.map(topic => {
                              const isTopicActive = selectedTopic?.id === topic.id;
                              const parsed = parseTopicName(topic.name);
                              return (
                                <div
                                  key={topic.id}
                                  onClick={() => {
                                    setSelectedChapter(chapter);
                                    setSelectedTopic(topic);
                                    setSummaryResult(null);
                                    setActiveTab('mcqs'); // focus on MCQs directly for subchapter
                                  }}
                                  className={`p-2 rounded-lg text-left cursor-pointer transition-colors ${
                                    isTopicActive
                                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-semibold'
                                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/30 text-slate-600 dark:text-zinc-400'
                                  }`}
                                >
                                  <div className="flex items-start space-x-1.5">
                                    {parsed.prefix && (
                                      <span className="text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded shrink-0 text-slate-500">
                                        {parsed.prefix.replace('Exercise ', '')}
                                      </span>
                                    )}
                                    <span className="text-[10.5px] leading-snug line-clamp-2">
                                      {parsed.title}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              };

              // 1. Single general section without expandable header
              if (isOnlyGeneral) {
                return (
                  <div key={sectionName} className="space-y-2">
                    {sectionChapters.map(chapter => renderChapterNode(chapter))}
                  </div>
                );
              }

              // 2. Sections with systemic categories
              const shouldCategorize = subjectName === 'Microbiology' && shouldCategorizeSection(sectionName);

              return (
                <div key={sectionName} className="border border-[#e4e4e7] dark:border-[#27272a] rounded-xl overflow-hidden bg-white dark:bg-[#18181b]">
                  {/* Section Title Header Accordion */}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
                    }}
                    className={`w-full p-3.5 flex justify-between items-center text-left font-bold text-[10px] tracking-wide transition-colors ${
                      isSectionActive 
                        ? 'bg-slate-50 dark:bg-zinc-900/30 text-indigo-600 dark:text-indigo-400 border-b border-[#e4e4e7] dark:border-[#27272a]' 
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50/50 dark:hover:bg-zinc-850/20'
                    }`}
                  >
                    <span className="truncate pr-2 uppercase">{displaySectionName(sectionName)}</span>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isSectionExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Section Content Block */}
                  <AnimatePresence initial={false}>
                    {isSectionExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-[#e4e4e7]/40 dark:border-[#27272a]/40 bg-slate-50/30 dark:bg-zinc-950/10 p-2 space-y-1.5"
                      >
                        {shouldCategorize ? (
                          (() => {
                            // Categorize chapters within section
                            const categoriesMap: { [cat: string]: Chapter[] } = {
                              'General Infective Syndromes': [],
                              'Bacterial Infections': [],
                              'Viral Infections': [],
                              'Parasitic Infections': [],
                              'Fungal Infections': []
                            };

                            sectionChapters.forEach(chap => {
                              const cat = getChapterCategory(chap.name, chap.description);
                              if (categoriesMap[cat]) {
                                categoriesMap[cat].push(chap);
                              } else {
                                categoriesMap['Bacterial Infections'].push(chap);
                              }
                            });

                            const activeCats = Object.keys(categoriesMap).filter(cat => categoriesMap[cat].length > 0);

                            return activeCats.map(cat => {
                              const catStyle = getCategoryStyle(cat);
                              const isCatExpanded = !!expandedCategories[`${sectionName}-${cat}`];
                              const catChapters = categoriesMap[cat];

                              return (
                                <div key={cat} className="border border-slate-100 dark:border-zinc-800/60 rounded-xl overflow-hidden bg-white dark:bg-[#18181b]/50">
                                  {/* Pathogen Category Header Row */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedCategories(prev => ({
                                        ...prev,
                                        [`${sectionName}-${cat}`]: !prev[`${sectionName}-${cat}`]
                                      }));
                                    }}
                                    className={`w-full p-2.5 flex justify-between items-center text-left text-[9.5px] font-bold transition-all border-b border-transparent ${catStyle.hoverBg}`}
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                                      <span className="text-slate-700 dark:text-zinc-300">{cat}</span>
                                      <span className="text-[8px] font-medium text-slate-400">({catChapters.length})</span>
                                    </div>
                                    <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isCatExpanded ? 'rotate-90' : ''}`} />
                                  </button>

                                  {/* Chapters inside Pathogen Category */}
                                  <AnimatePresence initial={false}>
                                    {isCatExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="p-1.5 space-y-1.5 bg-slate-50/20 dark:bg-zinc-950/5 border-t border-slate-100 dark:border-zinc-850"
                                      >
                                        {catChapters.map(chap => renderChapterNode(chap))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            });
                          })()
                        ) : (
                          // If no systemic categories, render chapters directly
                          sectionChapters.map(chap => renderChapterNode(chap))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Study Dashboard Area */}
        <div className="lg:col-span-7 space-y-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6">
          {selectedChapter ? (
            <div className="space-y-5">
              {/* Dynamic Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider pb-1">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <React.Fragment key={idx}>
                    <span className={idx === arr.length - 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                      {crumb}
                    </span>
                    {idx < arr.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-slate-300" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Back navigation when zoomed into topic */}
              {selectedTopic && (
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="flex items-center text-[10.5px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/10 px-2.5 py-1 rounded-md"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180 mr-1" />
                  <span>Back to {selectedChapter.name} Overview</span>
                </button>
              )}

              {/* Title Header Space */}
              {selectedTopic ? (
                (() => {
                  const parsed = parseTopicName(selectedTopic.name);
                  return (
                    <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/20 px-2 py-0.5 rounded inline-block">
                        {parsed.prefix || 'Active Subtopic'}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">{parsed.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{selectedTopic.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-4.5">
                        <button
                          onClick={() => handleAISummarize(selectedTopic.name, selectedTopic.description)}
                          className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors rounded-lg text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer border border-slate-100 dark:border-zinc-800/60"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>AI Study summary</span>
                        </button>
                        <button
                          onClick={() => handleStartTopicTest(selectedTopic)}
                          className="px-3.5 py-2 bg-[#18181b] dark:bg-[#f4f4f5] text-white dark:text-[#18181b] hover:bg-black dark:hover:bg-white transition-colors rounded-lg text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Practice Test ({currentMCQs.length} Qs)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Active Chapter Overview</span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">{selectedChapter.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{selectedChapter.description}</p>
                  
                  {currentMCQs.length > 0 && (
                    <button
                      onClick={handleStartChapterTest}
                      className="mt-4.5 px-3.5 py-2 bg-[#18181b] dark:bg-[#f4f4f5] text-white dark:text-[#18181b] hover:bg-black dark:hover:bg-white transition-colors rounded-lg text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Launch Chapter Test ({currentMCQs.length} Qs)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Study Area Navigation Tabs */}
              <div className="flex border-b border-[#e4e4e7] dark:border-[#27272a]">
                {!selectedTopic && currentTopics.length > 0 && (
                  <button
                    onClick={() => setActiveTab('topics')}
                    className={`pb-3 text-xs font-bold border-b-2 px-4 transition-all cursor-pointer ${
                      activeTab === 'topics'
                        ? 'border-[#18181b] dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    Exercises / Topics ({currentTopics.length})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('mcqs')}
                  className={`pb-3 text-xs font-bold border-b-2 px-4 transition-all cursor-pointer ${
                    activeTab === 'mcqs' || (selectedTopic && activeTab === 'topics')
                      ? 'border-[#18181b] dark:border-white text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {selectedTopic ? 'Topic Questions' : 'Chapter Questions'} ({currentMCQs.length})
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
              </div>

              {/* Tab Contents */}
              <div className="min-h-[280px]">
                {/* 1. Topics Tab */}
                {activeTab === 'topics' && !selectedTopic && (
                  <div className="space-y-3">
                    {currentTopics.length > 0 ? (
                      currentTopics.map((topic) => {
                        const parsed = parseTopicName(topic.name);
                        return (
                          <div
                            key={topic.id}
                            className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-200 transition-colors"
                          >
                            <div className="space-y-1.5 max-w-lg">
                              {parsed.prefix && (
                                <span className="inline-block text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/30 px-2 py-0.5 rounded">
                                  {parsed.prefix}
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                                {parsed.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">{topic.description}</p>
                            </div>
                            
                            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleAISummarize(topic.name, topic.description)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer border border-transparent"
                              >
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                <span>AI Summary</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTopic(topic);
                                  setSummaryResult(null);
                                  setActiveTab('mcqs');
                                }}
                                className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <Play className="h-2.5 w-2.5 fill-current stroke-none" />
                                <span>Practice</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <BookOpen className="h-8 w-8 mx-auto stroke-1" />
                        <p className="text-xs font-medium">No custom topics populated under this chapter yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MCQs Tab */}
                {(activeTab === 'mcqs' || (selectedTopic && activeTab === 'topics')) && (
                  <div className="space-y-3">
                    {currentMCQs.length > 0 ? (
                      currentMCQs.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => onQuestionClick && onQuestionClick(q.id)}
                          className={`p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-left space-y-2 bg-slate-50/30 dark:bg-zinc-900/10 transition-all ${
                            onQuestionClick ? 'cursor-pointer hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-850' : ''
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
                      <div className="text-center py-12 text-slate-400 bg-slate-50/30 dark:bg-zinc-900/5 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl space-y-3">
                        <HelpCircle className="h-8 w-8 mx-auto stroke-1" />
                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">No MCQs currently found for this specific topic node.</p>
                        {selectedTopic && (
                          <div className="space-y-2 max-w-sm mx-auto">
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Don't worry! You can practice the full chapter's compiled question bank instead.</p>
                            <button
                              onClick={() => {
                                setSelectedTopic(null);
                                setActiveTab('mcqs');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Solve Chapter MCQs ({getAllMCQs().filter(q => q.subject === subjectName && q.chapter === selectedChapter.name).length} Qs)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PDFs Tab */}
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
                              className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
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
                        <p className="text-xs font-medium">No custom notes uploaded for this node yet.</p>
                        <p className="text-[11px]">Log in as Admin to upload class notes or textbook references!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 mx-auto stroke-1 animate-spin text-slate-300 dark:text-zinc-700" />
              <p className="text-xs font-medium">Loading Textbook Syllabus Navigator...</p>
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

              <div className="p-5 overflow-y-auto flex-1 text-left space-y-4 font-sans">
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
