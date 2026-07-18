import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, Upload, Plus, Trash, HelpCircle, FileText, Sparkles, Loader2, 
  Check, AlertCircle, X, Database, Search, Filter, Edit, ChevronLeft, 
  ChevronRight, ChevronUp, ChevronDown, BookOpen, Layers, Video, Megaphone, User, Users, Award, Eye, Trash2, Activity,
  RefreshCw, Tag, Bookmark, Combine, Move, MoreVertical
} from 'lucide-react';
import { SubjectName, MCQ, PDFNote } from '../types';
import { safeStorage } from '../lib/safeStorage';
import ImportMCQs from './ImportMCQs';
import { 
  fetchDBSubjects, saveDBSubject, deleteDBSubject,
  fetchDBChapters, saveDBChapter, deleteDBChapter,
  fetchDBPdfs, saveDBPdf, deleteDBPdf,
  fetchDBNotes, saveDBNoteWithEdit, deleteDBNote,
  fetchDBQuestions, saveDBQuestionWithEdit, deleteDBQuestion,
  fetchDBTests, saveDBTest, deleteDBTest,
  fetchDBTestResults, deleteDBTestResult,
  fetchDBAnnouncements, saveDBAnnouncement, deleteDBAnnouncement,
  fetchDBFlashcards, saveDBFlashcard, deleteDBFlashcard,
  fetchDBVideos, saveDBVideo, deleteDBVideo,
  fetchDBUsers, saveDBUser, deleteDBUser,
  generateMCQFromText, testMongoDBConnection, importPDFMCQs,
  bulkApproveQuestions, bulkRejectQuestions, mergeDuplicateQuestions,
  fetchDBTopics, saveDBTopic, deleteDBTopic,
  renameCurriculumItem, moveCurriculumItem, mergeCurriculumItem,
  fetchCurriculumTrash, restoreCurriculumItem
} from '../lib/api';

type AdminTab = 
  | 'statistics'
  | 'subjects' 
  | 'chapters' 
  | 'topics'
  | 'trash' 
  | 'pdfs' 
  | 'notes' 
  | 'mcqs' 
  | 'tests' 
  | 'results' 
  | 'announcements' 
  | 'flashcards' 
  | 'videos' 
  | 'users' 
  | 'ai-generator' 
  | 'pdf-importer'
  | 'image-extractor'
  | 'database';

interface AdminPanelProps {
  onRefreshData?: () => void;
}

export default function AdminPanel({ onRefreshData }: AdminPanelProps = {}) {
  // Role-based authorization check
  const [user] = useState<any>(() => {
    const saved = safeStorage.getItem('medbank_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<AdminTab>('statistics');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState<{
    usersCount: number;
    studentsCount: number;
    adminsCount: number;
    subjectsCount: number;
    chaptersCount: number;
    pdfsCount: number;
    notesCount: number;
    mcqsCount: number;
    flashcardsCount: number;
    announcementsCount: number;
    resultsCount: number;
    avgAccuracy: number;
    pathologyMcqs: number;
    pharmacologyMcqs: number;
    microbiologyMcqs: number;
  } | null>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]); // cache subjects for dropdowns
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [trashList, setTrashList] = useState<any[]>([]);

  // Expanded tree states
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  // Curriculum Management Interactive Dialog States
  const [curriculumAction, setCurriculumAction] = useState<{
    type: 'rename' | 'move' | 'merge';
    itemType: 'subject' | 'chapter' | 'topic';
    item: any;
  } | null>(null);
  const [curriculumNewName, setCurriculumNewName] = useState<string>('');
  const [curriculumTargetParent, setCurriculumTargetParent] = useState<string>('');
  const [curriculumMergeTarget, setCurriculumMergeTarget] = useState<string>('');
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  
  // Search, Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Custom Delete Confirmation Modal States
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Curriculum Delete and Options States
  const [activeSubjectMenu, setActiveSubjectMenu] = useState<string | null>(null);
  const [activeTopicMenu, setActiveTopicMenu] = useState<string | null>(null);
  const [curriculumDeleteModal, setCurriculumDeleteModal] = useState<{
    itemType: 'subject' | 'topic';
    id: string;
    name: string;
  } | null>(null);
  const [deleteCascadeOption, setDeleteCascadeOption] = useState<'only' | 'cascade'>('only');

  // Database Connection Test States
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message?: string; error?: string; insertedId?: string } | null>(null);

  // AI Generator States
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubject, setAiSubject] = useState<SubjectName>('Pathology');
  const [aiText, setAiText] = useState('');
  const [aiGenLoading, setAiGenLoading] = useState(false);
  const [aiGenMcq, setAiGenMcq] = useState<any | null>(null);

  // PDF Importer States
  const [importPdfFile, setImportPdfFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'extract' | 'generate'>('extract');
  const [importSubject, setImportSubject] = useState<string>('Pathology');
  const [importChapter, setImportChapter] = useState('');
  const [importTopic, setImportTopic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedMcqs, setImportedMcqs] = useState<any[]>([]);
  const [savingImported, setSavingImported] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Active request and generation ID tracking to prevent stale state updates and race conditions
  const activeGenerationIdRef = React.useRef<string | null>(null);

  // MCQ Admin Review & Multi-Select states
  const [selectedMcqIds, setSelectedMcqIds] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'unapproved'>('all');

  // Custom iframe-safe toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    console.log(`[Admin Toast] ${type.toUpperCase()}: ${message}`);
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Advanced Batch & Progress States
  const [pdfTotalPages, setPdfTotalPages] = useState<number | null>(null);
  const [pdfCurrentBatch, setPdfCurrentBatch] = useState<number>(0);
  const [pdfTotalBatches, setPdfTotalBatches] = useState<number>(0);
  const [pdfBatchProgressText, setPdfBatchProgressText] = useState<string>('');

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    setImportPdfFile(file);
    setImportError(null);
    setImportedMcqs([]);
    setPdfTotalPages(null);
    setPdfCurrentBatch(0);
    setPdfTotalBatches(0);
    setPdfBatchProgressText('');

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        setPdfTotalPages(pdf.numPages);
      }
    } catch (err) {
      console.warn('Could not read PDF page count on upload, will retry during import process:', err);
    }
  };

  const autoSaveIfEmpty = async (allExtractedMcqs: any[]): Promise<boolean> => {
    try {
      console.log('[AdminPanel] Checking if live questions collection is empty...');
      const existingQs = await fetchDBQuestions();
      if (!existingQs || existingQs.length === 0) {
        console.log('[AdminPanel] Questions collection is empty! Automatically saving all imported questions to MongoDB Atlas.');
        let savedCount = 0;
        for (const q of allExtractedMcqs) {
          if (!q.id) {
            q.id = `q-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          }
          const success = await saveDBQuestionWithEdit(q);
          if (success) savedCount++;
        }
        console.log(`[AdminPanel] Auto-saved ${savedCount} questions directly to live database.`);
        setImportedMcqs([]); // Clear draft since they are live now
        setImportPdfFile(null);
        setImportChapter('');
        setImportTopic('');
        onRefreshData?.();
        return true;
      }
    } catch (err) {
      console.error('[AdminPanel] Failed to verify/auto-save empty collection:', err);
    }
    return false;
  };

  const triggerPdfImport = async () => {
    if (!importPdfFile) {
      alert('Please upload a PDF file first.');
      return;
    }

    // 1. Reset all generation states before every new request.
    // 2. Clear previous questions, progress, loading states, and cached results before starting a new generation.
    setIsImporting(true);
    setImportError(null);
    setImportedMcqs([]);
    setPdfTotalPages(null);
    setPdfCurrentBatch(0);
    setPdfTotalBatches(0);
    setPdfBatchProgressText('Initializing PDF Reader...');

    const generationId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    activeGenerationIdRef.current = generationId;

    console.log(`[QBank Generation] Starting new request. ID: ${generationId}`);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        setPdfBatchProgressText('Client-side PDF processor not loaded. Processing via direct single-batch transmission...');
        const reader = new FileReader();
        reader.readAsDataURL(importPdfFile);
        reader.onload = async () => {
          if (activeGenerationIdRef.current !== generationId) {
            console.log(`[QBank Generation] Discarding stale generation onload callback for ID: ${generationId}`);
            return;
          }
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const resultMcqs = await importPDFMCQs({
              pdfBase64: base64Data,
              mode: importMode,
              subject: importSubject,
              chapter: importChapter,
              topic: importTopic
            });

            if (activeGenerationIdRef.current !== generationId) {
              console.log(`[QBank Generation] Discarding stale state update for ID: ${generationId}`);
              return;
            }

            setImportedMcqs(resultMcqs);
            
            const autoSaved = await autoSaveIfEmpty(resultMcqs);
            if (activeGenerationIdRef.current !== generationId) return;

            if (autoSaved) {
              setPdfBatchProgressText(`Processing complete! Live database collection was empty, so ${resultMcqs.length} questions were automatically saved directly to MongoDB Atlas successfully!`);
            } else {
              setPdfBatchProgressText(`Processing complete! Successfully compiled ${resultMcqs.length} questions.`);
            }
          } catch (err: any) {
            console.error(`[QBank Generation] Fallback import error for ID: ${generationId}`, err);
            if (activeGenerationIdRef.current !== generationId) return;
            const isQuota = err.quotaExceeded || String(err.message).includes('daily usage limit') || String(err.message).includes('RESOURCE_EXHAUSTED') || String(err.message).includes('429');
            if (isQuota) {
              setImportError('The AI service has reached its daily usage limit. Please try again later or contact the administrator.');
            } else {
              setImportError(err.message || 'An error occurred during raw PDF processing fallback.');
            }
          } finally {
            if (activeGenerationIdRef.current === generationId) {
              setIsImporting(false);
            }
          }
        };
        reader.onerror = () => {
          console.error(`[QBank Generation] FileReader onerror event triggered for ID: ${generationId}`);
          if (activeGenerationIdRef.current !== generationId) return;
          setImportError('Failed to read PDF file on browser.');
          setIsImporting(false);
        };
        return;
      }

      const arrayBuffer = await importPdfFile.arrayBuffer();
      if (activeGenerationIdRef.current !== generationId) return;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      if (activeGenerationIdRef.current !== generationId) return;

      const numPages = pdf.numPages;
      setPdfTotalPages(numPages);

      // Split into smaller batches (8 pages each is optimal for speed, stability, and token limits)
      const batchSize = 8;
      const totalBatches = Math.ceil(numPages / batchSize);
      setPdfTotalBatches(totalBatches);

      let allExtractedMcqs: any[] = [];

      for (let b = 0; b < totalBatches; b++) {
        if (activeGenerationIdRef.current !== generationId) {
          console.log(`[QBank Generation] Process interrupted: request ID: ${generationId} is no longer active.`);
          return;
        }

        const batchNum = b + 1;
        setPdfCurrentBatch(batchNum);
        const startPage = b * batchSize + 1;
        const endPage = Math.min((b + 1) * batchSize, numPages);

        // Phase 1: Extract text from pages
        let batchText = '';
        for (let p = startPage; p <= endPage; p++) {
          if (activeGenerationIdRef.current !== generationId) return;
          setPdfBatchProgressText(`Batch ${batchNum}/${totalBatches}: Extracting text from page ${p} of ${numPages}...`);
          try {
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            batchText += `\n--- PAGE ${p} ---\n${pageText}`;
          } catch (pageErr) {
            console.error(`Error reading page ${p}:`, pageErr);
          }
        }

        if (activeGenerationIdRef.current !== generationId) return;

        // Phase 2: Call Gemini API sequentially
        setPdfBatchProgressText(`Batch ${batchNum}/${totalBatches}: Processing with medical AI (Pages ${startPage}-${endPage})...`);
        try {
          const batchMcqs = await importPDFMCQs({
            textBatch: batchText,
            mode: importMode,
            subject: importSubject,
            chapter: importChapter,
            topic: importTopic
          });

          if (activeGenerationIdRef.current !== generationId) return;

          if (batchMcqs && batchMcqs.length > 0) {
            allExtractedMcqs = [...allExtractedMcqs, ...batchMcqs];
            setImportedMcqs([...allExtractedMcqs]);
          }
        } catch (apiErr: any) {
          console.error(`[QBank Generation] Error processing batch ${batchNum} of request ID ${generationId}:`, apiErr);
          if (activeGenerationIdRef.current !== generationId) return;
          const isQuota = apiErr.quotaExceeded || String(apiErr.message).includes('daily usage limit') || String(apiErr.message).includes('RESOURCE_EXHAUSTED') || String(apiErr.message).includes('429');
          if (isQuota) {
            throw apiErr; // rethrow to stop subsequent batches and handle in outer catch
          }
          // Don't crash entirely so we can keep questions from other batches
        }
      }

      if (activeGenerationIdRef.current !== generationId) return;

      const autoSaved = await autoSaveIfEmpty(allExtractedMcqs);
      if (activeGenerationIdRef.current !== generationId) return;

      if (autoSaved) {
        setPdfBatchProgressText(`Processing complete! Live database collection was empty, so ${allExtractedMcqs.length} questions were automatically saved directly to MongoDB Atlas successfully!`);
      } else {
        setPdfBatchProgressText(`Processing complete! Successfully compiled ${allExtractedMcqs.length} questions.`);
      }
    } catch (err: any) {
      console.error(`[QBank Generation] Error during batch PDF import for ID ${generationId}:`, err);
      if (activeGenerationIdRef.current !== generationId) return;
      const isQuota = err.quotaExceeded || String(err.message).includes('daily usage limit') || String(err.message).includes('RESOURCE_EXHAUSTED') || String(err.message).includes('429');
      if (isQuota) {
        setImportError('The AI service has reached its daily usage limit. Please try again later or contact the administrator.');
      } else {
        setImportError(err.message || 'An error occurred during batch PDF processing.');
      }
    } finally {
      if (activeGenerationIdRef.current === generationId) {
        setIsImporting(false);
      }
    }
  };

  const handleApproveImportedMcq = async (mcqToSave: any, index: number) => {
    try {
      const success = await saveDBQuestionWithEdit(mcqToSave);
      if (success) {
        setImportedMcqs(prev => prev.filter((_, idx) => idx !== index));
        alert('Question successfully saved to Live QBank!');
        onRefreshData?.();
      } else {
        alert('Could not save question to MongoDB Atlas.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleApproveAllImportedMcqs = async () => {
    if (importedMcqs.length === 0) return;
    setSavingImported(true);
    let successCount = 0;
    try {
      for (const mcq of importedMcqs) {
        const success = await saveDBQuestionWithEdit(mcq);
        if (success) successCount++;
      }
      alert(`Successfully saved ${successCount} out of ${importedMcqs.length} questions to Live QBank!`);
      setImportedMcqs([]);
      setImportPdfFile(null);
      setImportChapter('');
      setImportTopic('');
      onRefreshData?.();
    } catch (err: any) {
      alert(`Error during bulk save: ${err.message}`);
    } finally {
      setSavingImported(false);
    }
  };

  // ============ IMAGE MCQ EXTRACTOR STATE & LOGIC ============
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSubject, setImageSubject] = useState<string>('Pathology');
  const [imageChapter, setImageChapter] = useState('');
  const [imageTopic, setImageTopic] = useState('');
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [imageExtractorError, setImageExtractorError] = useState<string | null>(null);
  const [imageExtractorLogs, setImageExtractorLogs] = useState<string[]>([]);
  const [extractedImageMcqs, setExtractedImageMcqs] = useState<any[]>([]);

  const addImageLog = (msg: string) => {
    console.log(`[Image Extractor] ${msg}`);
    setImageExtractorLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      addImageLog("No image file was selected.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG/JPG/JPEG).');
      addImageLog(`Rejected invalid file type: ${file.type}`);
      return;
    }
    setImageFile(file);
    setImageExtractorError(null);
    setExtractedImageMcqs([]);
    setImageExtractorLogs([]);
    addImageLog(`Selected image file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      addImageLog('Generated local preview of the selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleImageExtractMCQs = async () => {
    if (!imageFile || !imagePreview) {
      addImageLog("Abort: No image file selected.");
      return;
    }
    setIsExtractingImage(true);
    setImageExtractorError(null);
    setExtractedImageMcqs([]);
    setImageExtractorLogs([]);

    addImageLog('Initiating image extraction pipeline...');
    addImageLog('Converting medical image to raw Base64 transmission buffer...');
    
    try {
      addImageLog(`Submitting payload to Gemini API Vision model... Subject: ${imageSubject}, Ch: ${imageChapter || 'Auto-Detect'}, Topic: ${imageTopic || 'Auto-Detect'}`);
      
      const response = await fetch('/api/gemini/extract-image-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageFile.type,
          subject: imageSubject,
          chapter: imageChapter,
          topic: imageTopic
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMsg = data.error || `Server extraction failed (status ${response.status})`;
        const errorObj = new Error(errorMsg);
        if (response.status === 429 || data.quotaExceeded) {
          (errorObj as any).quotaExceeded = true;
        }
        throw errorObj;
      }

      addImageLog(`Gemini API Response: Success! Extracted and structured questions from the image.`);
      
      const mcqs = data.mcqs || [];
      addImageLog(`Standardized ${mcqs.length} extracted MCQ(s) successfully.`);
      
      // Since our new backend saves them immediately to MongoDB with approved: false, they are already saved!
      addImageLog(`Database Save: Successfully saved ${mcqs.length} questions to MongoDB Atlas with review status 'approved: false'.`);
      
      setExtractedImageMcqs(mcqs);
      addImageLog(`Displaying newly extracted pending-review questions immediately below.`);
      
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error('[Image Extractor] Failure:', err);
      const isQuota = err.quotaExceeded || String(err.message).includes('daily usage limit') || String(err.message).includes('RESOURCE_EXHAUSTED') || String(err.message).includes('429');
      if (isQuota) {
        setImageExtractorError('The AI service has reached its daily usage limit. Please try again later or contact the administrator.');
        addImageLog('Failure: The AI service has reached its daily usage limit. Please try again later or contact the administrator.');
      } else {
        setImageExtractorError(err.message || 'An error occurred during Image MCQ extraction.');
        addImageLog(`Failure: ${err.message || 'Unknown processing error.'}`);
      }
    } finally {
      setIsExtractingImage(false);
    }
  };

  const handleApproveImageMcq = async (mcqToSave: any, index: number) => {
    try {
      const updatedMcq = { ...mcqToSave, approved: true };
      const success = await saveDBQuestionWithEdit(updatedMcq);
      if (success) {
        setExtractedImageMcqs(prev => prev.filter((_, idx) => idx !== index));
        alert('Question successfully approved & published to Live QBank!');
        onRefreshData?.();
      } else {
        alert('Could not update and approve question in MongoDB Atlas.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDiscardImageMcq = async (mcqToDiscard: any, index: number) => {
    try {
      const qId = mcqToDiscard._id || mcqToDiscard.id;
      if (qId) {
        const success = await deleteDBQuestion(qId);
        if (success) {
          setExtractedImageMcqs(prev => prev.filter((_, idx) => idx !== index));
          alert('Question successfully deleted from database.');
          onRefreshData?.();
        } else {
          alert('Could not delete question from MongoDB Atlas.');
        }
      } else {
        setExtractedImageMcqs(prev => prev.filter((_, idx) => idx !== index));
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // ============ MCQ BULK AND MERGE OPERATIONS ============
  const handleSingleApprove = async (item: any) => {
    const id = item._id || item.id;
    console.log(`[Admin Approve Click Event] Fired on question ID: ${id}`, item);
    setIsLoading(true);
    try {
      const adminEmail = user?.email || 'admin@medbank.com';
      console.log(`[Admin Approve Request] Sending single approval request for ID: ${id} to API under email: ${adminEmail}`);
      const result = await bulkApproveQuestions([id], adminEmail);
      console.log(`[Admin Approve Server Response] Received:`, result);
      
      if (result && result.success) {
        showToast(result.message || `Successfully approved and published the question!`, 'success');
        setSelectedMcqIds(prev => prev.filter(i => i !== id));
        
        console.log(`[Admin Approve Refresh] Refreshing parent data and loading fresh questions...`);
        onRefreshData?.();
        const freshQs = await fetchDBQuestions(adminEmail);
        setDataList(freshQs);
      } else {
        const errorMsg = result?.message || (result as any)?.error || 'Approval failed on the server.';
        console.error(`[Admin Approve Failure] Server returned failure:`, result);
        showToast(`Approval failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('[Admin Approve Exception] Critical exception in approval flow:', err);
      showToast(`Approval error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    console.log(`[Admin Bulk Approve Click Event] Fired with selected IDs:`, selectedMcqIds);
    if (selectedMcqIds.length === 0) {
      showToast('Please select at least one MCQ to approve.', 'info');
      return;
    }
    if (!confirm(`Are you sure you want to bulk approve ${selectedMcqIds.length} selected question(s)?`)) {
      console.log(`[Admin Bulk Approve] Canceled by user.`);
      return;
    }
    setIsLoading(true);
    try {
      const adminEmail = user?.email || 'admin@medbank.com';
      console.log(`[Admin Bulk Approve Request] Sending bulk approval request for ${selectedMcqIds.length} IDs to API under email: ${adminEmail}`);
      const result = await bulkApproveQuestions(selectedMcqIds, adminEmail);
      console.log(`[Admin Bulk Approve Server Response] Received:`, result);
      
      if (result && result.success) {
        showToast(result.message || `Successfully approved ${selectedMcqIds.length} question(s)!`, 'success');
        setSelectedMcqIds([]);
        
        console.log(`[Admin Bulk Approve Refresh] Refreshing parent data and loading fresh questions...`);
        onRefreshData?.();
        const freshQs = await fetchDBQuestions(adminEmail);
        setDataList(freshQs);
      } else {
        const errorMsg = result?.message || (result as any)?.error || 'Bulk approval failed on the server.';
        console.error(`[Admin Bulk Approve Failure] Server returned failure:`, result);
        showToast(`Bulk approval failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('[Admin Bulk Approve Exception] Critical exception in bulk approval flow:', err);
      showToast(`Bulk approval error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedMcqIds.length === 0) {
      alert('Please select at least one MCQ to reject.');
      return;
    }
    if (!confirm(`Are you sure you want to bulk reject/delete ${selectedMcqIds.length} selected question(s)?`)) {
      return;
    }
    setIsLoading(true);
    try {
      const adminEmail = user?.email || 'admin@medbank.com';
      const success = await bulkRejectQuestions(selectedMcqIds, adminEmail);
      if (success) {
        alert(`Successfully rejected & deleted ${selectedMcqIds.length} question(s)!`);
        setSelectedMcqIds([]);
        onRefreshData?.();
        const freshQs = await fetchDBQuestions(adminEmail);
        setDataList(freshQs);
      } else {
        alert('Bulk rejection failed on the server.');
      }
    } catch (err: any) {
      alert(`Bulk rejection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeDuplicate = async (targetId: string, duplicateId: string) => {
    if (!targetId || !duplicateId) return;
    if (targetId === duplicateId) {
      alert('Cannot merge a question with itself.');
      return;
    }
    if (!confirm('Are you sure you want to merge this duplicate question? All references will be consolidated and the duplicate will be deleted.')) {
      return;
    }
    setIsLoading(true);
    try {
      const adminEmail = user?.email || 'admin@medbank.com';
      const success = await mergeDuplicateQuestions(targetId, duplicateId, adminEmail);
      if (success) {
        alert('Questions successfully merged!');
        onRefreshData?.();
        const freshQs = await fetchDBQuestions(adminEmail);
        setDataList(freshQs);
      } else {
        alert('Merging failed on the server.');
      }
    } catch (err: any) {
      alert(`Merge error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Access check
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl max-w-xl mx-auto shadow-sm">
        <div className="bg-red-50 dark:bg-red-950/20 text-red-500 p-4 rounded-full mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security Access Denied</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-2 leading-relaxed">
          The Admin Console is secure. Only users registered as <strong>admin</strong> are authorized to view or modify MBBS syllabus materials.
        </p>
      </div>
    );
  }

  const refreshCurriculumCache = async () => {
    try {
      const [subjects, chapters, topics, trash] = await Promise.all([
        fetchDBSubjects(),
        fetchDBChapters(),
        fetchDBTopics(),
        fetchCurriculumTrash()
      ]);
      setSubjectsList(subjects);
      setChaptersList(chapters);
      setTopicsList(topics);
      setTrashList(trash);
    } catch (err) {
      console.error('Error refreshing curriculum cache:', err);
    }
  };

  // Load subject options to populate dropdown selectors
  useEffect(() => {
    refreshCurriculumCache();
  }, []);

  // Fetch Core Collection Data based on active tab
  const loadTabContents = async () => {
    setIsLoading(true);
    setSearchQuery('');
    setSubjectFilter('');
    setCurrentPage(1);
    try {
      let data: any[] = [];
      switch (activeTab) {
        case 'subjects':
          data = await fetchDBSubjects();
          break;
        case 'chapters':
          data = await fetchDBChapters();
          break;
        case 'topics':
          data = await fetchDBTopics();
          break;
        case 'trash':
          data = await fetchCurriculumTrash();
          break;
        case 'pdfs':
          data = await fetchDBPdfs();
          break;
        case 'notes':
          data = await fetchDBNotes();
          break;
        case 'mcqs':
          data = await fetchDBQuestions(user?.email);
          break;
        case 'tests':
          data = await fetchDBTests();
          break;
        case 'results':
          data = await fetchDBTestResults();
          break;
        case 'announcements':
          data = await fetchDBAnnouncements();
          break;
        case 'flashcards':
          data = await fetchDBFlashcards();
          break;
        case 'videos':
          data = await fetchDBVideos();
          break;
        case 'users':
          data = await fetchDBUsers();
          break;
        default:
          data = [];
      }
      setDataList(data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveChapter = async (chapterItem: any, direction: 'up' | 'down') => {
    try {
      // Get all chapters of the same subject from dataList
      const sameSubjectChapters = dataList
        .filter((c: any) => c.subject === chapterItem.subject)
        .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

      const currentIndex = sameSubjectChapters.findIndex((c: any) => c.id === chapterItem.id);
      if (currentIndex === -1) return;

      let targetIndex = -1;
      if (direction === 'up' && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < sameSubjectChapters.length - 1) {
        targetIndex = currentIndex + 1;
      }

      if (targetIndex !== -1) {
        const targetChapter = sameSubjectChapters[targetIndex];
        
        // Swap displayOrder values
        const currentOrder = chapterItem.displayOrder || 0;
        const targetOrder = targetChapter.displayOrder || 0;
        
        // Swap or make distinct
        const newCurrentOrder = targetOrder;
        const newTargetOrder = currentOrder === targetOrder ? currentOrder + 1 : currentOrder;

        setIsSaving(true);
        await saveDBChapter({ ...chapterItem, displayOrder: newCurrentOrder, isEdit: true });
        await saveDBChapter({ ...targetChapter, displayOrder: newTargetOrder, isEdit: true });
        loadTabContents();
      }
    } catch (err: any) {
      alert(`Error reordering chapters: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const loadDashboardStatistics = async () => {
    setLoadingStats(true);
    try {
      const [
        users,
        subjects,
        chapters,
        questions,
        pdfs,
        notes,
        flashcards,
        announcements,
        results
      ] = await Promise.all([
        fetchDBUsers(),
        fetchDBSubjects(),
        fetchDBChapters(),
        fetchDBQuestions(),
        fetchDBPdfs(),
        fetchDBNotes(),
        fetchDBFlashcards(),
        fetchDBAnnouncements(),
        fetchDBTestResults()
      ]);

      const studentsCount = (users || []).filter((u: any) => u.role === 'student').length;
      const adminsCount = (users || []).filter((u: any) => u.role === 'admin').length;

      const pathMcqs = (questions || []).filter((q: any) => q.subject === 'Pathology').length;
      const pharmMcqs = (questions || []).filter((q: any) => q.subject === 'Pharmacology').length;
      const microMcqs = (questions || []).filter((q: any) => q.subject === 'Microbiology').length;

      let totalCorrect = 0;
      let totalQuestions = 0;
      (results || []).forEach((r: any) => {
        totalCorrect += r.correctAnswers || 0;
        totalQuestions += r.totalQuestions || 0;
      });
      const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

      setStatsData({
        usersCount: (users || []).length,
        studentsCount,
        adminsCount,
        subjectsCount: (subjects || []).length,
        chaptersCount: (chapters || []).length,
        pdfsCount: (pdfs || []).length,
        notesCount: (notes || []).length,
        mcqsCount: (questions || []).length,
        flashcardsCount: (flashcards || []).length,
        announcementsCount: (announcements || []).length,
        resultsCount: (results || []).length,
        avgAccuracy,
        pathologyMcqs: pathMcqs,
        pharmacologyMcqs: pharmMcqs,
        microbiologyMcqs: microMcqs
      });
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'statistics') {
      loadDashboardStatistics();
    } else if (activeTab !== 'ai-generator' && activeTab !== 'database') {
      loadTabContents();
    }
  }, [activeTab]);

  // Handle Create / Edit submissions
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const itemToSave = { 
        ...formData, 
        id: editItem ? editItem.id : formData.id || `${activeTab.slice(0,4)}-${Date.now()}`,
        isEdit: !!editItem 
      };

      let success = false;
      switch (activeTab) {
        case 'subjects':
          success = await saveDBSubject(itemToSave);
          break;
        case 'chapters': {
          const res = await saveDBChapter(itemToSave);
          if (res.success) {
            success = true;
          } else {
            success = false;
            if (res.error) {
              alert(res.error);
              setIsSaving(false);
              return;
            }
          }
          break;
        }
        case 'topics': {
          const res = await saveDBTopic(itemToSave);
          if (res.success) {
            success = true;
          } else {
            success = false;
            if (res.error) {
              alert(res.error);
              setIsSaving(false);
              return;
            }
          }
          break;
        }
        case 'pdfs':
          success = await saveDBPdf(itemToSave);
          break;
        case 'notes':
          success = await saveDBNoteWithEdit(itemToSave);
          break;
        case 'mcqs':
          // Parse options if comma separated or multiple inputs
          if (typeof itemToSave.options === 'string') {
            itemToSave.options = itemToSave.options.split(',').map((o: string) => o.trim());
          }
          success = await saveDBQuestionWithEdit(itemToSave);
          break;
        case 'tests':
          if (typeof itemToSave.questions === 'string') {
            itemToSave.questions = itemToSave.questions.split(',').map((q: string) => q.trim());
          }
          success = await saveDBTest(itemToSave);
          break;
        case 'announcements':
          success = await saveDBAnnouncement(itemToSave);
          break;
        case 'flashcards':
          success = await saveDBFlashcard(itemToSave);
          break;
        case 'videos':
          success = await saveDBVideo(itemToSave);
          break;
        case 'users':
          success = await saveDBUser(itemToSave);
          break;
      }

      if (success) {
        setIsModalOpen(false);
        setEditItem(null);
        setFormData({});
        loadTabContents();
        refreshCurriculumCache();
        onRefreshData?.();
      } else {
        alert('Could not persist data changes on MongoDB Atlas. Please check connections.');
      }
    } catch (err: any) {
      alert(`Error saving item: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record Execution
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      let success = false;
      const itemId = deleteConfirmItem.id;
      switch (activeTab) {
        case 'subjects':
          success = await deleteDBSubject(itemId);
          break;
        case 'chapters':
          success = await deleteDBChapter(itemId);
          break;
        case 'topics':
          success = await deleteDBTopic(itemId);
          break;
        case 'pdfs':
          success = await deleteDBPdf(itemId);
          break;
        case 'notes':
          success = await deleteDBNote(itemId);
          break;
        case 'mcqs':
          success = await deleteDBQuestion(itemId);
          break;
        case 'tests':
          success = await deleteDBTest(itemId);
          break;
        case 'results':
          success = await deleteDBTestResult(itemId);
          break;
        case 'announcements':
          success = await deleteDBAnnouncement(itemId);
          break;
        case 'flashcards':
          success = await deleteDBFlashcard(itemId);
          break;
        case 'videos':
          success = await deleteDBVideo(itemId);
          break;
        case 'users':
          success = await deleteDBUser(itemId);
          break;
      }

      if (success) {
        setDeleteConfirmItem(null);
        loadTabContents();
        refreshCurriculumCache();
        onRefreshData?.();
      } else {
        alert('Failed to delete selected item.');
      }
    } catch (err: any) {
      alert(`Error during delete transaction: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Curriculum Tree Actions
  const handleRenameCurriculumItem = async (itemType: 'subject' | 'chapter' | 'topic', id: string, oldName: string) => {
    const newName = prompt(`Rename ${itemType} "${oldName}" to:`, oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    try {
      setIsCurriculumLoading(true);
      const res = await renameCurriculumItem(itemType, id, newName.trim());
      if (res.success) {
        alert(`${itemType} renamed successfully.`);
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: ${res.error || 'Failed to rename'}`);
      }
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const handleMoveCurriculumItem = async (itemType: 'chapter' | 'topic', id: string, targetParentId: string) => {
    if (!targetParentId) return;
    try {
      setIsCurriculumLoading(true);
      const res = await moveCurriculumItem(itemType, id, targetParentId);
      if (res.success) {
        alert('Item moved successfully.');
        setCurriculumAction(null);
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: ${res.error || 'Failed to move'}`);
      }
    } catch (err: any) {
      alert(`Move failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const handleMergeCurriculumItem = async (itemType: 'subject' | 'chapter' | 'topic', sourceId: string, targetId: string) => {
    if (!targetId || sourceId === targetId) return;
    if (!confirm(`Are you absolutely sure you want to merge this ${itemType}? This action will re-assign all matching sub-items, questions, study notes, and flashcards, then permanently delete the source node. This CANNOT be undone.`)) return;
    try {
      setIsCurriculumLoading(true);
      const res = await mergeCurriculumItem(itemType, sourceId, targetId);
      if (res.success) {
        alert('Items merged successfully.');
        setCurriculumAction(null);
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: ${res.error || 'Failed to merge'}`);
      }
    } catch (err: any) {
      alert(`Merge failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const handleDeleteCurriculumItem = async (itemType: 'subject' | 'chapter' | 'topic', id: string, name: string) => {
    if (itemType === 'subject' || itemType === 'topic') {
      setCurriculumDeleteModal({ itemType, id, name });
      setDeleteCascadeOption('only');
      return;
    }

    const warning = `Are you absolutely sure you want to permanently delete the chapter "${name}"? This will permanently delete all nested sub-topics, MCQs, and related materials. This action is irreversible.`;
    
    if (!confirm(warning)) return;
    try {
      setIsCurriculumLoading(true);
      const success = await deleteDBChapter(id);
      if (success) {
        // Clear local bookmarks and other client caches for deleted items
        const getUserScopedKeyLocal = (baseKey: string) => {
          if (user && user.email) {
            return `${baseKey}_${user.email.replace(/[@.]/g, '_')}`;
          }
          return baseKey;
        };

        let mcqsToDelete: string[] = [];
        const cachedMcqsRaw = safeStorage.getItem(getUserScopedKeyLocal('medbank_custom_mcqs'));
        if (cachedMcqsRaw) {
          try {
            const cachedMcqs: any[] = JSON.parse(cachedMcqsRaw);
            mcqsToDelete = cachedMcqs.filter(q => q && q.chapter === name).map(q => q.id || q._id);
          } catch (e) {
            console.error('Error parsing cached MCQs for deletion filter:', e);
          }
        }

        if (mcqsToDelete.length > 0) {
          const bkKey = getUserScopedKeyLocal('medbank_bookmarks');
          const bksRaw = safeStorage.getItem(bkKey);
          if (bksRaw) {
            try {
              let bks: string[] = JSON.parse(bksRaw);
              bks = bks.filter(mid => !mcqsToDelete.includes(mid));
              safeStorage.setItem(bkKey, JSON.stringify(bks));
            } catch (e) {
              console.error('Error updating bookmarks on curriculum deletion:', e);
            }
          }
        }

        alert(`Success: "${name}" (chapter) and all linked records permanently deleted across the entire database.`);
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: Failed to delete chapter "${name}" from the database.`);
      }
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const executeCurriculumDeleteWithOptions = async () => {
    if (!curriculumDeleteModal) return;
    const { itemType, id, name } = curriculumDeleteModal;
    const isCascade = deleteCascadeOption === 'cascade';

    try {
      setIsCurriculumLoading(true);
      let success = false;

      if (itemType === 'subject') {
        success = await deleteDBSubject(id, isCascade);
      } else if (itemType === 'topic') {
        success = await deleteDBTopic(id, isCascade);
      }

      if (success) {
        // Clear local bookmarks and other client caches for deleted items
        const getUserScopedKeyLocal = (baseKey: string) => {
          if (user && user.email) {
            return `${baseKey}_${user.email.replace(/[@.]/g, '_')}`;
          }
          return baseKey;
        };

        let mcqsToDelete: string[] = [];
        const cachedMcqsRaw = safeStorage.getItem(getUserScopedKeyLocal('medbank_custom_mcqs'));
        if (cachedMcqsRaw) {
          try {
            const cachedMcqs: any[] = JSON.parse(cachedMcqsRaw);
            if (itemType === 'subject') {
              if (isCascade) {
                mcqsToDelete = cachedMcqs.filter(q => q && q.subject === name).map(q => q.id || q._id);
              }
            } else if (itemType === 'topic') {
              if (isCascade) {
                mcqsToDelete = cachedMcqs.filter(q => q && q.topic === name).map(q => q.id || q._id);
              }
            }
          } catch (e) {
            console.error('Error parsing cached MCQs for deletion filter:', e);
          }
        }

        if (mcqsToDelete.length > 0) {
          const bkKey = getUserScopedKeyLocal('medbank_bookmarks');
          const bksRaw = safeStorage.getItem(bkKey);
          if (bksRaw) {
            try {
              let bks: string[] = JSON.parse(bksRaw);
              bks = bks.filter(mid => !mcqsToDelete.includes(mid));
              safeStorage.setItem(bkKey, JSON.stringify(bks));
            } catch (e) {
              console.error('Error updating bookmarks on curriculum deletion:', e);
            }
          }
        }

        const successMsg = itemType === 'subject'
          ? (isCascade 
              ? `Success: Subject "${name}" and all related topics, chapters, and questions successfully deleted.` 
              : `Success: Subject "${name}" successfully deleted. Questions and learning materials have been moved to "Uncategorized".`)
          : (isCascade 
              ? `Success: Topic "${name}" and all its questions successfully deleted.` 
              : `Success: Topic "${name}" successfully deleted. Questions and learning materials have been kept as uncategorized under their parent chapter.`);

        alert(successMsg);
        setCurriculumDeleteModal(null);
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: Failed to delete ${itemType} "${name}" from the database.`);
      }
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const handleRestoreTrashItem = async (trashId: string) => {
    try {
      setIsCurriculumLoading(true);
      const res = await restoreCurriculumItem(trashId);
      if (res.success) {
        alert('Curriculum item and all associated cascade mapping restored successfully.');
        await refreshCurriculumCache();
        loadTabContents();
        onRefreshData?.();
      } else {
        alert(`Error: ${res.error || 'Failed to restore'}`);
      }
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  // Open creation modal
  const openAddModal = () => {
    setEditItem(null);
    let initialForm: any = {};
    
    // Set default keys to avoid undefined state issues in inputs
    switch (activeTab) {
      case 'subjects':
        initialForm = { name: '', description: '', icon: 'BookOpen' };
        break;
      case 'chapters':
        initialForm = { name: '', subject: subjectsList[0]?.name || 'Pathology', description: '' };
        break;
      case 'topics':
        initialForm = { name: '', chapterId: chaptersList[0]?.id || '', subject: subjectsList[0]?.name || 'Pathology', description: '' };
        break;
      case 'pdfs':
        initialForm = { title: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', topic: '', sourceBook: '', fileSize: '1.5 MB', pagesCount: 10, downloadUrl: '#' };
        break;
      case 'notes':
        initialForm = { title: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', topic: '', content: '', sourceBook: '' };
        break;
      case 'mcqs':
        initialForm = { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', topic: '', difficulty: 'Medium', sourceBook: '', type: 'Single Best Answer' };
        break;
      case 'tests':
        initialForm = { title: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', topic: '', durationMinutes: 30, questions: '' };
        break;
      case 'announcements':
        initialForm = { title: '', content: '', category: 'General', published: true };
        break;
      case 'flashcards':
        initialForm = { front: '', back: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', topic: '' };
        break;
      case 'videos':
        initialForm = { title: '', url: '', subject: subjectsList[0]?.name || 'Pathology', chapter: '', duration: '15:00' };
        break;
      case 'users':
        initialForm = { name: '', email: '', role: 'student' };
        break;
    }
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  // Open edit modal preloaded
  const openEditModal = (item: any) => {
    setEditItem(item);
    
    let prefilled = { ...item };
    if (activeTab === 'mcqs' && Array.isArray(item.options)) {
      // Keep options as array or join them based on representation
    }
    if (activeTab === 'tests' && Array.isArray(item.questions)) {
      prefilled.questions = item.questions.join(', ');
    }
    
    setFormData(prefilled);
    setIsModalOpen(true);
  };

  // Run MongoDB Test
  const handleTestMongoDB = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await testMongoDBConnection();
      setDbTestResult(res);
    } catch (err: any) {
      setDbTestResult({
        success: false,
        error: err.message || 'Database test failed to resolve.'
      });
    } finally {
      setTestingDb(false);
    }
  };

  // AI MCQ Auto generator trigger
  const handleAIGenerateMCQ = async () => {
    if (!aiTopic || !aiText) {
      alert('Please fill study topic and notes context first.');
      return;
    }
    setAiGenLoading(true);
    setAiGenMcq(null);
    try {
      const mcqResult = await generateMCQFromText({
        topic: aiTopic,
        subject: aiSubject,
        notesText: aiText
      });
      setAiGenMcq(mcqResult);
    } catch (err: any) {
      alert(`AI MCQ generation failed: ${err.message || 'Invalid environment API keys'}`);
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleApproveAIMcq = async () => {
    if (!aiGenMcq) return;
    try {
      const success = await saveDBQuestionWithEdit(aiGenMcq);
      if (success) {
        setAiGenMcq(null);
        setAiTopic('');
        setAiText('');
        alert('AI exam question successfully validated and saved to Atlas questions library!');
        onRefreshData?.();
      } else {
        alert('Could not save AI-generated question to MongoDB Atlas.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  // Filters & Search local array matching
  const filteredItems = dataList.filter(item => {
    // 1. Search Query Match
    const str = JSON.stringify(item).toLowerCase();
    const matchesSearch = str.includes(searchQuery.toLowerCase());
    
    // 2. Subject Filter Match
    const matchesSubject = !subjectFilter || 
      String(item.subject || '').toLowerCase() === subjectFilter.toLowerCase() ||
      String(item.category || '').toLowerCase() === subjectFilter.toLowerCase() ||
      String(item.role || '').toLowerCase() === subjectFilter.toLowerCase();

    // 3. Approval Filter Match
    let matchesApproval = true;
    if (activeTab === 'mcqs') {
      if (approvalFilter === 'approved') {
        matchesApproval = item.approved === true;
      } else if (approvalFilter === 'unapproved') {
        matchesApproval = item.approved === false;
      }
    }

    return matchesSearch && matchesSubject && matchesApproval;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const sidebarTabs: { id: AdminTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'statistics', label: 'Dashboard Statistics', icon: <Activity className="h-4 w-4" />, color: 'text-rose-500' },
    { id: 'subjects', label: 'Subjects', icon: <Layers className="h-4 w-4" />, color: 'text-blue-500' },
    { id: 'chapters', label: 'Chapters', icon: <BookOpen className="h-4 w-4" />, color: 'text-indigo-500' },
    { id: 'topics', label: 'Topics', icon: <Tag className="h-4 w-4" />, color: 'text-teal-500' },
    { id: 'trash', label: 'Recycle Bin', icon: <Trash2 className="h-4 w-4" />, color: 'text-slate-500' },
    { id: 'pdfs', label: 'PDFs & Syllabi', icon: <Upload className="h-4 w-4" />, color: 'text-rose-500' },
    { id: 'notes', label: 'Study Notes', icon: <FileText className="h-4 w-4" />, color: 'text-orange-500' },
    { id: 'mcqs', label: 'MCQs', icon: <HelpCircle className="h-4 w-4" />, color: 'text-cyan-500' },
    { id: 'pdf-importer', label: 'Import MCQs', icon: <Upload className="h-4 w-4" />, color: 'text-emerald-500' },
    { id: 'tests', label: 'Question Banks', icon: <Award className="h-4 w-4" />, color: 'text-amber-500' },
    { id: 'results', label: 'Student Results', icon: <Eye className="h-4 w-4" />, color: 'text-teal-500' },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" />, color: 'text-purple-500' },
    { id: 'flashcards', label: 'Flashcards', icon: <Sparkles className="h-4 w-4" />, color: 'text-pink-500' },
    { id: 'videos', label: 'Lectures / Videos', icon: <Video className="h-4 w-4" />, color: 'text-red-500' },
    { id: 'users', label: 'User Directory', icon: <Users className="h-4 w-4" />, color: 'text-emerald-500' },
    { id: 'ai-generator', label: 'Gemini MCQ Maker', icon: <Sparkles className="h-4 w-4 text-amber-500" />, color: 'text-amber-500' },
    { id: 'database', label: 'Test MongoDB', icon: <Database className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-500' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[75vh]">
      {/* 1. Left Sidebar Navigation */}
      {/* On mobile: Compact dropdown selection */}
      <div className="block md:hidden bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 space-y-2 text-left">
        <div className="flex justify-between items-center border-b border-[#e4e4e7] dark:border-[#27272a] pb-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            <span>MedBank Admin</span>
          </h3>
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{user.email}</span>
        </div>
        <div className="pt-1">
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Active Admin Area</label>
          <select
            value={activeTab}
            onChange={(e) => {
              setActiveTab(e.target.value as any);
              setSearchQuery('');
              setSubjectFilter('');
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none"
          >
            {sidebarTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* On desktop: Full sidebar */}
      <aside className="hidden md:flex w-full md:w-64 shrink-0 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-4 flex-col justify-between">
        <div className="space-y-6">
          <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4 px-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Stethoscope className="h-4.5 w-4.5 text-blue-600" />
              <span>MedBank Admin</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Syllabus Orchestrator</p>
          </div>

          <nav className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setSubjectFilter('');
                }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b]'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-white dark:text-slate-900' : tab.color}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-[#e4e4e7] dark:border-[#27272a] pt-4 px-2 text-center">
          <p className="text-[10px] text-slate-400 font-semibold">Logged as Admin</p>
          <p className="text-[9px] text-slate-400 truncate mt-0.5">{user.email}</p>
        </div>
      </aside>

      {/* 2. Main Workstation Area */}
      <section className="flex-grow bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 flex flex-col">
        {/* Dynamic Header */}
        <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
              {activeTab === 'statistics' && <Activity className="h-5 w-5 text-rose-500 animate-pulse" />}
              {activeTab === 'ai-generator' && <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />}
              {activeTab === 'database' && <Database className="h-5 w-5 text-emerald-500" />}
              <span>{activeTab === 'mcqs' ? 'Multiple Choice Questions' : activeTab === 'statistics' ? 'Dashboard Statistics' : activeTab} Management Console</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {activeTab === 'statistics' 
                ? 'Overview of content, accuracy ratios, and database records' 
                : 'Add, update, delete, and publish medical dataset assets to MongoDB'}
            </p>
          </div>

          {/* Create Button */}
          {activeTab !== 'ai-generator' && activeTab !== 'database' && activeTab !== 'statistics' && activeTab !== 'results' && activeTab !== 'pdf-importer' && activeTab !== 'image-extractor' && activeTab !== 'trash' && (
            <button
              onClick={openAddModal}
              className="bg-[#18181b] dark:bg-white text-white dark:text-[#18181b] hover:bg-black dark:hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New {activeTab.slice(0, -1)}</span>
            </button>
          )}
        </div>

        {/* 3. Render Workstation Tab */}

        {/* ============ DASHBOARD STATISTICS TAB ============ */}
        {activeTab === 'statistics' && (
          <div className="space-y-6 text-left">
            {loadingStats ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <span className="text-xs font-semibold">Aggregating database statistics from Atlas...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Metric Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Total Students */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Students</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.studentsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Total Subjects */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syllabus Subjects</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.subjectsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Total Chapters */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-lg">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syllabus Chapters</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.chaptersCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* QBank MCQs */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 rounded-lg">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">QBank MCQs</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.mcqsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Study Notes */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lectures & Notes</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.notesCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Syllabus PDFs */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-lg">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syllabus PDFs</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.pdfsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Flashcards */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-pink-50 dark:bg-pink-950/20 text-pink-600 rounded-lg">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flashcards</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.flashcardsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Results Recorded */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-lg">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test Submissions</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.resultsCount ?? 0}</h4>
                    </div>
                  </div>

                  {/* Average accuracy score */}
                  <div className="p-4 bg-slate-50/55 dark:bg-zinc-900/30 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center space-x-4">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Test Accuracy</p>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{statsData?.avgAccuracy ?? 0}%</h4>
                    </div>
                  </div>
                </div>

                {/* 2. Subject Breakdown */}
                <div className="p-5 border border-[#e4e4e7] dark:border-[#27272a] bg-slate-50/10 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Syllabus MCQ Balance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Pathology</span>
                      <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">{statsData?.pathologyMcqs ?? 0} MCQs</h4>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase">Pharmacology</span>
                      <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">{statsData?.pharmacologyMcqs ?? 0} MCQs</h4>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-teal-500 uppercase">Microbiology</span>
                      <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">{statsData?.microbiologyMcqs ?? 0} MCQs</h4>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ AI GENERATOR TAB ============ */}
        {activeTab === 'ai-generator' && (
          <div className="space-y-6 text-left">
            <div className="bg-slate-50/50 dark:bg-zinc-950/25 border border-dashed border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Gemini MBBS Clinical Case Generator</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                Paste high-yield clinical paragraphs or textbook notes below. The Gemini AI engine will parse the medical facts, construct valid distractors, and formulate detailed textbook explanations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Study Topic</label>
                  <input
                    type="text"
                    placeholder="e.g., G6PD Deficiency clinical crisis, MESNA mechanism"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs focus:border-[#18181b] dark:focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Subject</label>
                  <select
                    value={aiSubject}
                    onChange={(e: any) => setAiSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs focus:border-[#18181b] dark:focus:border-white focus:outline-none text-slate-700 dark:text-zinc-300"
                  >
                    {subjectsList.map((s: any) => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Textbook Reference / Lecture Context</label>
                <textarea
                  rows={4}
                  placeholder="Paste textbook facts or notes: e.g. 'MESNA is administered along with cyclophosphamide to bind and neutralize the toxic metabolite acrolein in the bladder, reducing hemorrhagic cystitis risk...'"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs focus:border-[#18181b] dark:focus:border-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAIGenerateMCQ}
                disabled={aiGenLoading}
                className="w-full py-2.5 bg-[#18181b] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#18181b] font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {aiGenLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Formulating clinical board question...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Auto-Generate board question via Gemini AI</span>
                  </>
                )}
              </button>
            </div>

            {aiGenMcq && (
              <div className="p-5 border border-emerald-200 dark:border-emerald-950 bg-emerald-50/10 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-100 dark:border-emerald-950/50">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-100/50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">Preview Draft</span>
                  <span className="text-[9px] text-slate-400 font-bold">{aiGenMcq.type} • {aiGenMcq.difficulty}</span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-950 dark:text-white leading-relaxed">{aiGenMcq.question}</p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {aiGenMcq.options.map((opt: string, oIdx: number) => {
                      const isCorrect = oIdx === aiGenMcq.correctAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-lg border text-xs leading-relaxed flex items-center space-x-2 ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-950 dark:text-emerald-300 font-semibold'
                              : 'border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b]'
                          }`}
                        >
                          <span className="font-bold text-slate-400">{String.fromCharCode(65 + oIdx)}:</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-white dark:bg-[#18181b] rounded-lg border border-[#e4e4e7] dark:border-[#27272a] text-xs text-slate-600 dark:text-zinc-300 leading-relaxed space-y-1">
                    <span className="font-bold text-slate-800 dark:text-white">Explanation & Insights:</span>
                    <p>{aiGenMcq.explanation}</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setAiGenMcq(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Decline Draft
                  </button>
                  <button
                    onClick={handleApproveAIMcq}
                    className="px-5 py-2 bg-[#18181b] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#18181b] rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve & Save to QBank</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ IMPORT MCQS FROM PDF TAB ============ */}
        {activeTab === 'pdf-importer' && (
          <ImportMCQs onRefreshData={onRefreshData} />
        )}
        {false && activeTab === 'pdf-importer' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-500" />
                <span>Import Medical MCQs from PDF Syllabus</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Seamlessly upload a standard textbook chapter, exam paper, or study syllabus PDF. Choose to extract pre-existing printed multiple choice questions, or use medical AI to synthesize new professional-grade board exam vignettes directly from the PDF content.
              </p>
            </div>

            {/* Config & Dropzone Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Config */}
              <div className="lg:col-span-1 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">1. Configure Context</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Subject</label>
                  <select
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                  >
                    {subjectsList.map((s: any) => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Respiratory Pathology"
                    value={importChapter}
                    onChange={(e) => setImportChapter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Granulomatous Lung Diseases"
                    value={importTopic}
                    onChange={(e) => setImportTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                  />
                </div>

                <div className="border-t border-[#e4e4e7] dark:border-[#27272a] pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">2. Select Operation Mode</h4>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('extract')}
                      className={`w-full p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                        importMode === 'extract'
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                          : 'border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b]'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                          importMode === 'extract' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                        }`}>
                          {importMode === 'extract' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Mode 1: Extract Existing MCQs</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                          Extract printed MCQ sheets directly. Automatically filters out chapter headings, figures, margins, references, watermarks, and footers.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('generate')}
                      className={`w-full p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                        importMode === 'generate'
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                          : 'border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b]'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                          importMode === 'generate' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                        }`}>
                          {importMode === 'generate' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Mode 2: Generate New MCQs from Content</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                          Analyze general text/chapters in the PDF to draft custom-written clinical board exam vignettes and case studies based on key findings.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Trigger */}
              <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handlePdfUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl flex-grow flex flex-col items-center justify-center p-8 transition-all ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50/10'
                      : importPdfFile
                      ? 'border-emerald-500/50 bg-slate-50/20'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/20 dark:bg-zinc-950/10'
                  }`}
                >
                  <input
                    type="file"
                    id="pdf-file-picker"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePdfUpload(e.target.files[0]);
                      }
                    }}
                  />
                  
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-full mb-3 text-emerald-500">
                    <Upload className="h-8 w-8" />
                  </div>

                  {importPdfFile ? (
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{importPdfFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(importPdfFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                      <button
                        type="button"
                        onClick={() => setImportPdfFile(null)}
                        className="text-[10px] text-red-500 font-bold hover:underline mt-1 cursor-pointer"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Drag and drop your syllabus/lecture PDF here</p>
                      <p className="text-[10px] text-slate-400 mt-1">or</p>
                      <label
                        htmlFor="pdf-file-picker"
                        className="mt-2 inline-block px-4 py-2 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl shadow-sm cursor-pointer hover:bg-slate-50"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={triggerPdfImport}
                  disabled={isImporting || !importPdfFile}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all animate-fade-in"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : importMode === 'generate' ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate QBank</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Process PDF and Extract Questions</span>
                    </>
                  )}
                </button>

                {/* Intelligent Sequential Batch Progress Indicator */}
                {isImporting && (
                  <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl space-y-3 shadow-sm animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-zinc-300">
                        {pdfTotalBatches > 1 
                          ? `Processing Batch ${pdfCurrentBatch} of ${pdfTotalBatches}` 
                          : 'Processing Document'}
                      </span>
                      {pdfTotalPages && (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                          Pages: {pdfTotalPages}
                        </span>
                      )}
                    </div>
                    
                    {/* Animated custom progress bar */}
                    <div className="h-2 bg-slate-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: pdfTotalBatches > 0 
                            ? `${(pdfCurrentBatch / pdfTotalBatches) * 100}%` 
                            : '25%' 
                        }}
                      />
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span className="truncate">{pdfBatchProgressText || 'Initializing Gemini AI engine...'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message with Retry Button */}
            {importError && (
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-2xl text-xs text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
                <button
                  type="button"
                  onClick={triggerPdfImport}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Generation</span>
                </button>
              </div>
            )}

            {/* Extracted Review Area */}
            {importedMcqs.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Drafted MCQs ({importedMcqs.length} Questions)</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Please review and edit the automatically classified metadata and question content before publishing live.</p>
                  </div>
                  <button
                    type="button"
                    disabled={savingImported}
                    onClick={handleApproveAllImportedMcqs}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow transition-all self-end sm:self-auto"
                  >
                    {savingImported ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Approve & Publish All ({importedMcqs.length})</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {importedMcqs.map((mcq, idx) => (
                    <div
                      key={idx}
                      className="p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-2xl shadow-sm space-y-4 text-left"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          Question #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-bold text-slate-400">Difficulty:</span>
                          <select
                            value={mcq.difficulty || 'Medium'}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].difficulty = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>

                          <span className="font-bold text-slate-400 ml-2">Type:</span>
                          <select
                            value={mcq.type || 'Single Best Answer'}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].type = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            <option value="Single Best Answer">Single Best Answer</option>
                            <option value="Clinical Scenario">Clinical Scenario</option>
                            <option value="Image-based MCQ">Image-based MCQ</option>
                            <option value="Multiple Correct Answers">Multiple Choice</option>
                            <option value="Assertion & Reason">Assertion & Reason</option>
                            <option value="Clinical Case Based">Clinical Case Based</option>
                          </select>
                        </div>
                      </div>

                      {/* Intelligent Content Organization Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Subject</label>
                          <select
                            value={mcq.subject || (subjectsList[0]?.name || 'Pathology')}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].subject = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                          >
                            {subjectsList.map((s: any) => (
                              <option key={s.id || s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Chapter</label>
                          <input
                            type="text"
                            value={mcq.chapter || ''}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].chapter = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Inflammation"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Topic</label>
                          <input
                            type="text"
                            value={mcq.topic || ''}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].topic = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Acute Inflammation"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Subtopic</label>
                          <input
                            type="text"
                            value={mcq.subtopic || ''}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].subtopic = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Mediators"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">System</label>
                          <input
                            type="text"
                            value={mcq.system || ''}
                            onChange={(e) => {
                              const updated = [...importedMcqs];
                              updated[idx].system = e.target.value;
                              setImportedMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Immune System"
                          />
                        </div>
                      </div>

                      {/* Question Stem Textarea */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Question Stem</label>
                        <textarea
                          rows={2}
                          value={mcq.question}
                          onChange={(e) => {
                            const updated = [...importedMcqs];
                            updated[idx].question = e.target.value;
                            setImportedMcqs(updated);
                          }}
                          className="w-full p-2.5 bg-slate-50/50 dark:bg-zinc-950/25 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
                        />
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mcq.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="space-y-1">
                            <label className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase px-1">
                              <span>Option {String.fromCharCode(65 + optIdx)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...importedMcqs];
                                  updated[idx].correctAnswer = optIdx;
                                  setImportedMcqs(updated);
                                }}
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  mcq.correctAnswer === optIdx
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {mcq.correctAnswer === optIdx ? 'Correct Key' : 'Set Correct'}
                              </button>
                            </label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...importedMcqs];
                                updated[idx].options[optIdx] = e.target.value;
                                setImportedMcqs(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-xl text-xs transition-colors ${
                                mcq.correctAnswer === optIdx
                                  ? 'border-emerald-500 bg-emerald-50/10'
                                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Explanation & Rationale</label>
                        <textarea
                          rows={2}
                          value={mcq.explanation}
                          onChange={(e) => {
                            const updated = [...importedMcqs];
                            updated[idx].explanation = e.target.value;
                            setImportedMcqs(updated);
                          }}
                          className="w-full p-2.5 bg-slate-50/50 dark:bg-zinc-950/25 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs"
                        />
                      </div>

                      {/* Item Actions */}
                      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setImportedMcqs(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveImportedMcq(mcq, idx)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Publish Question</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ EXTRACT MCQS FROM IMAGE (GEMINI VISION) TAB ============ */}
        {activeTab === 'image-extractor' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span>Extract Medical MCQs from Image via Gemini Vision AI</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Upload a mobile snapshot, anatomical illustration, clinical chart, or scanned page of a textbook. Our advanced Gemini 1.5/2.0 multimodal reasoning parses questions, options, and key answers, saving drafts to the MongoDB Atlas backend instantly as unapproved.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <div className="lg:col-span-1 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">1. Configure Context</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Subject</label>
                  <select
                    value={imageSubject}
                    onChange={(e) => setImageSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                  >
                    {subjectsList.map((s: any) => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Override Chapter (Optional)</label>
                  <input
                    type="text"
                    value={imageChapter}
                    onChange={(e) => setImageChapter(e.target.value)}
                    placeholder="e.g. Inflammation (Auto-detected if empty)"
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Override Topic (Optional)</label>
                  <input
                    type="text"
                    value={imageTopic}
                    onChange={(e) => setImageTopic(e.target.value)}
                    placeholder="e.g. Acute mediators (Auto-detected if empty)"
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Live Execution Log</h4>
                  <div className="bg-zinc-950 text-emerald-400 font-mono text-[9px] p-3 rounded-xl h-44 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {imageExtractorLogs.length === 0 ? (
                      <span className="text-zinc-600">Waiting for user interaction...</span>
                    ) : (
                      imageExtractorLogs.map((log, idx) => (
                        <div key={idx} className="leading-normal">{log}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Preview Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 text-center space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-left">2. Image Attachment</h3>

                  <div className="relative group border-2 border-dashed border-[#e4e4e7] dark:border-[#27272a] hover:border-violet-500 dark:hover:border-violet-400 rounded-2xl p-6 transition-all flex flex-col items-center justify-center bg-slate-50/20 dark:bg-zinc-900/5 min-h-[160px]">
                    <input
                      type="file"
                      id="image-extractor-input"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {imagePreview ? (
                      <div className="space-y-3 z-20">
                        <img 
                          src={imagePreview} 
                          alt="Extracted preview" 
                          className="max-h-56 mx-auto rounded-xl shadow border border-slate-100 dark:border-zinc-800 object-contain"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Click or drag another image to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pointer-events-none">
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/20 text-violet-500 rounded-full w-fit mx-auto">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Click to upload image snapshot</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Supports high-res PNG, JPG, JPEG documents</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleImageExtractMCQs}
                    disabled={isExtractingImage || !imageFile}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                  >
                    {isExtractingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Extracting via Gemini Vision API...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Extract MCQ(s) from Selected Image</span>
                      </>
                    )}
                  </button>
                </div>

                {imageExtractorError && (
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-2xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-shake">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{imageExtractorError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Review / Edit Area */}
            {extractedImageMcqs.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800 animate-fade-in">
                <div className="bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Review Drafted Questions from Image ({extractedImageMcqs.length})</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Below are the questions saved to your database as "pending review". Customize any fields below, and click Approve to publish them live, or Discard to delete.</p>
                </div>

                <div className="space-y-4">
                  {extractedImageMcqs.map((mcq, idx) => (
                    <div
                      key={idx}
                      className="p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-2xl shadow-sm space-y-4 text-left"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
                        <span className="text-[9px] font-bold text-violet-600 bg-violet-100/50 dark:bg-violet-950/50 px-2 py-0.5 rounded">
                          Extracted MCQ #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-bold text-slate-400">Difficulty:</span>
                          <select
                            value={mcq.difficulty || 'Medium'}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].difficulty = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Subject</label>
                          <select
                            value={mcq.subject || (subjectsList[0]?.name || 'Pathology')}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].subject = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                          >
                            {subjectsList.map((s: any) => (
                              <option key={s.id || s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Chapter</label>
                          <input
                            type="text"
                            value={mcq.chapter || ''}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].chapter = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Inflammation"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Topic</label>
                          <input
                            type="text"
                            value={mcq.topic || ''}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].topic = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Mediators"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Subtopic</label>
                          <input
                            type="text"
                            value={mcq.subtopic || ''}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].subtopic = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Histamine"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">System</label>
                          <input
                            type="text"
                            value={mcq.system || ''}
                            onChange={(e) => {
                              const updated = [...extractedImageMcqs];
                              updated[idx].system = e.target.value;
                              setExtractedImageMcqs(updated);
                            }}
                            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px]"
                            placeholder="e.g. Cardiovascular"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Question Stem</label>
                        <textarea
                          rows={3}
                          value={mcq.question}
                          onChange={(e) => {
                            const updated = [...extractedImageMcqs];
                            updated[idx].question = e.target.value;
                            setExtractedImageMcqs(updated);
                          }}
                          className="w-full p-2.5 bg-slate-50/50 dark:bg-zinc-950/25 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mcq.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="space-y-1">
                            <label className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase px-1">
                              <span>Option {String.fromCharCode(65 + optIdx)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...extractedImageMcqs];
                                  updated[idx].correctAnswer = optIdx;
                                  setExtractedImageMcqs(updated);
                                }}
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  mcq.correctAnswer === optIdx
                                    ? 'bg-violet-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800'
                                }`}
                              >
                                {mcq.correctAnswer === optIdx ? 'Correct Key' : 'Set Correct'}
                              </button>
                            </label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...extractedImageMcqs];
                                updated[idx].options[optIdx] = e.target.value;
                                setExtractedImageMcqs(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-xl text-xs transition-colors focus:outline-none ${
                                mcq.correctAnswer === optIdx
                                  ? 'border-violet-500 bg-violet-50/10'
                                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Explanation & Rationale</label>
                        <textarea
                          rows={2}
                          value={mcq.explanation || ''}
                          onChange={(e) => {
                            const updated = [...extractedImageMcqs];
                            updated[idx].explanation = e.target.value;
                            setExtractedImageMcqs(updated);
                          }}
                          className="w-full p-2.5 bg-slate-50/50 dark:bg-zinc-950/25 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-zinc-900">
                        <button
                          type="button"
                          onClick={() => handleDiscardImageMcq(mcq, idx)}
                          className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveImageMcq(mcq, idx)}
                          className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ TEST DATABASE TAB ============ */}
        {activeTab === 'database' && (
          <div className="space-y-6 text-left">
            <div className="bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Database Instance: "medbank"</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Verify the server-side credentials are correct. Running this test connects to Atlas, triggers collection audits, and writes a test register verification document inside the medbank users database space.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTestMongoDB}
                  disabled={testingDb}
                  className="px-5 py-2.5 bg-[#18181b] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#18181b] font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {testingDb ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Executing database operational audit...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      <span>Test Database Operations</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {dbTestResult && (
              <div
                className={`p-5 rounded-2xl border text-xs leading-relaxed space-y-3 ${
                  dbTestResult.success
                    ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-900 dark:text-emerald-200'
                    : 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/15 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {dbTestResult.success ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <span>{dbTestResult.success ? 'Operational Success! MongoDB Atlas is active and connected.' : 'Database Operations Test Failed'}</span>
                </div>

                {dbTestResult.success ? (
                  <div className="space-y-2">
                    <p className="font-medium text-[11px] text-slate-700 dark:text-zinc-300">
                      {dbTestResult.message}
                    </p>
                    {dbTestResult.insertedId && (
                      <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-emerald-100 dark:border-emerald-950 font-mono text-[10px] space-y-1">
                        <span className="text-slate-400">Inserted Verification ID:</span>
                        <span className="block font-bold text-slate-800 dark:text-slate-200">{dbTestResult.insertedId}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-rose-100 dark:border-rose-950 font-mono text-[10px] text-rose-600 dark:text-rose-400 whitespace-pre-wrap">
                    {dbTestResult.error || 'An unknown authentication error occurred.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============ CURRICULUM ORCHESTRATOR WORKSPACE ============ */}
        {activeTab === 'subjects' && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/55 dark:bg-zinc-900/10 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">MBBS Curriculum Orchestrator</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Expand and manage the complete syllabus curriculum tree (Subjects &rarr; Chapters &rarr; Topics) with cascading updates.
                </p>
              </div>
              <button
                onClick={() => openAddModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Curriculum Node</span>
              </button>
            </div>

            {/* Quick interactive search filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter curriculum nodes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
              />
            </div>

            {isCurriculumLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <span className="text-xs font-semibold">Updating curriculum and re-indexing mapped data...</span>
              </div>
            ) : subjectsList.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#e4e4e7] dark:border-[#27272a] rounded-2xl bg-slate-50/10">
                <p className="text-xs text-slate-500">No subjects found. Create your first subject to begin building the curriculum.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectsList
                  .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((sub) => {
                    const isSubExpanded = expandedSubjects.includes(sub.id || sub._id);
                    const subChapters = chaptersList.filter((ch) => ch.subject === sub.name);

                    return (
                      <div key={sub.id || sub._id} className="border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/20 shadow-sm">
                        {/* Subject Row */}
                        <div className="flex items-center justify-between p-4 bg-slate-50/55 dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-all">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                setExpandedSubjects(prev =>
                                  isSubExpanded
                                    ? prev.filter((id) => id !== (sub.id || sub._id))
                                    : [...prev, sub.id || sub._id]
                                );
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors text-slate-500"
                            >
                              {isSubExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{sub.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {subChapters.length} chapters mapped &bull; Code: {sub.id || sub._id}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1.5 relative">
                            <button
                              onClick={() => {
                                setEditItem(null);
                                setFormData({ name: '', subject: sub.name, description: '' });
                                setActiveTab('chapters');
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-600 rounded transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Add Chapter"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Chapter</span>
                            </button>

                            {/* Dropdown Menu (⋮) */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSubjectMenu(activeSubjectMenu === (sub.id || sub._id) ? null : (sub.id || sub._id));
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded transition-colors cursor-pointer flex items-center justify-center"
                                title="More Subject options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeSubjectMenu === (sub.id || sub._id) && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSubjectMenu(null);
                                    }}
                                  />
                                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-20 text-xs">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSubjectMenu(null);
                                        handleRenameCurriculumItem('subject', sub.id || sub._id, sub.name);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                      <Edit className="h-3.5 w-3.5 text-blue-500" />
                                      <span>Rename Subject</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSubjectMenu(null);
                                        setCurriculumAction({ type: 'merge', itemType: 'subject', item: sub });
                                        setCurriculumMergeTarget('');
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                      <Combine className="h-3.5 w-3.5 text-amber-500" />
                                      <span>Merge Subject</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSubjectMenu(null);
                                        handleDeleteCurriculumItem('subject', sub.id || sub._id, sub.name);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      <span>Delete Subject</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chapters under Subject */}
                        {isSubExpanded && (
                          <div className="border-t border-[#e4e4e7] dark:border-[#27272a] divide-y divide-slate-100 dark:divide-zinc-800/50 p-3 bg-slate-50/20 space-y-2">
                            {subChapters.length === 0 ? (
                              <p className="text-[11px] text-slate-400 pl-8 py-3 italic">No chapters mapped to this subject.</p>
                            ) : (
                              subChapters.map((ch) => {
                                const isChExpanded = expandedChapters.includes(ch.id || ch._id);
                                const chTopics = topicsList.filter((tp) => tp.chapterId === ch.id);

                                return (
                                  <div key={ch.id || ch._id} className="pl-6 py-2">
                                    <div className="flex items-center justify-between hover:bg-slate-100/40 p-2 rounded-xl transition-all">
                                      <div className="flex items-center space-x-2.5">
                                        <button
                                          onClick={() => {
                                            setExpandedChapters(prev =>
                                              isChExpanded
                                                ? prev.filter((id) => id !== (ch.id || ch._id))
                                                : [...prev, ch.id || ch._id]
                                            );
                                          }}
                                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors text-slate-500"
                                        >
                                          {isChExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                                        <div>
                                          <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">{ch.name}</span>
                                          <span className="text-[9px] text-slate-400 ml-2">({chTopics.length} topics)</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => handleRenameCurriculumItem('chapter', ch.id || ch._id, ch.name)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-blue-500 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Edit className="h-3 w-3" />
                                          <span>Rename</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setCurriculumAction({ type: 'move', itemType: 'chapter', item: ch });
                                            setCurriculumTargetParent('');
                                          }}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-indigo-500 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Move className="h-3 w-3" />
                                          <span>Move</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setCurriculumAction({ type: 'merge', itemType: 'chapter', item: ch });
                                            setCurriculumMergeTarget('');
                                          }}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-amber-500 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Combine className="h-3 w-3" />
                                          <span>Merge</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditItem(null);
                                            setFormData({ name: '', chapterId: ch.id, subject: sub.name, description: '' });
                                            setActiveTab('topics');
                                            setIsModalOpen(true);
                                          }}
                                          className="p-1 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-600 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Plus className="h-3 w-3" />
                                          <span>Add Topic</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteCurriculumItem('chapter', ch.id || ch._id, ch.name)}
                                          disabled={isCurriculumLoading}
                                          className={`p-1 rounded ${isCurriculumLoading ? 'opacity-50 cursor-not-allowed text-slate-300 dark:text-zinc-600' : 'text-slate-400 hover:text-red-500 cursor-pointer'}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Topics list under Chapter */}
                                    {isChExpanded && (
                                      <div className="pl-6 pt-1 pb-2 space-y-1 border-l-2 border-dashed border-slate-200 dark:border-zinc-800 ml-2 mt-1">
                                        {chTopics.length === 0 ? (
                                          <p className="text-[10px] text-slate-400 italic py-1 pl-4">No topics mapped to this chapter.</p>
                                        ) : (
                                          chTopics.map((tp) => (
                                            <div key={tp.id || tp._id} className="flex items-center justify-between p-1.5 hover:bg-slate-100/30 rounded-lg pl-4">
                                              <div className="flex items-center space-x-2">
                                                <HelpCircle className="h-3 w-3 text-slate-400" />
                                                <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">{tp.name}</span>
                                              </div>

                                              <div className="flex items-center space-x-1 relative">
                                                {/* Dropdown Menu (⋮) */}
                                                <div className="relative">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveTopicMenu(activeTopicMenu === (tp.id || tp._id) ? null : (tp.id || tp._id));
                                                    }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded transition-colors cursor-pointer flex items-center justify-center"
                                                    title="More Topic options"
                                                  >
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                  </button>

                                                  {activeTopicMenu === (tp.id || tp._id) && (
                                                    <>
                                                      <div 
                                                        className="fixed inset-0 z-10" 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setActiveTopicMenu(null);
                                                        }}
                                                      />
                                                      <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-20 text-[11px]">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTopicMenu(null);
                                                            handleRenameCurriculumItem('topic', tp.id || tp._id, tp.name);
                                                          }}
                                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                                                        >
                                                          <Edit className="h-3 w-3 text-blue-500" />
                                                          <span>Rename Topic</span>
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTopicMenu(null);
                                                            setCurriculumAction({ type: 'move', itemType: 'topic', item: tp });
                                                            setCurriculumTargetParent('');
                                                          }}
                                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                                                        >
                                                          <Move className="h-3 w-3 text-indigo-500" />
                                                          <span>Move to Chapter</span>
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTopicMenu(null);
                                                            setCurriculumAction({ type: 'merge', itemType: 'topic', item: tp });
                                                            setCurriculumMergeTarget('');
                                                          }}
                                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                                                        >
                                                          <Combine className="h-3 w-3 text-amber-500" />
                                                          <span>Merge Topic</span>
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTopicMenu(null);
                                                            handleDeleteCurriculumItem('topic', tp.id || tp._id, tp.name);
                                                          }}
                                                          className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                                        >
                                                          <Trash2 className="h-3 w-3 text-red-500" />
                                                          <span>Delete Topic</span>
                                                        </button>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ============ RECYCLE BIN / TRASH WORKSPACE ============ */}
        {activeTab === 'trash' && (
          <div className="space-y-6 text-left">
            <div className="bg-slate-50/55 dark:bg-zinc-900/10 p-5 border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recycle Bin / Curriculum Recovery</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Restore previously deleted subjects, chapters, or topics. Restoring a parent node will automatically re-link its downstream cascade trees securely.
              </p>
            </div>

            {isCurriculumLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <span className="text-xs font-semibold">Rebuilding indices and restoring links...</span>
              </div>
            ) : trashList.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 border border-dashed border-[#e4e4e7] dark:border-[#27272a] rounded-2xl bg-slate-50/10">
                <Trash2 className="h-8 w-8 text-slate-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Recycle Bin is empty.</p>
              </div>
            ) : (
              <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl overflow-x-auto bg-white dark:bg-zinc-900/20 shadow-sm">
                <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Node Type</th>
                      <th className="py-3 px-4">Deleted Node Name</th>
                      <th className="py-3 px-4">Deletion Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e4e7]/50 dark:divide-[#27272a]/50">
                    {trashList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/25">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.type === 'subject' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                            item.type === 'chapter' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
                            'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white block">{item.name}</span>
                          {item.originalData?.subject && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">Subject: {item.originalData.subject}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          {new Date(item.deletedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRestoreTrashItem(item.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-xl border border-emerald-100 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Restore Node</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ CURRICULUM ACTIONS POPUP (MOVE / MERGE) ============ */}
        {curriculumAction && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {curriculumAction.type} {curriculumAction.itemType}: "{curriculumAction.item.name}"
                </h3>
                <button
                  onClick={() => setCurriculumAction(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* MOVE OPERATION */}
              {curriculumAction.type === 'move' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Moving this {curriculumAction.itemType} will update all associated MCQ questions, study notes, and flashcard mappings instantly to maintain consistency.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Select Target {curriculumAction.itemType === 'chapter' ? 'Subject' : 'Chapter'}
                    </label>
                    <select
                      value={curriculumTargetParent}
                      onChange={(e) => setCurriculumTargetParent(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                    >
                      <option value="">-- Choose New Parent --</option>
                      {curriculumAction.itemType === 'chapter'
                        ? subjectsList.map((sub) => (
                            <option key={sub.id || sub._id} value={sub.name}>
                              {sub.name}
                            </option>
                          ))
                        : chaptersList.map((ch) => (
                            <option key={ch.id || ch._id} value={ch.id}>
                              {ch.name} ({ch.subject})
                            </option>
                          ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      onClick={() => setCurriculumAction(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleMoveCurriculumItem(curriculumAction.itemType as any, curriculumAction.item.id || curriculumAction.item._id, curriculumTargetParent)}
                      disabled={!curriculumTargetParent || isCurriculumLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCurriculumLoading ? 'Moving...' : 'Move Node'}
                    </button>
                  </div>
                </div>
              )}

              {/* MERGE OPERATION */}
              {curriculumAction.type === 'merge' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Merging this {curriculumAction.itemType} with another target node will transfer all child nodes, questions, notes, and flashcards to the target, then delete the source node.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Choose Destination {curriculumAction.itemType} (To Merge Into)
                    </label>
                    <select
                      value={curriculumMergeTarget}
                      onChange={(e) => setCurriculumMergeTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                    >
                      <option value="">-- Choose Target Node --</option>
                      {curriculumAction.itemType === 'subject'
                        ? subjectsList
                            .filter((s) => (s.id || s._id) !== (curriculumAction.item.id || curriculumAction.item._id))
                            .map((s) => (
                              <option key={s.id || s._id} value={s.id || s._id}>
                                {s.name}
                              </option>
                            ))
                        : curriculumAction.itemType === 'chapter'
                        ? chaptersList
                            .filter((ch) => (ch.id || ch._id) !== (curriculumAction.item.id || curriculumAction.item._id))
                            .map((ch) => (
                              <option key={ch.id || ch._id} value={ch.id || ch._id}>
                                {ch.name} ({ch.subject})
                              </option>
                            ))
                        : topicsList
                            .filter((tp) => (tp.id || tp._id) !== (curriculumAction.item.id || curriculumAction.item._id))
                            .map((tp) => (
                              <option key={tp.id || tp._id} value={tp.id || tp._id}>
                                {tp.name}
                              </option>
                            ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      onClick={() => setCurriculumAction(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleMergeCurriculumItem(curriculumAction.itemType, curriculumAction.item.id || curriculumAction.item._id, curriculumMergeTarget)}
                      disabled={!curriculumMergeTarget || isCurriculumLoading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-amber-700 disabled:opacity-50"
                    >
                      {isCurriculumLoading ? 'Merging...' : 'Merge Nodes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ STANDARD CRUD DATA LISTINGS ============ */}
        {activeTab !== 'ai-generator' && activeTab !== 'database' && activeTab !== 'statistics' && activeTab !== 'image-extractor' && activeTab !== 'subjects' && activeTab !== 'trash' && (
          <div className="flex-grow flex flex-col justify-between">
            {/* Search, Filter Area */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:border-[#18181b] dark:focus:border-white focus:outline-none"
                />
              </div>

              {/* Categorical Filtering Option */}
              {(activeTab === 'chapters' || activeTab === 'pdfs' || activeTab === 'notes' || activeTab === 'mcqs' || activeTab === 'tests' || activeTab === 'flashcards' || activeTab === 'videos' || activeTab === 'users' || activeTab === 'results') && (
                <div className="relative min-w-[140px]">
                  <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={subjectFilter}
                    onChange={(e) => {
                      setSubjectFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-[#18181b] dark:focus:border-white text-slate-600 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {activeTab === 'users' ? (
                      <>
                        <option value="student">Students</option>
                        <option value="admin">Admins</option>
                      </>
                    ) : (
                      <>
                        {subjectsList.map((s: any) => (
                          <option key={s.id || s.name} value={s.name}>{s.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'mcqs' && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Review Filter:</span>
                  <div className="inline-flex rounded-lg border border-[#e4e4e7] dark:border-[#27272a] p-0.5 bg-white dark:bg-zinc-950">
                    {(['all', 'approved', 'unapproved'] as const).map((filterVal) => (
                      <button
                        key={filterVal}
                        onClick={() => {
                          setApprovalFilter(filterVal);
                          setCurrentPage(1);
                          setSelectedMcqIds([]);
                        }}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                          approvalFilter === filterVal
                            ? 'bg-[#18181b] text-white dark:bg-white dark:text-[#18181b] shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        {filterVal}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedMcqIds.length > 0 && (
                  <div className="flex items-center space-x-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedMcqIds.length} Selected:</span>
                    <button
                      onClick={handleBulkApprove}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Bulk Approve</span>
                    </button>
                    <button
                      onClick={handleBulkReject}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="h-3 w-3" />
                      <span>Bulk Reject</span>
                    </button>
                    <button
                      onClick={() => setSelectedMcqIds([])}
                      className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content Table / Card view */}
            {isLoading ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <span className="text-xs font-semibold">Loading live MBBS content from Atlas...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 border border-dashed border-[#e4e4e7] dark:border-[#27272a] rounded-2xl bg-slate-50/10">
                <HelpCircle className="h-8 w-8 text-slate-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">No medical records matched your filters.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      {activeTab === 'mcqs' && (
                        <th className="py-3 px-2 w-8">
                          <input
                            type="checkbox"
                            checked={currentItems.length > 0 && currentItems.every(item => selectedMcqIds.includes(item._id || item.id))}
                            onChange={(e) => {
                              const ids = currentItems.map(item => item._id || item.id).filter(Boolean);
                              if (e.target.checked) {
                                setSelectedMcqIds(prev => Array.from(new Set([...prev, ...ids])));
                              } else {
                                setSelectedMcqIds(prev => prev.filter(id => !ids.includes(id)));
                              }
                            }}
                            className="rounded border-[#e4e4e7] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="py-3 px-2">Identifier</th>
                      <th className="py-3 px-2">Primary Details</th>
                      <th className="py-3 px-2">Metadata</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e4e7]/50 dark:divide-[#27272a]/50">
                    {activeTab === 'chapters' ? (
                      currentItems.map((item) => (
                        <tr key={item.id || item._id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/25">
                          <td className="py-3 px-2 font-mono text-[10px] text-slate-400 max-w-[80px] truncate">
                            {item.id || item._id}
                          </td>
                          <td className="py-3 px-2 max-w-[200px] truncate">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.description || 'No description provided.'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                {item.subject}
                              </span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                item.isActive !== false 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}>
                                {item.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 mt-1.5">
                              <span>Order: {item.displayOrder || 0}</span>
                              <div className="flex items-center border border-slate-200 dark:border-zinc-800 rounded ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleMoveChapter(item, 'up')}
                                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveChapter(item, 'down')}
                                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800 border-l border-slate-200 dark:border-zinc-800 text-slate-500 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                title="Edit Chapter"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Chapter"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : activeTab === 'mcqs' ? (
                      currentItems.map((item) => {
                        // Find any duplicate questions by comparing questions stems
                        const duplicates = dataList.filter(q => {
                          const itemId = item._id || item.id;
                          const qId = q._id || q.id;
                          return qId !== itemId && 
                            String(q.question || '').trim().toLowerCase() === String(item.question || '').trim().toLowerCase();
                        });
                        const hasDuplicate = duplicates.length > 0;
                        const isSelected = selectedMcqIds.includes(item._id || item.id);

                        return (
                          <tr key={item.id || item._id} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/25 ${isSelected ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}`}>
                            <td className="py-3 px-2 w-8">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const id = item._id || item.id;
                                  if (e.target.checked) {
                                    setSelectedMcqIds(prev => [...prev, id]);
                                  } else {
                                    setSelectedMcqIds(prev => prev.filter(i => i !== id));
                                  }
                                }}
                                className="rounded border-[#e4e4e7] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-2 font-mono text-[10px] text-slate-400 max-w-[80px] truncate">
                              {item.id || item._id}
                            </td>
                            <td className="py-3 px-2 max-w-[280px]">
                              <span className="font-semibold text-slate-900 dark:text-white block line-clamp-2 leading-relaxed">
                                {item.question}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-zinc-900 px-1 rounded">Key: {item.correctAnswer}</span>
                                {item.approved === false ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                                    Pending Review
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                    Approved
                                  </span>
                                )}
                                {item.confidenceScore !== undefined && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    item.confidenceScore >= 85
                                      ? 'bg-emerald-55/10 text-emerald-600 dark:text-emerald-400'
                                      : item.confidenceScore >= 70
                                        ? 'bg-blue-50/50 text-blue-600 dark:text-blue-400'
                                        : 'bg-rose-50/50 text-rose-600 dark:text-rose-400'
                                  }`}>
                                    Confidence: {item.confidenceScore}%
                                  </span>
                                )}
                                {item.isIncomplete && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50" title={Array.isArray(item.validationErrors) && item.validationErrors.length > 0 ? item.validationErrors.join(', ') : 'Incomplete/truncated question detected'}>
                                    Incomplete ⚠️
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                {item.subject || 'Pathology'}
                              </span>
                              {item.chapter && (
                                <span className="text-[10px] text-slate-500 font-medium block truncate mt-1">
                                  Ch: {item.chapter}
                                </span>
                              )}
                              {item.topic && (
                                <span className="text-[10px] text-slate-400 font-medium block truncate">
                                  Tp: {item.topic}
                                </span>
                              )}
                              {item.difficulty && (
                                <span className="text-[9px] font-bold block text-blue-600 dark:text-blue-400 mt-1">
                                  {item.difficulty}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-2">
                                {hasDuplicate && (
                                  <button
                                    onClick={() => handleMergeDuplicate(duplicates[0]._id || duplicates[0].id, item._id || item.id)}
                                    className="p-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 px-1.5 py-1 rounded border border-amber-200 dark:border-amber-900/50"
                                    title="Merge duplicate questions"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Merge Duplicate</span>
                                  </button>
                                )}
                                <div className="flex items-center space-x-1">
                                  {item.approved === false && (
                                    <button
                                      onClick={() => handleSingleApprove(item)}
                                      className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                      title="Approve & Publish MCQ"
                                    >
                                      <Check className="h-4.5 w-4.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                    title="Edit MCQ details / Move Chapter"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmItem(item)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                    title="Delete MCQ"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      currentItems.map((item) => (
                        <tr key={item.id || item._id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/25">
                          <td className="py-3 px-2 font-mono text-[10px] text-slate-400 max-w-[80px] truncate">
                            {item.id || item._id}
                          </td>
                          <td className="py-3 px-2 max-w-[200px] truncate">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {item.name || item.title || item.question || item.front || item.email}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.description || item.content || item.back || item.url}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                              {item.subject || item.category || item.role || 'Syllabus'}
                            </span>
                            {item.chapter && (
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-1">
                                Ch: {item.chapter}
                              </span>
                            )}
                            {item.score !== undefined && (
                              <span className="text-[10px] font-bold block text-emerald-600 mt-1">
                                Acc: {item.score}%
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end space-x-1">
                              {activeTab !== 'results' && (
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                  title="Edit Document"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
              <div className="border-t border-[#e4e4e7] dark:border-[#27272a] pt-4 mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)}-
                  {Math.min(filteredItems.length, currentPage * itemsPerPage)} of {filteredItems.length} records
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 border border-[#e4e4e7] dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 border border-[#e4e4e7] dark:border-[#27272a] hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================== */}
      {/* 4. MODALS (FORM ADD/EDIT)                     */}
      {/* ============================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {editItem ? 'Edit Existing' : 'Publish New'} {activeTab.slice(0, -1)}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                >
                  <X className="h-4.5 w-4.5 text-slate-400" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* 1. Subjects Fields */}
                {activeTab === 'subjects' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Pathology, Pharmacology, etc."
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Syllabus overview..."
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Icon Representation</label>
                      <input
                        type="text"
                        placeholder="BookOpen, Layers, etc."
                        value={formData.icon || ''}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* 2. Chapters Fields */}
                {activeTab === 'chapters' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Cell Adaptations, General Autonomic..."
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject Mappings</label>
                      <select
                        value={formData.subject || (subjectsList[0]?.name || 'Pathology')}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      >
                        {subjectsList.map((s: any) => (
                          <option key={s.id || s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Chapter summary details..."
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Display Order</label>
                        <input
                          type="number"
                          value={formData.displayOrder || 0}
                          onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive !== false}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="isActive" className="text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">Active Status</label>
                      </div>
                    </div>
                  </>
                )}

                {/* Topics Fields */}
                {activeTab === 'topics' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Acute Inflammation, Necrosis Mechanisms..."
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500 animate-fade-in"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Chapter</label>
                      <select
                        value={formData.chapterId || ''}
                        required
                        onChange={(e) => {
                          const selectedCh = chaptersList.find(ch => ch.id === e.target.value);
                          setFormData({ 
                            ...formData, 
                            chapterId: e.target.value,
                            subject: selectedCh ? selectedCh.subject : (formData.subject || subjectsList[0]?.name || 'Pathology')
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="" disabled>-- Select Chapter --</option>
                        {chaptersList.map((ch: any) => (
                          <option key={ch.id} value={ch.id}>{ch.name} ({ch.subject})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject Mappings</label>
                      <select
                        value={formData.subject || (subjectsList[0]?.name || 'Pathology')}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      >
                        {subjectsList.map((s: any) => (
                          <option key={s.id || s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Optional topic details..."
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                {/* 3. PDFs Fields */}
                {activeTab === 'pdfs' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PDF Title</label>
                        <input
                          type="text"
                          required
                          placeholder="Robbins Outline Chapter 1..."
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || (subjectsList[0]?.name || 'Pathology')}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        >
                          {subjectsList.map((s: any) => (
                            <option key={s.id || s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Mapping</label>
                        <input
                          type="text"
                          placeholder="Cell Adaptations..."
                          value={formData.chapter || ''}
                          onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic Mapping</label>
                        <input
                          type="text"
                          placeholder="Apoptosis Pathways..."
                          value={formData.topic || ''}
                          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">File Size</label>
                        <input
                          type="text"
                          value={formData.fileSize || ''}
                          onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pages Count</label>
                        <input
                          type="number"
                          value={formData.pagesCount || 10}
                          onChange={(e) => setFormData({ ...formData, pagesCount: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Book</label>
                        <input
                          type="text"
                          placeholder="Robbins Path"
                          value={formData.sourceBook || ''}
                          onChange={(e) => setFormData({ ...formData, sourceBook: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 4. Notes Fields */}
                {activeTab === 'notes' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note Title</label>
                        <input
                          type="text"
                          required
                          placeholder="E.g., Hypertrophy cellular tracks..."
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || 'Pathology'}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Clinical Outline Context (Textbook content)</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Write detailed high-yield clinical facts for board exams..."
                        value={formData.content || ''}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* 5. MCQs (Questions) Fields */}
                {activeTab === 'mcqs' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Body</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="A 45-year-old chronic alcoholic presents with severe epigastric pain..."
                        value={formData.question || ''}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-semibold">Multiple Options (Comma separated list string or edit individually)</label>
                      <input
                        type="text"
                        required
                        placeholder="Option A, Option B, Option C, Option D"
                        value={Array.isArray(formData.options) ? formData.options.join(', ') : formData.options || ''}
                        onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correct Answer Index</label>
                        <select
                          value={formData.correctAnswer !== undefined ? formData.correctAnswer : 0}
                          onChange={(e) => setFormData({ ...formData, correctAnswer: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value={0}>Index A (0)</option>
                          <option value={1}>Index B (1)</option>
                          <option value={2}>Index C (2)</option>
                          <option value={3}>Index D (3)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Difficulty</label>
                        <select
                          value={formData.difficulty || 'Medium'}
                          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Textbook Explanation Mechanisms</label>
                      <textarea
                        rows={2}
                        placeholder="Enter the mechanism of drug action/cell adaptation..."
                        value={formData.explanation || ''}
                        onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || 'Pathology'}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Type Style</label>
                        <select
                          value={formData.type || 'Single Best Answer'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Single Best Answer">Single Best Answer</option>
                          <option value="Clinical Scenario">Clinical Scenario</option>
                          <option value="Image-based MCQ">Image-based MCQ</option>
                          <option value="Multiple Correct Answers">Multiple Choice</option>
                          <option value="Assertion & Reason">Assertion & Reason</option>
                          <option value="Clinical Case Based">Clinical Case Based</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter</label>
                        <input
                          type="text"
                          placeholder="e.g. Inflammation"
                          value={formData.chapter || ''}
                          onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic</label>
                        <input
                          type="text"
                          placeholder="e.g. Acute Inflammation"
                          value={formData.topic || ''}
                          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subtopic</label>
                        <input
                          type="text"
                          placeholder="e.g. Mediators"
                          value={formData.subtopic || ''}
                          onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">System</label>
                        <input
                          type="text"
                          placeholder="e.g. Immune System"
                          value={formData.system || ''}
                          onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 6. Tests Fields */}
                {activeTab === 'tests' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Test Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Pathology Midterm, Cell Injury Practice Exam..."
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || 'Pathology'}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duration (Minutes)</label>
                        <input
                          type="number"
                          value={formData.durationMinutes || 30}
                          onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question IDs (Comma-separated string of IDs)</label>
                      <input
                        type="text"
                        placeholder="e.g. q-1, q-2, q-3"
                        value={formData.questions || ''}
                        onChange={(e) => setFormData({ ...formData, questions: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                  </>
                )}

                {/* 7. Announcements Fields */}
                {activeTab === 'announcements' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Announcement Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Final MBBS Examination Schedules..."
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Announcement Category</label>
                      <select
                        value={formData.category || 'General'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      >
                        <option value="General">General</option>
                        <option value="Exam">Exam Info</option>
                        <option value="Update">Update Alerts</option>
                        <option value="Schedule">Schedule / Lectures</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Content Body</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Important instructions to students..."
                        value={formData.content || ''}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="published"
                        checked={formData.published !== false}
                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="published" className="text-xs font-bold text-slate-700 dark:text-zinc-300">Publish Immediately to Live Board</label>
                    </div>
                  </>
                )}

                {/* 8. Flashcards Fields */}
                {activeTab === 'flashcards' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Front Question Side</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Front textbook query..."
                        value={formData.front || ''}
                        onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Back Answer Side</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Back study response..."
                        value={formData.back || ''}
                        onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || 'Pathology'}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Mappings</label>
                        <input
                          type="text"
                          placeholder="Autonomics..."
                          value={formData.chapter || ''}
                          onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 9. Videos Fields */}
                {activeTab === 'videos' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Video Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. Cell Apoptosis Masterclass..."
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Video Reference URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={formData.url || ''}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <select
                          value={formData.subject || 'Pathology'}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Mappings</label>
                        <input
                          type="text"
                          placeholder="Robbins Cell Path"
                          value={formData.chapter || ''}
                          onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duration String</label>
                        <input
                          type="text"
                          value={formData.duration || '15:00'}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 10. Users Fields */}
                {activeTab === 'users' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email ID</label>
                        <input
                          type="email"
                          required
                          disabled={!!editItem}
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Access Role Privilege</label>
                      <select
                        value={formData.role || 'student'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
                      >
                        <option value="student">Student Account</option>
                        <option value="admin">Administrator (Full Dashboard Access)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#e4e4e7] dark:border-[#27272a] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-700 text-slate-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#18181b] dark:bg-white text-white dark:text-[#18181b] hover:bg-black dark:hover:bg-slate-100 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editItem ? 'Save Changes' : 'Publish Document'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 5. MODAL (DELETE CONFIRMATION)                 */}
      {/* ============================================== */}
      <AnimatePresence>
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-sm shadow-xl p-6 text-left"
            >
              <div className="flex items-start space-x-3 text-red-500">
                <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-xl">
                  <Trash className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Live Record Confirmation</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to delete the record "{deleteConfirmItem.name || deleteConfirmItem.title || deleteConfirmItem.question || deleteConfirmItem.front || deleteConfirmItem.email}"?
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 rounded-xl text-[10px] text-rose-700 dark:text-rose-300">
                ⚠️ <strong>Crucial Alert:</strong> This action cannot be undone and will immediately sync removal to the live MongoDB Atlas cluster!
              </div>

              <div className="mt-5 flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-700 text-slate-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteItem}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <span>Delete Permanently</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 5B. MODAL (CURRICULUM DELETE WITH OPTIONS)     */}
      {/* ============================================== */}
      <AnimatePresence>
        {curriculumDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-md shadow-xl p-6 text-left"
            >
              <div className="flex items-start space-x-3 text-red-500">
                <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-xl">
                  <Trash className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    Delete {curriculumDeleteModal.itemType}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to delete this {curriculumDeleteModal.itemType}? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Curriculum Update Alert:</strong> Please choose how you want to handle existing questions and learning materials associated with the {curriculumDeleteModal.itemType} <strong>"{curriculumDeleteModal.name}"</strong>.
              </div>

              {/* Options selection */}
              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 p-3 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="deleteCascadeOption"
                    value="only"
                    checked={deleteCascadeOption === 'only'}
                    onChange={() => setDeleteCascadeOption('only')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-zinc-700"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">
                      {curriculumDeleteModal.itemType === 'subject'
                        ? 'Delete subject only (keep questions, move to "Uncategorized")'
                        : 'Delete topic only (keep questions uncategorized)'}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      {curriculumDeleteModal.itemType === 'subject'
                        ? 'Remove the subject record. Existing MCQs, notes, and other resources are kept safe and re-routed to the "Uncategorized" category.'
                        : 'Remove the topic record. All existing MCQs and resources are kept safe under the parent chapter but clear their topic categorization.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-red-100/40 dark:border-red-950/20 rounded-xl hover:bg-red-50/20 dark:hover:bg-red-950/5 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="deleteCascadeOption"
                    value="cascade"
                    checked={deleteCascadeOption === 'cascade'}
                    onChange={() => setDeleteCascadeOption('cascade')}
                    className="mt-1 text-red-600 focus:ring-red-500 border-slate-300 dark:border-zinc-700"
                  />
                  <div>
                    <span className="block text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      Delete and cascading purge everything (cascade delete)
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      {curriculumDeleteModal.itemType === 'subject'
                        ? 'Permanently delete this subject AND all its related chapters, topics, MCQs, flashcards, and notes. This cannot be reverted.'
                        : 'Permanently delete this topic AND all associated MCQs, notes, and materials under it. This cannot be reverted.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={isCurriculumLoading}
                  onClick={() => setCurriculumDeleteModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-700 text-slate-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCurriculumLoading}
                  onClick={executeCurriculumDeleteWithOptions}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isCurriculumLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Purging...</span>
                    </>
                  ) : (
                    <span>Confirm & Delete</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating high-polish modern Toast Notification block */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 animate-fade-in flex items-start gap-3">
          {toast.type === 'success' ? (
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Check className="h-4 w-4" />
            </div>
          ) : toast.type === 'error' ? (
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
              <HelpCircle className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white capitalize leading-none mb-1">{toast.type} Notification</p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal whitespace-pre-line break-words">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer shrink-0">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}
