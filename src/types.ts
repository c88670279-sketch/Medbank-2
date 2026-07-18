export type SubjectName = string;

export interface Chapter {
  id: string;
  name: string;
  subject: SubjectName;
  description: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  chapterId: string;
  subject: SubjectName;
  description: string;
}

export interface PDFNote {
  id: string;
  title: string;
  subject: SubjectName;
  chapter: string;
  topic: string;
  sourceBook: string;
  fileSize: string;
  downloadUrl: string;
  uploadedAt: string;
  pagesCount: number;
}

export interface MCQ {
  id: string;
  _id?: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed correct option or bitmask for multiple
  correctAnswers?: number[]; // for multiple correct answers
  explanation: string;
  subject: SubjectName;
  chapter: string;
  topic: string;
  subtopic?: string;
  system?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  sourceBook: string;
  source?: 'PDF' | 'Image' | 'AI Generated' | 'Manual' | string;
  approved?: boolean;
  tags: string[];
  image?: string;
  examSource?: string; // deprecated
  targetExams?: string[];
  type: 'Single Best Answer' | 'Multiple Correct' | 'True/False' | 'Image Based' | 'Case-based MCQ' | 'Clinical Scenario' | 'Match the Following' | 'Assertion-Reason' | 'Multiple Correct Answers' | 'Assertion & Reason' | 'Clinical Case Based' | 'Image-based MCQ' | 'Single Best Answer (SBA)';
  confidenceScore?: number;
  validationErrors?: string[];
  isIncomplete?: boolean;
  verified?: boolean;
  detectedVisualType?: 'none' | 'radiology' | 'histology' | 'pathology' | 'anatomy' | 'flowchart' | 'table' | 'graph' | 'clinical_photo';
  hasVisualFigure?: boolean;
  figureCropBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface UserStats {
  solvedCount: number;
  correctCount: number;
  accuracy: number; // Percentage (0-100)
  studyTimeSeconds: number; // Total seconds studied
  weakTopics: { topic: string; subject: SubjectName; accuracy: number }[];
  strongTopics: { topic: string; subject: SubjectName; accuracy: number }[];
}

export interface RecentActivity {
  id: string;
  type: 'test_completed' | 'pdf_read' | 'bookmark_added' | 'ai_query';
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface TestAttempt {
  id: string;
  title: string;
  subject?: SubjectName;
  chapter?: string;
  topic?: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeTakenSeconds: number;
  date: string;
  questions: MCQ[];
  selectedAnswers: { [questionId: string]: number | number[] };
}

export interface Bookmark {
  id: string;
  userId: string;
  type: 'question' | 'note';
  itemId: string; // MCQ ID or PDFNote ID
  savedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatar?: string;
}
