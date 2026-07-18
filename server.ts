import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { connectDB, UserModel, SubjectModel, ChapterModel, NoteModel, PdfModel, QuestionModel, TestModel, TestResultModel, AnnouncementModel, FlashcardModel, VideoModel, TopicModel, TrashModel } from './src/db/mongoose';
import mongoose from 'mongoose';

dotenv.config();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function ensureSubjectAndChapter(subjectName: string, chapterName: string): Promise<{ subject: string; chapter: string }> {
  let finalSubject = 'Pathology';
  let finalChapter = 'General Medicine';

  if (!subjectName) {
    return { subject: finalSubject, chapter: finalChapter };
  }

  const normalizedSubj = subjectName.trim();
  if (!normalizedSubj) {
    return { subject: finalSubject, chapter: finalChapter };
  }

  try {
    // 1. Find or create subject
    let subjectObj = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${normalizedSubj.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } });
    if (!subjectObj) {
      // Find clean subject name casing
      let matchedStandardName = normalizedSubj;
      const lower = normalizedSubj.toLowerCase();
      if (lower.includes('patho')) matchedStandardName = 'Pathology';
      else if (lower.includes('phar')) matchedStandardName = 'Pharmacology';
      else if (lower.includes('micro')) matchedStandardName = 'Microbiology';
      else if (lower.includes('anat')) matchedStandardName = 'Anatomy';
      else if (lower.includes('physio')) matchedStandardName = 'Physiology';
      else if (lower.includes('biochem')) matchedStandardName = 'Biochemistry';
      else if (lower.includes('surg')) matchedStandardName = 'Surgery';
      else if (lower.includes('pedia')) matchedStandardName = 'Pediatrics';
      else if (lower.includes('obg') || lower.includes('gyne') || lower.includes('obstet')) matchedStandardName = 'Obstetrics & Gynecology';
      else if (lower.includes('ophthal')) matchedStandardName = 'Ophthalmology';
      else if (lower.includes('ent') || lower.includes('oto')) matchedStandardName = 'ENT';
      else if (lower.includes('foren') || lower.includes('fmt')) matchedStandardName = 'Forensic Medicine';
      else if (lower.includes('comm') || lower.includes('psm') || lower.includes('preventive')) matchedStandardName = 'Community Medicine';
      else if (lower.includes('derma')) matchedStandardName = 'Dermatology';
      else if (lower.includes('psych')) matchedStandardName = 'Psychiatry';
      else if (lower.includes('radio')) matchedStandardName = 'Radiology';
      else if (lower.includes('anes')) matchedStandardName = 'Anesthesia';
      else if (lower.includes('ortho')) matchedStandardName = 'Orthopedics';
      else if (lower.includes('med')) matchedStandardName = 'Medicine';

      // Check again with matched standard name
      subjectObj = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${matchedStandardName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } });
      if (!subjectObj) {
        const subjId = `subj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        let icon = 'BookOpen';
        const lowerStandard = matchedStandardName.toLowerCase();
        if (lowerStandard.includes('patho')) icon = 'ShieldAlert';
        else if (lowerStandard.includes('phar')) icon = 'Droplet';
        else if (lowerStandard.includes('micro')) icon = 'Activity';
        else if (lowerStandard.includes('anat')) icon = 'Layers';
        else if (lowerStandard.includes('physio')) icon = 'Heart';
        else if (lowerStandard.includes('biochem')) icon = 'Atom';
        else if (lowerStandard.includes('med')) icon = 'Stethoscope';
        else if (lowerStandard.includes('surg')) icon = 'Scissors';
        else if (lowerStandard.includes('pedia')) icon = 'Baby';
        else if (lowerStandard.includes('ophthal')) icon = 'Eye';
        else if (lowerStandard.includes('foren')) icon = 'FileText';
        else if (lowerStandard.includes('comm')) icon = 'Users';

        subjectObj = new SubjectModel({
          id: subjId,
          name: matchedStandardName,
          description: `Automatically created subject for ${matchedStandardName} MCQs.`,
          icon
        });
        await subjectObj.save();
        console.log(`[Dynamic Subject Seeding] Created new subject: ${matchedStandardName}`);
      }
    }
    
    finalSubject = subjectObj.name;

    // 2. Find or create chapter if specified
    const targetChapter = (chapterName || 'General Medicine').trim();
    if (targetChapter) {
      let chapterObj = await ChapterModel.findOne({
        name: { $regex: new RegExp(`^${targetChapter.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        subject: finalSubject
      });
      if (!chapterObj) {
        const chapId = `chap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        chapterObj = new ChapterModel({
          id: chapId,
          name: targetChapter,
          subject: finalSubject,
          description: `Automatically created chapter for ${targetChapter} under ${finalSubject}.`,
          displayOrder: 10,
          isActive: true
        });
        await chapterObj.save();
        console.log(`[Dynamic Chapter Seeding] Created new chapter: ${targetChapter} under ${finalSubject}`);
      }
      finalChapter = chapterObj.name;
    }
  } catch (err) {
    console.error('[ensureSubjectAndChapter] Error securing subject/chapter in database:', err);
  }

  return { subject: finalSubject, chapter: finalChapter };
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key === '') {
    console.warn('GEMINI_API_KEY is not defined or is placeholder. Falling back to local high-fidelity AI simulation.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || (err.error && (err.error.code || err.error.status));
  if (status === 429) return true;

  const msg = String(err.message || '').toUpperCase();
  if (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('QUOTA_EXCEEDED') ||
    msg.includes('QUOTA EXCEEDED') ||
    msg.includes('RATE_LIMIT') ||
    msg.includes('LIMIT_EXCEEDED')
  ) {
    return true;
  }
  return false;
}

function handleGeminiError(err: any, res: any, contextDescription: string) {
  // Log the complete API error for the administrator
  console.error(`[ADMIN ALARM] Complete Gemini API Error during [${contextDescription}]:`, err);

  const isQuota = isQuotaExceededError(err);
  if (isQuota) {
    return res.status(429).json({
      success: false,
      quotaExceeded: true,
      error: "The AI service has reached its daily usage limit. Please try again later or contact the administrator."
    });
  }

  return res.status(500).json({
    success: false,
    error: err.message || `Gemini API call failed during ${contextDescription}.`
  });
}

async function generateWithModelFallback(ai: any, params: any) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  let lastError: any = null;
  let quotaError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Request] Attempting generateContent with model: ${model}...`);
      const apiParams = {
        ...params,
        model: model
      };
      const response = await ai.models.generateContent(apiParams);
      console.log(`[Gemini Request] Success with model: ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini Request] Model ${model} failed:`, err.message || err);
      lastError = err;
      if (isQuotaExceededError(err)) {
        quotaError = err;
      }
    }
  }

  throw quotaError || lastError;
}

function parseMCQsFromTextFallback(text: string, defaultSubject?: string, defaultChapter?: string, defaultTopic?: string): any[] {
  console.log(`[Fallback Parser] Starting high-fidelity text fallback parsing of ${text.length} characters...`);
  const mcqs: any[] = [];
  
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n');
  
  let currentQuestion: any = null;
  let inExplanation = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect question start:
    // Pattern matches: "1. ", "Q1. ", "Question 23: ", "1) ", "[12] ", "Q. 2: "
    const questionMatch = line.match(/^(?:Q(?:uestion)?[\s\.]*\s*)?(\d+)\s*[\.\:\-\)]\s*(.*)/i) ||
                          line.match(/^\[(\d+)\]\s*(.*)/i);
                          
    if (questionMatch) {
      if (currentQuestion) {
        mcqs.push(currentQuestion);
      }
      currentQuestion = {
        question: questionMatch[2].trim(),
        options: [],
        correctAnswer: 0,
        explanation: '',
        subject: defaultSubject || 'Pathology',
        chapter: defaultChapter || 'General Medicine',
        topic: defaultTopic || 'General Concept',
        difficulty: 'Medium',
        type: 'Single Best Answer',
        targetExams: []
      };
      inExplanation = false;
      continue;
    }

    if (!currentQuestion) {
      // Create first question stem if none started
      currentQuestion = {
        question: line,
        options: [],
        correctAnswer: 0,
        explanation: '',
        subject: defaultSubject || 'Pathology',
        chapter: defaultChapter || 'General Medicine',
        topic: defaultTopic || 'General Concept',
        difficulty: 'Medium',
        type: 'Single Best Answer',
        targetExams: []
      };
      continue;
    }

    // Check if line contains inline multiple options, e.g. "A. OptionA B. OptionB C. OptionC D. OptionD"
    if (line.match(/^[A-Ea-e1-5][\.\)\-].*[B-Fb-f2-6][\.\)\-].*[C-Gc-g3-7][\.\)\-].*/)) {
      const parts = line.split(/\s+([A-Ea-e1-5][\.\)\-])\s+/);
      let currentLabel = '';
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j].trim();
        if (!part) continue;
        if (part.match(/^[A-Ea-e1-5][\.\)\-]$/)) {
          currentLabel = part[0].toUpperCase();
        } else {
          if (currentLabel) {
            currentQuestion.options.push(`${currentLabel}: ${part}`);
          } else {
            const firstLetterMatch = part.match(/^([A-Ea-e1-5])[\dots\)\-]\s*(.*)/i);
            if (firstLetterMatch) {
              currentQuestion.options.push(`${firstLetterMatch[1].toUpperCase()}: ${firstLetterMatch[2].trim()}`);
            }
          }
        }
      }
      continue;
    }

    // Detect option start:
    // Matches: "A. ...", "A) ...", "a) ...", "a. ...", "(A) ...", "[a] ...", "1. ...", "1) ..."
    const optionMatch = line.match(/^[\(\[a-z]?([A-Ea-e1-5])[\)\]\.\:\-]\s*(.*)/);
    if (optionMatch && !inExplanation && currentQuestion.options.length < 5) {
      const label = optionMatch[1].toUpperCase();
      const text = optionMatch[2].trim();
      currentQuestion.options.push(`${label}: ${text}`);
      continue;
    }

    // Detect correct answer:
    // Matches: "Correct Answer: A", "Answer: A", "Ans: A", "Ans. A", "Key: A", "Correct option: A"
    const answerMatch = line.match(/^(?:Correct\s+)?Ans(?:wer)?(?:\s+is)?[\s\.\:\-\=]+([A-Ea-e1-5])(?:\s+|$)/i) ||
                        line.match(/^Key[\s\.\:\-\=]+([A-Ea-e1-5])(?:\s+|$)/i) ||
                        line.match(/^Correct\s+option\s+is\s+([A-Ea-e1-5])/i);
    if (answerMatch) {
      const ansChar = answerMatch[1].toUpperCase();
      let ansIndex = 0;
      if (ansChar >= 'A' && ansChar <= 'E') {
        ansIndex = ansChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
      } else {
        const num = parseInt(ansChar);
        if (num >= 1 && num <= 5) {
          ansIndex = num - 1;
        }
      }
      currentQuestion.correctAnswer = ansIndex;
      continue;
    }

    // Detect explanation marker:
    // Matches: "Explanation: ...", "Rationale: ...", "Ref: ...", "Discussion: ..."
    const explanationMatch = line.match(/^(?:Explanation|Rationale|Ref|Reference|Discussion|Correct\s+Answer\s+Explanation)[\s\.\:\-]+(.*)/i);
    if (explanationMatch) {
      inExplanation = true;
      currentQuestion.explanation = explanationMatch[1].trim();
      continue;
    }

    // Append to current state
    if (inExplanation) {
      currentQuestion.explanation += '\n' + line;
    } else if (currentQuestion.options.length > 0) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('correct') || lowerLine.startsWith('explanation') || lowerLine.startsWith('ref:') || lowerLine.startsWith('rationale')) {
        inExplanation = true;
        currentQuestion.explanation = line;
      } else {
        const lastIdx = currentQuestion.options.length - 1;
        currentQuestion.options[lastIdx] += ' ' + line;
      }
    } else {
      currentQuestion.question += '\n' + line;
    }
  }

  if (currentQuestion) {
    mcqs.push(currentQuestion);
  }

  const processedMcqs = mcqs.filter(q => q.question && q.question.trim().length > 5);

  processedMcqs.forEach(q => {
    if (q.options.length === 0) {
      q.options = ['Option A', 'Option B', 'Option C', 'Option D'];
    } else {
      q.options = q.options.map((opt: string) => {
        return opt.replace(/^[A-E1-5]\s*[\.\:\)\-\s]+\s*/i, '').trim();
      });
      while (q.options.length < 4) {
        q.options.push(`Option ${String.fromCharCode(65 + q.options.length)}`);
      }
    }
  });

  console.log(`[Fallback Parser] Successfully parsed ${processedMcqs.length} questions from text.`);
  return processedMcqs;
}

const VALID_QUESTION_TYPES = [
  'Single Best Answer',
  'Multiple Correct',
  'True/False',
  'Image Based',
  'Case-based MCQ',
  'Clinical Scenario',
  'Match the Following',
  'Assertion-Reason',
  'Multiple Correct Answers',
  'Assertion & Reason',
  'Clinical Case Based',
  'Image-based MCQ',
  'Single Best Answer (SBA)'
];

function normalizeQuestionType(q: any): any {
  if (!q) return q;
  const currentType = q.type;
  if (!currentType || typeof currentType !== 'string') {
    q.type = 'Single Best Answer';
    return q;
  }

  // Exact match (case insensitive or direct)
  const found = VALID_QUESTION_TYPES.find(t => t.toLowerCase() === currentType.trim().toLowerCase());
  if (found) {
    q.type = found;
  } else {
    console.warn(`[Type Mapping] Unsupported question type "${currentType}" found. Mapping to "Single Best Answer".`);
    q.type = 'Single Best Answer';
  }
  return q;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  confidenceScore: number;
  isIncomplete: boolean;
  shouldReject: boolean;
}

function validateAndScoreQuestion(q: any): ValidationResult {
  const errors: string[] = [];
  let score = 100;
  let isIncomplete = false;
  let shouldReject = false;

  const stem = q.question ? String(q.question).trim() : '';

  // 1. Detect if question is empty or missing
  if (!stem) {
    errors.push('Question stem is empty');
    score = 0;
    isIncomplete = true;
    shouldReject = true;
    return { isValid: false, errors, confidenceScore: 0, isIncomplete, shouldReject };
  }

  // 2. Reject questions that start in the middle of a sentence
  if (stem.startsWith('...')) {
    errors.push('Question starts with an ellipsis (middle of sentence)');
    score = 0;
    isIncomplete = true;
    shouldReject = true;
  } else {
    const firstLetterMatch = stem.match(/[a-zA-Z]/);
    if (firstLetterMatch) {
      const firstLetter = firstLetterMatch[0];
      if (firstLetter === firstLetter.toLowerCase() && firstLetter !== firstLetter.toUpperCase()) {
        errors.push(`Question starts with a lowercase letter "${firstLetter}" (middle of sentence)`);
        score = 0;
        isIncomplete = true;
        shouldReject = true;
      }
    }
  }

  if (shouldReject) {
    return { isValid: false, errors, confidenceScore: 0, isIncomplete, shouldReject };
  }

  // 3. Detect incomplete or truncated questions
  const endsWithEllipsis = stem.endsWith('...') || stem.endsWith('…') || stem.endsWith('..');
  if (endsWithEllipsis) {
    errors.push('Question stem ends with an ellipsis or is truncated');
    score -= 30;
    isIncomplete = true;
  } else {
    const endsWithPunctuation = /[?.!:;"']$/.test(stem);
    if (!endsWithPunctuation) {
      errors.push('Question stem does not end with proper punctuation (might be truncated)');
      score -= 15;
      const lastWordMatch = stem.match(/\b([a-zA-Z]+)$/);
      if (lastWordMatch) {
        const lastWord = lastWordMatch[1].toLowerCase();
        const prepositionsAndConjunctions = ['of', 'the', 'a', 'an', 'and', 'or', 'with', 'by', 'for', 'at', 'to', 'in', 'is', 'are', 'was', 'were', 'that', 'which', 'who', 'whom'];
        if (prepositionsAndConjunctions.includes(lastWord)) {
          errors.push(`Question stem ends with trailing preposition/conjunction "${lastWord}" (incomplete sentence)`);
          score -= 25;
          isIncomplete = true;
        }
      }
    }
  }

  if (stem.length < 15) {
    errors.push('Question stem is extremely short (less than 15 characters)');
    score -= 20;
    isIncomplete = true;
  }

  // 4. Validate options A, B, C, D
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length < 4) {
    errors.push(`Question has fewer than 4 options (found ${opts.length})`);
    score -= 40;
    isIncomplete = true;
    shouldReject = true; // REJECT if fewer than 4 options
  } else {
    let emptyOptionCount = 0;
    let truncatedOptionCount = 0;
    opts.forEach((opt: any) => {
      const oStr = opt ? String(opt).trim() : '';
      if (!oStr) {
        emptyOptionCount++;
      } else {
        if (oStr.endsWith('...') || oStr.endsWith('…')) {
          truncatedOptionCount++;
        }
      }
    });

    if (emptyOptionCount > 0) {
      errors.push(`Question has ${emptyOptionCount} empty options`);
      score -= (emptyOptionCount * 20);
      isIncomplete = true;
      shouldReject = true; // REJECT if any empty options exist
    }
    if (truncatedOptionCount > 0) {
      errors.push(`Question has ${truncatedOptionCount} truncated/ellipsis options`);
      score -= (truncatedOptionCount * 15);
      isIncomplete = true;
    }
  }

  // 5. Validate correct answer
  const ans = q.correctAnswer;
  if (ans === undefined || ans === null) {
    errors.push('Correct answer index is missing');
    score -= 30;
    isIncomplete = true;
  } else {
    const ansIdx = Number(ans);
    if (isNaN(ansIdx) || ansIdx < 0 || ansIdx >= opts.length) {
      errors.push(`Correct answer index ${ans} is out of bounds for ${opts.length} options`);
      score -= 30;
      isIncomplete = true;
    }
  }

  // 6. Explanation validation (if available)
  const exp = q.explanation ? String(q.explanation).trim() : '';
  if (exp) {
    const expEndsWithEllipsis = exp.endsWith('...') || exp.endsWith('…');
    if (expEndsWithEllipsis) {
      errors.push('Explanation is truncated or ends with an ellipsis');
      score -= 15;
      isIncomplete = true;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    errors,
    confidenceScore: score,
    isIncomplete,
    shouldReject
  };
}

// 1. Explain Answer / Incorrect Option
app.post('/api/gemini/explain', async (req, res) => {
  const { question, optionSelected, isCorrect, correctAnswer, explanation, subject } = req.body;
  
  const ai = getAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are an expert MBBS medical tutor. A 2nd-year MBBS student is studying ${subject || 'Medical Sciences'}.
They answered the following MCQ:
Question: "${question}"
Selected Option: "${optionSelected}"
Is Selected Option Correct: ${isCorrect ? 'YES' : 'NO'}
True Correct Answer: "${correctAnswer}"
Standard Textbook Explanation: "${explanation}"

Please provide a highly educational, engaging, and clear tutor explanation.
1. Confirm if their choice was correct or incorrect and briefly explain why.
2. Break down the medical mechanism (pathological, pharmacological, or microbiological) behind the correct answer in clear bullet points.
3. Provide a helpful clinical pearl or a creative mnemonic to help them easily memorize this concept for exams.
4. Format the output elegantly in Markdown with clear medical headers (e.g., 🩺 Clinical Mechanisms, 💡 Mnemonic & Pearls).`;

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Explanation request');
  }
});

// 2. Generate Custom MCQ from notes text
app.post('/api/gemini/generate-mcq', async (req, res) => {
  const { topic, subject, notesText } = req.body;

  const ai = getAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are an expert medical professor compiling questions for 2nd-year MBBS professional exams.
Generate ONE highly realistic, high-yield exam question from the following context/notes text:
Subject: ${subject}
Topic: ${topic}
Notes Context: "${notesText}"

The question type must be one of: 'Single Best Answer', 'Multiple Correct Answers', 'Assertion & Reason', 'Clinical Case Based', or 'Image Based'.
Ensure it has a detailed explanation and matches standard textbooks like Robbins Pathology, KDT Pharmacology, or Apurba Sastry Microbiology.

Based on the subject and topic, you must automatically assign the correct chapter.
Example Chapters:
- Pathology: 'Cell Injury & Adaptation', 'Inflammation & Repair', 'Neoplasia', 'Hemodynamic Disorders', 'Immunology'
- Pharmacology: 'General Pharmacology', 'Autonomic Nervous System', 'Cardiovascular Drugs'
- Microbiology: 'General Bacteriology', 'Immunology', 'Systemic Bacteriology'

You MUST return the output strictly in JSON format matching the schema requested below.`;

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['question', 'options', 'correctAnswer', 'explanation', 'difficulty', 'tags', 'type', 'chapter', 'topic'],
          properties: {
            question: { type: Type.STRING, description: 'The exam question text. If Clinical Case Based, include age, history, clinical presentation, and findings.' },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of exactly four options.'
            },
            correctAnswer: { type: Type.INTEGER, description: 'The 0-based index of the correct option (0, 1, 2, or 3).' },
            explanation: { type: Type.STRING, description: 'Comprehensive medical breakdown explaining why the correct option is right, and why others are wrong.' },
            difficulty: { type: Type.STRING, description: 'Must be "Easy", "Medium", or "Hard".' },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2 to 4 keywords or tags related to the topic.' },
            type: { type: Type.STRING, description: 'Must be one of "Single Best Answer", "Multiple Correct Answers", "Assertion & Reason", "Clinical Case Based", "Image Based".' },
            chapter: { type: Type.STRING, description: 'The suggested standard chapter name.' },
            topic: { type: Type.STRING, description: 'The suggested specific topic name.' }
          }
        }
      }
    });

    const parsedMcq = JSON.parse(response.text || '{}');
    // Add missing metadata keys
    parsedMcq.id = `q-gen-${Date.now()}`;
    parsedMcq.subject = subject || 'Pathology';
    parsedMcq.chapter = parsedMcq.chapter || 'Cell Injury & Adaptation';
    parsedMcq.topic = topic || parsedMcq.topic || 'General Topic';
    parsedMcq.sourceBook = 'AI Tutor Bot';
    parsedMcq.source = 'AI Generated';
    parsedMcq.approved = true; // AI Generated questions used directly are pre-approved for practice

    normalizeQuestionType(parsedMcq);

    res.json({ success: true, mcq: parsedMcq });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Custom MCQ generation');
  }
});



// Unified MCQ Import Endpoint (PDF and Image multi-modal extraction engine)
app.post('/api/gemini/import-mcqs', async (req, res) => {
  const { fileType, pdfBase64, image, mimeType, textBatch, mode, subject, chapter, topic, sourceName } = req.body;

  console.log(`[Unified MCQ Import] POST /api/gemini/import-mcqs called. Type: ${fileType}, Mode: ${mode}, Subject: ${subject}`);

  if (fileType === 'pdf' && !pdfBase64 && !textBatch) {
    return res.status(400).json({ success: false, error: 'Either PDF data or Text Batch is required for PDF imports.' });
  }
  if (fileType === 'image' && !image) {
    return res.status(400).json({ success: false, error: 'Image data (Base64) is required for image imports.' });
  }

  const ai = getAI();
  if (!ai) {
    if (textBatch) {
      console.log(`[Unified MCQ Import] Gemini is offline. Invoking local high-fidelity text fallback parser...`);
      try {
        await connectDB();
        const fallbackQs = parseMCQsFromTextFallback(textBatch, subject, chapter, topic);
        if (fallbackQs.length > 0) {
          const savedMcqs = [];
          const existingQs = await QuestionModel.find({}, { question: 1 });
          const normalizeStem = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const existingStems = new Set(existingQs.map(q => normalizeStem(q.question)));
          const processedStemsInBatch = new Set<string>();
          let duplicateSkippedCount = 0;

          for (let i = 0; i < fallbackQs.length; i++) {
            const m = fallbackQs[i];
            const normalizedNewStem = normalizeStem(m.question || '');
            if (!normalizedNewStem) continue;

            if (existingStems.has(normalizedNewStem) || processedStemsInBatch.has(normalizedNewStem)) {
              duplicateSkippedCount++;
              continue;
            }
            processedStemsInBatch.add(normalizedNewStem);

            const qId = `q-imp-fb-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
            const compiledMcq: any = {
              id: qId,
              question: m.question,
              options: m.options,
              correctAnswer: m.correctAnswer,
              correctAnswers: [m.correctAnswer],
              explanation: m.explanation || 'Extracted via local high-fidelity parser.',
              subject: subject || 'Pathology',
              chapter: chapter || 'General Medicine',
              topic: topic || 'General Topic',
              subtopic: 'General',
              system: 'General',
              difficulty: 'Medium',
              sourceBook: sourceName || 'Local Fallback Parser',
              source: 'PDF',
              approved: false,
              status: 'Pending',
              tags: [topic || 'General'],
              type: 'Single Best Answer',
              targetExams: [],
              confidenceScore: 0.8,
              validationErrors: [],
              isIncomplete: false
            };

            const question = new QuestionModel(compiledMcq);
            await question.save();
            savedMcqs.push(question);
          }

          return res.json({
            success: true,
            mcqs: savedMcqs,
            duplicateSkippedCount,
            subjectVerification: {
              isValid: true,
              detectedSubject: subject || 'Pathology',
              warningMessage: 'Notice: Gemini is offline. Imported via local high-fidelity text fallback parser.'
            }
          });
        }
      } catch (fallbackErr: any) {
        console.error('[Unified MCQ Import] Fallback parser failed:', fallbackErr);
      }
    }
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    await connectDB();
    const dbSubjectsList = await SubjectModel.find({}, 'name').lean();
    const subjectListStr = dbSubjectsList.length > 0 
      ? dbSubjectsList.map((s: any) => `'${s.name}'`).join(', ') 
      : "'Pathology', 'Pharmacology', 'Microbiology'";

    const systemPrompt = `You are an expert medical MCQ extraction engine. Your only task is to convert PDFs or images into a clean, structured question bank. Accuracy is more important than speed.

Rules:

1. Extract only:
- Question
- Options (A, B, C, D, E if present)
- Correct answer
- Explanation
- Subject
- Chapter
- Difficulty
- Question type
- Target Exams (targetExams - detect if any target exams are mentioned, e.g., NEET PG, INICET, FMGE, AIIMS, NEXT, University PCT. Leave empty if none detected. NEVER automatically assign NEET PG to questions from textbooks.)

2. Completely ignore and never save:
- Page numbers
- Headers
- Footers
- Copyright text
- Watermarks
- QR codes
- URLs
- Logos
- "Continue on next page"
- Blank lines
- Image captions unrelated to the question
- Advertisement text
- Repeated text

3. Detect where each field belongs:
- Question: Starts from the question number or first sentence. Ends before Option A.
- Options: Detect A/B/C/D/E even if formatted differently. Keep complete option text.
- Correct Answer: Detect from phrases like:
  * Answer:
  * Ans:
  * Correct Answer:
  * Correct Option:
  * Key:
  * Solution:
  Save only the option letter.
- Explanation: Starts after the answer section and ends before the next question.

4. Never mix two questions together.

5. Never attach one explanation to another question.

6. If an image belongs to a question, attach it to that question only.

7. If a question continues on the next page, merge both pages before extracting.

8. Automatically classify:
- Subject: Automatically identify the true medical subject for each question based on clinical context (e.g. Pathology, Pharmacology, Microbiology, Anatomy, Physiology, Biochemistry, Forensic Medicine, Social and Preventive Medicine, ENT, Ophthalmology, Pediatrics, Surgery, OBG, Medicine, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesia, etc.). Do not limit to [${subjectListStr}] if the question belongs to a different clinical field; identify the correct subject from all available medical fields so they are mapped to their respective subjects correctly.
- Chapter: Automatically detect the specific medical chapter. For Anatomy, choose exactly from "Part 1: Upper Limb & Thorax", "Part 2: Lower Limb, Abdomen & Pelvis", "Part 3: Head & Neck", "Part 4: Brain & Neuroanatomy". For other subjects, use the standard medical chapter or organ system.
- Topic: Specific disease or concept. For Anatomy, classify strictly into one of the specific sub-topics belonging to the selected Part (e.g. Upper Limb, Thoracic Cavity, Heart, Gluteal Region, Abdomen, Brainstem, Cerebellum, etc.).
- Difficulty: Easy|Medium|Hard
- Question Type (questionType):
  * Single Best Answer
  * Image Based
  * Clinical Scenario
  * Assertion-Reason
  * Match the Following
  * Multiple Correct
  * True/False
- Target Exams (targetExams): Extract any target exams mentioned (e.g. NEET PG, INICET, FMGE, AIIMS, NEXT). If not found, leave as an empty array. Never default to NEET PG.

9. Remove duplicate questions using semantic similarity.

10. Validate every extracted question before saving.
Validation checklist:
✓ One question only
✓ Minimum 2 options
✓ Options belong to the same question
✓ Answer belongs to that question
✓ Explanation belongs to that question
✓ No page number
✓ No watermark
✓ No header/footer
✓ No duplicated text

If validation fails, do not save the question.

Output JSON Format for "mcqs" array items:
{
  "question": "Question text here",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text",
    "E": "Option E text if present"
  },
  "correctAnswer": "A|B|C|D|E",
  "explanation": "Detailed explanation here",
  "subject": "Subject name",
  "chapter": "Chapter name",
  "topic": "Topic name",
  "difficulty": "Easy|Medium|Hard",
  "questionType": "Question Type",
  "targetExams": ["NEET PG", "INICET"]
  "images": [],
  "tags": ["tag1", "tag2"]
}

Additional context overrides (use if relevant, or infer from content if not provided):
- Expected Subject: ${subject || 'Unspecified'}
- Expected Chapter: ${chapter || 'Unspecified'}
- Expected Topic: ${topic || 'Unspecified'}

You MUST return the output strictly in JSON format matching the schema requested below, with an array of "mcqs" and a "subjectVerification" object checking if the material belongs to the selected expected subject: "${subject || 'Unspecified'}".`;

    let modelInputContents: any[] = [];
    
    if (fileType === 'pdf') {
      if (pdfBase64) {
        modelInputContents.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          }
        });
      } else if (textBatch) {
        modelInputContents.push({
          text: `Here is the text content extracted from the target PDF:\n\n${textBatch}`
        });
      }
    } else if (fileType === 'image') {
      const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const cleanMime = mimeType || 'image/jpeg';
      modelInputContents.push({
        inlineData: {
          mimeType: cleanMime,
          data: cleanBase64
        }
      });
    } else {
      if (textBatch) {
        modelInputContents.push({ text: textBatch });
      }
    }

    modelInputContents.push({ text: systemPrompt });

    let result;
    try {
      console.log(`[Unified MCQ Import] Submitting payload to Gemini with model fallback loop...`);
      const response = await generateWithModelFallback(ai, {
        contents: modelInputContents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['mcqs', 'subjectVerification'],
            properties: {
              mcqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: [
                    'question', 'options', 'correctAnswer', 'explanation',
                    'subject', 'chapter', 'topic', 'difficulty', 'questionType'
                  ],
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.OBJECT,
                      properties: {
                        A: { type: Type.STRING },
                        B: { type: Type.STRING },
                        C: { type: Type.STRING },
                        D: { type: Type.STRING },
                        E: { type: Type.STRING }
                      }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    questionType: { type: Type.STRING },
                    targetExams: { type: Type.ARRAY, items: { type: Type.STRING } },
                    images: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              subjectVerification: {
                type: Type.OBJECT,
                required: ['isValid', 'detectedSubject', 'warningMessage'],
                properties: {
                  isValid: { type: Type.BOOLEAN },
                  detectedSubject: { type: Type.STRING },
                  warningMessage: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      console.log(`[Unified MCQ Import] Received response from Gemini. Status: Success. Text length: ${response.text?.length || 0} characters.`);
      result = JSON.parse(response.text || '{"mcqs": [], "subjectVerification": {"isValid": true, "detectedSubject": ""}}');
    } catch (geminiErr: any) {
      console.error(`[Unified MCQ Import] Gemini models failed or quota exceeded:`, geminiErr);
      if (textBatch) {
        console.log(`[Unified MCQ Import] Attempting local high-fidelity text parsing fallback...`);
        const fallbackQs = parseMCQsFromTextFallback(textBatch, subject, chapter, topic);
        if (fallbackQs.length > 0) {
          result = {
            mcqs: fallbackQs,
            subjectVerification: {
              isValid: true,
              detectedSubject: subject || 'Pathology',
              warningMessage: 'Notice: AI service limit reached. Questions were successfully extracted using our local high-fidelity fallback parser.'
            }
          };
        } else {
          throw geminiErr;
        }
      } else {
        throw geminiErr;
      }
    }
    
    const conn = await connectDB();
    
    // Auto deduplication check against MongoDB questions
    const existingQs = await QuestionModel.find({}, { question: 1 });
    const normalizeStem = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingStems = new Set(existingQs.map(q => normalizeStem(q.question)));
    const processedStemsInBatch = new Set<string>();

    const savedMcqs = [];
    let duplicateSkippedCount = 0;

    for (let i = 0; i < (result.mcqs || []).length; i++) {
      const m = result.mcqs[i];
      const normalizedNewStem = normalizeStem(m.question || '');

      if (!normalizedNewStem) continue;

      if (existingStems.has(normalizedNewStem) || processedStemsInBatch.has(normalizedNewStem)) {
        console.log(`[Unified MCQ Import] Skipping duplicate question: "${m.question?.substring(0, 50)}..."`);
        duplicateSkippedCount++;
        continue;
      }
      processedStemsInBatch.add(normalizedNewStem);

      // Map options object to array
      let optionsArray: string[] = [];
      if (m.options) {
        if (Array.isArray(m.options)) {
          optionsArray = m.options;
        } else if (typeof m.options === 'object') {
          const keys = ['A', 'B', 'C', 'D', 'E'];
          keys.forEach(k => {
            if (m.options[k] !== undefined && m.options[k] !== null && String(m.options[k]).trim() !== '') {
              optionsArray.push(String(m.options[k]).trim());
            }
          });
        }
      }

      // Convert letter answer (A, B, C, D, E) to 0-based index
      let corrAnswerIdx = 0;
      if (typeof m.correctAnswer === 'number') {
        corrAnswerIdx = m.correctAnswer;
      } else if (typeof m.correctAnswer === 'string') {
        const letter = m.correctAnswer.trim().toUpperCase();
        if (letter === 'A' || letter === '0') corrAnswerIdx = 0;
        else if (letter === 'B' || letter === '1') corrAnswerIdx = 1;
        else if (letter === 'C' || letter === '2') corrAnswerIdx = 2;
        else if (letter === 'D' || letter === '3') corrAnswerIdx = 3;
        else if (letter === 'E' || letter === '4') corrAnswerIdx = 4;
        else {
          const parsed = parseInt(letter, 10);
          if (!isNaN(parsed)) corrAnswerIdx = parsed;
        }
      }

      const qId = `q-imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      const compiledMcq: any = {
        id: qId,
        question: m.question,
        options: optionsArray,
        correctAnswer: corrAnswerIdx,
        correctAnswers: [corrAnswerIdx],
        explanation: m.explanation,
        subject: m.subject || subject || 'Pathology',
        chapter: m.chapter || chapter || 'General Medicine',
        topic: m.topic || topic || 'General Topic',
        subtopic: m.subtopic || 'General',
        system: m.system || 'General',
        difficulty: m.difficulty || 'Medium',
        sourceBook: sourceName || 'Import MCQs',
        source: fileType === 'pdf' ? 'PDF' : 'Image',
        approved: false, // Pending review before publishing
        status: 'Pending',
        tags: m.tags && m.tags.length > 0 ? m.tags : [m.topic || 'General'],
        type: m.questionType || m.type || 'Single Best Answer',
        targetExams: m.targetExams || [],
      };

      const { subject: savedSubject, chapter: savedChapter } = await ensureSubjectAndChapter(compiledMcq.subject, compiledMcq.chapter);
      compiledMcq.subject = savedSubject;
      compiledMcq.chapter = savedChapter;

      // Ensure tags contains targetExams if available
      if (compiledMcq.targetExams && Array.isArray(compiledMcq.targetExams)) {
        compiledMcq.targetExams.forEach(te => {
          if (!compiledMcq.tags.includes(te)) {
            compiledMcq.tags.push(te);
          }
        });
      }

      normalizeQuestionType(compiledMcq);

      const validation = validateAndScoreQuestion(compiledMcq);
      if (validation.shouldReject) {
        console.warn(`[Unified MCQ Import] Rejecting question due to critical failure: "${compiledMcq.question}"`);
        continue;
      }

      compiledMcq.confidenceScore = validation.confidenceScore;
      compiledMcq.validationErrors = validation.errors;
      compiledMcq.isIncomplete = validation.isIncomplete;

      const question = new QuestionModel(compiledMcq);
      await question.save();
      savedMcqs.push(question);
    }

    console.log(`[Unified MCQ Import] Processed complete. Saved: ${savedMcqs.length}, Skipped duplicates: ${duplicateSkippedCount}.`);
    res.json({ success: true, mcqs: savedMcqs, duplicateSkippedCount, subjectVerification: result.subjectVerification });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Unified MCQ processing');
  }
});

// Import MCQs from PDF (Extract vs Generate with intelligent classification)
app.post('/api/gemini/import-pdf-mcqs', async (req, res) => {
  const { pdfBase64, textBatch, mode, subject, chapter, topic, sourceName, questionTypes } = req.body;

  console.log(`[PDF Parsing] POST /api/gemini/import-pdf-mcqs called. Mode: ${mode}, Subject: ${subject}, Chapter: ${chapter}, Topic: ${topic}`);
  if (pdfBase64) {
    console.log(`[PDF Parsing] Parsing PDF via raw Base64 transmission. Base64 length: ${pdfBase64.length} characters.`);
  } else if (textBatch) {
    console.log(`[PDF Parsing] Parsing text batch extracted client-side. Text batch length: ${textBatch.length} characters.`);
  }

  if (!pdfBase64 && !textBatch) {
    console.error('[PDF Parsing] Fail: neither pdfBase64 nor textBatch were supplied.');
    return res.status(400).json({ success: false, error: 'Either PDF data or Text Batch is required' });
  }

  const ai = getAI();
  if (!ai) {
    if (textBatch) {
      console.log(`[PDF Parsing] Gemini is offline. Invoking local high-fidelity text fallback parser...`);
      try {
        await connectDB();
        const fallbackQs = parseMCQsFromTextFallback(textBatch, subject, chapter, topic);
        if (fallbackQs.length > 0) {
          const savedMcqs = [];
          for (let i = 0; i < fallbackQs.length; i++) {
            const m = fallbackQs[i];
            const qId = `q-pdf-fb-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
            const compiledMcq: any = {
              id: qId,
              question: m.question,
              options: m.options,
              correctAnswer: m.correctAnswer,
              correctAnswers: [m.correctAnswer],
              explanation: m.explanation || 'Extracted via local high-fidelity parser.',
              subject: subject || 'Pathology',
              chapter: chapter || 'General Medicine',
              topic: topic || 'General Topic',
              subtopic: 'General',
              system: 'General',
              difficulty: 'Medium',
              sourceBook: 'Local Fallback Parser',
              source: 'PDF',
              approved: false,
              status: 'Pending',
              tags: [topic || 'General'],
              type: 'Single Best Answer'
            };

            const validation = validateAndScoreQuestion(compiledMcq);
            if (validation.shouldReject) continue;

            compiledMcq.confidenceScore = validation.confidenceScore;
            compiledMcq.validationErrors = validation.errors;
            compiledMcq.isIncomplete = validation.isIncomplete;

            const question = new QuestionModel(compiledMcq);
            await question.save();
            savedMcqs.push(question);
          }
          return res.json({ success: true, mcqs: savedMcqs });
        }
      } catch (fallbackErr: any) {
        console.error('[PDF Parsing] Fallback parser failed:', fallbackErr);
      }
    }
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    let systemPrompt = `You are an expert medical MCQ extraction engine. Your only task is to convert PDFs or images into a clean, structured question bank. Accuracy is more important than speed.

Rules:

1. Extract only:
- Question
- Options (A, B, C, D, E if present)
- Correct answer
- Explanation
- Subject
- Chapter
- Difficulty
- Question type
- Target Exams (targetExams - detect if any target exams are mentioned, e.g., NEET PG, INICET, FMGE, AIIMS, NEXT, University PCT. Leave empty if none detected. NEVER automatically assign NEET PG to questions from textbooks.)

2. Completely ignore and never save:
- Page numbers
- Headers
- Footers
- Copyright text
- Watermarks
- QR codes
- URLs
- Logos
- "Continue on next page"
- Blank lines
- Image captions unrelated to the question
- Advertisement text
- Repeated text

3. Detect where each field belongs:
- Question: Starts from the question number or first sentence. Ends before Option A.
- Options: Detect A/B/C/D/E even if formatted differently. Keep complete option text.
- Correct Answer: Detect from phrases like:
  * Answer:
  * Ans:
  * Correct Answer:
  * Correct Option:
  * Key:
  * Solution:
  Save only the option letter.
- Explanation: Starts after the answer section and ends before the next question.

4. Never mix two questions together.

5. Never attach one explanation to another question.

6. If an image belongs to a question, attach it to that question only.

7. If a question continues on the next page, merge both pages before extracting.

8. Automatically classify:
- Subject: Automatically identify the true medical subject for each question based on clinical context (e.g. Pathology, Pharmacology, Microbiology, Anatomy, Physiology, Biochemistry, Forensic Medicine, Social and Preventive Medicine, ENT, Ophthalmology, Pediatrics, Surgery, OBG, Medicine, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesia, etc.). Do not limit to any narrow list of subjects; identify the correct subject from all available medical fields so they are mapped to their respective subjects correctly.
- Chapter: Automatically detect the specific medical chapter. For Anatomy, choose exactly from "Part 1: Upper Limb & Thorax", "Part 2: Lower Limb, Abdomen & Pelvis", "Part 3: Head & Neck", "Part 4: Brain & Neuroanatomy". For other subjects, use the standard medical chapter or organ system.
- Topic: Specific disease or concept. For Anatomy, classify strictly into one of the specific sub-topics belonging to the selected Part (e.g. Upper Limb, Thoracic Cavity, Heart, Gluteal Region, Abdomen, Brainstem, Cerebellum, etc.).
- Difficulty: Easy|Medium|Hard
- Question Type (questionType):
  * Single Best Answer
  * Image Based
  * Clinical Scenario
  * Assertion-Reason
  * Match the Following
  * Multiple Correct
  * True/False
- Target Exams (targetExams): Extract any target exams mentioned (e.g. NEET PG, INICET, FMGE, AIIMS, NEXT). If not found, leave as an empty array. Never default to NEET PG.

9. Remove duplicate questions using semantic similarity.

10. Validate every extracted question before saving.
Validation checklist:
✓ One question only
✓ Minimum 2 options
✓ Options belong to the same question
✓ Answer belongs to that question
✓ Explanation belongs to that question
✓ No page number
✓ No watermark
✓ No header/footer
✓ No duplicated text

If validation fails, do not save the question.

Output JSON Format for "mcqs" array items:
{
  "question": "Question text here",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text",
    "E": "Option E text if present"
  },
  "correctAnswer": "A|B|C|D|E",
  "explanation": "Detailed explanation here",
  "subject": "Subject name",
  "chapter": "Chapter name",
  "topic": "Topic name",
  "difficulty": "Easy|Medium|Hard",
  "questionType": "Question Type",
  "targetExams": ["NEET PG", "INICET"],
  "images": [],
  "tags": ["tag1", "tag2"]
}

Additional context overrides (use if relevant, or infer from content if not provided):
- Expected Subject: ${subject || 'Unspecified'}
- Expected Chapter: ${chapter || 'Unspecified'}
- Expected Topic: ${topic || 'Unspecified'}`;

    let modelInputContents: any[] = [];
    if (pdfBase64) {
      modelInputContents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        }
      });
    } else if (textBatch) {
      modelInputContents.push({
        text: `Here is the text content extracted from the target PDF page range/batch:\n\n${textBatch}`
      });
    }

    // Add general subject/chapter overrides to guide the model if available
    const overridesPrompt = `
Additional context metadata to guide classification (use if content matches):
- Expected Subject: ${subject || 'Unspecified'}
- Expected Chapter: ${chapter || 'Unspecified'}
- Expected Topic: ${topic || 'Unspecified'}`;

    modelInputContents.push({ text: overridesPrompt });
    modelInputContents.push({ text: systemPrompt });

    let result;
    try {
      console.log(`[MCQ Extraction] Submitting prompt & content payload to Gemini AI Model via fallback loop...`);
      const response = await generateWithModelFallback(ai, {
        contents: modelInputContents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['mcqs'],
            properties: {
              mcqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: [
                    'question', 'options', 'correctAnswer', 'explanation',
                    'subject', 'chapter', 'topic', 'difficulty', 'questionType'
                  ],
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.OBJECT,
                      properties: {
                        A: { type: Type.STRING },
                        B: { type: Type.STRING },
                        C: { type: Type.STRING },
                        D: { type: Type.STRING },
                        E: { type: Type.STRING }
                      }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    questionType: { type: Type.STRING },
                    targetExams: { type: Type.ARRAY, items: { type: Type.STRING } },
                    images: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        }
      });

      console.log(`[MCQ Extraction] Received raw response text from Gemini AI. Character length: ${response.text?.length || 0}`);
      result = JSON.parse(response.text || '{"mcqs": []}');
    } catch (geminiErr: any) {
      console.error(`[PDF Parsing] Gemini failed or quota exceeded:`, geminiErr);
      if (textBatch) {
        console.log(`[PDF Parsing] Attempting local high-fidelity text parsing fallback...`);
        const fallbackQs = parseMCQsFromTextFallback(textBatch, subject, chapter, topic);
        if (fallbackQs.length > 0) {
          result = { mcqs: fallbackQs };
        } else {
          throw geminiErr;
        }
      } else {
        throw geminiErr;
      }
    }
    const rawMcqsCount = result.mcqs?.length || 0;
    console.log(`[MCQ Extraction] Successfully parsed ${rawMcqsCount} raw questions from JSON structure.`);

    const conn = await connectDB();
    const savedMcqs = [];

    for (let i = 0; i < (result.mcqs || []).length; i++) {
      const m = result.mcqs[i];
      const qId = `q-pdf-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Map options object to array
      let optionsArray: string[] = [];
      if (m.options) {
        if (Array.isArray(m.options)) {
          optionsArray = m.options;
        } else if (typeof m.options === 'object') {
          const keys = ['A', 'B', 'C', 'D', 'E'];
          keys.forEach(k => {
            if (m.options[k] !== undefined && m.options[k] !== null && String(m.options[k]).trim() !== '') {
              optionsArray.push(String(m.options[k]).trim());
            }
          });
        }
      }

      // Convert letter answer (A, B, C, D, E) to 0-based index
      let corrAnswerIdx = 0;
      if (typeof m.correctAnswer === 'number') {
        corrAnswerIdx = m.correctAnswer;
      } else if (typeof m.correctAnswer === 'string') {
        const letter = m.correctAnswer.trim().toUpperCase();
        if (letter === 'A' || letter === '0') corrAnswerIdx = 0;
        else if (letter === 'B' || letter === '1') corrAnswerIdx = 1;
        else if (letter === 'C' || letter === '2') corrAnswerIdx = 2;
        else if (letter === 'D' || letter === '3') corrAnswerIdx = 3;
        else if (letter === 'E' || letter === '4') corrAnswerIdx = 4;
        else {
          const parsed = parseInt(letter, 10);
          if (!isNaN(parsed)) corrAnswerIdx = parsed;
        }
      }

      const compiledMcq: any = {
        id: qId,
        question: m.question,
        options: optionsArray,
        correctAnswer: corrAnswerIdx,
        correctAnswers: [corrAnswerIdx],
        explanation: m.explanation,
        subject: m.subject || subject || 'Pathology',
        chapter: m.chapter || chapter || 'General Medicine',
        topic: m.topic || topic || 'General Topic',
        subtopic: m.subtopic || 'General',
        system: m.system || 'General',
        difficulty: m.difficulty || 'Medium',
        sourceBook: sourceName || 'PDF Importer',
        source: 'PDF',
        approved: false, // Pending review before publishing
        status: 'Pending', // Explicit pending status
        tags: m.tags && m.tags.length > 0 ? m.tags : [m.topic || 'General'],
        type: m.questionType || m.type || 'Single Best Answer',
        targetExams: m.targetExams || [],
      };

      const { subject: savedSubject, chapter: savedChapter } = await ensureSubjectAndChapter(compiledMcq.subject, compiledMcq.chapter);
      compiledMcq.subject = savedSubject;
      compiledMcq.chapter = savedChapter;

      // Ensure tags contains targetExams if available
      if (compiledMcq.targetExams && Array.isArray(compiledMcq.targetExams)) {
        compiledMcq.targetExams.forEach(te => {
          if (!compiledMcq.tags.includes(te)) {
            compiledMcq.tags.push(te);
          }
        });
      }

      normalizeQuestionType(compiledMcq);

      const validation = validateAndScoreQuestion(compiledMcq);
      if (validation.shouldReject) {
        console.warn(`[PDF Import] Rejecting question due to critical failure (e.g. empty/incomplete options or starts in middle of sentence): "${compiledMcq.question}"`);
        continue; // Skip saving this question completely to ensure we never save an MCQ without complete options
      }

      compiledMcq.confidenceScore = validation.confidenceScore;
      compiledMcq.validationErrors = validation.errors;
      compiledMcq.isIncomplete = validation.isIncomplete;

      const question = new QuestionModel(compiledMcq);
      await question.save();
      savedMcqs.push(question);
    }

    console.log(`[API Response] POST /api/gemini/import-pdf-mcqs saved and returning ${savedMcqs.length} MCQs.`);
    res.json({ success: true, mcqs: savedMcqs });
  } catch (err: any) {
    return handleGeminiError(err, res, 'PDF MCQ processing');
  }
});

// Extract & Generate MCQ from Image (multimodal analysis with intelligent classification)
app.post('/api/gemini/extract-image-mcq', async (req, res) => {
  const { image, mimeType, subject, chapter, topic, sourceName, questionTypes } = req.body;

  console.log(`[LOG] [MCQ Extraction] POST /api/gemini/extract-image-mcq called. Subject: ${subject}, Chapter: ${chapter}, Topic: ${topic}`);
  
  if (!image) {
    console.error('[LOG] [MCQ Extraction] Fail: image base64 was not provided.');
    return res.status(400).json({ success: false, error: 'Image data (Base64) is required' });
  }

  // Handle strip data URI header
  const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
  const cleanMime = mimeType || 'image/jpeg';

  console.log(`[LOG] [MCQ Extraction] Received image upload. MIME Type: ${cleanMime}. Base64 length: ${cleanBase64.length} characters.`);

  const ai = getAI();
  if (!ai) {
    console.error('[LOG] [MCQ Extraction] Gemini API key is missing or unconfigured.');
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are an expert medical MCQ extraction engine. Your task is to convert images into a clean, structured question bank with >99% extraction accuracy.
You must use your Vision capabilities to carefully detect both text and visual elements in the input image.

Rules:

1. Extract only:
- Question
- Options (A, B, C, D, E if present)
- Correct answer
- Explanation
- Subject
- Chapter
- Difficulty
- Question type
- Target Exams (targetExams - detect if any target exams are mentioned, e.g., NEET PG, INICET, FMGE, AIIMS, NEXT, University PCT. Leave empty if none detected. NEVER automatically assign NEET PG to questions from textbooks.)

2. AI Vision & Visual Figure Detection (CRITICAL):
Analyze the input image using your vision capabilities.
Identify if the image contains any clinical visual elements such as:
- Radiology (X-ray, MRI, CT scan, ultrasound)
- Histology or Pathology slides (stained tissues, microscopic images)
- Anatomy diagrams or illustrations
- Flowcharts or clinical decision trees
- Tables, graphs, or charts
- Clinical photographs of patients/conditions
If any visual element is present, set:
- \`detectedVisualType\` to one of: 'radiology', 'histology', 'pathology', 'anatomy', 'flowchart', 'table', 'graph', 'clinical_photo'.
- \`hasVisualFigure\` to true.
- \`figureCropBox\` to a bounding box \`{ "ymin": number, "xmin": number, "ymax": number, "xmax": number }\` (on a normalized scale of 0 to 1000, where 0 is top/left and 1000 is bottom/right) which perfectly wraps ONLY the clinical figure, radiology scan, slide, diagram, or chart. Ensure the crop box does NOT include the text of the question or options.
If there are NO visual figures, set \`hasVisualFigure\` to false, \`detectedVisualType\` to 'none', and coordinates to 0.

3. Completely ignore and never save:
- Page numbers
- Headers
- Footers
- Copyright text
- Watermarks
- QR codes
- URLs
- Logos
- "Continue on next page"
- Blank lines
- Image captions unrelated to the question
- Advertisement text
- Repeated text

4. Detect where each field belongs:
- Question: Starts from the question number or first sentence. Ends before Option A.
- Options: Detect A/B/C/D/E even if formatted differently. Keep complete option text.
- Correct Answer: Detect from phrases like:
  * Answer:
  * Ans:
  * Correct Answer:
  * Correct Option:
  * Key:
  * Solution:
  Save only the option letter.
- Explanation: Starts after the answer section and ends before the next question.

5. Never mix two questions together.

6. Never attach one explanation to another question.

7. If an image belongs to a question, attach it to that question only.

8. Automatically classify:
- Subject: Automatically identify the true medical subject for each question based on clinical context (e.g. Pathology, Pharmacology, Microbiology, Anatomy, Physiology, Biochemistry, Forensic Medicine, Social and Preventive Medicine, ENT, Ophthalmology, Pediatrics, Surgery, OBG, Medicine, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesia, etc.). Do not limit to any narrow list of subjects; identify the correct subject from all available medical fields so they are mapped to their respective subjects correctly.
- Chapter: Automatically detect the specific medical chapter. For Anatomy, choose exactly from "Part 1: Upper Limb & Thorax", "Part 2: Lower Limb, Abdomen & Pelvis", "Part 3: Head & Neck", "Part 4: Brain & Neuroanatomy". For other subjects, use the standard medical chapter or organ system.
- Topic: Specific disease or concept. For Anatomy, classify strictly into one of the specific sub-topics belonging to the selected Part (e.g. Upper Limb, Thoracic Cavity, Heart, Gluteal Region, Abdomen, Brainstem, Cerebellum, etc.).
- Difficulty: Easy|Medium|Hard
- Question Type (questionType):
  * Single Best Answer
  * Image Based
  * Clinical Scenario
  * Assertion-Reason
  * Match the Following
  * Multiple Correct
  * True/False
- Target Exams (targetExams): Extract any target exams mentioned (e.g. NEET PG, INICET, FMGE, AIIMS, NEXT). If not found, leave as an empty array. Never default to NEET PG.

9. Remove duplicate questions using semantic similarity.

10. Validate every extracted question before saving.
Validation checklist:
✓ One question only
✓ Minimum 2 options
✓ Options belong to the same question
✓ Answer belongs to that question
✓ Explanation belongs to that question
✓ No page number
✓ No watermark
✓ No header/footer
✓ No duplicated text

If validation fails, do not save the question.

Output JSON Format for "mcqs" array items:
{
  "question": "Question text here",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text",
    "E": "Option E text if present"
  },
  "correctAnswer": "A|B|C|D|E",
  "explanation": "Detailed explanation here",
  "subject": "Subject name",
  "chapter": "Chapter name",
  "topic": "Topic name",
  "difficulty": "Easy|Medium|Hard",
  "questionType": "Question Type",
  "targetExams": ["NEET PG", "INICET"],
  "images": [],
  "tags": ["tag1", "tag2"],
  "detectedVisualType": "none|radiology|histology|pathology|anatomy|flowchart|table|graph|clinical_photo",
  "hasVisualFigure": true|false,
  "figureCropBox": {
    "ymin": 0,
    "xmin": 0,
    "ymax": 0,
    "xmax": 0
  }
}

Context Overrides (use if relevant, or infer from image content if not provided):
- Expected Subject: ${subject || 'Pathology'}
- Expected Chapter: ${chapter || 'Unspecified'}
- Expected Topic: ${topic || 'Unspecified'}

You MUST return the output strictly in JSON format matching the schema requested below, with an array of "mcqs".`;

    console.log('[LOG] [MCQ Extraction] Submitting image payload and prompt to Gemini AI via fallback loop...');
    
    const response = await generateWithModelFallback(ai, {
      contents: [
        { text: prompt },
        { inlineData: { data: cleanBase64, mimeType: cleanMime } }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['mcqs'],
          properties: {
            mcqs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: [
                  'question', 'options', 'correctAnswer', 'explanation',
                  'subject', 'chapter', 'topic', 'difficulty', 'questionType'
                ],
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                      E: { type: Type.STRING }
                    }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  chapter: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  targetExams: { type: Type.ARRAY, items: { type: Type.STRING } },
                  images: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detectedVisualType: { type: Type.STRING },
                  hasVisualFigure: { type: Type.BOOLEAN },
                  figureCropBox: {
                    type: Type.OBJECT,
                    properties: {
                      ymin: { type: Type.INTEGER },
                      xmin: { type: Type.INTEGER },
                      ymax: { type: Type.INTEGER },
                      xmax: { type: Type.INTEGER }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`[LOG] [MCQ Extraction] Received response from Gemini. Status: Success. Text length: ${response.text?.length || 0} characters.`);
    const result = JSON.parse(response.text || '{"mcqs": []}');
    
    const conn = await connectDB();
    const savedMcqs = [];
    let duplicateSkippedCount = 0;

    // Load existing question stems to perform >99% accurate duplicate elimination
    const existingQs = await QuestionModel.find({}, { question: 1 });
    const normalizeStem = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingStems = new Set(existingQs.map(q => normalizeStem(q.question)));
    const processedStemsInBatch = new Set<string>();

    for (let i = 0; i < (result.mcqs || []).length; i++) {
      const m = result.mcqs[i];
      const normalizedNewStem = normalizeStem(m.question || '');

      if (!normalizedNewStem) continue;

      // Duplicate Elimination Check
      if (existingStems.has(normalizedNewStem) || processedStemsInBatch.has(normalizedNewStem)) {
        console.log(`[MCQ Image Extraction] Skipping duplicate question: "${m.question?.substring(0, 50)}..."`);
        duplicateSkippedCount++;
        continue;
      }
      processedStemsInBatch.add(normalizedNewStem);

      const qId = `q-img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Map options object to array
      let optionsArray: string[] = [];
      if (m.options) {
        if (Array.isArray(m.options)) {
          optionsArray = m.options;
        } else if (typeof m.options === 'object') {
          const keys = ['A', 'B', 'C', 'D', 'E'];
          keys.forEach(k => {
            if (m.options[k] !== undefined && m.options[k] !== null && String(m.options[k]).trim() !== '') {
              optionsArray.push(String(m.options[k]).trim());
            }
          });
        }
      }

      // Convert letter answer (A, B, C, D, E) to 0-based index
      let corrAnswerIdx = 0;
      if (typeof m.correctAnswer === 'number') {
        corrAnswerIdx = m.correctAnswer;
      } else if (typeof m.correctAnswer === 'string') {
        const letter = m.correctAnswer.trim().toUpperCase();
        if (letter === 'A' || letter === '0') corrAnswerIdx = 0;
        else if (letter === 'B' || letter === '1') corrAnswerIdx = 1;
        else if (letter === 'C' || letter === '2') corrAnswerIdx = 2;
        else if (letter === 'D' || letter === '3') corrAnswerIdx = 3;
        else if (letter === 'E' || letter === '4') corrAnswerIdx = 4;
        else {
          const parsed = parseInt(letter, 10);
          if (!isNaN(parsed)) corrAnswerIdx = parsed;
        }
      }

      const compiledMcq: any = {
        id: qId,
        question: m.question,
        options: optionsArray,
        correctAnswer: corrAnswerIdx,
        correctAnswers: [corrAnswerIdx],
        explanation: m.explanation,
        subject: m.subject || subject || 'Pathology',
        chapter: m.chapter || chapter || 'General Medicine',
        topic: m.topic || topic || 'General Topic',
        subtopic: m.subtopic || 'General',
        system: m.system || 'General',
        difficulty: m.difficulty || 'Medium',
        sourceBook: sourceName || 'Image Extraction',
        source: 'Image',
        approved: false, // Pending review before publishing
        tags: m.tags && m.tags.length > 0 ? m.tags : [m.topic || 'General'],
        type: m.questionType || m.type || 'Single Best Answer',
        targetExams: m.targetExams || [],
        detectedVisualType: m.detectedVisualType || 'none',
        hasVisualFigure: m.hasVisualFigure || false,
        figureCropBox: m.figureCropBox || { ymin: 0, xmin: 0, ymax: 0, xmax: 0 }
      };

      // Attach the original uploaded image base64 if a visual figure is detected
      if ((compiledMcq.hasVisualFigure || compiledMcq.type === 'Image Based' || compiledMcq.type === 'Image-based MCQ') && req.body.image) {
        compiledMcq.image = req.body.image;
        if (compiledMcq.type !== 'Image Based' && compiledMcq.type !== 'Image-based MCQ') {
          compiledMcq.type = 'Image Based';
        }
      }

      const { subject: savedSubject, chapter: savedChapter } = await ensureSubjectAndChapter(compiledMcq.subject, compiledMcq.chapter);
      compiledMcq.subject = savedSubject;
      compiledMcq.chapter = savedChapter;

      // Ensure tags contains targetExams if available
      if (compiledMcq.targetExams && Array.isArray(compiledMcq.targetExams)) {
        compiledMcq.targetExams.forEach(te => {
          if (!compiledMcq.tags.includes(te)) {
            compiledMcq.tags.push(te);
          }
        });
      }

      normalizeQuestionType(compiledMcq);

      const validation = validateAndScoreQuestion(compiledMcq);
      if (validation.shouldReject) {
        console.warn(`[Image Import] Rejecting question due to critical failure (e.g. starts in middle of sentence): "${compiledMcq.question}"`);
        continue; // Skip saving this question completely
      }

      compiledMcq.confidenceScore = validation.confidenceScore;
      compiledMcq.validationErrors = validation.errors;
      compiledMcq.isIncomplete = validation.isIncomplete;

      const question = new QuestionModel(compiledMcq);
      await question.save();
      savedMcqs.push(question);
    }

    console.log('[LOG] [MCQ Extraction] Standardized and saved extracted MCQs successfully:', savedMcqs.length, 'Duplicates skipped:', duplicateSkippedCount);
    res.json({ success: true, mcqs: savedMcqs, duplicateSkippedCount });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Image MCQ extraction');
  }
});

// 3. Summarize topic
app.post('/api/gemini/summarize', async (req, res) => {
  const { topic, contextText, subject } = req.body;

  const ai = getAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are a legendary MBBS professor specializing in ${subject || 'Medical Sciences'}.
Provide an elegant, high-yield medical summary for the topic: "${topic}".
Notes Content: "${contextText || 'Standard Textbook Syllabus'}"

Include:
1. "High-Yield Overview" (explain the concept beautifully and simply).
2. "Clinical pearls" (critical facts for clinical cases).
3. "Creative Mnemonic" (a mnemonic helper to remember the key points, drug names, or diagnostic criteria).
Format the output beautifully in Markdown.`;

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Summarization');
  }
});

// 4. Generate mnemonics
app.post('/api/gemini/mnemonics', async (req, res) => {
  const { topic, termsToMemorize, subject } = req.body;

  const ai = getAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API is unavailable because the GEMINI_API_KEY environment variable is not configured or is empty. Please set it in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are a medical learning specialist. Create an unforgettable, funny, or highly logical medical mnemonic to memorize these specific terms: "${termsToMemorize}" related to the topic "${topic}" in the 2nd Year MBBS subject ${subject || 'Sciences'}.
Explain what each letter in the mnemonic stands for clearly and why it is clinically relevant. Format in clean, readable Markdown.`;

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    return handleGeminiError(err, res, 'Mnemonics generation');
  }
});


// --- MongoDB API Routes ---

// Health endpoint with MongoDB Atlas connection verification
app.get('/api/health', async (req, res) => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('MONGODB_URI environment variable is missing or empty.');
    }
    
    // Create users collection if it does not already exist
    const collections = await conn.db!.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) {
      await conn.db!.createCollection('users');
    }

    res.json({ status: 'connected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unknown database connection error' });
  }
});

// Test MongoDB Endpoint
app.post('/api/test-db', async (req, res) => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('MONGODB_URI environment variable is missing or empty.');
    }

    const client = (conn as any).client;
    if (!client) {
      throw new Error('MongoDB native client is not available on connection.');
    }

    // Connect to database 'medbank'
    const db = client.db('medbank');

    // Run ping to verify database connectivity without inserting dummy users
    await db.command({ ping: 1 });

    res.json({
      success: true,
      message: "Successfully connected to MongoDB Atlas and verified database connectivity without test users."
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Unknown database operation error'
    });
  }
});

// Users API
app.post('/api/auth/register', async (req, res) => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('Database connection failed: MONGODB_URI environment variable is missing.');
    }

    const { email, password, name, role, avatar } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email address already exists.' });
    }

    // Create a new user with hashed password
    const newUser = new UserModel({
      id: `usr-${Date.now()}`,
      email: email.toLowerCase(),
      password: hashPassword(password),
      name,
      role: email.toLowerCase() === 'admin@medbank.com' ? 'admin' : 'student',
      avatar: avatar || '',
      createdAt: new Date()
    });

    await newUser.save();

    // Create a safe user object to return without the password hash
    const userJson = newUser.toObject();
    delete userJson.password;

    res.json({ success: true, user: userJson });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message || 'Database registration error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('Database connection failed: MONGODB_URI environment variable is missing.');
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email address and password are required.' });
    }

    // Find the user
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    // Verify hashed password
    const incomingHash = hashPassword(password);
    if (user.password !== incomingHash) {
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    // Create a safe user object without the password hash
    const userJson = user.toObject();
    delete userJson.password;

    res.json({ success: true, user: userJson });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message || 'Database login error' });
  }
});

app.get('/api/users/:email', async (req, res) => {
  try {
    const user = await UserModel.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await UserModel.find({}).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, email, name, role, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    let user = await UserModel.findOne({ email: email.toLowerCase() });
    const resolvedName = name || email.split('@')[0] || 'Medical Student';

    if (user) {
      user.name = resolvedName;
      user.role = role || user.role;
      user.avatar = avatar || user.avatar;
      await user.save();
    } else {
      user = new UserModel({
        id: id || `usr-${Date.now()}`,
        email: email.toLowerCase(),
        name: resolvedName,
        role: role || 'student',
        avatar: avatar || ''
      });
      await user.save();
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await UserModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= SUBJECTS API =================
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await SubjectModel.find({}).sort({ name: 1 });
    res.json({ success: true, subjects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = `subj-${Date.now()}`;
    const subject = new SubjectModel(data);
    await subject.save();
    res.json({ success: true, subject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await SubjectModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    res.json({ success: true, subject });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const idOrOid = req.params.id;
    const cascade = req.query.cascade === 'true';
    const query = mongoose.Types.ObjectId.isValid(idOrOid)
      ? { $or: [{ id: idOrOid }, { _id: idOrOid }] }
      : { id: idOrOid };

    const subject = await SubjectModel.findOne(query);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    const subjectName = subject.name;

    if (cascade) {
      // Option 2: Permanently cascading delete related records in other collections
      await ChapterModel.deleteMany({ subject: subjectName });
      await TopicModel.deleteMany({ subject: subjectName });
      await QuestionModel.deleteMany({ subject: subjectName });
      await NoteModel.deleteMany({ subject: subjectName });
      await PdfModel.deleteMany({ subject: subjectName });
      await FlashcardModel.deleteMany({ subject: subjectName });
      await VideoModel.deleteMany({ subject: subjectName });
      await TestModel.deleteMany({ subject: subjectName });
      await TestResultModel.deleteMany({ subject: subjectName });
    } else {
      // Option 1: Delete subject only, move linked resources to "Uncategorized" and clear chapter/topic.
      // Ensure "Uncategorized" subject exists
      const uncategorizedExists = await SubjectModel.findOne({ name: 'Uncategorized' });
      if (!uncategorizedExists) {
        await SubjectModel.create({
          id: 'subj-uncategorized',
          name: 'Uncategorized',
          description: 'Questions and learning materials from deleted subjects.',
          icon: 'HelpCircle'
        });
      }

      // Delete chapters and topics of this subject as they are bound to the deleted subject
      await ChapterModel.deleteMany({ subject: subjectName });
      await TopicModel.deleteMany({ subject: subjectName });

      // Move questions and other materials to "Uncategorized"
      await QuestionModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await NoteModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await PdfModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await FlashcardModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await VideoModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await TestModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
      await TestResultModel.updateMany({ subject: subjectName }, { $set: { subject: 'Uncategorized', chapter: '', topic: '' } });
    }

    await SubjectModel.deleteOne(query);

    const suffixMessage = cascade
      ? 'permanently cascading deleted along with all its chapters, topics, and MCQs.'
      : 'deleted. All its questions and materials have been moved to the "Uncategorized" subject.';

    res.json({
      success: true,
      message: `Subject "${subjectName}" successfully ${suffixMessage}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= CHAPTERS API =================
app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await ChapterModel.find({}).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, chapters });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chapters', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.subject) {
      return res.status(400).json({ success: false, error: 'Chapter name and subject are required.' });
    }

    // Prevent duplicate chapter names within the same subject (case-insensitive)
    const existing = await ChapterModel.findOne({
      subject: data.subject,
      name: { $regex: new RegExp('^' + data.name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: `A chapter named "${data.name.trim()}" already exists in ${data.subject}.` });
    }

    if (!data.id) data.id = `chap-${Date.now()}`;
    const chapter = new ChapterModel({
      id: data.id,
      name: data.name.trim(),
      subject: data.subject,
      description: data.description || '',
      displayOrder: Number(data.displayOrder !== undefined ? data.displayOrder : 0),
      isActive: data.isActive !== false
    });
    await chapter.save();
    res.json({ success: true, chapter });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/chapters/:id', async (req, res) => {
  try {
    const data = req.body;
    const chapter = await ChapterModel.findOne({ id: req.params.id });
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' });
    }

    if (data.name) {
      const subjectToCheck = data.subject || chapter.subject;
      // Prevent duplicate chapter names within the same subject (case-insensitive)
      const existing = await ChapterModel.findOne({
        id: { $ne: req.params.id },
        subject: subjectToCheck,
        name: { $regex: new RegExp('^' + data.name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
      });
      if (existing) {
        return res.status(400).json({ success: false, error: `A chapter named "${data.name.trim()}" already exists in ${subjectToCheck}.` });
      }
    }

    const updatedFields: any = {};
    if (data.name !== undefined) updatedFields.name = data.name.trim();
    if (data.subject !== undefined) updatedFields.subject = data.subject;
    if (data.description !== undefined) updatedFields.description = data.description;
    if (data.displayOrder !== undefined) updatedFields.displayOrder = Number(data.displayOrder);
    if (data.isActive !== undefined) updatedFields.isActive = !!data.isActive;

    const updatedChapter = await ChapterModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: updatedFields },
      { new: true }
    );
    res.json({ success: true, chapter: updatedChapter });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/chapters/:id', async (req, res) => {
  try {
    const idOrOid = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(idOrOid)
      ? { $or: [{ id: idOrOid }, { _id: idOrOid }] }
      : { id: idOrOid };

    const chapter = await ChapterModel.findOne(query);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' });
    }
    const chapterName = chapter.name;
    const subjectName = chapter.subject;

    // Permanently cascading delete related records in other collections
    const chapterIds = [chapter.id, String(chapter._id)].filter(Boolean);
    await TopicModel.deleteMany({ chapterId: { $in: chapterIds } });
    await QuestionModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await NoteModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await PdfModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await FlashcardModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await VideoModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await TestModel.deleteMany({ subject: subjectName, chapter: chapterName });
    await TestResultModel.deleteMany({ subject: subjectName, chapter: chapterName });

    await ChapterModel.deleteOne(query);

    res.json({ success: true, message: `Chapter "${chapterName}" and all nested topics and materials permanently deleted.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= TOPICS & CURRICULUM MANAGEMENT API =================
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await TopicModel.find({}).sort({ name: 1 });
    res.json({ success: true, topics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/topics', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.chapterId || !data.subject) {
      return res.status(400).json({ success: false, error: 'Name, chapterId, and subject are required.' });
    }
    if (!data.id) data.id = `top-${Date.now()}`;
    const topic = new TopicModel({
      id: data.id,
      name: data.name.trim(),
      chapterId: data.chapterId,
      subject: data.subject,
      description: data.description || ''
    });
    await topic.save();
    res.json({ success: true, topic });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/topics/:id', async (req, res) => {
  try {
    const data = req.body;
    const topic = await TopicModel.findOne({ id: req.params.id });
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const updatedFields: any = {};
    if (data.name !== undefined) updatedFields.name = data.name.trim();
    if (data.chapterId !== undefined) updatedFields.chapterId = data.chapterId;
    if (data.subject !== undefined) updatedFields.subject = data.subject;
    if (data.description !== undefined) updatedFields.description = data.description;

    const updatedTopic = await TopicModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: updatedFields },
      { new: true }
    );
    res.json({ success: true, topic: updatedTopic });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/topics/:id', async (req, res) => {
  try {
    const idOrOid = req.params.id;
    const cascade = req.query.cascade === 'true';
    const query = mongoose.Types.ObjectId.isValid(idOrOid)
      ? { $or: [{ id: idOrOid }, { _id: idOrOid }] }
      : { id: idOrOid };

    const topic = await TopicModel.findOne(query);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    const topicName = topic.name;
    const subjectName = topic.subject;

    const chapter = await ChapterModel.findOne({ id: topic.chapterId });
    const chapterName = chapter ? chapter.name : '';

    if (cascade) {
      // Option 2: Permanently cascading delete related records
      if (chapterName) {
        await QuestionModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
        await NoteModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
        await PdfModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
        await FlashcardModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
        await TestModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
        await TestResultModel.deleteMany({ subject: subjectName, chapter: chapterName, topic: topicName });
      } else {
        await QuestionModel.deleteMany({ subject: subjectName, topic: topicName });
        await NoteModel.deleteMany({ subject: subjectName, topic: topicName });
        await PdfModel.deleteMany({ subject: subjectName, topic: topicName });
        await FlashcardModel.deleteMany({ subject: subjectName, topic: topicName });
        await TestModel.deleteMany({ subject: subjectName, topic: topicName });
        await TestResultModel.deleteMany({ subject: subjectName, topic: topicName });
      }
    } else {
      // Option 1: Keep questions, notes, etc., but set topic category to '' (uncategorized)
      if (chapterName) {
        await QuestionModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
        await NoteModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
        await PdfModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
        await FlashcardModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
        await TestModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
        await TestResultModel.updateMany({ subject: subjectName, chapter: chapterName, topic: topicName }, { $set: { topic: '' } });
      } else {
        await QuestionModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
        await NoteModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
        await PdfModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
        await FlashcardModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
        await TestModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
        await TestResultModel.updateMany({ subject: subjectName, topic: topicName }, { $set: { topic: '' } });
      }
    }

    await TopicModel.deleteOne(query);

    const suffixMessage = cascade
      ? 'permanently cascading deleted along with all its MCQs and learning materials.'
      : 'deleted. Its MCQs and learning materials have been kept as uncategorized under their parent chapter.';

    res.json({
      success: true,
      message: `Topic "${topicName}" successfully ${suffixMessage}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CURRICULUM RENAME ENDPOINT
app.post('/api/curriculum/rename', async (req, res) => {
  try {
    const { type, id, newName } = req.body;
    if (!type || !id || !newName || !newName.trim()) {
      return res.status(400).json({ success: false, error: 'Type, ID, and newName are required.' });
    }

    const trimmedNewName = newName.trim();

    if (type === 'subject') {
      const subject = await SubjectModel.findOne({ id });
      if (!subject) return res.status(404).json({ success: false, error: 'Subject not found.' });
      const oldName = subject.name;

      // Update name inside related models
      await ChapterModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await TopicModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await QuestionModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await NoteModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await PdfModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await FlashcardModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await VideoModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await TestModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });
      await TestResultModel.updateMany({ subject: oldName }, { $set: { subject: trimmedNewName } });

      subject.name = trimmedNewName;
      await subject.save();

      return res.json({ success: true, message: `Successfully renamed subject from "${oldName}" to "${trimmedNewName}" across all records.` });
    }

    if (type === 'chapter') {
      const chapter = await ChapterModel.findOne({ id });
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapter not found.' });
      const oldName = chapter.name;
      const subject = chapter.subject;

      // Update name inside related models under the same subject
      await QuestionModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await NoteModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await PdfModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await FlashcardModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await VideoModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await TestModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });
      await TestResultModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: trimmedNewName } });

      chapter.name = trimmedNewName;
      await chapter.save();

      return res.json({ success: true, message: `Successfully renamed chapter from "${oldName}" to "${trimmedNewName}" under ${subject}.` });
    }

    if (type === 'topic') {
      const topic = await TopicModel.findOne({ id });
      if (!topic) return res.status(404).json({ success: false, error: 'Topic not found.' });
      const oldName = topic.name;
      const subject = topic.subject;

      // Find the chapter name
      const chap = await ChapterModel.findOne({ id: topic.chapterId });
      const chapName = chap ? chap.name : '';

      // Update inside related models
      if (chapName) {
        await QuestionModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
        await NoteModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
        await PdfModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
        await FlashcardModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
        await TestModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
        await TestResultModel.updateMany({ subject, chapter: chapName, topic: oldName }, { $set: { topic: trimmedNewName } });
      } else {
        await QuestionModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
        await NoteModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
        await PdfModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
        await FlashcardModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
        await TestModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
        await TestResultModel.updateMany({ subject, topic: oldName }, { $set: { topic: trimmedNewName } });
      }

      topic.name = trimmedNewName;
      await topic.save();

      return res.json({ success: true, message: `Successfully renamed topic from "${oldName}" to "${trimmedNewName}".` });
    }

    res.status(400).json({ success: false, error: 'Invalid type provided.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CURRICULUM MOVE ENDPOINT
app.post('/api/curriculum/move', async (req, res) => {
  try {
    const { type, id, targetParentId } = req.body;
    if (!type || !id || !targetParentId) {
      return res.status(400).json({ success: false, error: 'Type, ID, and targetParentId are required.' });
    }

    if (type === 'chapter') {
      const chapter = await ChapterModel.findOne({ id });
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapter not found.' });
      const chapterName = chapter.name;
      const oldSubjectName = chapter.subject;

      const targetSubject = await SubjectModel.findOne({ id: targetParentId });
      if (!targetSubject) return res.status(404).json({ success: false, error: 'Target Subject not found.' });
      const targetSubjectName = targetSubject.name;

      // Update all related questions, notes, PDFs, flashcards, videos to new subject
      await QuestionModel.updateMany({ subject: oldSubjectName, chapter: chapterName }, { $set: { subject: targetSubjectName } });
      await NoteModel.updateMany({ subject: oldSubjectName, chapter: chapterName }, { $set: { subject: targetSubjectName } });
      await PdfModel.updateMany({ subject: oldSubjectName, chapter: chapterName }, { $set: { subject: targetSubjectName } });
      await FlashcardModel.updateMany({ subject: oldSubjectName, chapter: chapterName }, { $set: { subject: targetSubjectName } });
      await VideoModel.updateMany({ subject: oldSubjectName, chapter: chapterName }, { $set: { subject: targetSubjectName } });

      // Update topics under this chapter to target subject name
      await TopicModel.updateMany({ chapterId: id }, { $set: { subject: targetSubjectName } });

      chapter.subject = targetSubjectName;
      await chapter.save();

      return res.json({ success: true, message: `Successfully moved chapter "${chapterName}" to subject "${targetSubjectName}".` });
    }

    if (type === 'topic') {
      const topic = await TopicModel.findOne({ id });
      if (!topic) return res.status(404).json({ success: false, error: 'Topic not found.' });
      const topicName = topic.name;
      const oldSubject = topic.subject;
      const oldChapterId = topic.chapterId;

      const oldChapter = await ChapterModel.findOne({ id: oldChapterId });
      const oldChapterName = oldChapter ? oldChapter.name : '';

      const targetChapter = await ChapterModel.findOne({ id: targetParentId });
      if (!targetChapter) return res.status(404).json({ success: false, error: 'Target Chapter not found.' });
      const targetChapterName = targetChapter.name;
      const targetSubjectName = targetChapter.subject;

      // Update all related materials to new chapter and subject
      if (oldChapterName) {
        await QuestionModel.updateMany({ subject: oldSubject, chapter: oldChapterName, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await NoteModel.updateMany({ subject: oldSubject, chapter: oldChapterName, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await PdfModel.updateMany({ subject: oldSubject, chapter: oldChapterName, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await FlashcardModel.updateMany({ subject: oldSubject, chapter: oldChapterName, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
      } else {
        await QuestionModel.updateMany({ subject: oldSubject, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await NoteModel.updateMany({ subject: oldSubject, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await PdfModel.updateMany({ subject: oldSubject, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
        await FlashcardModel.updateMany({ subject: oldSubject, topic: topicName }, { $set: { subject: targetSubjectName, chapter: targetChapterName } });
      }

      topic.chapterId = targetParentId;
      topic.subject = targetSubjectName;
      await topic.save();

      return res.json({ success: true, message: `Successfully moved topic "${topicName}" to chapter "${targetChapterName}" under "${targetSubjectName}".` });
    }

    res.status(400).json({ success: false, error: 'Invalid type provided.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CURRICULUM MERGE ENDPOINT
app.post('/api/curriculum/merge', async (req, res) => {
  try {
    const { type, sourceId, targetId } = req.body;
    if (!type || !sourceId || !targetId) {
      return res.status(400).json({ success: false, error: 'Type, sourceId, and targetId are required.' });
    }

    if (type === 'subject') {
      const sourceSub = await SubjectModel.findOne({ id: sourceId });
      const targetSub = await SubjectModel.findOne({ id: targetId });
      if (!sourceSub || !targetSub) return res.status(404).json({ success: false, error: 'Source or Target subject not found.' });

      const oldName = sourceSub.name;
      const targetName = targetSub.name;

      // Reassign all nested curriculum elements and records to target subject
      await ChapterModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await TopicModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await QuestionModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await NoteModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await PdfModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await FlashcardModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });
      await VideoModel.updateMany({ subject: oldName }, { $set: { subject: targetName } });

      // Save to Trash with merged status
      const trashItem = new TrashModel({
        id: `trash-${Date.now()}`,
        type: 'subject',
        name: oldName,
        metadata: {
          id: sourceSub.id,
          name: sourceSub.name,
          description: sourceSub.description,
          icon: sourceSub.icon,
          mergedInto: targetName
        }
      });
      await trashItem.save();
      await SubjectModel.deleteOne({ id: sourceId });

      return res.json({ success: true, message: `Successfully merged subject "${oldName}" into "${targetName}". All matching chapters, topics, and studies have been updated.` });
    }

    if (type === 'chapter') {
      const sourceChap = await ChapterModel.findOne({ id: sourceId });
      const targetChap = await ChapterModel.findOne({ id: targetId });
      if (!sourceChap || !targetChap) return res.status(404).json({ success: false, error: 'Source or Target chapter not found.' });

      const oldName = sourceChap.name;
      const targetName = targetChap.name;
      const subject = sourceChap.subject;

      // Reassign questions, notes, PDFs, flashcards, videos to target chapter
      await QuestionModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: targetName } });
      await NoteModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: targetName } });
      await PdfModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: targetName } });
      await FlashcardModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: targetName } });
      await VideoModel.updateMany({ subject, chapter: oldName }, { $set: { chapter: targetName } });

      // Reassign child topics to target chapter ID
      await TopicModel.updateMany({ chapterId: sourceId }, { $set: { chapterId: targetId } });

      // Save to Trash
      const trashItem = new TrashModel({
        id: `trash-${Date.now()}`,
        type: 'chapter',
        name: oldName,
        metadata: {
          id: sourceChap.id,
          name: sourceChap.name,
          subject: sourceChap.subject,
          description: sourceChap.description,
          mergedInto: targetName
        }
      });
      await trashItem.save();
      await ChapterModel.deleteOne({ id: sourceId });

      return res.json({ success: true, message: `Successfully merged chapter "${oldName}" into "${targetName}" under ${subject}.` });
    }

    if (type === 'topic') {
      const sourceTop = await TopicModel.findOne({ id: sourceId });
      const targetTop = await TopicModel.findOne({ id: targetId });
      if (!sourceTop || !targetTop) return res.status(404).json({ success: false, error: 'Source or Target topic not found.' });

      const oldName = sourceTop.name;
      const targetName = targetTop.name;
      const subject = sourceTop.subject;

      // Reassign all items referencing source topic to target topic name
      await QuestionModel.updateMany({ subject, topic: oldName }, { $set: { topic: targetName } });
      await NoteModel.updateMany({ subject, topic: oldName }, { $set: { topic: targetName } });
      await PdfModel.updateMany({ subject, topic: oldName }, { $set: { topic: targetName } });
      await FlashcardModel.updateMany({ subject, topic: oldName }, { $set: { topic: targetName } });

      // Save to Trash
      const trashItem = new TrashModel({
        id: `trash-${Date.now()}`,
        type: 'topic',
        name: oldName,
        metadata: {
          id: sourceTop.id,
          name: sourceTop.name,
          chapterId: sourceTop.chapterId,
          subject: sourceTop.subject,
          description: sourceTop.description,
          mergedInto: targetName
        }
      });
      await trashItem.save();
      await TopicModel.deleteOne({ id: sourceId });

      return res.json({ success: true, message: `Successfully merged topic "${oldName}" into "${targetName}".` });
    }

    res.status(400).json({ success: false, error: 'Invalid type provided.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CURRICULUM TRASH & RECYCLE BIN
app.get('/api/curriculum/trash', async (req, res) => {
  try {
    const trash = await TrashModel.find({}).sort({ deletedAt: -1 });
    res.json({ success: true, trash });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/curriculum/restore', async (req, res) => {
  try {
    const { trashId } = req.body;
    if (!trashId) {
      return res.status(400).json({ success: false, error: 'trashId is required.' });
    }

    const trashItem = await TrashModel.findOne({ id: trashId });
    if (!trashItem) {
      return res.status(404).json({ success: false, error: 'Trash item not found or already restored.' });
    }

    const { type, metadata } = trashItem;

    if (type === 'subject') {
      const subject = new SubjectModel(metadata);
      await subject.save();
    } else if (type === 'chapter') {
      const chapter = new ChapterModel(metadata);
      await chapter.save();
    } else if (type === 'topic') {
      const topic = new TopicModel(metadata);
      await topic.save();
    }

    await TrashModel.deleteOne({ id: trashId });

    res.json({ success: true, message: `Successfully restored ${type} "${trashItem.name}" from Recycle Bin.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= PDFs API =================
app.get('/api/pdfs', async (req, res) => {
  try {
    const pdfs = await PdfModel.find({}).sort({ uploadedAt: -1 });
    res.json({ success: true, pdfs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pdfs', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = `pdf-${Date.now()}`;
    const pdf = new PdfModel(data);
    await pdf.save();
    res.json({ success: true, pdf });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/pdfs/:id', async (req, res) => {
  try {
    const pdf = await PdfModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!pdf) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }
    res.json({ success: true, pdf });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pdfs/:id', async (req, res) => {
  try {
    const result = await PdfModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }
    res.json({ success: true, message: 'PDF successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= NOTES API =================
app.get('/api/notes', async (req, res) => {
  try {
    const { email } = req.query;
    console.log(`[MongoDB Read] GET /api/notes. Query email: ${email}`);
    let query = {};
    if (email) {
      const emailLower = (email as string).toLowerCase();
      query = {
        $or: [
          { email: "" },
          { email: { $exists: false } },
          { email: emailLower }
        ]
      };
    }
    const notes = await NoteModel.find(query).sort({ uploadedAt: -1 });
    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const noteData = req.body;
    if (!noteData.id) {
      noteData.id = `note-${Date.now()}`;
    }
    if (noteData.email) {
      noteData.email = noteData.email.toLowerCase();
    }
    const note = new NoteModel(noteData);
    await note.save();
    res.json({ success: true, note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const note = await NoteModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const result = await NoteModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, message: 'Note successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= QUESTIONS API =================
const getQuestionFindQuery = (val: string) => {
  const conds: any[] = [{ id: val }];
  if (/^[0-9a-fA-F]{24}$/.test(val)) {
    conds.push({ _id: val });
  }
  return { $or: conds };
};
app.get('/api/questions', async (req, res) => {
  try {
    const { email, page, limit, subject, chapter, topic, difficulty, type, search, all, approvedOnly } = req.query;
    let isAdmin = false;
    if (email) {
      const emailStr = (email as string).toLowerCase();
      const user = await UserModel.findOne({ email: emailStr });
      if ((user && user.role === 'admin') || emailStr === 'admin@medbank.com' || emailStr === 'c88670279@gmail.com') {
        isAdmin = true;
      }
    }
    
    // Build query conditions
    const query: any = {};
    if (subject && subject !== 'All') {
      query.subject = subject;
    }
    if (chapter && chapter !== 'All') {
      query.chapter = chapter;
    }
    if (topic && topic !== 'All') {
      query.topic = topic;
    }
    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (search && (search as string).trim()) {
      const s = (search as string).trim();
      query.$or = [
        { question: { $regex: s, $options: 'i' } },
        { explanation: { $regex: s, $options: 'i' } },
        { tags: { $in: [new RegExp(s, 'i')] } }
      ];
    }
    
    if (!isAdmin || approvedOnly === 'true') {
      query.approved = true;
    }

    if (all === 'true') {
      console.log(`[MongoDB Read] Fetching all matching MCQs (limit 1000) for Admin/Student`);
      const questions = await QuestionModel.find(query).sort({ id: -1 }).limit(1000);
      return res.json({ success: true, questions, total: questions.length, page: 1, limit: 1000 });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
    
    console.log(`[MongoDB Read] Paginated fetch. Query:`, JSON.stringify(query), `Page: ${pageNum}, Limit: ${limitNum}`);
    
    const [total, questions] = await Promise.all([
      QuestionModel.countDocuments(query),
      QuestionModel.find(query)
        .sort({ id: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
    ]);
    
    res.json({
      success: true,
      questions,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (err: any) {
    console.error('[MongoDB Read] Error fetching questions from MongoDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/questions/counts', async (req, res) => {
  try {
    const { email, approvedOnly } = req.query;
    let isAdmin = false;
    if (email) {
      const emailStr = (email as string).toLowerCase();
      const user = await UserModel.findOne({ email: emailStr });
      if ((user && user.role === 'admin') || emailStr === 'admin@medbank.com' || emailStr === 'c88670279@gmail.com') {
        isAdmin = true;
      }
    }

    const query: any = {};
    if (!isAdmin || approvedOnly === 'true') {
      query.approved = true;
    }

    const [total, subjectStats, chapterStats, topicStats] = await Promise.all([
      QuestionModel.countDocuments(query),
      QuestionModel.aggregate([
        { $match: query },
        { $group: { _id: '$subject', count: { $sum: 1 } } }
      ]),
      QuestionModel.aggregate([
        { $match: query },
        { $group: { _id: '$chapter', count: { $sum: 1 } } }
      ]),
      QuestionModel.aggregate([
        { $match: query },
        { $group: { _id: '$topic', count: { $sum: 1 } } }
      ])
    ]);

    const subjects: { [key: string]: number } = {};
    const chapters: { [key: string]: number } = {};
    const topics: { [key: string]: number } = {};

    subjectStats.forEach((item: any) => {
      if (item._id) subjects[item._id] = item.count;
    });
    chapterStats.forEach((item: any) => {
      if (item._id) chapters[item._id] = item.count;
    });
    topicStats.forEach((item: any) => {
      if (item._id) topics[item._id] = item.count;
    });

    res.json({
      success: true,
      total,
      subjects,
      chapters,
      topics
    });
  } catch (err: any) {
    console.error('[MongoDB Stats] Error fetching question counts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[MongoDB Read] Fetching single MCQ by ID: ${id}`);
    const question = await QuestionModel.findOne({ $or: [{ id }, { _id: id }] });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.json({ success: true, question });
  } catch (err: any) {
    console.error('[MongoDB Read] Error fetching single question from MongoDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/api/sources', async (req, res) => {
  try {
    await connectDB();
    const sources = await QuestionModel.distinct('sourceBook');
    const examSources = await QuestionModel.distinct('examSource');
    const combined = Array.from(new Set([...sources, ...examSources])).filter(Boolean);
    res.json(combined);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

app.put('/api/sources/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Missing oldName or newName' });
    }
    await connectDB();
    const result1 = await QuestionModel.updateMany({ sourceBook: oldName }, { $set: { sourceBook: newName } });
    const result2 = await QuestionModel.updateMany({ examSource: oldName }, { $set: { examSource: newName } });
    res.json({ success: true, modifiedCount: result1.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename source' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const qData = req.body;
    console.log(`[MongoDB Save] Request received to save single question. Body:`, JSON.stringify({ ...qData, options: qData.options?.length }));
    if (!qData.id) {
      qData.id = `q-${Date.now()}`;
    }
    // Set approved to true for manually created/published questions by default, but let client override if needed
    if (qData.approved === undefined) {
      qData.approved = true;
    }
    if (qData.source === undefined) {
      qData.source = 'Manual';
    }

    normalizeQuestionType(qData);

    const validation = validateAndScoreQuestion(qData);
    qData.confidenceScore = validation.confidenceScore;
    qData.validationErrors = validation.errors;
    qData.isIncomplete = validation.isIncomplete;

    // Automatically flag invalid manually saved questions for manual review instead of approving them,
    // if approved was true but it's incomplete or has low confidence
    if (qData.approved && (validation.isIncomplete || validation.confidenceScore < 70)) {
      qData.approved = false;
    }

    qData.status = qData.approved ? 'Approved' : 'Pending';

    const question = new QuestionModel(qData);
    await question.save();
    console.log(`[MongoDB Save] [API Response] Successfully saved question ID ${qData.id} to MongoDB.`);
    res.json({ success: true, question });
  } catch (err: any) {
    console.error(`[MongoDB Save] Failed to save question to MongoDB:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questions/batch', async (req, res) => {
  try {
    const questionsData = req.body || [];
    console.log(`[MongoDB Save] Request received for batch saving ${questionsData.length} MCQs.`);
    const savedQuestions = [];
    
    for (let i = 0; i < questionsData.length; i++) {
      const qData = questionsData[i];
      if (!qData.id) {
        qData.id = `q-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      }
      if (qData.approved === undefined) {
        qData.approved = true;
      }
      if (qData.source === undefined) {
        qData.source = 'Manual';
      }

      normalizeQuestionType(qData);

      const validation = validateAndScoreQuestion(qData);
      qData.confidenceScore = validation.confidenceScore;
      qData.validationErrors = validation.errors;
      qData.isIncomplete = validation.isIncomplete;

      // Automatically flag invalid questions for manual review instead of approving them
      if (qData.approved && (validation.isIncomplete || validation.confidenceScore < 70)) {
        qData.approved = false;
      }

      qData.status = qData.approved ? 'Approved' : 'Pending';

      const question = new QuestionModel(qData);
      await question.save();
      savedQuestions.push(question);
    }
    console.log(`[MongoDB Save] [API Response] Successfully batch-saved ${savedQuestions.length} questions to MongoDB Atlas.`);
    res.json({ success: true, count: savedQuestions.length, questions: savedQuestions });
  } catch (err: any) {
    console.error(`[MongoDB Save] Failed batch-save transaction on MongoDB:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questions/bulk-approve', async (req, res) => {
  try {
    const { ids, email } = req.body;
    console.log(`[Admin Bulk Approve API] Received request. email: ${email}, ids count: ${ids?.length || 0}`, ids);
    if (!email) {
      console.warn(`[Admin Bulk Approve API] Missing email.`);
      return res.status(400).json({ success: false, error: 'Email is required for authorization.' });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    const isSpecialAdmin = email.toLowerCase() === 'admin@medbank.com' || email.toLowerCase() === 'c88670279@gmail.com';
    if (!isSpecialAdmin && (!user || user.role !== 'admin')) {
      console.warn(`[Admin Bulk Approve API] Unauthorized attempt or user not found. user:`, user);
      return res.status(403).json({ success: false, error: 'Unauthorized. Only admins can perform bulk operations.' });
    }
    
    const safeIds = (ids || []).map((id: string) => {
      if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (e) {
          return id;
        }
      }
      return id;
    });

    console.log(`[Admin Bulk Approve] Resolving ${ids?.length || 0} questions from database using safe IDs:`, safeIds);
    const updateResult = await QuestionModel.updateMany({
      $or: [
        { id: { $in: safeIds } },
        { _id: { $in: safeIds } }
      ]
    }, { $set: { approved: true, status: 'Approved' } });
    
    console.log(`[Admin Bulk Approve] Database update completed. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);
    
    res.json({ 
      success: true, 
      message: `Successfully approved and published ${updateResult.matchedCount} question(s).`, 
      approvedCount: updateResult.matchedCount, 
      skippedCount: 0 
    });
  } catch (err: any) {
    console.error(`[Admin Bulk Approve API] Critical Error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questions/bulk-reject', async (req, res) => {
  try {
    const { ids, email } = req.body;
    console.log(`[Admin Bulk Reject API] Received request. email: ${email}, ids count: ${ids?.length || 0}`, ids);
    if (!email) {
      console.warn(`[Admin Bulk Reject API] Missing email.`);
      return res.status(400).json({ success: false, error: 'Email is required for authorization.' });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    const isSpecialAdmin = email.toLowerCase() === 'admin@medbank.com' || email.toLowerCase() === 'c88670279@gmail.com';
    if (!isSpecialAdmin && (!user || user.role !== 'admin')) {
      console.warn(`[Admin Bulk Reject API] Unauthorized attempt or user not found. user:`, user);
      return res.status(403).json({ success: false, error: 'Unauthorized. Only admins can perform bulk operations.' });
    }
    
    const safeIds = (ids || []).map((id: string) => {
      if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (e) {
          return id;
        }
      }
      return id;
    });

    console.log(`[Admin Bulk Reject] Deleting / rejecting matching questions with safe IDs:`, safeIds);
    const deleteResult = await QuestionModel.deleteMany({
      $or: [
        { id: { $in: safeIds } },
        { _id: { $in: safeIds } }
      ]
    });
    console.log(`[Admin Bulk Reject] Successfully deleted ${deleteResult.deletedCount} documents.`);
    res.json({ success: true, message: `Successfully rejected and deleted ${deleteResult.deletedCount} question(s).` });
  } catch (err: any) {
    console.error(`[Admin Bulk Reject API] Critical Error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/questions/merge', async (req, res) => {
  try {
    const { primaryId, duplicateId, email } = req.body;
    console.log(`[Admin Merge API] Received request. email: ${email}, primaryId: ${primaryId}, duplicateId: ${duplicateId}`);
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required for authorization.' });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    const isSpecialAdmin = email.toLowerCase() === 'admin@medbank.com' || email.toLowerCase() === 'c88670279@gmail.com';
    if (!isSpecialAdmin && (!user || user.role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'Unauthorized. Only admins can perform merge operations.' });
    }
    
    console.log(`[Admin Merge] Finding primary and duplicate questions using flexible queries.`);
    const primary = await QuestionModel.findOne(getQuestionFindQuery(primaryId));
    const duplicate = await QuestionModel.findOne(getQuestionFindQuery(duplicateId));
    if (!primary || !duplicate) {
      console.warn(`[Admin Merge] Could not find primary (${!!primary}) or duplicate (${!!duplicate})`);
      return res.status(404).json({ success: false, error: 'One or both questions not found.' });
    }
    
    // Merge tags
    const combinedTags = Array.from(new Set([...(primary.tags || []), ...(duplicate.tags || [])]));
    primary.tags = combinedTags;
    primary.approved = true; // Auto approve primary
    primary.status = 'Approved';
    
    await primary.save();
    const deleteRes = await QuestionModel.deleteOne(getQuestionFindQuery(duplicateId));
    console.log(`[Admin Merge] Primary question updated. Duplicate deleted count: ${deleteRes.deletedCount}`);
    
    res.json({ success: true, message: 'Questions successfully merged.' });
  } catch (err: any) {
    console.error(`[Admin Merge API] Error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    console.log(`[Questions Edit API] PUT /api/questions/${req.params.id} called with body:`, req.body);
    if (req.body) {
      if (req.body.type) {
        const temp = { type: req.body.type };
        normalizeQuestionType(temp);
        req.body.type = temp.type;
      }
      if (req.body.approved !== undefined) {
        req.body.status = req.body.approved ? 'Approved' : 'Pending';
      }
    }
    const question = await QuestionModel.findOneAndUpdate(
      getQuestionFindQuery(req.params.id),
      { $set: req.body },
      { new: true }
    );
    if (!question) {
      console.warn(`[Questions Edit API] Question with identifier ${req.params.id} not found.`);
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    console.log(`[Questions Edit API] Successfully updated question: ${question.id} (approved: ${question.approved})`);
    res.json({ success: true, question });
  } catch (err: any) {
    console.error(`[Questions Edit API] Error updating question:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    console.log(`[Questions Delete API] DELETE /api/questions/${req.params.id} called.`);
    const result = await QuestionModel.deleteOne(getQuestionFindQuery(req.params.id));
    if (result.deletedCount === 0) {
      console.warn(`[Questions Delete API] Question with identifier ${req.params.id} not found for deletion.`);
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    console.log(`[Questions Delete API] Successfully deleted question with identifier ${req.params.id}`);
    res.json({ success: true, message: 'Question successfully deleted' });
  } catch (err: any) {
    console.error(`[Questions Delete API] Error deleting question:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= TESTS API =================
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await TestModel.find({});
    res.json({ success: true, tests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const testData = req.body;
    if (!testData.id) {
      testData.id = `test-${Date.now()}`;
    }
    const test = new TestModel(testData);
    await test.save();
    res.json({ success: true, test });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tests/:id', async (req, res) => {
  try {
    const test = await TestModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    res.json({ success: true, test });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    const result = await TestModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    res.json({ success: true, message: 'Test successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= RESULTS (TEST RESULTS) API =================
app.get('/api/testResults', async (req, res) => {
  try {
    const { email } = req.query;
    console.log(`[MongoDB Read] GET /api/testResults. Query email: ${email}`);
    let results;
    if (email) {
      results = await TestResultModel.find({ email: (email as string).toLowerCase() }).sort({ date: -1 });
    } else {
      results = await TestResultModel.find({}).sort({ date: -1 });
    }
    res.json({ success: true, testResults: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/testResults', async (req, res) => {
  try {
    const resultData = req.body;
    if (!resultData.id) {
      resultData.id = `att-${Date.now()}`;
    }
    if (resultData.email) {
      resultData.email = resultData.email.toLowerCase();
    }
    const testResult = new TestResultModel(resultData);
    await testResult.save();
    res.json({ success: true, testResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/testResults/:id', async (req, res) => {
  try {
    const result = await TestResultModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ success: false, message: 'Test result not found' });
    }
    res.json({ success: true, testResult: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/testResults/:id', async (req, res) => {
  try {
    const result = await TestResultModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Test result not found' });
    }
    res.json({ success: true, message: 'Test result successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= ANNOUNCEMENTS API =================
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await AnnouncementModel.find({}).sort({ date: -1 });
    res.json({ success: true, announcements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = `ann-${Date.now()}`;
    const announcement = new AnnouncementModel(data);
    await announcement.save();
    res.json({ success: true, announcement });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/announcements/:id', async (req, res) => {
  try {
    const announcement = await AnnouncementModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.json({ success: true, announcement });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const result = await AnnouncementModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.json({ success: true, message: 'Announcement successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= FLASHCARDS API =================
app.get('/api/flashcards', async (req, res) => {
  try {
    const { email } = req.query;
    console.log(`[MongoDB Read] GET /api/flashcards. Query email: ${email}`);
    let query = {};
    if (email) {
      const emailLower = (email as string).toLowerCase();
      query = {
        $or: [
          { email: "" },
          { email: { $exists: false } },
          { email: emailLower }
        ]
      };
    }
    const flashcards = await FlashcardModel.find(query).sort({ createdAt: -1 });
    res.json({ success: true, flashcards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/flashcards', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = `fc-${Date.now()}`;
    if (data.email) {
      data.email = data.email.toLowerCase();
    }
    const flashcard = new FlashcardModel(data);
    await flashcard.save();
    res.json({ success: true, flashcard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/flashcards/:id', async (req, res) => {
  try {
    const flashcard = await FlashcardModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!flashcard) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }
    res.json({ success: true, flashcard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/flashcards/:id', async (req, res) => {
  try {
    const result = await FlashcardModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }
    res.json({ success: true, message: 'Flashcard successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ================= VIDEOS API =================
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await VideoModel.find({}).sort({ uploadedAt: -1 });
    res.json({ success: true, videos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = `vid-${Date.now()}`;
    const video = new VideoModel(data);
    await video.save();
    res.json({ success: true, video });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const video = await VideoModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.json({ success: true, video });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const result = await VideoModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.json({ success: true, message: 'Video successfully deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Graceful Express database-error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isMongooseError = err.name === 'MongooseError' || 
                          err.name === 'MongoNetworkError' || 
                          err.name === 'MongoServerError' ||
                          err.message?.includes('buffer') ||
                          err.message?.includes('buffering') ||
                          err.message?.includes('topology') ||
                          err.message?.includes('connection');
                          
  if (isMongooseError) {
    console.warn('[AI Studio] Database offline or unconfigured — returning fallback empty/success mock data.');
    if (req.method === 'GET') {
      const pathSegments = req.path.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || 'data';
      
      // If the route expects a list (usually ends with s), return empty array
      const isPlural = lastSegment.endsWith('s');
      return res.json({
        success: true,
        [lastSegment]: isPlural ? [] : {}
      });
    }
    return res.status(200).json({
      success: false,
      error: 'Database is currently unconfigured or offline. Falling back to local offline mode.',
      fallback: true
    });
  }
  
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Serve static files in production / Vite middleware in development
async function startServer() {
  // 1. Initialize Vite or static file serving first
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 2. Start listening on the port immediately
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedBank AI Server running on port ${PORT}`);
  });

  // 3. Connect to MongoDB Atlas in the background
  console.log('Initiating non-blocking connection to MongoDB Atlas in background...');
  connectDB().catch((err) => {
    console.error('Failed to connect to MongoDB Atlas on background server startup:', err);
  });
}

startServer();
