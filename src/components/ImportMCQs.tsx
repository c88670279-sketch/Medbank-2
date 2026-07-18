import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Trash, 
  Edit3, 
  AlertCircle, 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Minus, 
  CheckSquare, 
  ShieldCheck,
  Search 
} from 'lucide-react';
import { importMCQs, saveDBQuestionWithEdit, fetchDBQuestions, fetchDBSubjects, fetchDBChapters, saveDBChapter, fetchSources, renameSource } from '../lib/api';
import { MCQ, SubjectName } from '../types';

interface FileQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'image';
  status: 'pending' | 'extracting' | 'processing' | 'success' | 'failed';
  error?: string;
  extractedCount: number;
  progress: number;
  startPage?: number;
  endPage?: number;
  totalPages?: number | null;
}

const QUESTION_TYPE_OPTIONS = [
  'All Question Types',
  'Single Best Answer (SBA)',
  'Multiple Correct Answers (MCMA)',
  'Clinical Scenario / Case-Based',
  'Image-Based Questions',
  'Assertion & Reason',
  'Match the Columns',
  'True/False',
  'Sequential Arrangement',
  'Fill in the Blank',
  'One-Liner / Recall',
  'Integrated / Multidisciplinary',
  'Numerical / Calculation-Based',
  'Diagram / Label-Based',
  'Table / Graph Interpretation',
  'Previous Year Question (PYQ)',
  'AI-Generated Concept-Based'
];

interface ImportMCQsProps {
  onRefreshData?: () => void;
  onStartQuiz?: (mcqs: MCQ[], title: string) => void;
}

export default function ImportMCQs({ onRefreshData, onStartQuiz }: ImportMCQsProps) {
  // Configuration States
  const [subject, setSubject] = useState<string>('Pathology');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [importMode, setImportMode] = useState<'extract' | 'generate'>('extract');
  const [sourceName, setSourceName] = useState('');
  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [isRenamingSource, setIsRenamingSource] = useState(false);
  const [sourceRenameOld, setSourceRenameOld] = useState('');
  const [sourceRenameNew, setSourceRenameNew] = useState('');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['All Question Types']);
  const [showQuestionTypesDropdown, setShowQuestionTypesDropdown] = useState(false);

  // Dynamic Subjects, Chapters and Counts
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [loadingSubjectsAndChapters, setLoadingSubjectsAndChapters] = useState(true);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [subjectWarning, setSubjectWarning] = useState<{ isValid: boolean; warningMessage?: string; detectedSubject?: string } | null>(null);

  const loadSubjectsAndChapters = async () => {
    try {
      setLoadingSubjectsAndChapters(true);
      const [fetchedSubjects, fetchedChapters, fetchedQuestions, fetchedSources] = await Promise.all([
        fetchDBSubjects(),
        fetchDBChapters(),
        fetchDBQuestions(),
        fetchSources().catch(() => [])
      ]);
      setSubjectsList(fetchedSubjects);
      setSourcesList(fetchedSources);
      setChaptersList(fetchedChapters);
      setQuestionsList(fetchedQuestions || []);
      if (fetchedSubjects.length > 0) {
        const hasPathology = fetchedSubjects.some(s => s.name === 'Pathology');
        if (hasPathology) {
          setSubject('Pathology');
        } else {
          setSubject(fetchedSubjects[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load dynamic subjects and chapters in ImportMCQs:', err);
    } finally {
      setLoadingSubjectsAndChapters(false);
    }
  };

  useEffect(() => {
    loadSubjectsAndChapters();
  }, []);

  // File Queue & Drag/Drop
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [logTicker, setLogTicker] = useState('Ready to import. Choose PDF or Image files.');
  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState(0);

  // Review Draft States
  const [draftQuestions, setDraftQuestions] = useState<MCQ[]>([]);
  const [expandedDraftIndex, setExpandedDraftIndex] = useState<number | null>(0);
  const [savingBulk, setSavingBulk] = useState(false);
  const [activeReviewStep, setActiveReviewStep] = useState<'categorization' | 'details'>('categorization');

  // Generation Cancellation Token
  const processingIdRef = useRef<string | null>(null);

  // Auto-detect total pages for PDFs when added
  useEffect(() => {
    fileQueue.forEach((item, index) => {
      if (item.type === 'pdf' && item.totalPages === undefined) {
        detectPdfPageCount(item, index);
      }
    });
  }, [fileQueue]);

  const detectPdfPageCount = async (item: FileQueueItem, index: number) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        const arrayBuffer = await item.file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        
        setFileQueue(prev => {
          const next = [...prev];
          if (next[index] && next[index].id === item.id) {
            next[index].totalPages = pdf.numPages;
            next[index].startPage = 1;
            next[index].endPage = pdf.numPages;
          }
          return next;
        });
      }
    } catch (err) {
      console.warn(`Could not read page count for ${item.name}:`, err);
      setFileQueue(prev => {
        const next = [...prev];
        if (next[index] && next[index].id === item.id) {
          next[index].totalPages = null;
        }
        return next;
      });
    }
  };

  // Image Compress to base64
  const compressImageToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_DIM = 1024;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const mimeType = 'image/jpeg';
          const base64 = canvas.toDataURL(mimeType, 0.85);
          resolve({ base64, mimeType });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Log message helper
  const addLog = (msg: string) => {
    console.log(`[Import Logs] ${msg}`);
    setLogTicker(msg);
    setProgressLog(prev => [msg, ...prev].slice(0, 50));
  };

  const handleCreateChapterInline = async (newChapterName: string) => {
    if (!newChapterName || !newChapterName.trim()) return;
    try {
      setIsCreatingChapter(true);
      addLog(`Creating new chapter "${newChapterName}" under ${subject}...`);
      const result = await saveDBChapter({
        id: `chap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: newChapterName.trim(),
        subject: subject,
        description: 'Auto-created inline from Extraction Panel',
        displayOrder: 1,
        isActive: true
      });
      if (result.success) {
        addLog(`Successfully created chapter "${newChapterName}"!`);
        // Refresh chapters and questions list for count
        const [freshChapters, freshQuestions] = await Promise.all([
          fetchDBChapters(),
          fetchDBQuestions()
        ]);
        setChaptersList(freshChapters);
        setQuestionsList(freshQuestions || []);
        setChapter(newChapterName.trim());
      } else {
        alert(result.error || 'Failed to create chapter in database.');
      }
    } catch (err: any) {
      alert(`Error creating chapter: ${err.message}`);
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const handleCreateNewChapter = async (newChapterName: string) => {
    await handleCreateChapterInline(newChapterName);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        file,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'image',
        status: 'pending',
        extractedCount: 0,
        progress: 0,
      };
    });

    setFileQueue(prev => [...prev, ...newItems]);
    addLog(`Added ${files.length} files to processing queue.`);
  };

  const removeFileFromQueue = (id: string) => {
    setFileQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateFilePageRange = (id: string, start: number, end: number) => {
    setFileQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, startPage: start, endPage: end };
      }
      return item;
    }));
  };

  const clearQueue = () => {
    setFileQueue([]);
    setSkippedDuplicatesCount(0);
    addLog('Queue cleared.');
  };

  // Advanced Sequential Multi-File Processing Engine
  const startImportQueue = async () => {
    if (fileQueue.length === 0) {
      alert('Please upload PDF or Image files first.');
      return;
    }

    setIsProcessing(true);
    setSkippedDuplicatesCount(0);
    setProgressLog([]);
    setSubjectWarning(null);
    const runId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    processingIdRef.current = runId;

    let totalSavedMcqs: MCQ[] = [];
    let localSkippedDuplicates = 0;

    addLog('Starting MCQ Import Engine...');

    try {
      for (let index = 0; index < fileQueue.length; index++) {
        if (processingIdRef.current !== runId) {
          addLog('Processing cancelled by user.');
          break;
        }

        const item = fileQueue[index];
        setCurrentProcessingIndex(index);
        
        // Update item status in UI
        setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'extracting', progress: 10 } : f));
        addLog(`Analyzing File [${index + 1}/${fileQueue.length}]: ${item.name}...`);

        let extractedFromThisFile: MCQ[] = [];

        try {
          if (item.type === 'image') {
            // Compress Image & Convert to Base64
            setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, progress: 30 } : f));
            addLog(`Compressing clinical snapshot to preserve high-yield text legibility...`);
            const { base64, mimeType } = await compressImageToBase64(item.file);
            
            if (processingIdRef.current !== runId) return;

            setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'processing', progress: 50 } : f));
            addLog(`Submitting image and clinical scene to Gemini multi-modal reasoning engine...`);
            
            let result;
            let attempts = 0;
            const maxAttempts = 3;
            let delayMs = 30000;

            while (attempts < maxAttempts) {
              try {
                attempts++;
                result = await importMCQs({
                  fileType: 'image',
                  questionTypes: selectedQuestionTypes,
                  image: base64,
                  mimeType,
                  mode: importMode,
                  subject,
                  chapter: chapter || undefined,
                  topic: topic || undefined,
                    sourceName
                });
                break;
              } catch (apiErr: any) {
                if (apiErr.quotaExceeded && attempts < maxAttempts) {
                  addLog(`Daily Gemini API limit detected. Attempt ${attempts}/${maxAttempts}. Pausing for 30s before retrying...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                  delayMs *= 2;
                } else {
                  throw apiErr;
                }
              }
            }

            if (result) {
              extractedFromThisFile = result.mcqs;
              localSkippedDuplicates += result.duplicateSkippedCount;
              if (result.subjectVerification) {
                setSubjectWarning(result.subjectVerification);
              }
              if (result.mcqs && result.mcqs.length > 0) {
                setDraftQuestions(prev => {
                  const merged = [...prev, ...result.mcqs];
                  const seen = new Set();
                  return merged.filter(q => {
                    const hash = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (seen.has(hash)) return false;
                    seen.add(hash);
                    return true;
                  });
                });
              }
            }
          } else {
            // PDF Document Extraction (digital or scanned with Fallback)
            const pdfjsLib = (window as any).pdfjsLib;
            const start = item.startPage || 1;
            const end = item.endPage || item.totalPages || 1;

            if (!pdfjsLib) {
              addLog('Client-side PDF page reader not loaded. Sending whole PDF base64...');
              const reader = new FileReader();
              const base64DataPromise = new Promise<string>((resolve, reject) => {
                reader.readAsDataURL(item.file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = (e) => reject(e);
              });
              const pdfBase64 = await base64DataPromise;

              if (processingIdRef.current !== runId) return;
              setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'processing', progress: 50 } : f));

              let result;
              let attempts = 0;
              const maxAttempts = 3;
              let delayMs = 30000;

              while (attempts < maxAttempts) {
                try {
                  attempts++;
                  result = await importMCQs({
                    fileType: 'pdf',
                    pdfBase64,
                    questionTypes: selectedQuestionTypes,
                    mode: importMode,
                    subject,
                    chapter: chapter || undefined,
                    topic: topic || undefined,
                    sourceName
                  });
                  break;
                } catch (apiErr: any) {
                  if (apiErr.quotaExceeded && attempts < maxAttempts) {
                    addLog(`Daily Gemini API limit detected. Attempt ${attempts}/${maxAttempts}. Pausing for 30s before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 2;
                  } else {
                    throw apiErr;
                  }
                }
              }

              if (result) {
                extractedFromThisFile = result.mcqs;
                localSkippedDuplicates += result.duplicateSkippedCount;
                if (result.subjectVerification) {
                  setSubjectWarning(result.subjectVerification);
                }
                if (result.mcqs && result.mcqs.length > 0) {
                  setDraftQuestions(prev => {
                    const merged = [...prev, ...result.mcqs];
                    const seen = new Set();
                    return merged.filter(q => {
                      const hash = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (seen.has(hash)) return false;
                      seen.add(hash);
                      return true;
                    });
                  });
                }
              }
            } else {
              addLog(`Parsing PDF chapters page range ${start}-${end} out of ${item.totalPages || 'unknown'}...`);
              const arrayBuffer = await item.file.arrayBuffer();
              const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
              const pdf = await loadingTask.promise;
              const numPages = pdf.numPages;

              // Batch large PDFs into chunks of 8 pages each for performance stability and to prevent timeouts
              const batchSize = 8;
              const pageStart = Math.max(1, start);
              const pageEnd = Math.min(numPages, end);
              const totalPagesToProcess = pageEnd - pageStart + 1;
              const totalBatches = Math.ceil(totalPagesToProcess / batchSize);

              let fileAccumMcqs: MCQ[] = [];

              for (let b = 0; b < totalBatches; b++) {
                if (processingIdRef.current !== runId) break;

                const bStart = pageStart + b * batchSize;
                const bEnd = Math.min(pageStart + (b + 1) * batchSize - 1, pageEnd);
                
                const progressPercent = Math.round(15 + (b / totalBatches) * 75);
                setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, progress: progressPercent } : f));
                addLog(`Processing PDF batch ${b + 1}/${totalBatches} (Pages ${bStart}-${bEnd})...`);

                // Phase 1: Extract text
                let textBatch = '';
                let isScannedPageDetected = false;

                for (let p = bStart; p <= bEnd; p++) {
                  if (processingIdRef.current !== runId) break;
                  setFileQueue(prev => prev.map((f, idx) => idx === index ? { ...f, progress: Math.round(progressPercent + ((p - bStart) / (bEnd - bStart + 1)) * (75 / totalBatches)) } : f));
                  
                  try {
                    const page = await pdf.getPage(p);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((it: any) => it.str).join(' ');
                    textBatch += `\n--- PAGE ${p} ---\n${pageText}`;

                    if (pageText.trim().length < 40) {
                      isScannedPageDetected = true;
                    }
                  } catch (pageErr) {
                    console.error(`Page read error on ${p}:`, pageErr);
                  }
                }

                if (processingIdRef.current !== runId) break;

                // Call unified import API
                if (isScannedPageDetected && textBatch.trim().length < 200) {
                  addLog(`Scanned page or high clinical illustration ratio detected in pages ${bStart}-${bEnd}. Activating high-fidelity visual-first mode...`);
                } else {
                  addLog(`Extracting MBBS questions from digital content batch (Pages ${bStart}-${bEnd})...`);
                }

                let result;
                let attempts = 0;
                const maxAttempts = 3;
                let delayMs = 30000;

                while (attempts < maxAttempts) {
                  try {
                    attempts++;
                    result = await importMCQs({
                      fileType: 'pdf',
                      textBatch: textBatch.trim().length > 100 ? textBatch : undefined,
                      questionTypes: selectedQuestionTypes,
                      pdfBase64: textBatch.trim().length <= 100 ? await convertPdfPagesToBase64(item.file, bStart, bEnd) : undefined,
                      mode: importMode,
                      subject,
                      chapter: chapter || undefined,
                      topic: topic || undefined,
                    sourceName
                    });
                    break;
                  } catch (apiErr: any) {
                    if (apiErr.quotaExceeded && attempts < maxAttempts) {
                      addLog(`Daily Gemini API limit detected. Attempt ${attempts}/${maxAttempts}. Pausing for 30s before retrying...`);
                      await new Promise(resolve => setTimeout(resolve, delayMs));
                      delayMs *= 2;
                    } else {
                      throw apiErr;
                    }
                  }
                }

                if (result) {
                  if (result.mcqs && result.mcqs.length > 0) {
                    fileAccumMcqs = [...fileAccumMcqs, ...result.mcqs];
                    // Append to draft list immediately to show real-time progress to admin!
                    setDraftQuestions(prev => {
                      const merged = [...prev, ...result.mcqs];
                      // Client-side final deduplication safeguard
                      const seen = new Set();
                      return merged.filter(q => {
                        const hash = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (seen.has(hash)) return false;
                        seen.add(hash);
                        return true;
                      });
                    });
                  }
                  localSkippedDuplicates += result.duplicateSkippedCount;
                  if (result.subjectVerification) {
                    setSubjectWarning(result.subjectVerification);
                  }
                }
              }

              extractedFromThisFile = fileAccumMcqs;
            }
          }

          // Mark file success
          setFileQueue(prev => prev.map((f, idx) => idx === index ? { 
            ...f, 
            status: 'success', 
            progress: 100, 
            extractedCount: extractedFromThisFile.length 
          } : f));
          addLog(`Successfully compiled ${extractedFromThisFile.length} MCQs from "${item.name}".`);

        } catch (itemErr: any) {
          console.error(`Error processing file ${item.name}:`, itemErr);
          setFileQueue(prev => prev.map((f, idx) => idx === index ? { 
            ...f, 
            status: 'failed', 
            progress: 100, 
            error: itemErr.message || 'AI processing failure' 
          } : f));
          addLog(`Failed to process "${item.name}": ${itemErr.message || 'System error'}`);
        }

        // Calculate cumulative progress
        setOverallProgress(Math.round(((index + 1) / fileQueue.length) * 100));
      }

      addLog(`Import process completed! Loaded questions into draft list. Skipped duplicates count: ${localSkippedDuplicates}`);
      setSkippedDuplicatesCount(localSkippedDuplicates);

    } catch (err: any) {
      addLog(`Critical processing error: ${err.message || 'Failure'}`);
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(null);
      onRefreshData?.();
    }
  };

  const convertPdfPagesToBase64 = async (file: File, start: number, end: number): Promise<string> => {
    // Return standard arrayBuffer sliced or converted.
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
    });
    return base64Promise;
  };

  const cancelProcessing = () => {
    processingIdRef.current = null;
    setIsProcessing(false);
    addLog('Import process halted by user.');
  };

  // Draft Edit Controls
  const handleEditDraftField = (index: number, field: keyof MCQ, value: any) => {
    setDraftQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleEditDraftOption = (index: number, optIndex: number, value: string) => {
    setDraftQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        const nextOptions = [...q.options];
        nextOptions[optIndex] = value;
        return { ...q, options: nextOptions };
      }
      return q;
    }));
  };

  const addOptionToDraft = (index: number) => {
    setDraftQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        return { ...q, options: [...q.options, 'New option'] };
      }
      return q;
    }));
  };

  const removeOptionFromDraft = (index: number, optIndex: number) => {
    setDraftQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        const nextOptions = q.options.filter((_, oIdx) => oIdx !== optIndex);
        let nextCorrect = q.correctAnswer;
        if (nextCorrect >= nextOptions.length) {
          nextCorrect = 0;
        }
        return { ...q, options: nextOptions, correctAnswer: nextCorrect };
      }
      return q;
    }));
  };

  // Approval Individual
  const approveDraftMcq = async (index: number) => {
    const qToSave = draftQuestions[index];
    try {
      addLog(`Publishing Question #${index + 1} to Live Database...`);
      const success = await saveDBQuestionWithEdit(qToSave);
      if (success) {
        setDraftQuestions(prev => prev.filter((_, idx) => idx !== index));
        // Reset expanded index gracefully
        setExpandedDraftIndex(prev => prev !== null && prev >= index ? Math.max(0, prev - 1) : prev);
        addLog(`Successfully published Question #${index + 1}!`);
        onRefreshData?.();
      } else {
        alert('Could not save question. Database connection issue.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  // Delete Individual
  const rejectDraftMcq = (index: number) => {
    setDraftQuestions(prev => prev.filter((_, idx) => idx !== index));
    setExpandedDraftIndex(prev => prev !== null && prev >= index ? Math.max(0, prev - 1) : prev);
    addLog(`Rejected draft question #${index + 1}.`);
  };

  // Bulk Publish All
  const approveAllDraftMcqs = async () => {
    if (draftQuestions.length === 0) return;
    setSavingBulk(true);
    let successCount = 0;
    addLog(`Initiating bulk publish of ${draftQuestions.length} medical MCQs...`);

    try {
      for (let i = 0; i < draftQuestions.length; i++) {
        const mcq = draftQuestions[i];
        const success = await saveDBQuestionWithEdit(mcq);
        if (success) successCount++;
      }
      
      addLog(`Bulk publish complete! Saved ${successCount} questions successfully to Live QBank!`);
      setDraftQuestions([]);
      setExpandedDraftIndex(null);
      onRefreshData?.();
      alert(`Bulk Publish Successful! Published ${successCount} medical board questions to QBank.`);
    } catch (err: any) {
      alert(`Bulk save error: ${err.message}`);
    } finally {
      setSavingBulk(false);
    }
  };

  const hasSubjectMismatchesInBatch = draftQuestions.some(
    q => q.subject && subject && q.subject.toLowerCase() !== subject.toLowerCase()
  );

  const mismatchedSubjectsInBatch = Array.from(new Set(
    draftQuestions
      .filter(q => q.subject && subject && q.subject.toLowerCase() !== subject.toLowerCase())
      .map(q => q.subject)
  ));

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* 1. Header Information */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Unified Import MCQ Engine v2.0</span>
          </h2>
          <p className="text-[11px] text-slate-300 leading-relaxed max-w-2xl">
            A state-of-the-art multimodal AI extraction system. Supports batch uploading scanned PDFs, digital textbook chapters, and phone snapshot sheets. Automatically normalizes formatting, extracts image diagnostics, and deduplicates questions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl text-[10px] text-slate-300 font-mono self-start md:self-auto">
          <Loader2 className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin text-emerald-400' : 'text-slate-500'}`} />
          <span>Status: {isProcessing ? 'Processing Queue' : 'Idle'}</span>
        </div>
      </div>

      {/* Subject Validation Mismatch Warning */}
      {subjectWarning && !subjectWarning.isValid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-start space-x-3.5 text-slate-800 dark:text-amber-200"
        >
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-tight text-amber-800 dark:text-amber-400">Subject Mismatch Warning</h4>
            <p className="text-[11px] leading-relaxed">
              {subjectWarning.warningMessage || `The uploaded clinical content is detected as "${subjectWarning.detectedSubject}" but you have selected "${subject}" as the Target Subject.`}
            </p>
            <p className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 mt-1">
              Note: You can still review, edit, and approve these questions, or close this importer and change your target configurations.
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. Configure & Dropzone Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Parameters Configuration */}
        <div className="lg:col-span-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-zinc-900">
            <Layers className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">1. Configure Context</h3>
          </div>

          <div className="space-y-3.5">
            {/* Target Subject Searchable Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Target Subject</label>
              {loadingSubjectsAndChapters ? (
                <div className="flex items-center space-x-1.5 py-2 px-3 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading subjects...</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubjectDropdown(!showSubjectDropdown);
                      setShowChapterDropdown(false);
                    }}
                    className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <span>{subject || 'Select Subject'}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>

                  {showSubjectDropdown && (
                    <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 space-y-2 max-h-[250px] overflow-y-auto">
                      <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search subjects..."
                          value={subjectSearch}
                          onChange={(e) => setSubjectSearch(e.target.value)}
                          className="w-full bg-transparent border-none text-[11px] focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        {subjectsList
                          .filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
                          .map((s) => {
                            const count = questionsList.filter(q => q.subject === s.name).length;
                            return (
                              <button
                                key={s.id || s.name}
                                type="button"
                                onClick={() => {
                                  setSubject(s.name);
                                  setShowSubjectDropdown(false);
                                  setSubjectSearch('');
                                  setChapter('');
                                }}
                                className={`w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left ${
                                  subject === s.name
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <span>{s.name}</span>
                                <span className="text-[9px] bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-full text-slate-400 font-bold shrink-0">
                                  {count} MCQs
                                </span>
                              </button>
                            );
                          })}
                        {subjectsList.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).length === 0 && (
                          <p className="text-[10px] text-slate-400 text-center py-2">No subjects found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Target Chapter Searchable Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Chapter Name (Optional)</label>
              <button
                type="button"
                onClick={() => {
                  setShowChapterDropdown(!showChapterDropdown);
                  setShowSubjectDropdown(false);
                }}
                className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <span>{chapter || 'Select Chapter (Optional)'}</span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </button>

              {showChapterDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 space-y-2 max-h-[250px] overflow-y-auto">
                  <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-150 dark:border-zinc-800">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search or add chapter..."
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      className="w-full bg-transparent border-none text-[11px] focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setChapter('');
                        setShowChapterDropdown(false);
                        setChapterSearch('');
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left ${
                        chapter === ''
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      None (Auto-Detect Chapter)
                    </button>

                    {chaptersList
                      .filter((c) => c.subject?.toLowerCase() === subject?.toLowerCase())
                      .filter((c) => c.name.toLowerCase().includes(chapterSearch.toLowerCase()))
                      .map((c) => {
                        const count = questionsList.filter(q => q.chapter === c.name).length;
                        return (
                          <button
                            key={c.id || c.name}
                            type="button"
                            onClick={() => {
                              setChapter(c.name);
                              setShowChapterDropdown(false);
                              setChapterSearch('');
                            }}
                            className={`w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left ${
                              chapter === c.name
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <span>{c.name}</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-full text-slate-400 shrink-0">
                              {count} Qs
                            </span>
                          </button>
                        );
                      })}

                    {chapterSearch.trim() && !chaptersList.some(c => c.subject?.toLowerCase() === subject?.toLowerCase() && c.name.toLowerCase() === chapterSearch.trim().toLowerCase()) && (
                      <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-900">
                        <button
                          type="button"
                          disabled={isCreatingChapter}
                          onClick={() => handleCreateNewChapter(chapterSearch)}
                          className="w-full flex items-center justify-center space-x-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {isCreatingChapter ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          <span>Create Chapter "{chapterSearch.trim()}"</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Topic Tag (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Granulomatous Inflammations"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Source Name</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceDropdown(!showSourceDropdown);
                    setShowSubjectDropdown(false);
                    setShowChapterDropdown(false);
                  }}
                  className="flex-1 flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <span className={sourceName ? '' : 'text-slate-400 font-normal'}>{sourceName || 'Select or Create Source...'}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
                {sourceName && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceRenameOld(sourceName);
                      setSourceRenameNew(sourceName);
                      setIsRenamingSource(true);
                    }}
                    className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                    title="Edit/Rename Source"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showSourceDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 space-y-2 max-h-[250px] overflow-y-auto">
                  <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search or create source..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="w-full bg-transparent border-none text-[11px] focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    {sourcesList
                      .filter(s => s.toLowerCase().includes(sourceSearch.toLowerCase()))
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSourceName(s);
                            setShowSourceDropdown(false);
                            setSourceSearch('');
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg flex items-center justify-between group"
                        >
                          <span className="font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{s}</span>
                        </button>
                      ))}
                    {sourceSearch && !sourcesList.find(s => s.toLowerCase() === sourceSearch.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourceName(sourceSearch);
                          setSourcesList(prev => [...prev, sourceSearch]);
                          setShowSourceDropdown(false);
                          setSourceSearch('');
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg flex items-center space-x-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="font-semibold">Create "{sourceSearch}"</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rename Modal */}
            <AnimatePresence>
              {isRenamingSource && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-emerald-500" />
                        Edit / Rename Source
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Current Name</label>
                        <input
                          type="text"
                          value={sourceRenameOld}
                          disabled
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Name</label>
                        <input
                          type="text"
                          value={sourceRenameNew}
                          onChange={(e) => setSourceRenameNew(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Enter new source name"
                        />
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          This will update the source name for <strong>all MCQs</strong> currently assigned to "{sourceRenameOld}". Other fields like chapter mapping, tags, and progress will remain exactly the same.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end space-x-2">
                      <button
                        onClick={() => setIsRenamingSource(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!sourceRenameNew || sourceRenameNew === sourceRenameOld) {
                            setIsRenamingSource(false);
                            return;
                          }
                          try {
                            await renameSource(sourceRenameOld, sourceRenameNew);
                            setSourcesList(prev => prev.map(s => s === sourceRenameOld ? sourceRenameNew : s));
                            setSourceName(sourceRenameNew);
                            if (onRefreshData) onRefreshData();
                            setIsRenamingSource(false);
                          } catch (err) {
                            alert("Failed to rename source.");
                          }
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                      >
                        Rename Source
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Question Types Filter */}
            <div className="relative pt-2 border-t border-slate-100 dark:border-zinc-900">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Question Types to Extract</label>
              <button
                type="button"
                onClick={() => {
                  setShowQuestionTypesDropdown(!showQuestionTypesDropdown);
                  setShowSourceDropdown(false);
                  setShowSubjectDropdown(false);
                  setShowChapterDropdown(false);
                }}
                className="w-full flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <span className="truncate pr-2">
                  {selectedQuestionTypes.includes('All Question Types') 
                    ? 'All Question Types' 
                    : `${selectedQuestionTypes.length} type${selectedQuestionTypes.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </button>

              {showQuestionTypesDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 max-h-[250px] overflow-y-auto">
                  <div className="space-y-1">
                    {QUESTION_TYPE_OPTIONS.map((type) => {
                      const isSelected = selectedQuestionTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (type === 'All Question Types') {
                              setSelectedQuestionTypes(['All Question Types']);
                            } else {
                              let newSelected = selectedQuestionTypes.filter(t => t !== 'All Question Types');
                              if (newSelected.includes(type)) {
                                newSelected = newSelected.filter(t => t !== type);
                              } else {
                                newSelected.push(type);
                              }
                              if (newSelected.length === 0) {
                                newSelected = ['All Question Types'];
                              }
                              setSelectedQuestionTypes(newSelected);
                            }
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-zinc-900"
                        >
                          <span className={`font-medium ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {type}
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Operation Mode</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('extract')}
                  className={`p-2.5 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                    importMode === 'extract'
                      ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/15'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/40 hover:bg-slate-50'
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    importMode === 'extract' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {importMode === 'extract' && <div className="h-1 w-1 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Extract Printed MCQs</p>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-normal mt-0.5">Scans textbook mocks or slides, preserving exact formatting and numbering structures.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('generate')}
                  className={`p-2.5 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                    importMode === 'generate'
                      ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/15'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/40 hover:bg-slate-50'
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    importMode === 'generate' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {importMode === 'generate' && <div className="h-1 w-1 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Generate from Textbook Material</p>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-normal mt-0.5">Analyzes medical study text or guidelines, synthesizing premium board-style clinical case vignettes.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Multi-file Dropzone & List */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            {/* Unified Drag & Drop Target */}
            <div
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[140px] relative ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-50/10'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-400/50 bg-slate-50/20 dark:bg-zinc-950/10'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-full text-emerald-500 mb-2 shrink-0">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Drag & drop PDFs or Images here
              </p>
              <p className="text-[9px] text-slate-400 mt-1">
                Supports Standard/Scanned PDFs and snapshots (JPG, PNG, WebP)
              </p>
              <button
                type="button"
                className="mt-2.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold rounded-xl shadow-sm hover:bg-slate-50 shrink-0 cursor-pointer"
              >
                Choose Files
              </button>
            </div>

            {/* Queue List */}
            {fileQueue.length > 0 && (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                  <span>Uploaded Queue ({fileQueue.length} files)</span>
                  <button onClick={clearQueue} className="text-red-500 hover:underline">Clear All</button>
                </div>
                <div className="space-y-1.5">
                  {fileQueue.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800 rounded-xl text-xs gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.type === 'pdf' ? (
                          <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-violet-500 shrink-0" />
                        )}
                        <div className="truncate pr-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">{item.name}</p>
                          <p className="text-[9px] text-slate-400">
                            {(item.size / 1024 / 1024).toFixed(2)} MB • {item.type.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.type === 'pdf' && item.totalPages && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-slate-400">Pages:</span>
                            <div className="flex items-center gap-0.5">
                              <input 
                                type="number" 
                                min={1} 
                                max={item.totalPages} 
                                value={item.startPage || 1}
                                onChange={(e) => updateFilePageRange(item.id, parseInt(e.target.value) || 1, item.endPage || item.totalPages || 1)}
                                className="w-8 px-1 py-0.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-[9px] font-mono"
                              />
                              <span className="text-[9px] text-slate-400">-</span>
                              <input 
                                type="number" 
                                min={1} 
                                max={item.totalPages} 
                                value={item.endPage || item.totalPages || 1}
                                onChange={(e) => updateFilePageRange(item.id, item.startPage || 1, parseInt(e.target.value) || item.totalPages || 1)}
                                className="w-8 px-1 py-0.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-center text-[9px] font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* File status badge */}
                        <div className="text-[9px] font-bold">
                          {item.status === 'pending' && <span className="text-slate-400 uppercase">Ready</span>}
                          {item.status === 'extracting' && <span className="text-emerald-500 animate-pulse">Extracting...</span>}
                          {item.status === 'processing' && <span className="text-violet-500 animate-pulse">AI Parsing...</span>}
                          {item.status === 'success' && <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">Success ({item.extractedCount})</span>}
                          {item.status === 'failed' && <span className="text-red-500 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">Failed</span>}
                        </div>

                        <button 
                          onClick={() => removeFileFromQueue(item.id)}
                          disabled={isProcessing}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-red-500 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-900 shrink-0">
            {/* Progress Log Monitor */}
            {isProcessing && (
              <div className="space-y-2 bg-slate-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-900 animate-fade-in text-xs font-mono text-left">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-700 dark:text-zinc-300">Execution Progress</span>
                  <span className="text-emerald-500 text-[10px]">{overallProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  <span className="truncate">{logTicker}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={cancelProcessing}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Stop Import Process</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startImportQueue}
                  disabled={fileQueue.length === 0}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-zinc-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Start Unified MCQ Import ({fileQueue.length} Files)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real-time Skipped Duplicates Banner */}
      {skippedDuplicatesCount > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/40 rounded-2xl flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-extrabold">Skipped {skippedDuplicatesCount} Duplicate Questions!</p>
            <p className="text-[10px] mt-0.5 text-amber-600 dark:text-amber-400">The automatic database deduplication engine identified matching question stems in MongoDB Atlas and silently filtered them out to preserve clean, uncorrupted, high-yield records.</p>
          </div>
        </div>
      )}

      {/* 4. Live Draft Question Review Workspace */}
      {draftQuestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100/60 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-800">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-500" />
                <span>2. Review Extracted Drafts ({draftQuestions.length} Questions)</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Edit, audit, approve or reject imported MCQs before permanently saving them into the active Question Bank.</p>
            </div>
            <button
              type="button"
              disabled={savingBulk || draftQuestions.length === 0}
              onClick={approveAllDraftMcqs}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all self-end sm:self-auto"
            >
              {savingBulk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Bulk Approve & Publish ({draftQuestions.length})</span>
            </button>
          </div>

          {hasSubjectMismatchesInBatch && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-950/40 rounded-2xl flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300 animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase tracking-wide">⚠️ Content Subject Mismatch Detected!</p>
                <p className="text-[10px] mt-0.5 text-rose-600 dark:text-rose-400 font-medium">
                  Some of the extracted questions appear to belong to other subjects (such as <strong className="underline">{mismatchedSubjectsInBatch.join(', ')}</strong>) instead of your selected target subject <strong className="underline">{subject}</strong>.
                  You can edit the Subject mapping of individual questions below before publishing.
                </p>
              </div>
            </div>
          )}

          {/* Step Navigation Tabs */}
          <div className="flex bg-slate-100/80 dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 mb-4">
            <button
              type="button"
              onClick={() => setActiveReviewStep('categorization')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeReviewStep === 'categorization'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-zinc-700/50'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className={`h-4 w-4 ${activeReviewStep === 'categorization' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Step 1: Review & Verify AI Subjects ({draftQuestions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveReviewStep('details')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeReviewStep === 'details'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-zinc-700/50'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Edit3 className={`h-4 w-4 ${activeReviewStep === 'details' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Step 2: Detailed Stem & Options</span>
            </button>
          </div>

          {activeReviewStep === 'categorization' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-2xl">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase">
                  <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                  <span>AI Subject & Meta Classification Audit</span>
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90 mt-1 font-medium leading-relaxed font-sans">
                  The AI-powered ingestion engine automatically parsed clinical contexts and assigned subjects, chapters, topics, and difficulties. Verify or modify the classifications below before finalizing the questions in your Question Bank.
                </p>
              </div>

              {/* Categorization Table/Cards */}
              <div className="space-y-3">
                {draftQuestions.map((mcq, idx) => {
                  const isVerified = mcq.verified || false;

                  return (
                    <div 
                      key={mcq.id}
                      className={`p-5 border rounded-2xl transition-all shadow-sm ${
                        isVerified 
                          ? 'border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/5' 
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b]'
                      }`}
                    >
                      {/* Top row: meta-info and actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/60 font-sans">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-[10px] font-extrabold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 shrink-0">
                            Q#{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {mcq.question || 'Empty Question Stem'}
                            </p>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                          {/* Verify Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleEditDraftField(idx, 'verified', !isVerified)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border ${
                              isVerified
                                ? 'bg-emerald-500 border-emerald-500 text-white dark:text-zinc-950 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isVerified ? 'Verified' : 'Verify'}</span>
                          </button>

                          {/* Quick Edit (Bridge to Step 2) */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedDraftIndex(idx);
                              setActiveReviewStep('details');
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl cursor-pointer"
                            title="Edit full question details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Trash / Delete */}
                          <button
                            type="button"
                            onClick={() => rejectDraftMcq(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                            title="Reject & Delete Question"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom row: Inline classifications */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                        {/* Subject */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans">Subject Mapping</label>
                          <select
                            value={mcq.subject}
                            onChange={(e) => handleEditDraftField(idx, 'subject', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-sans"
                          >
                            {subjectsList.map(s => (
                              <option key={s.id || s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Chapter */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans">Chapter Mapping</label>
                          <input
                            type="text"
                            value={mcq.chapter || ''}
                            onChange={(e) => handleEditDraftField(idx, 'chapter', e.target.value)}
                            placeholder="e.g. Inflammation"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 font-medium font-sans"
                          />
                        </div>

                        {/* Topic */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans">Topic Mapping</label>
                          <input
                            type="text"
                            value={mcq.topic || ''}
                            onChange={(e) => handleEditDraftField(idx, 'topic', e.target.value)}
                            placeholder="e.g. Mediators"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100 font-medium font-sans"
                          />
                        </div>

                        {/* Difficulty */}
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans">Difficulty</label>
                          <select
                            value={mcq.difficulty}
                            onChange={(e) => handleEditDraftField(idx, 'difficulty', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-sans"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-100/60 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-800 mt-4 font-sans">
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                  Verified: {draftQuestions.filter(q => q.verified).length} / {draftQuestions.length} Questions Verified
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveReviewStep('details')}
                    className="flex-grow sm:flex-initial px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Proceed to Detailed Edits</span>
                  </button>
                  <button
                    type="button"
                    disabled={savingBulk || draftQuestions.length === 0}
                    onClick={approveAllDraftMcqs}
                    className="flex-grow sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md"
                  >
                    {savingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Confirm & Save All ({draftQuestions.length})</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Draft Accordion Grid */
            <div className="space-y-3">
              {draftQuestions.map((mcq, idx) => {
                const isExpanded = expandedDraftIndex === idx;
                const errors = mcq.validationErrors || [];
                const hasWarnings = errors.length > 0;

              return (
                <div
                  key={mcq.id}
                  className={`border rounded-2xl overflow-hidden transition-all shadow-sm ${
                    isExpanded 
                      ? 'border-emerald-500 dark:border-emerald-600 bg-white dark:bg-[#18181b]' 
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 hover:bg-white dark:hover:bg-zinc-900/40'
                  }`}
                >
                  {/* Header row */}
                  <div 
                    onClick={() => setExpandedDraftIndex(isExpanded ? null : idx)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none gap-4"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                        mcq.source === 'PDF' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-300'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-950/55 dark:text-violet-300'
                      }`}>
                        {mcq.source === 'PDF' ? 'PDF' : 'IMAGE'}
                      </span>
                      {mcq.sourceBook && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/55 dark:text-amber-300 shrink-0 uppercase" title="Question Source">
                          {mcq.sourceBook}
                        </span>
                      )}
                      {mcq.targetExams && mcq.targetExams.length > 0 && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-300 shrink-0 uppercase" title="Target Exams">
                          {mcq.targetExams.join(', ')}
                        </span>
                      )}
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate pr-1">
                        Q#{idx + 1}: {mcq.question || 'Empty Question Stem'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {hasWarnings && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded">
                          <AlertCircle className="h-3 w-3" />
                          <span>Needs Fix</span>
                        </div>
                      )}
                      
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        Score: {mcq.confidenceScore ?? 100}%
                      </span>

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Editable Body */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 dark:border-zinc-800/80 p-5 space-y-4 text-left"
                      >
                        {/* Errors and Warnings logs */}
                        {hasWarnings && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-950/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 uppercase">
                              <AlertCircle className="h-3 w-3" />
                              <span>Validation Warning Logs ({errors.length})</span>
                            </p>
                            <ul className="list-disc list-inside text-[9px] text-amber-700 dark:text-amber-400 space-y-0.5">
                              {errors.map((err, errIdx) => <li key={errIdx}>{err}</li>)}
                            </ul>
                          </div>
                        )}

                        {mcq.subject && subject && mcq.subject.toLowerCase() !== subject.toLowerCase() && (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1 uppercase">
                              <AlertCircle className="h-3 w-3 text-rose-500" />
                              <span>⚠️ Subject Mismatch Warning</span>
                            </p>
                            <p className="text-[9px] text-rose-700 dark:text-rose-400">
                              This MCQ is classified as <strong className="underline">{mcq.subject}</strong>, but your expected target subject is <strong className="underline">{subject}</strong>. You can verify or update its subject selection in the right-hand panel before publishing.
                            </p>
                          </div>
                        )}

                        {/* Edit grid */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          {/* Question stem (left 4 cols) */}
                          <div className="md:col-span-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Stem</label>
                              <textarea
                                value={mcq.question}
                                rows={4}
                                onChange={(e) => handleEditDraftField(idx, 'question', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            {/* Options with letter markers */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Options List</label>
                                <button 
                                  onClick={() => addOptionToDraft(idx)}
                                  className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 hover:underline"
                                >
                                  <Plus className="h-3 w-3" /> Add Option
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {mcq.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <div className="flex items-center justify-center h-5 w-5 rounded bg-slate-200 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                                      {String.fromCharCode(65 + optIdx)}
                                    </div>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleEditDraftOption(idx, optIdx, e.target.value)}
                                      className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                                    />
                                    {mcq.options.length > 2 && (
                                      <button 
                                        onClick={() => removeOptionFromDraft(idx, optIdx)}
                                        className="p-1.5 text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded cursor-pointer"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Metadata sidebar (right 2 cols) */}
                          <div className="md:col-span-2 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correct Option</label>
                              <select
                                value={mcq.correctAnswer}
                                onChange={(e) => handleEditDraftField(idx, 'correctAnswer', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              >
                                {mcq.options.map((_, optIdx) => (
                                  <option key={optIdx} value={optIdx}>Option {String.fromCharCode(65 + optIdx)}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Difficulty Level</label>
                              <select
                                value={mcq.difficulty}
                                onChange={(e) => handleEditDraftField(idx, 'difficulty', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Source (Origin)</label>
                              <input
                                type="text"
                                placeholder="e.g. Robbins Pathology, Apurba Sastry"
                                value={mcq.sourceBook || ''}
                                onChange={(e) => handleEditDraftField(idx, 'sourceBook', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Exams</label>
                              <input
                                type="text"
                                placeholder="e.g. NEET PG, INICET (comma separated)"
                                value={mcq.targetExams ? mcq.targetExams.join(', ') : ''}
                                onChange={(e) => handleEditDraftField(idx, 'targetExams', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject Mapping</label>
                              <select
                                value={mcq.subject}
                                onChange={(e) => handleEditDraftField(idx, 'subject', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              >
                                {subjectsList.map(s => (
                                  <option key={s.id || s.name} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Mapping</label>
                              <input
                                type="text"
                                placeholder="e.g. Inflammation"
                                value={mcq.chapter || ''}
                                onChange={(e) => handleEditDraftField(idx, 'chapter', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic Mapping</label>
                              <input
                                type="text"
                                placeholder="e.g. Mediators"
                                value={mcq.topic || ''}
                                onChange={(e) => handleEditDraftField(idx, 'topic', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rationale explanation */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Detailed Clinical Explanation & Distractor Rationale</label>
                          <textarea
                            value={mcq.explanation}
                            rows={3}
                            onChange={(e) => handleEditDraftField(idx, 'explanation', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium"
                          />
                        </div>

                        {/* Approve and save buttons row */}
                        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => rejectDraftMcq(idx)}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Trash className="h-3.5 w-3.5" />
                            <span>Reject & Delete</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => approveDraftMcq(idx)}
                            className="px-5 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Approve & Save Live</span>
                          </button>
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
      )}
    </div>
  );
}
