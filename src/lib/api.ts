import { MCQ } from '../types';
import { safeStorage } from './safeStorage';

const originalFetch = window.fetch;
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await originalFetch(input, init);
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('text/html') || response.url.includes('__cookie_check') || response.redirected) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('iframe-cookie-restriction-detected'));
    }
    return new Response(JSON.stringify({
      success: false,
      error: 'Iframe Session/Cookie Restriction: Your browser is blocking third-party cookies inside the preview iframe. Please click "Open in New Tab" in the top-right corner to run the application with full capabilities.',
      iframeRestriction: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const clone = response.clone();
  try {
    const text = await clone.text();
    if (text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('iframe-cookie-restriction-detected'));
      }
      return new Response(JSON.stringify({
        success: false,
        error: 'Iframe Session/Cookie Restriction: Received HTML instead of JSON. Your browser is blocking third-party cookies inside the preview iframe. Please click "Open in New Tab" in the top-right corner.',
        iframeRestriction: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    // Ignore reading error
  }

  return response;
};

// Shadow fetch globally in this module scope
const fetch = customFetch;

export async function explainAnswer(params: {
  question: string;
  optionSelected: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  subject?: string;
}): Promise<string> {
  try {
    const response = await fetch('/api/gemini/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (data.success) {
      return data.text;
    }
    throw new Error(data.error || 'Failed to explain answer');
  } catch (error: any) {
    console.error('Error fetching AI explanation:', error);
    return `### 🩺 Study Clinical Pearl (Network Error)
    
*Could not fetch dynamic AI response: ${error.message || 'Server connection failed'}*

**Textbook Highlight:**
${params.explanation}

*Verify that your server is running and your GEMINI_API_KEY is configured correctly in the Secrets panel.*`;
  }
}

export async function generateMCQFromText(params: {
  topic: string;
  subject: string;
  notesText: string;
}): Promise<MCQ> {
  const response = await fetch('/api/gemini/generate-mcq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (data.success) {
    return data.mcq;
  }
  throw new Error(data.error || 'Failed to generate MCQ');
}

export async function summarizeTopic(params: {
  topic: string;
  contextText: string;
  subject: string;
}): Promise<string> {
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (data.success) {
    return data.text;
  }
  throw new Error(data.error || 'Failed to generate summary');
}

export async function generateMnemonics(params: {
  topic: string;
  termsToMemorize: string;
  subject: string;
}): Promise<string> {
  const response = await fetch('/api/gemini/mnemonics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (data.success) {
    return data.text;
  }
  throw new Error(data.error || 'Failed to generate mnemonic');
}

// --- MongoDB Atlas Persistent API Integration ---

export async function fetchDBNotes(email?: string): Promise<any[]> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = email || (userStr ? JSON.parse(userStr).email : '');
    const url = userEmail ? `/api/notes?email=${encodeURIComponent(userEmail)}` : '/api/notes';
    const response = await fetch(url);
    const data = await response.json();
    return data.success ? data.notes : [];
  } catch (error) {
    console.error('Error fetching notes from MongoDB:', error);
    return [];
  }
}

export async function saveDBNote(note: any): Promise<boolean> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = userStr ? JSON.parse(userStr).email : '';
    if (userEmail && !note.email) {
      note.email = userEmail;
    }
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving note to MongoDB:', error);
    return false;
  }
}

export async function fetchDBQuestions(
  email?: string,
  params: {
    page?: number;
    limit?: number;
    subject?: string;
    chapter?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    search?: string;
    all?: boolean;
    approvedOnly?: boolean;
  } = {}
): Promise<any> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = email || (userStr ? JSON.parse(userStr).email : '');
    const queryParams = new URLSearchParams();
    if (userEmail) queryParams.append('email', userEmail);
    if (params.page !== undefined) queryParams.append('page', String(params.page));
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params.subject) queryParams.append('subject', params.subject);
    if (params.chapter) queryParams.append('chapter', params.chapter);
    if (params.topic) queryParams.append('topic', params.topic);
    if (params.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params.type) queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    if (params.all) queryParams.append('all', 'true');
    if (params.approvedOnly) queryParams.append('approvedOnly', 'true');

    const url = `/api/questions?${queryParams.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.success) {
      if (params.page !== undefined || params.limit !== undefined) {
        return {
          questions: data.questions || [],
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 50
        };
      }
      return data.questions || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching questions from MongoDB:', error);
    return [];
  }
}

export async function fetchDBQuestionCounts(email?: string, approvedOnly?: boolean): Promise<{
  total: number;
  subjects: { [key: string]: number };
  chapters: { [key: string]: number };
  topics: { [key: string]: number };
}> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = email || (userStr ? JSON.parse(userStr).email : '');
    const queryParams = new URLSearchParams();
    if (userEmail) queryParams.append('email', userEmail);
    if (approvedOnly) queryParams.append('approvedOnly', 'true');

    const response = await fetch(`/api/questions/counts?${queryParams.toString()}`);
    const data = await response.json();
    if (data.success) {
      return {
        total: data.total || 0,
        subjects: data.subjects || {},
        chapters: data.chapters || {},
        topics: data.topics || {}
      };
    }
    return { total: 0, subjects: {}, chapters: {}, topics: {} };
  } catch (error) {
    console.error('Error fetching question counts:', error);
    return { total: 0, subjects: {}, chapters: {}, topics: {} };
  }
}

export async function fetchDBQuestion(id: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/questions/${encodeURIComponent(id)}`);
    const data = await response.json();
    return data.success ? data.question : null;
  } catch (error) {
    console.error('Error fetching single question from MongoDB:', error);
    return null;
  }
}

export async function bulkApproveQuestions(ids: string[], email: string): Promise<{ success: boolean; message?: string; approvedCount?: number; skippedCount?: number }> {
  try {
    const response = await fetch('/api/questions/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, email })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in bulkApproveQuestions:', error);
    return { success: false, message: 'Network error or bulk approval failed.' };
  }
}

export async function bulkRejectQuestions(ids: string[], email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/questions/bulk-reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, email })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error in bulkRejectQuestions:', error);
    return false;
  }
}

export async function mergeDuplicateQuestions(primaryId: string, duplicateId: string, email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/questions/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryId, duplicateId, email })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error in mergeDuplicateQuestions:', error);
    return false;
  }
}

export async function saveDBQuestion(question: any): Promise<boolean> {
  try {
    const response = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving question to MongoDB:', error);
    return false;
  }
}

export async function deleteDBQuestion(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/questions/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting question from MongoDB:', error);
    return false;
  }
}

export async function fetchDBUser(email: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(email)}`);
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Error fetching user from MongoDB:', error);
    return null;
  }
}

export async function registerUser(params: { email: string; name: string; role: string; password?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Registration API error:', error);
    return { success: false, error: error.message || 'Network connection failed during registration.' };
  }
}

export async function loginUser(email: string, password?: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Login API error:', error);
    return { success: false, error: error.message || 'Network connection failed during login.' };
  }
}

export async function saveDBUser(user: any): Promise<boolean> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving user to MongoDB:', error);
    return false;
  }
}

export async function fetchDBTestResults(email?: string): Promise<any[]> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = email || (userStr ? JSON.parse(userStr).email : '');
    const url = userEmail ? `/api/testResults?email=${encodeURIComponent(userEmail)}` : '/api/testResults';
    const response = await fetch(url);
    const data = await response.json();
    return data.success ? data.testResults : [];
  } catch (error) {
    console.error('Error fetching test results from MongoDB:', error);
    return [];
  }
}

export async function saveDBTestResult(result: any): Promise<boolean> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = userStr ? JSON.parse(userStr).email : '';
    if (userEmail && !result.email) {
      result.email = userEmail;
    }
    const response = await fetch('/api/testResults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving test result to MongoDB:', error);
    return false;
  }
}

export async function deleteDBTestResult(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/testResults/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting test result:', error);
    return false;
  }
}

// Subjects
export async function fetchDBSubjects(): Promise<any[]> {
  try {
    const response = await fetch('/api/subjects');
    const data = await response.json();
    return data.success ? data.subjects : [];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
}

export async function saveDBSubject(subject: any): Promise<boolean> {
  try {
    const method = subject.isEdit ? 'PUT' : 'POST';
    const url = subject.isEdit ? `/api/subjects/${subject.id}` : '/api/subjects';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving subject:', error);
    return false;
  }
}

export async function deleteDBSubject(id: string, cascade?: boolean): Promise<boolean> {
  try {
    const url = `/api/subjects/${id}?cascade=${cascade ? 'true' : 'false'}`;
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting subject:', error);
    return false;
  }
}

// Chapters
export async function fetchDBChapters(): Promise<any[]> {
  try {
    const response = await fetch('/api/chapters');
    const data = await response.json();
    return data.success ? data.chapters : [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
}

export async function saveDBChapter(chapter: any): Promise<{ success: boolean; error?: string }> {
  try {
    const method = chapter.isEdit ? 'PUT' : 'POST';
    const url = chapter.isEdit ? `/api/chapters/${chapter.id}` : '/api/chapters';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapter)
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error };
  } catch (error: any) {
    console.error('Error saving chapter:', error);
    return { success: false, error: error.message || 'Network error occurred while saving chapter.' };
  }
}

export async function deleteDBChapter(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return false;
  }
}

// Topics
export async function fetchDBTopics(): Promise<any[]> {
  try {
    const response = await fetch('/api/topics');
    const data = await response.json();
    return data.success ? data.topics : [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

export async function saveDBTopic(topic: any): Promise<{ success: boolean; error?: string }> {
  try {
    const method = topic.isEdit ? 'PUT' : 'POST';
    const url = topic.isEdit ? `/api/topics/${topic.id}` : '/api/topics';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(topic)
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error };
  } catch (error: any) {
    console.error('Error saving topic:', error);
    return { success: false, error: error.message || 'Network error occurred while saving topic.' };
  }
}

export async function deleteDBTopic(id: string, cascade?: boolean): Promise<boolean> {
  try {
    const url = `/api/topics/${id}?cascade=${cascade ? 'true' : 'false'}`;
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting topic:', error);
    return false;
  }
}

// Curriculum Operations (Rename, Move, Merge, Recycle Bin)
export async function renameCurriculumItem(type: 'subject' | 'chapter' | 'topic', id: string, newName: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/curriculum/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, newName })
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error, message: data.message };
  } catch (error: any) {
    console.error('Error renaming curriculum item:', error);
    return { success: false, error: error.message || 'Network error.' };
  }
}

export async function moveCurriculumItem(type: 'chapter' | 'topic', id: string, targetParentId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/curriculum/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, targetParentId })
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error, message: data.message };
  } catch (error: any) {
    console.error('Error moving curriculum item:', error);
    return { success: false, error: error.message || 'Network error.' };
  }
}

export async function mergeCurriculumItem(type: 'subject' | 'chapter' | 'topic', sourceId: string, targetId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/curriculum/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, sourceId, targetId })
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error, message: data.message };
  } catch (error: any) {
    console.error('Error merging curriculum items:', error);
    return { success: false, error: error.message || 'Network error.' };
  }
}

export async function fetchCurriculumTrash(): Promise<any[]> {
  try {
    const response = await fetch('/api/curriculum/trash');
    const data = await response.json();
    return data.success ? data.trash : [];
  } catch (error) {
    console.error('Error fetching curriculum trash:', error);
    return [];
  }
}

export async function restoreCurriculumItem(trashId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/curriculum/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashId })
    });
    const data = await response.json();
    return { success: !!data.success, error: data.error, message: data.message };
  } catch (error: any) {
    console.error('Error restoring curriculum item:', error);
    return { success: false, error: error.message || 'Network error.' };
  }
}

// PDFs
export async function fetchDBPdfs(): Promise<any[]> {
  try {
    const response = await fetch('/api/pdfs');
    const data = await response.json();
    return data.success ? data.pdfs : [];
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    return [];
  }
}

export async function saveDBPdf(pdf: any): Promise<boolean> {
  try {
    const method = pdf.isEdit ? 'PUT' : 'POST';
    const url = pdf.isEdit ? `/api/pdfs/${pdf.id}` : '/api/pdfs';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdf)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving PDF:', error);
    return false;
  }
}

export async function deleteDBPdf(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/pdfs/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return false;
  }
}

// Notes Add/Edit/Delete
export async function saveDBNoteWithEdit(note: any): Promise<boolean> {
  try {
    const method = note.isEdit ? 'PUT' : 'POST';
    const url = note.isEdit ? `/api/notes/${note.id}` : '/api/notes';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving note:', error);
    return false;
  }
}

export async function deleteDBNote(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

// Questions Add/Edit/Delete
export async function saveDBQuestionWithEdit(question: any): Promise<boolean> {
  try {
    const method = question.isEdit ? 'PUT' : 'POST';
    const url = question.isEdit ? `/api/questions/${question.id}` : '/api/questions';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving question:', error);
    return false;
  }
}

// Tests
export async function fetchDBTests(): Promise<any[]> {
  try {
    const response = await fetch('/api/tests');
    const data = await response.json();
    return data.success ? data.tests : [];
  } catch (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
}

export async function saveDBTest(test: any): Promise<boolean> {
  try {
    const method = test.isEdit ? 'PUT' : 'POST';
    const url = test.isEdit ? `/api/tests/${test.id}` : '/api/tests';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving test:', error);
    return false;
  }
}

export async function deleteDBTest(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting test:', error);
    return false;
  }
}

// Announcements
export async function fetchDBAnnouncements(): Promise<any[]> {
  try {
    const response = await fetch('/api/announcements');
    const data = await response.json();
    return data.success ? data.announcements : [];
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

export async function saveDBAnnouncement(announcement: any): Promise<boolean> {
  try {
    const method = announcement.isEdit ? 'PUT' : 'POST';
    const url = announcement.isEdit ? `/api/announcements/${announcement.id}` : '/api/announcements';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcement)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving announcement:', error);
    return false;
  }
}

export async function deleteDBAnnouncement(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return false;
  }
}

// Flashcards
export async function fetchDBFlashcards(email?: string): Promise<any[]> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = email || (userStr ? JSON.parse(userStr).email : '');
    const url = userEmail ? `/api/flashcards?email=${encodeURIComponent(userEmail)}` : '/api/flashcards';
    const response = await fetch(url);
    const data = await response.json();
    return data.success ? data.flashcards : [];
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return [];
  }
}

export async function saveDBFlashcard(flashcard: any): Promise<boolean> {
  try {
    const userStr = safeStorage.getItem('medbank_user');
    const userEmail = userStr ? JSON.parse(userStr).email : '';
    if (userEmail && !flashcard.email) {
      flashcard.email = userEmail;
    }
    const method = flashcard.isEdit ? 'PUT' : 'POST';
    const url = flashcard.isEdit ? `/api/flashcards/${flashcard.id}` : '/api/flashcards';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flashcard)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving flashcard:', error);
    return false;
  }
}

export async function deleteDBFlashcard(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    return false;
  }
}

// Videos
export async function fetchDBVideos(): Promise<any[]> {
  try {
    const response = await fetch('/api/videos');
    const data = await response.json();
    return data.success ? data.videos : [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

export async function saveDBVideo(video: any): Promise<boolean> {
  try {
    const method = video.isEdit ? 'PUT' : 'POST';
    const url = video.isEdit ? `/api/videos/${video.id}` : '/api/videos';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video)
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving video:', error);
    return false;
  }
}

export async function deleteDBVideo(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
}

export async function fetchDBUsers(): Promise<any[]> {
  try {
    const response = await fetch('/api/users');
    const data = await response.json();
    return data.success ? data.users : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function deleteDBUser(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting user from MongoDB:', error);
    return false;
  }
}

export const fetchSources = async (): Promise<string[]> => {
  const res = await fetch(`/api/sources`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
};

export const renameSource = async (oldName: string, newName: string): Promise<any> => {
  const res = await fetch(`/api/sources/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName }),
  });
  if (!res.ok) throw new Error('Failed to rename source');
  return res.json();
};

export async function importMCQs(params: {
  fileType: 'pdf' | 'image' | 'text';
  pdfBase64?: string;
  image?: string;
  mimeType?: string;
  textBatch?: string;
  mode: 'extract' | 'generate';
  subject: string;
  chapter?: string;
  topic?: string;
  sourceName?: string;
  questionTypes?: string[];
}): Promise<{ mcqs: any[]; duplicateSkippedCount: number; subjectVerification?: any }> {
  const cacheBuster = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const response = await fetch(`/api/gemini/import-mcqs?t=${cacheBuster}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (data.success) {
    return { 
      mcqs: data.mcqs, 
      duplicateSkippedCount: data.duplicateSkippedCount || 0,
      subjectVerification: data.subjectVerification
    };
  }
  const err = new Error(data.error || 'Failed to import and process MCQs');
  if (response.status === 429 || data.quotaExceeded) {
    (err as any).quotaExceeded = true;
  }
  throw err;
}

export async function importPDFMCQs(params: {
  pdfBase64?: string;
  textBatch?: string;
  mode: 'extract' | 'generate';
  subject: string;
  chapter?: string;
  topic?: string;
  sourceName?: string;
}): Promise<any[]> {
  const cacheBuster = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const response = await fetch(`/api/gemini/import-pdf-mcqs?t=${cacheBuster}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (data.success) {
    return data.mcqs;
  }
  const err = new Error(data.error || 'Failed to process PDF and import MCQs');
  if (response.status === 429 || data.quotaExceeded) {
    (err as any).quotaExceeded = true;
  }
  throw err;
}

export async function testMongoDBConnection(): Promise<{ success: boolean; message?: string; error?: string; insertedId?: string }> {
  try {
    const response = await fetch('/api/test-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error during MongoDB manual test execution:', error);
    return { success: false, error: error.message || 'Network error occurred during test.' };
  }
}

