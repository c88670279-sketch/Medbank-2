import { MCQ, Chapter, Topic, PDFNote, RecentActivity, UserStats, SubjectName, TestAttempt } from '../types';
import { saveDBNote, saveDBQuestion, deleteDBQuestion, saveDBTestResult, saveDBUser } from './api';
import { safeStorage } from './safeStorage';

// Chapters Mapping
export const MOCK_CHAPTERS: Chapter[] = [
  // Pathology
  { id: 'path-c1', name: 'Cell Injury & Adaptation', subject: 'Pathology', description: 'Reversible and irreversible cell injury, necrosis, apoptosis, and intracellular accumulations.' },
  { id: 'path-c2', name: 'Inflammation & Repair', subject: 'Pathology', description: 'Acute and chronic inflammation, chemical mediators, and tissue regeneration and wound healing.' },
  { id: 'path-c3', name: 'Neoplasia', subject: 'Pathology', description: 'Characteristics of benign and malignant tumors, oncogenes, tumor suppressors, and metastasis.' },
  { id: 'path-c4', name: 'Anemia & Hematology', subject: 'Pathology', description: 'Microcytic, macrocytic, hemolytic anemias, and leukemia classifications.' },

  // Pharmacology
  { id: 'pharm-c1', name: 'General Pharmacology', subject: 'Pharmacology', description: 'Pharmacokinetics (absorption, distribution, metabolism, excretion) and pharmacodynamics.' },
  { id: 'pharm-c2', name: 'Autonomic Nervous System', subject: 'Pharmacology', description: 'Cholinergic, anticholinergic, adrenergic, and antiadrenergic drugs.' },
  { id: 'pharm-c3', name: 'Cardiovascular Drugs', subject: 'Pharmacology', description: 'Antihypertensives, antiarrhythmics, drugs for heart failure and angina.' },
  { id: 'pharm-c4', name: 'Antimicrobials', subject: 'Pharmacology', description: 'Penicillins, cephalosporins, aminoglycosides, macrolides, and fluoroquinolones.' },

  // Microbiology
  { id: 'micro-c1', name: 'General Bacteriology', subject: 'Microbiology', description: 'Bacterial cell structure, growth, nutrition, and disinfection.' },
  { id: 'micro-c2', name: 'Immunology', subject: 'Microbiology', description: 'Antigens, antibodies, hypersensitivity reactions, and autoimmune disorders.' },
  { id: 'micro-c3', name: 'Systemic Bacteriology', subject: 'Microbiology', description: 'Staphylococci, Streptococci, Enterobacteriaceae, and Mycobacteria.' },
  { id: 'micro-c4', name: 'Virology', subject: 'Microbiology', description: 'DNA viruses, RNA viruses, HIV, hepatitis, and antiviral defenses.' }
];

// Topics Mapping
export const MOCK_TOPICS: Topic[] = [
  // Pathology - Cell Injury
  { id: 'path-t1', name: 'Necrosis vs Apoptosis', chapterId: 'path-c1', subject: 'Pathology', description: 'Morphology, biochemistry, and molecular mechanisms of cell death.' },
  { id: 'path-t2', name: 'Intracellular Accumulations', chapterId: 'path-c1', subject: 'Pathology', description: 'Fatty change, amyloidosis, calcification, and pigment storage.' },
  // Pathology - Inflammation
  { id: 'path-t3', name: 'Vascular Events', chapterId: 'path-c2', subject: 'Pathology', description: 'Vasodilation, increased permeability, and fluid exudation.' },
  { id: 'path-t4', name: 'Cellular Events', chapterId: 'path-c2', subject: 'Pathology', description: 'Leukocyte rolling, adhesion, transmigration, and phagocytosis.' },
  // Pathology - Neoplasia
  { id: 'path-t5', name: 'Tumor Suppressor Genes', chapterId: 'path-c3', subject: 'Pathology', description: 'TP53, RB1, BRCA1/2, and APC genes in cancer.' },

  // Pharmacology - General
  { id: 'pharm-t1', name: 'Bioavailability & Half-life', chapterId: 'pharm-c1', subject: 'Pharmacology', description: 'Factors influencing plasma concentration-time curves.' },
  { id: 'pharm-t2', name: 'Receptor Signaling Mechanisms', chapterId: 'pharm-c1', subject: 'Pharmacology', description: 'G-proteins, ion channels, enzyme-linked receptors.' },
  // Pharmacology - ANS
  { id: 'pharm-t3', name: 'Adrenergic Agonists', chapterId: 'pharm-c2', subject: 'Pharmacology', description: 'Epinephrine, Norepinephrine, Dopamine, and selective agonists.' },
  { id: 'pharm-t4', name: 'Beta Blockers', chapterId: 'pharm-c2', subject: 'Pharmacology', description: 'Propranolol, Atenolol, Metoprolol, and their clinical uses.' },

  // Microbiology - General
  { id: 'micro-t1', name: 'Gram Staining & Cell Wall', chapterId: 'micro-c1', subject: 'Microbiology', description: 'Differences in Gram-positive and Gram-negative envelope structures.' },
  { id: 'micro-t2', name: 'Sterilization Methods', chapterId: 'micro-c1', subject: 'Microbiology', description: 'Autoclave parameters, dry heat, radiation, and chemical disinfectants.' },
  // Microbiology - Immunology
  { id: 'micro-t3', name: 'Hypersensitivity Reactions', chapterId: 'micro-c2', subject: 'Microbiology', description: 'Types I, II, III, and IV hypersensitivity with clinical correlations.' }
];

// PDF notes
export const MOCK_PDF_NOTES: PDFNote[] = [
  {
    id: 'pdf-1',
    title: 'Robbins Pathology - Cell Injury Summarized',
    subject: 'Pathology',
    chapter: 'Cell Injury & Adaptation',
    topic: 'Necrosis vs Apoptosis',
    sourceBook: 'Robbins & Cotran',
    fileSize: '4.2 MB',
    downloadUrl: '#',
    uploadedAt: '2026-07-01',
    pagesCount: 15
  },
  {
    id: 'pdf-2',
    title: 'Ramdas Pathology - Key Amyloidosis Tables',
    subject: 'Pathology',
    chapter: 'Cell Injury & Adaptation',
    topic: 'Intracellular Accumulations',
    sourceBook: 'Ramdas Pathology',
    fileSize: '2.1 MB',
    downloadUrl: '#',
    uploadedAt: '2026-07-05',
    pagesCount: 8
  },
  {
    id: 'pdf-3',
    title: 'KDT Pharmacology - Autonomic Drugs Flowcharts',
    subject: 'Pharmacology',
    chapter: 'Autonomic Nervous System',
    topic: 'Adrenergic Agonists',
    sourceBook: 'KDT (Tripathi)',
    fileSize: '6.8 MB',
    downloadUrl: '#',
    uploadedAt: '2026-06-20',
    pagesCount: 22
  },
  {
    id: 'pdf-4',
    title: 'Apurba Sastry - Hypersensitivity Simplified Notes',
    subject: 'Microbiology',
    chapter: 'Immunology',
    topic: 'Hypersensitivity Reactions',
    sourceBook: 'Apurba Sastry',
    fileSize: '3.5 MB',
    downloadUrl: '#',
    uploadedAt: '2026-07-08',
    pagesCount: 12
  }
];

// Comprehensive MCQs
export const MOCK_MCQS: MCQ[] = [
  {
    id: 'q-1',
    question: 'A 45-year-old chronic alcoholic presents with severe epigastric pain radiating to the back. Serum amylase and lipase are significantly elevated. A biopsy of the pancreas would most likely show which type of necrosis?',
    options: [
      'Coagulative Necrosis',
      'Liquefactive Necrosis',
      'Fat Necrosis',
      'Caseous Necrosis'
    ],
    correctAnswer: 2,
    explanation: 'Fat necrosis is characteristic of acute pancreatitis. Released pancreatic lipases liquefy membrane lipids and hydrolyze triglycerides, releasing fatty acids which combine with calcium to form chalky white areas (saponification).',
    subject: 'Pathology',
    chapter: 'Cell Injury & Adaptation',
    topic: 'Necrosis vs Apoptosis',
    difficulty: 'Medium',
    sourceBook: 'Robbins & Cotran',
    tags: ['Pancreas', 'Necrosis', 'Clinical Case'],
    type: 'Clinical Case Based'
  },
  {
    id: 'q-2',
    question: 'Which of the following is the hallmark molecular event of apoptosis, executed by caspases?',
    options: [
      'Random DNA fragmentation',
      'Internucleosomal DNA cleavage (DNA laddering)',
      'Intracellular calcium influx resulting in membrane rupture',
      'Anerobic glycolysis upregulation'
    ],
    correctAnswer: 1,
    explanation: 'Internucleosomal DNA cleavage of 180-200 base pair intervals (DNA laddering) is a highly specific hallmark of apoptosis, mediated by Caspase-Activated DNase (CAD).',
    subject: 'Pathology',
    chapter: 'Cell Injury & Adaptation',
    topic: 'Necrosis vs Apoptosis',
    difficulty: 'Easy',
    sourceBook: 'Robbins & Cotran',
    tags: ['Apoptosis', 'Caspases'],
    type: 'Single Best Answer'
  },
  {
    id: 'q-3',
    question: 'Assertion (A): Phenoxybenzamine is used in the pre-operative management of Pheochromocytoma.\nReason (R): It is a competitive alpha-receptor blocker that prevents epinephrine-induced hypertensive crisis.',
    options: [
      'Both A and R are true, and R is the correct explanation of A.',
      'Both A and R are true, but R is NOT the correct explanation of A.',
      'A is true, but R is false.',
      'Both A and R are false.'
    ],
    correctAnswer: 2,
    explanation: 'Assertion is true (Phenoxybenzamine is used pre-operatively). However, the reason is false because Phenoxybenzamine is an IRREVERSIBLE (non-competitive) covalent alpha-blocker, not a competitive one.',
    subject: 'Pharmacology',
    chapter: 'Autonomic Nervous System',
    topic: 'Adrenergic Agonists',
    difficulty: 'Hard',
    sourceBook: 'KDT (Tripathi)',
    tags: ['ANS', 'Pheochromocytoma', 'Assertion-Reason'],
    type: 'Assertion & Reason'
  },
  {
    id: 'q-4',
    question: 'An 18-year-old male eats peanuts and within 10 minutes develops generalized hives, difficulty breathing, laryngeal edema, and a blood pressure of 80/50 mmHg. What is the immediate drug of choice and its route of administration?',
    options: [
      'Intravenous Hydrocortisone 100mg',
      'Intramuscular Epinephrine 1:1000 (0.5 mg)',
      'Subcutaneous Epinephrine 1:10000 (0.1 mg)',
      'Oral Cetirizine 10mg'
    ],
    correctAnswer: 1,
    explanation: 'This is a Type I anaphylactic hypersensitivity reaction. Intramuscular epinephrine (adrenaline) 1:1000 injected in the anterolateral thigh is the first-line lifesaving treatment to reverse bronchoconstriction and vasodilation.',
    subject: 'Pharmacology',
    chapter: 'Autonomic Nervous System',
    topic: 'Adrenergic Agonists',
    difficulty: 'Medium',
    sourceBook: 'KDT (Tripathi)',
    tags: ['ANS', 'Anaphylaxis', 'Epinephrine'],
    type: 'Clinical Case Based'
  },
  {
    id: 'q-5',
    question: 'A skin biopsy of an elderly male showing a purplish nodule on the foot reveals spindle-shaped cells, slit-like vascular spaces containing red blood cells, and positive staining for HHV-8. This lesion represents Kaposi Sarcoma, which is strongly associated with which condition?',
    options: [
      'Chronic HBV infection',
      'Advanced HIV infection / AIDS',
      'Primary Biliary Cholangitis',
      'EBV associated lymphoma'
    ],
    correctAnswer: 1,
    explanation: 'Kaposi Sarcoma is a vascular neoplasm caused by Human Herpesvirus 8 (HHV-8), characteristically manifesting in HIV-infected individuals with low CD4 counts.',
    subject: 'Pathology',
    chapter: 'Neoplasia',
    topic: 'Tumor Suppressor Genes',
    difficulty: 'Medium',
    sourceBook: 'Robbins & Cotran',
    tags: ['HIV', 'HHV-8', 'Neoplasia'],
    type: 'Clinical Case Based'
  },
  {
    id: 'q-6',
    question: 'Which of the following components is present in the cell wall of Gram-positive bacteria but is ABSENT in Gram-negative bacteria?',
    options: [
      'Peptidoglycan',
      'Lipopolysaccharide (LPS)',
      'Teichoic Acid',
      'Outer membrane'
    ],
    correctAnswer: 2,
    explanation: 'Teichoic acid and lipoteichoic acid are unique polymers found embedded in the thick peptidoglycan cell walls of Gram-positive bacteria, absent in Gram-negatives. Gram-negative cell walls feature an outer membrane with lipopolysaccharides (endotoxin).',
    subject: 'Microbiology',
    chapter: 'General Bacteriology',
    topic: 'Gram Staining & Cell Wall',
    difficulty: 'Easy',
    sourceBook: 'Apurba Sastry',
    tags: ['Bacteriology', 'Cell Wall'],
    type: 'Single Best Answer'
  },
  {
    id: 'q-7',
    question: 'Identify the stained organism showing a distinct "Gram-negative, safety-pin appearance" (bipolar staining) on Wayson stain, representing a zoonotic pathogen that causes high fever, painful buboes, and high mortality if untreated:',
    options: [
      'Pseudomonas aeruginosa',
      'Yersinia pestis',
      'Vibrio cholerae',
      'Klebsiella pneumoniae'
    ],
    correctAnswer: 1,
    explanation: 'Yersinia pestis, the causative agent of plague, exhibits characteristic bipolar "safety-pin" staining with Wayson or Giemsa stains.',
    subject: 'Microbiology',
    chapter: 'Systemic Bacteriology',
    topic: 'Sterilization Methods',
    difficulty: 'Medium',
    sourceBook: 'Apurba Sastry',
    tags: ['Bacteriology', 'Plague', 'Image-Based'],
    type: 'Image Based'
  },
  {
    id: 'q-8',
    question: 'A patient is started on a high-dose chemotherapy regimen and develops sudden-onset hemorrhagic cystitis. Which of the following drugs is most likely responsible, and what adjunct is administered to neutralize the toxic metabolite?',
    options: [
      'Methotrexate; Folinic Acid (Leucovorin)',
      'Cyclophosphamide; MESNA',
      'Doxorubicin; Dexrazoxane',
      'Cisplatin; Amifostine'
    ],
    correctAnswer: 1,
    explanation: 'Cyclophosphamide produces acrolein, a toxic metabolite excreted in urine that causes hemorrhagic cystitis. MESNA (2-mercaptoethane sulfonate) is administered to bind and neutralize acrolein in the bladder.',
    subject: 'Pharmacology',
    chapter: 'Antimicrobials',
    topic: 'Bioavailability & Half-life',
    difficulty: 'Hard',
    sourceBook: 'KDT (Tripathi)',
    tags: ['Chemotherapy', 'MESNA', 'Cyclophosphamide'],
    type: 'Clinical Case Based'
  }
];

// Helper functions for persistent local state
export function getUserScopedKey(baseKey: string): string {
  const user = safeStorage.getItem('medbank_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed && parsed.email) {
        return `${baseKey}_${parsed.email.toLowerCase()}`;
      }
    } catch (e) {}
  }
  return baseKey;
}

export function getSavedUser(): any {
  const user = safeStorage.getItem('medbank_user');
  if (user) return JSON.parse(user);
  return null;
}

export function saveUser(user: any) {
  safeStorage.setItem('medbank_user', JSON.stringify(user));
  saveDBUser(user).catch(err => console.error('Failed to sync user to MongoDB Atlas:', err));
}

export function clearUser() {
  safeStorage.removeItem('medbank_user');
  // Individual users keep their namespace-isolated keys untouched to prevent leakage
}

export function getBookmarks(): string[] {
  const bks = safeStorage.getItem(getUserScopedKey('medbank_bookmarks'));
  return bks ? JSON.parse(bks) : [];
}

export function toggleBookmark(mcqId: string): string[] {
  let bks = getBookmarks();
  if (bks.includes(mcqId)) {
    bks = bks.filter(id => id !== mcqId);
  } else {
    bks.push(mcqId);
  }
  safeStorage.setItem(getUserScopedKey('medbank_bookmarks'), JSON.stringify(bks));
  return bks;
}

export function getTestAttempts(): TestAttempt[] {
  const atts = safeStorage.getItem(getUserScopedKey('medbank_test_attempts'));
  return atts ? JSON.parse(atts) : [];
}

export function saveTestAttempt(attempt: TestAttempt) {
  const atts = getTestAttempts();
  atts.unshift(attempt);
  safeStorage.setItem(getUserScopedKey('medbank_test_attempts'), JSON.stringify(atts));
  saveDBTestResult(attempt).catch(err => console.error('Failed to sync test result to MongoDB Atlas:', err));
}

export function getStudyStreak(): { currentStreak: number; longestStreak: number; lastActiveDate: string } {
  const str = safeStorage.getItem(getUserScopedKey('medbank_study_streak'));
  if (str) return JSON.parse(str);
  
  const defaultStreak = { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  safeStorage.setItem(getUserScopedKey('medbank_study_streak'), JSON.stringify(defaultStreak));
  return defaultStreak;
}

export function updateStudyStreak() {
  const streak = getStudyStreak();
  const today = new Date().toISOString().split('T')[0];
  if (streak.lastActiveDate === today) {
    return streak;
  }
  
  if (!streak.lastActiveDate) {
    streak.currentStreak = 1;
    streak.longestStreak = 1;
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (streak.lastActiveDate === yesterday) {
      streak.currentStreak += 1;
    } else {
      streak.currentStreak = 1;
    }
  }
  
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }
  streak.lastActiveDate = today;
  safeStorage.setItem(getUserScopedKey('medbank_study_streak'), JSON.stringify(streak));
  return streak;
}

export function getCustomMCQs(): MCQ[] {
  const list = safeStorage.getItem(getUserScopedKey('medbank_custom_mcqs'));
  return list ? JSON.parse(list) : [];
}

export function addCustomMCQ(mcq: MCQ) {
  const list = getCustomMCQs();
  list.unshift(mcq);
  safeStorage.setItem(getUserScopedKey('medbank_custom_mcqs'), JSON.stringify(list));
  saveDBQuestion(mcq).catch(err => console.error('Failed to sync MCQ to MongoDB Atlas:', err));
}

export function deleteCustomMCQ(id: string) {
  let list = getCustomMCQs();
  list = list.filter(item => item.id !== id);
  safeStorage.setItem(getUserScopedKey('medbank_custom_mcqs'), JSON.stringify(list));
  deleteDBQuestion(id).catch(err => console.error('Failed to delete MCQ from MongoDB Atlas:', err));
}

export function getCustomPDFs(): PDFNote[] {
  const list = safeStorage.getItem(getUserScopedKey('medbank_custom_pdfs'));
  return list ? JSON.parse(list) : [];
}

export function addCustomPDF(pdf: PDFNote) {
  const list = getCustomPDFs();
  list.unshift(pdf);
  safeStorage.setItem(getUserScopedKey('medbank_custom_pdfs'), JSON.stringify(list));
  saveDBNote(pdf).catch(err => console.error('Failed to sync PDF note to MongoDB Atlas:', err));
}

// Aggregates MCQ + custom MCQs with ID-based deduplication, prioritizing live db data
export function getAllMCQs(): MCQ[] {
  const customRaw = safeStorage.getItem(getUserScopedKey('medbank_custom_mcqs'));
  if (customRaw !== null) {
    try {
      return JSON.parse(customRaw);
    } catch (e) {
      console.error('Failed to parse cached custom MCQs:', e);
    }
  }
  const custom = getCustomMCQs();
  const merged = [...custom, ...MOCK_MCQS];
  const map = new Map<string, MCQ>();
  merged.forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

// Aggregates PDFs + custom PDFs with ID-based deduplication, prioritizing live db data
export function getAllPDFs(): PDFNote[] {
  const customRaw = safeStorage.getItem(getUserScopedKey('medbank_custom_pdfs'));
  if (customRaw !== null) {
    try {
      return JSON.parse(customRaw);
    } catch (e) {
      console.error('Failed to parse cached custom PDFs:', e);
    }
  }
  const custom = getCustomPDFs();
  const merged = [...custom, ...MOCK_PDF_NOTES];
  const map = new Map<string, PDFNote>();
  merged.forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

export function getStats(): UserStats {
  const attempts = getTestAttempts();
  
  let solvedCount = 0;
  let correctCount = 0;
  
  attempts.forEach(att => {
    solvedCount += att.totalQuestions;
    correctCount += att.correctAnswers;
  });
  
  // Default metrics if no attempts yet (fully isolated, empty on first login)
  if (attempts.length === 0) {
    return {
      solvedCount: 0,
      correctCount: 0,
      accuracy: 0,
      studyTimeSeconds: 0,
      weakTopics: [],
      strongTopics: []
    };
  }
  
  const accuracy = Math.round((correctCount / solvedCount) * 100) || 0;
  const studyTimeSeconds = attempts.reduce((acc, att) => acc + att.timeTakenSeconds, 0);
  
  return {
    solvedCount,
    correctCount,
    accuracy,
    studyTimeSeconds,
    weakTopics: [
      { topic: 'Hypersensitivity Reactions', subject: 'Microbiology', accuracy: 55 },
      { topic: 'Bioavailability & Half-life', subject: 'Pharmacology', accuracy: 62 }
    ],
    strongTopics: [
      { topic: 'Necrosis vs Apoptosis', subject: 'Pathology', accuracy: 90 },
      { topic: 'Adrenergic Agonists', subject: 'Pharmacology', accuracy: 88 }
    ]
  };
}

export function getRecentActivities(): RecentActivity[] {
  const attempts = getTestAttempts();
  const list: RecentActivity[] = [];
  
  attempts.slice(0, 3).forEach(att => {
    list.push({
      id: att.id,
      type: 'test_completed',
      title: `Completed ${att.title}`,
      subtitle: `Scored ${att.correctAnswers}/${att.totalQuestions} (${att.score}%) • ${Math.round(att.timeTakenSeconds / 60)} mins`,
      timestamp: att.date
    });
  });
  
  return list;
}
