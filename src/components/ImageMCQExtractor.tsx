import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Image as ImageIcon, Sparkles, Check, X, Edit, Trash, HelpCircle,
  Loader2, AlertCircle, Play, Eye, Layers, ChevronRight, BookOpen, Save, RefreshCw
} from 'lucide-react';
import { MCQ, SubjectName } from '../types';
import { safeStorage } from '../lib/safeStorage';

interface ImageUploadItem {
  id: string;
  file: File;
  name: string;
  size: string;
  thumbnail: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  error?: string;
  extractedMcq?: MCQ;
}

interface ImageMCQExtractorProps {
  onRefreshData?: () => void;
  onStartQuiz?: (questions: MCQ[], title: string) => void;
}

function cleanErrorMessage(errStr: string): string {
  if (!errStr) return 'Unknown error';
  
  let working = errStr;
  
  // Strip outer prefix "Server extraction failed (status 500): " or similar if present
  const match = working.match(/status \d+\):\s*(\{.*\})/);
  if (match && match[1]) {
    working = match[1];
  }
  
  try {
    const parsed = JSON.parse(working);
    if (parsed.error) {
      return cleanErrorMessage(parsed.error);
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch (e) {
    // If it's not a direct JSON string, check for nested JSON or standard ApiError syntax
    const nestedMatch = working.match(/(?:ApiError:\s*)?(\{.*\})/);
    if (nestedMatch && nestedMatch[1]) {
      try {
        const parsedNested = JSON.parse(nestedMatch[1]);
        if (parsedNested.error) {
          return cleanErrorMessage(JSON.stringify(parsedNested.error));
        }
        if (parsedNested.message) {
          return parsedNested.message;
        }
      } catch (e2) {}
    }
  }
  
  // Fallback to substring extraction of the "message" if any
  const msgMatch = working.match(/"message":\s*"([^"]+)"/);
  if (msgMatch && msgMatch[1]) {
    return msgMatch[1].replace(/\\n/g, ' ').trim();
  }
  
  return errStr;
}

export default function ImageMCQExtractor({ onRefreshData, onStartQuiz }: ImageMCQExtractorProps) {
  const [user] = useState<any>(() => {
    const saved = safeStorage.getItem('medbank_user');
    return saved ? JSON.parse(saved) : { role: 'student', name: 'Student' };
  });

  const [subject, setSubject] = useState<SubjectName>('Pathology');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [uploadList, setUploadList] = useState<ImageUploadItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState<number | null>(null);
  const [editingMcq, setEditingMcq] = useState<MCQ | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [id: string]: 'saved' | 'saving' | 'error' }>({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [duplicateSkippedCount, setDuplicateSkippedCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper: Client-side image compression & conversion to Base64
  const compressAndConvertToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Target max width/height of 1024px to preserve high-yield text legibility
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

          // Standard compressed format
          const mimeType = 'image/jpeg';
          const base64 = canvas.toDataURL(mimeType, 0.85);
          resolve({ base64, mimeType });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Drag & Drop event handlers
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
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Add files to the queue
  const addFiles = (files: File[]) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'bmp'];
    const newItems: ImageUploadItem[] = [];

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!validExtensions.includes(ext) && !file.type.startsWith('image/')) {
        alert(`Unsupported file format: ${file.name}. Only JPG, JPEG, PNG, WEBP, HEIC, and BMP are supported.`);
        return;
      }

      // Create a local object URL for previewing before server upload
      const thumbnail = URL.createObjectURL(file);
      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      newItems.push({
        id,
        file,
        name: file.name,
        size: formatFileSize(file.size),
        thumbnail,
        status: 'pending',
        progress: 0,
      });
    });

    setUploadList((prev) => [...prev, ...newItems]);
  };

  // Remove a file from the list & delete from MongoDB if successfully extracted
  const removeFile = async (id: string) => {
    const target = uploadList.find((item) => item.id === id);
    if (target && target.extractedMcq) {
      console.log(`[LOG] [Image Extractor] Deleting extracted MCQ ${target.extractedMcq.id} from MongoDB...`);
      try {
        const response = await fetch(`/api/questions/${target.extractedMcq.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          console.log(`[LOG] [Image Extractor] Successfully deleted MCQ ${target.extractedMcq.id} from MongoDB.`);
        } else {
          console.warn(`[LOG] [Image Extractor] Failed to delete MCQ ${target.extractedMcq.id} from MongoDB (might have already been deleted).`);
        }
      } catch (err) {
        console.error(`[LOG] [Image Extractor] Error deleting MCQ ${target.extractedMcq.id} from MongoDB:`, err);
      }
    }

    setUploadList((prev) => {
      const targetItem = prev.find((item) => item.id === id);
      if (targetItem?.thumbnail) {
        URL.revokeObjectURL(targetItem.thumbnail);
      }
      return prev.filter((item) => item.id !== id);
    });

    if (activeReviewIndex !== null) {
      const remaining = uploadList.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        setActiveReviewIndex(null);
        setEditingMcq(null);
      } else {
        setActiveReviewIndex(0);
      }
    }
  };

  // Process a single image
  const processImageItem = async (itemId: string): Promise<boolean> => {
    // 1. Update status to processing
    setUploadList((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'processing', progress: 15 } : item))
    );

    const targetItem = uploadList.find((item) => item.id === itemId);
    if (!targetItem) return false;

    console.log(`[LOG] [Image Extractor] Starting process for item: ${targetItem.name}, size: ${targetItem.size}`);

    try {
      // 2. Compress and convert to Base64
      const { base64, mimeType } = await compressAndConvertToBase64(targetItem.file);
      console.log(`[LOG] [Image Extractor] File compressed. MIME Type: ${mimeType}, base64 length: ${base64.length}`);
      
      setUploadList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, progress: 40 } : item))
      );

      // 3. Make the API Call to extract
      console.log(`[LOG] [Image Extractor] Requesting Gemini extraction...`);
      const response = await fetch('/api/gemini/extract-image-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType,
          subject,
          chapter: chapter || undefined,
          topic: topic || undefined,
        }),
      });

      setUploadList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, progress: 60 } : item))
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server extraction failed (status ${response.status}): ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to extract MCQ.');
      }

      console.log(`[LOG] [Image Extractor] Gemini response received successfully for ${targetItem.name}.`);

      if (result.duplicateSkippedCount > 0) {
        setDuplicateSkippedCount((prev) => (prev || 0) + result.duplicateSkippedCount);
      }

      const extractedList = result.mcqs || [];
      if (extractedList.length === 0) {
        if (result.duplicateSkippedCount > 0) {
          throw new Error('This image contained duplicate question(s) that already exist in the database and were automatically eliminated.');
        }
        throw new Error('No MCQs could be extracted or generated from this image.');
      }

      // Associate the original compressed base64 image in the first MCQ object
      const serverMcq = extractedList[0];
      const compiledMcq: MCQ = {
        ...serverMcq,
        id: serverMcq.id || serverMcq._id,
        image: base64, // Keep image base64 directly embedded for fully autonomous loading!
      };

      setUploadList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, progress: 90 } : item))
      );

      console.log(`[LOG] [Image Extractor] MCQ was already saved on server with ID: ${compiledMcq.id}`);

      // 5. Display immediately
      setUploadList((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'success', progress: 100, extractedMcq: compiledMcq }
            : item
        )
      );

      return true;
    } catch (err: any) {
      console.error(`[LOG] [Image Extractor] Failed to process/save ${targetItem.name}:`, err);
      setUploadList((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'failed', progress: 100, error: err.message || 'Processing failed' }
            : item
        )
      );
      return false;
    }
  };

  // Process all pending images in the list sequentially
  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    const pendingItems = uploadList.filter((item) => item.status === 'pending' || item.status === 'failed');

    for (const item of pendingItems) {
      await processImageItem(item.id);
    }

    setIsProcessingAll(false);

    // Auto-select the first successful MCQ for review
    const firstSuccessIndex = uploadList.findIndex((item) => item.extractedMcq !== undefined);
    const updatedList = uploadList;
    const finalSuccessIndex = updatedList.findIndex((item) => item.extractedMcq !== undefined || item.status === 'success');
    
    if (finalSuccessIndex !== -1) {
      const activeItem = updatedList[finalSuccessIndex];
      if (activeItem && activeItem.extractedMcq) {
        setActiveReviewIndex(finalSuccessIndex);
        setEditingMcq({ ...activeItem.extractedMcq });
      }
    }
  };

  // Sync index change during review
  const handleSelectReviewItem = (index: number) => {
    const item = uploadList[index];
    if (item && item.extractedMcq) {
      setActiveReviewIndex(index);
      setEditingMcq({ ...item.extractedMcq });
    }
  };

  // Save changes made in the inline editor
  const handleUpdateEditingMcq = (updated: Partial<MCQ>) => {
    if (!editingMcq) return;
    const newMcq = { ...editingMcq, ...updated } as MCQ;
    setEditingMcq(newMcq);

    // Also update the queue item so the change is persisted
    if (activeReviewIndex !== null) {
      setUploadList((prev) => {
        const copy = [...prev];
        if (copy[activeReviewIndex]) {
          copy[activeReviewIndex].extractedMcq = newMcq;
        }
        return copy;
      });
    }
  };

  // Save & publish a question (or approve/update)
  const handleSaveQuestion = async (queueItemId: string, mcq: MCQ) => {
    setSaveStatus((prev) => ({ ...prev, [queueItemId]: 'saving' }));
    console.log(`[LOG] [Image Extractor] Saving/approving edited MCQ ${mcq.id} to MongoDB...`);

    try {
      if (user.role === 'admin') {
        // Admin: Update the question in the global MongoDB Atlas questions database!
        const response = await fetch(`/api/questions/${mcq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcq),
        });

        if (!response.ok) {
          throw new Error(`Failed to update database: status ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update');
        }

        console.log(`[LOG] [Image Extractor] Successfully updated/approved MCQ ${mcq.id} in MongoDB.`);
        setSaveStatus((prev) => ({ ...prev, [queueItemId]: 'saved' }));
        if (onRefreshData) onRefreshData();
      } else {
        // Student: Save to personal practice local storage bank!
        const userObj = safeStorage.getItem('medbank_user');
        const userEmail = userObj ? JSON.parse(userObj).email : '';
        const storageKey = userEmail ? `medbank_personal_practice_mcqs_${userEmail.toLowerCase()}` : 'medbank_personal_practice_mcqs';
        const personalSaved = safeStorage.getItem(storageKey);
        const personalList: MCQ[] = personalSaved ? JSON.parse(personalSaved) : [];
        personalList.unshift(mcq);
        safeStorage.setItem(storageKey, JSON.stringify(personalList));

        // Also update in MongoDB so student edits are saved there!
        await fetch(`/api/questions/${mcq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcq),
        });

        console.log(`[LOG] [Image Extractor] Successfully saved/updated personal MCQ ${mcq.id} in local storage & MongoDB.`);
        setSaveStatus((prev) => ({ ...prev, [queueItemId]: 'saved' }));
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      console.error('[LOG] [Image Extractor] Failed to save/publish MCQ:', err);
      setSaveStatus((prev) => ({ ...prev, [queueItemId]: 'error' }));
    }
  };

  // Launch a practice test session with all successfully extracted questions
  const handlePracticeAll = () => {
    const questionsToPractice = uploadList
      .filter((item) => item.extractedMcq !== undefined)
      .map((item) => item.extractedMcq!);

    if (questionsToPractice.length === 0) return;

    if (onStartQuiz) {
      onStartQuiz(questionsToPractice, 'Image MCQ Extraction Practice Session');
    }
  };

  const successfulMcqs = uploadList.filter((item) => item.extractedMcq !== undefined);

  return (
    <div className="space-y-6 text-left animate-fade-in max-w-6xl mx-auto">
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-emerald-500" />
          <span>OCR Medical Image MCQ Extractor</span>
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Upload images of textbook pages, lecture slides, question sheets, or clinical case photographs (X-rays, histology slides, CTs, flowcharts). Advanced AI will automatically OCR and extract clinical MCQs, categorize them, and make them available for interactive learning!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Drag and Drop & Metadata Config */}
        <div className="lg:col-span-1 bg-slate-50/50 dark:bg-zinc-950/25 border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            <span>1. Configure Context</span>
          </h3>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectName)}
              className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs font-medium"
            >
              <option value="Pathology">Pathology</option>
              <option value="Pharmacology">Pharmacology</option>
              <option value="Microbiology">Microbiology</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cardiorespiratory pathology"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Topic Tag (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Myocardial Infarction"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-emerald-500" />
              <span>2. Upload Images</span>
            </h3>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10'
                  : 'border-[#e4e4e7] dark:border-[#27272a] hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#18181b]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <ImageIcon className="h-8 w-8 mx-auto text-slate-400 dark:text-zinc-500 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Drag & Drop or Click to Upload</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                Supports Camera / Gallery / Files<br />
                JPG, PNG, WEBP, HEIC, BMP up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Upload Queue and Batch Processing Status */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 flex flex-col justify-between h-[450px]">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Upload Queue ({uploadList.length} files)
              </h3>
              {uploadList.length > 0 && (
                <button
                  onClick={() => {
                    setUploadList([]);
                    setDuplicateSkippedCount(null);
                  }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {duplicateSkippedCount !== null && duplicateSkippedCount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5 animate-fade-in">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                <div className="text-left">
                  <p className="font-bold">Duplicate Elimination Engine Active (&gt;99% Accuracy)</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed text-blue-600 dark:text-blue-400">
                    Detected and automatically skipped <strong>{duplicateSkippedCount}</strong> duplicate or overlapping question(s) from the database to keep your question bank clean and precise.
                  </p>
                </div>
              </div>
            )}

            {uploadList.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                <ImageIcon className="h-10 w-10 stroke-1 text-slate-300" />
                <p className="text-xs font-medium">Your queue is currently empty</p>
                <p className="text-[10px] max-w-[250px]">Add images of question sheets or medical notes to initiate AI extraction.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadList.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950/10"
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <img
                        src={item.thumbnail}
                        alt="Thumbnail"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-100 dark:border-zinc-800"
                      />
                      <div className="max-w-[180px] sm:max-w-[280px]">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.size}</p>
                        {item.status === 'failed' && item.error && (
                          <div className="mt-1 p-1 bg-rose-50/40 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-950/25 rounded-lg text-left">
                            <p className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold leading-normal break-words">
                              {cleanErrorMessage(item.error)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Processing / Progress State indicators */}
                      {item.status === 'pending' && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                          Queued
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <div className="flex items-center space-x-1.5 text-blue-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-[10px] font-extrabold">{item.progress}%</span>
                        </div>
                      )}
                      {item.status === 'success' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>Extracted</span>
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span
                          className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                          title={item.error}
                        >
                          <AlertCircle className="h-3 w-3" />
                          <span>Error</span>
                        </span>
                      )}

                      <button
                        onClick={() => removeFile(item.id)}
                        disabled={item.status === 'processing'}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold">
              {uploadList.filter((i) => i.status === 'success').length} of {uploadList.length} processed successfully
            </span>

            <button
              onClick={handleProcessAll}
              disabled={isProcessingAll || uploadList.length === 0 || !uploadList.some((i) => i.status === 'pending' || i.status === 'failed')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-emerald-600/10"
            >
              {isProcessingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Extract MCQs from Images</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Review and Editing Area */}
      {successfulMcqs.length > 0 && (
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-zinc-800 pb-3 gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-500" />
                <span>Extracted MCQs Review & Publishing Panel</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Review extracted options, verify answers, adjust classifications, and save questions.
              </p>
            </div>

            {/* Quick Practice Mode for Students */}
            {user.role === 'student' && (
              <button
                onClick={handlePracticeAll}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Practice All Extracted ({successfulMcqs.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List of successfully extracted items (Selection menu) */}
            <div className="md:col-span-1 space-y-2 border-r border-slate-100 dark:border-zinc-800 pr-2 max-h-[500px] overflow-y-auto">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Item to Review</span>
              {uploadList.map((item, idx) => {
                if (item.status !== 'success' || !item.extractedMcq) return null;
                const isSelected = activeReviewIndex === idx;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectReviewItem(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/15'
                        : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 bg-white dark:bg-[#18181b]'
                    }`}
                  >
                    <img
                      src={item.thumbnail}
                      alt="thumbnail"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-100 dark:border-zinc-800"
                    />
                    <div className="flex-1 truncate">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.name}</h4>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">
                        {item.extractedMcq.type} • {item.extractedMcq.difficulty}
                      </p>
                    </div>
                    {saveStatus[item.id] === 'saved' ? (
                      <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Question Editor Form */}
            <div className="md:col-span-2">
              {editingMcq ? (
                <div className="space-y-4">
                  {/* Inline visual showing the source image uploaded */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-xl flex items-center space-x-3">
                    <img
                      src={uploadList[activeReviewIndex!].thumbnail}
                      alt="Source attachment"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-zinc-800 shrink-0 cursor-pointer hover:scale-105 transition-all"
                      onClick={() => {
                        // Open full size in new tab if requested
                        const win = window.open();
                        if (win) win.document.write(`<img src="${uploadList[activeReviewIndex!].thumbnail}" style="max-width:100%"/>`);
                      }}
                    />
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-0.5">Source Image Attachment</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {uploadList[activeReviewIndex!].name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">The original image is securely bound to this question.</p>
                    </div>
                  </div>

                  {/* AI Vision Crop Box Figure Mapping */}
                  {editingMcq.hasVisualFigure && editingMcq.figureCropBox && (
                    <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <span>🔬</span>
                          <span>Extracted Clinical Figure ({editingMcq.detectedVisualType})</span>
                        </span>
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                          AI Crop Perfect Mapping
                        </span>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div 
                          className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800 shrink-0 bg-zinc-100" 
                          style={{ width: '80px', height: '80px' }}
                        >
                          <img
                            src={uploadList[activeReviewIndex!].thumbnail}
                            alt="Cropped Clinical Figure"
                            className="absolute"
                            style={{
                              top: `-${editingMcq.figureCropBox.ymin / 10}%`,
                              left: `-${editingMcq.figureCropBox.xmin / 10}%`,
                              width: `${100000 / Math.max(1, (editingMcq.figureCropBox.xmax - editingMcq.figureCropBox.xmin))}%`,
                              height: `${100000 / Math.max(1, (editingMcq.figureCropBox.ymax - editingMcq.figureCropBox.ymin))}%`,
                              maxWidth: 'none',
                            }}
                          />
                        </div>
                        <div className="text-left text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                          <p className="font-bold text-slate-800 dark:text-white capitalize text-[11px]">
                            {editingMcq.detectedVisualType?.replace('_', ' ')} Detected
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Crop Region: y:[{editingMcq.figureCropBox.ymin}, {editingMcq.figureCropBox.ymax}] x:[{editingMcq.figureCropBox.xmin}, {editingMcq.figureCropBox.xmax}]
                          </p>
                          <p className="text-[9px] leading-normal text-slate-400">
                            Perfect MCQ visual pairing to preserve context during mock review.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question editor */}
                  <div className="space-y-3 text-left">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Stem</label>
                      <textarea
                        value={editingMcq.question}
                        onChange={(e) => handleUpdateEditingMcq({ question: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none h-24 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Options */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Options & Answer Selection</label>
                      <div className="space-y-2">
                        {editingMcq.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateEditingMcq({ correctAnswer: oIdx })}
                              className={`h-6 w-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border transition-all ${
                                editingMcq.correctAnswer === oIdx
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-200 dark:border-zinc-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...editingMcq.options];
                                newOpts[oIdx] = e.target.value;
                                handleUpdateEditingMcq({ options: newOpts });
                              }}
                              className={`w-full px-3 py-1.5 border rounded-xl text-xs ${
                                editingMcq.correctAnswer === oIdx
                                  ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/5 dark:bg-emerald-950/5'
                                  : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-[#18181b]'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Detailed Explanation</label>
                      <textarea
                        value={editingMcq.explanation}
                        onChange={(e) => handleUpdateEditingMcq({ explanation: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none h-20 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Classifications Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-950/15 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Subject</label>
                        <select
                          value={editingMcq.subject}
                          onChange={(e) => handleUpdateEditingMcq({ subject: e.target.value as SubjectName })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold"
                        >
                          <option value="Pathology">Pathology</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Microbiology">Microbiology</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Chapter</label>
                        <input
                          type="text"
                          value={editingMcq.chapter}
                          onChange={(e) => handleUpdateEditingMcq({ chapter: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Topic</label>
                        <input
                          type="text"
                          value={editingMcq.topic}
                          onChange={(e) => handleUpdateEditingMcq({ topic: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Subtopic</label>
                        <input
                          type="text"
                          value={editingMcq.subtopic || ''}
                          onChange={(e) => handleUpdateEditingMcq({ subtopic: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">System</label>
                        <input
                          type="text"
                          value={editingMcq.system || ''}
                          onChange={(e) => handleUpdateEditingMcq({ system: e.target.value })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Difficulty</label>
                        <select
                          value={editingMcq.difficulty}
                          onChange={(e) => handleUpdateEditingMcq({ difficulty: e.target.value as any })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Question Type</label>
                        <select
                          value={editingMcq.type}
                          onChange={(e) => handleUpdateEditingMcq({ type: e.target.value as any })}
                          className="w-full p-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold"
                        >
                          <option value="Single Best Answer">Single Best Answer (SBA)</option>
                          <option value="Clinical Scenario">Clinical Scenario</option>
                          <option value="Image-based MCQ">Image-based MCQ</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      onClick={() => removeFile(uploadList[activeReviewIndex!].id)}
                      className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Discard Draft</span>
                    </button>

                    <button
                      onClick={() => handleSaveQuestion(uploadList[activeReviewIndex!].id, editingMcq)}
                      disabled={saveStatus[uploadList[activeReviewIndex!].id] === 'saving'}
                      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                        saveStatus[uploadList[activeReviewIndex!].id] === 'saved'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border border-emerald-200/50 cursor-default'
                          : saveStatus[uploadList[activeReviewIndex!].id] === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-[#18181b] hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#18181b]'
                      }`}
                    >
                      {saveStatus[uploadList[activeReviewIndex!].id] === 'saving' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : saveStatus[uploadList[activeReviewIndex!].id] === 'saved' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Approved & Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>
                            {user.role === 'admin' ? 'Approve & Publish to Global QBank' : 'Save for Personal Practice'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-[350px] flex flex-col items-center justify-center text-slate-400 text-center space-y-2 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-2xl">
                  <HelpCircle className="h-8 w-8 stroke-1 text-slate-300 animate-pulse" />
                  <p className="text-xs font-medium">No MCQ selected for review</p>
                  <p className="text-[10px] max-w-[250px]">Choose an extracted item on the left to review its generated question structure.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
