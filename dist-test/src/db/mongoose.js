import mongoose from 'mongoose';
// Disable command buffering globally so that queries fail fast when offline instead of hanging
mongoose.set('bufferCommands', false);
const MONGODB_URI = process.env.MONGODB_URI;
function getCleanedURI(uri) {
    if (!uri)
        return uri;
    // Verify the username and password are correctly formatted.
    // The correct Atlas Database User password is 'mnbvcxz9869@'.
    // Since '@' is a special URI character, it MUST be URL-encoded as '%40'.
    // If the URI is missing the '@' suffix or is unencoded, we correct it here.
    let cleaned = uri;
    if (cleaned.includes('Medbankadmin:mnbvcxz9869') && !cleaned.includes('Medbankadmin:mnbvcxz9869%40')) {
        cleaned = cleaned.replace('Medbankadmin:mnbvcxz9869@@', 'Medbankadmin:mnbvcxz9869%40@');
        cleaned = cleaned.replace('Medbankadmin:mnbvcxz9869@', 'Medbankadmin:mnbvcxz9869%40@');
    }
    return cleaned;
}
export async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }
    // If already connecting, wait for it to complete
    if (mongoose.connection.readyState === 2) {
        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (mongoose.connection.readyState !== 2) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }
    }
    const cleanedURI = getCleanedURI(MONGODB_URI);
    if (!cleanedURI) {
        console.warn('MONGODB_URI is not set. Database operations will run in memory / fallback mode.');
        return null;
    }
    try {
        const conn = await mongoose.connect(cleanedURI);
        console.log(`Successfully connected to MongoDB Atlas: ${conn.connection.host}`);
        // Trigger seeding of default medical dataset.
        // On Vercel, run seeding in the background to avoid blocking serverless request handling.
        if (process.env.VERCEL) {
            seedInitialData().catch((err) => {
                console.error('Background seeding error in Vercel environment:', err);
            });
        }
        else {
            await seedInitialData();
        }
        return conn.connection;
    }
    catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
        const errMsg = error.message || String(error);
        if (errMsg.includes('auth') || errMsg.includes('authentication') || errMsg.includes('bad auth') || errMsg.includes('MongoServerError: bad auth')) {
            throw new Error('MongoDB Atlas authentication failed (bad auth). Please check your MONGODB_URI environment variable in the Settings tab. Make sure your username, password, and database path are correct and that the user has readWrite access to your cluster.');
        }
        throw error;
    }
}
// 1. users schema
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    avatar: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'users' });
// 2. subjects schema
const SubjectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'BookOpen' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'subjects' });
SubjectSchema.index({ id: 1 }, { unique: true });
SubjectSchema.index({ name: 1 });
// 3. chapters schema
const ChapterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    subject: { type: String, required: true }, // e.g. 'Pathology', 'Pharmacology', 'Microbiology'
    description: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'chapters' });
ChapterSchema.index({ id: 1 }, { unique: true });
ChapterSchema.index({ subject: 1 });
// 4. notes schema
const NoteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    content: { type: String, default: '' },
    sourceBook: { type: String, default: '' },
    email: { type: String, default: '' },
    uploadedAt: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { collection: 'notes' });
// 5. pdfs schema
const PdfSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    sourceBook: { type: String, default: '' },
    fileSize: { type: String, default: '1.5 MB' },
    downloadUrl: { type: String, default: '#' },
    uploadedAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
    pagesCount: { type: Number, default: 10 }
}, { collection: 'pdfs' });
// 6. questions schema
const QuestionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
    correctAnswers: { type: [Number], default: [] },
    explanation: { type: String, default: '' },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    subtopic: { type: String, default: '' },
    system: { type: String, default: '' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    sourceBook: { type: String, default: '' },
    source: { type: String, default: 'Manual' }, // PDF, Image, AI Generated, Manual
    approved: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    image: { type: String },
    examSource: { type: String, default: '' },
    targetExams: { type: [String], default: [] },
    type: { type: String, enum: ['Single Best Answer', 'Multiple Correct', 'True/False', 'Image Based', 'Case-based MCQ', 'Clinical Scenario', 'Match the Following', 'Assertion-Reason', 'Multiple Correct Answers', 'Assertion & Reason', 'Clinical Case Based', 'Image-based MCQ', 'Single Best Answer (SBA)'], default: 'Single Best Answer' },
    confidenceScore: { type: Number, default: 100 },
    validationErrors: { type: [String], default: [] },
    isIncomplete: { type: Boolean, default: false },
    status: { type: String, default: 'Pending' },
    detectedVisualType: { type: String, default: 'none' },
    hasVisualFigure: { type: Boolean, default: false },
    figureCropBox: {
        ymin: { type: Number, default: 0 },
        xmin: { type: Number, default: 0 },
        ymax: { type: Number, default: 0 },
        xmax: { type: Number, default: 0 }
    }
}, { collection: 'questions' });
// Database indexes on Subject, Chapter, Topic, Question ID and Source
QuestionSchema.index({ id: 1 }, { unique: true });
QuestionSchema.index({ subject: 1 });
QuestionSchema.index({ chapter: 1 });
QuestionSchema.index({ topic: 1 });
QuestionSchema.index({ source: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ approved: 1 });
QuestionSchema.index({ subject: 1, chapter: 1, topic: 1 });
// 7. tests schema
const TestSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subject: { type: String, default: '' },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    questions: { type: [String], default: [] }, // Array of question IDs
    durationMinutes: { type: Number, default: 30 },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'tests' });
// 8. results schema
const TestResultSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, default: 'usr-1' },
    email: { type: String, default: '' },
    title: { type: String, required: true },
    subject: { type: String },
    chapter: { type: String },
    topic: { type: String },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    score: { type: Number, required: true },
    timeTakenSeconds: { type: Number, required: true },
    date: { type: String, required: true },
    questions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    selectedAnswers: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { collection: 'results' });
// 9. announcements schema
const AnnouncementSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, enum: ['General', 'Exam', 'Update', 'Schedule'], default: 'General' },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    published: { type: Boolean, default: true }
}, { collection: 'announcements' });
// 10. flashcards schema
const FlashcardSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    email: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'flashcards' });
// 11. videos schema
const VideoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    duration: { type: String, default: '15:00' },
    uploadedAt: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { collection: 'videos' });
// 12. topics schema
const TopicSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    chapterId: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'topics' });
TopicSchema.index({ id: 1 }, { unique: true });
TopicSchema.index({ chapterId: 1 });
TopicSchema.index({ subject: 1 });
// 13. trash schema
const TrashSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['subject', 'chapter', 'topic'], required: true },
    name: { type: String, required: true },
    deletedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { collection: 'trash' });
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const SubjectModel = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
export const ChapterModel = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
export const NoteModel = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export const PdfModel = mongoose.models.Pdf || mongoose.model('Pdf', PdfSchema);
export const QuestionModel = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
export const TestResultModel = mongoose.models.TestResult || mongoose.model('TestResult', TestResultSchema);
export const AnnouncementModel = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const FlashcardModel = mongoose.models.Flashcard || mongoose.model('Flashcard', FlashcardSchema);
export const VideoModel = mongoose.models.Video || mongoose.model('Video', VideoSchema);
export const TopicModel = mongoose.models.Topic || mongoose.model('Topic', TopicSchema);
export const TrashModel = mongoose.models.Trash || mongoose.model('Trash', TrashSchema);
export async function seedInitialData() {
    try {
        // 1. Seed Subjects
        const subjectsCount = await SubjectModel.countDocuments();
        if (subjectsCount === 0) {
            console.log('Seeding initial subjects to MongoDB Atlas...');
            await SubjectModel.insertMany([
                { id: 'subj-1', name: 'Pathology', description: 'Study of disease pathogenesis, cellular injuries, and systemic lesions.', icon: 'ShieldAlert' },
                { id: 'subj-2', name: 'Pharmacology', description: 'Study of drugs, mechanism of action, pharmacokinetics, and clinical uses.', icon: 'Droplet' },
                { id: 'subj-3', name: 'Microbiology', description: 'Study of infectious agents, systemic bacteriology, virology, and immunology.', icon: 'Activity' }
            ]);
        }
        // 2. Seed Chapters
        const chaptersCount = await ChapterModel.countDocuments();
        if (chaptersCount === 0) {
            console.log('Seeding initial chapters to MongoDB Atlas...');
            await ChapterModel.insertMany([
                { id: 'path-c1', name: 'Cell Injury & Adaptation', subject: 'Pathology', description: 'Reversible and irreversible cell injury, necrosis, and apoptosis.', displayOrder: 1, isActive: true },
                { id: 'path-c2', name: 'Inflammation & Repair', subject: 'Pathology', description: 'Acute/chronic inflammation and tissue repair.', displayOrder: 2, isActive: true },
                { id: 'path-c3', name: 'Neoplasia', subject: 'Pathology', description: 'Characteristics of benign/malignant tumors and genetic triggers.', displayOrder: 3, isActive: true },
                { id: 'pharm-c1', name: 'General Pharmacology', subject: 'Pharmacology', description: 'Pharmacokinetics and pharmacodynamics.', displayOrder: 1, isActive: true },
                { id: 'pharm-c2', name: 'Autonomic Nervous System', subject: 'Pharmacology', description: 'Adrenergic, cholinergic, and blocking drugs.', displayOrder: 2, isActive: true },
                { id: 'micro-c1', name: 'General Bacteriology', subject: 'Microbiology', description: 'Bacterial envelope structure and disinfection.', displayOrder: 1, isActive: true },
                { id: 'micro-c2', name: 'Immunology', subject: 'Microbiology', description: 'Antigen-antibody interactions and hypersensitivities.', displayOrder: 2, isActive: true }
            ]);
        }
        // 3. Seed PDFs (PDF Notes)
        const pdfsCount = await PdfModel.countDocuments();
        if (pdfsCount === 0) {
            console.log('Seeding initial PDFs to MongoDB Atlas...');
            await PdfModel.insertMany([
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
            ]);
        }
        // 4. Seed Notes (Quick Rich Notes)
        const notesCount = await NoteModel.countDocuments();
        if (notesCount === 0) {
            console.log('Seeding initial Notes to MongoDB Atlas...');
            await NoteModel.insertMany([
                {
                    id: 'note-1',
                    title: 'Difference between Necrosis & Apoptosis',
                    subject: 'Pathology',
                    chapter: 'Cell Injury & Adaptation',
                    topic: 'Necrosis vs Apoptosis',
                    content: 'Necrosis is always pathological, characterized by cell swelling, membrane disruption, inflammatory response, and enzymatic digestion. Apoptosis can be physiological or pathological, characterized by cell shrinkage, intact membrane, DNA laddering, and lack of inflammation.',
                    sourceBook: 'Robbins & Cotran',
                    uploadedAt: '2026-07-01'
                },
                {
                    id: 'note-2',
                    title: 'Beta Blockers Clinical Overview',
                    subject: 'Pharmacology',
                    chapter: 'Autonomic Nervous System',
                    topic: 'Beta Blockers',
                    content: 'Beta blockers block epinephrine/norepinephrine binding. Non-selective (Propranolol) blocks B1 and B2, causing bronchoconstriction (contraindicated in asthma). Selective (Metoprolol, Atenolol) blocks B1 preferentially. Useful in Hypertension, Angina, and post-MI.',
                    sourceBook: 'KDT (Tripathi)',
                    uploadedAt: '2026-07-03'
                }
            ]);
        }
        // 5. Seed Questions (MCQs)
        const questionsCount = await QuestionModel.countDocuments();
        if (questionsCount === 0) {
            console.log('Seeding initial questions to MongoDB Atlas...');
            await QuestionModel.insertMany([
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
                    correctAnswers: [2],
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
                    correctAnswers: [1],
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
                    correctAnswers: [2],
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
                    correctAnswers: [1],
                    explanation: 'This is a Type I anaphylactic hypersensitivity reaction. Intramuscular epinephrine (adrenaline) 1:1000 injected in the anterolateral thigh is the first-line lifesaving treatment to reverse bronchoconstriction and vasodilation.',
                    subject: 'Pharmacology',
                    chapter: 'Autonomic Nervous System',
                    topic: 'Adrenergic Agonists',
                    difficulty: 'Medium',
                    sourceBook: 'KDT (Tripathi)',
                    tags: ['ANS', 'Anaphylaxis', 'Epinephrine'],
                    type: 'Clinical Case Based'
                }
            ]);
        }
        // 6. Seed Tests
        const testsCount = await TestModel.countDocuments();
        if (testsCount === 0) {
            console.log('Seeding initial mock tests to MongoDB Atlas...');
            await TestModel.insertMany([
                {
                    id: 'test-1',
                    title: 'Cell Injury and Apoptosis Mini Test',
                    subject: 'Pathology',
                    chapter: 'Cell Injury & Adaptation',
                    topic: 'Necrosis vs Apoptosis',
                    questions: ['q-1', 'q-2'],
                    durationMinutes: 15
                },
                {
                    id: 'test-2',
                    title: 'Autonomic Nervous System Practice Quiz',
                    subject: 'Pharmacology',
                    chapter: 'Autonomic Nervous System',
                    topic: 'Adrenergic Agonists',
                    questions: ['q-3', 'q-4'],
                    durationMinutes: 20
                }
            ]);
        }
        // 7. Seed Announcements
        const annCount = await AnnouncementModel.countDocuments();
        if (annCount === 0) {
            console.log('Seeding initial announcements to MongoDB Atlas...');
            await AnnouncementModel.insertMany([
                {
                    id: 'ann-1',
                    title: 'Welcome to MedBank AI Student Dashboard!',
                    content: 'You can now access fully synced lecture notes, board exam MCQs, flashcards, and clinical videos.',
                    category: 'General',
                    date: '2026-07-10',
                    published: true
                },
                {
                    id: 'ann-2',
                    title: 'Weekly Board Test Released',
                    content: 'A new Pathology mock test covering Cell Injury & Adaptation is live. Please attempt it under mock test conditions.',
                    category: 'Exam',
                    date: '2026-07-12',
                    published: true
                }
            ]);
        }
        // 8. Seed Flashcards
        const fcCount = await FlashcardModel.countDocuments();
        if (fcCount === 0) {
            console.log('Seeding initial flashcards to MongoDB Atlas...');
            await FlashcardModel.insertMany([
                {
                    id: 'fc-1',
                    front: 'What is the hallmark marker of Caseous Necrosis?',
                    back: 'Cheesy, white appearance; characteristic of tuberculosis (Mycobacterium tuberculosis infection).',
                    subject: 'Pathology',
                    chapter: 'Cell Injury & Adaptation',
                    topic: 'Necrosis vs Apoptosis'
                },
                {
                    id: 'fc-2',
                    front: 'What is the mechanism of action of Mesna?',
                    back: 'Mesna binds and neutralizes the toxic metabolite Acrolein in the bladder, preventing hemorrhagic cystitis caused by Cyclophosphamide.',
                    subject: 'Pharmacology',
                    chapter: 'Antimicrobials',
                    topic: 'Bioavailability & Half-life'
                }
            ]);
        }
        // 9. Seed Videos
        const vidCount = await VideoModel.countDocuments();
        if (vidCount === 0) {
            console.log('Seeding initial videos to MongoDB Atlas...');
            await VideoModel.insertMany([
                {
                    id: 'vid-1',
                    title: 'Pathophysiology of Reversible vs Irreversible Cell Injury',
                    url: 'https://www.youtube.com/watch?v=17X2X8zCO-s',
                    subject: 'Pathology',
                    chapter: 'Cell Injury & Adaptation',
                    duration: '14:25',
                    uploadedAt: '2026-07-02'
                },
                {
                    id: 'vid-2',
                    title: 'Understanding Sympathomimetic & Parasympathomimetic Drugs',
                    url: 'https://www.youtube.com/watch?v=Fms0r64p4lU',
                    subject: 'Pharmacology',
                    chapter: 'Autonomic Nervous System',
                    duration: '18:10',
                    uploadedAt: '2026-07-05'
                }
            ]);
        }
        // Run the normalization and dynamic curriculum rebuilding/cleaning
        await normalizeAndRebuildCurriculum();
        console.log('Database initial data seeding completed successfully!');
    }
    catch (err) {
        console.error('Error during data seeding:', err);
    }
}
export async function normalizeAndRebuildCurriculum() {
    try {
        console.log('Starting dynamic curriculum cleaning and rebuilding...');
        // 1. Normalize UPPERCASE glitches and glitched FMT/ENT subjects
        // FMT subject contains legal/forensic questions misclassified under "General Medicine".
        // We merge FMT into "Forensic Medicine", and update "General Medicine" chapter to "Medical Jurisprudence".
        const fmtSubject = await SubjectModel.findOne({ name: 'FMT' });
        if (fmtSubject) {
            console.log('Merging subject FMT into Forensic Medicine...');
            // Reassign all documents under FMT to Forensic Medicine
            await QuestionModel.updateMany({ subject: 'FMT' }, { $set: { subject: 'Forensic Medicine' } });
            await QuestionModel.updateMany({ subject: 'Forensic Medicine', chapter: 'General Medicine' }, { $set: { chapter: 'Medical Jurisprudence' } });
            await NoteModel.updateMany({ subject: 'FMT' }, { $set: { subject: 'Forensic Medicine' } });
            await NoteModel.updateMany({ subject: 'Forensic Medicine', chapter: 'General Medicine' }, { $set: { chapter: 'Medical Jurisprudence' } });
            await PdfModel.updateMany({ subject: 'FMT' }, { $set: { subject: 'Forensic Medicine' } });
            await PdfModel.updateMany({ subject: 'Forensic Medicine', chapter: 'General Medicine' }, { $set: { chapter: 'Medical Jurisprudence' } });
            await FlashcardModel.updateMany({ subject: 'FMT' }, { $set: { subject: 'Forensic Medicine' } });
            await FlashcardModel.updateMany({ subject: 'Forensic Medicine', chapter: 'General Medicine' }, { $set: { chapter: 'Medical Jurisprudence' } });
            // Delete chapter 'General Medicine' from FMT
            await ChapterModel.deleteOne({ name: 'General Medicine', subject: 'FMT' });
            // Delete subject 'FMT'
            await SubjectModel.deleteOne({ name: 'FMT' });
        }
        // Ensure we have a "Forensic Medicine" subject
        const forensicSubject = await SubjectModel.findOne({ name: 'Forensic Medicine' });
        if (!forensicSubject) {
            await new SubjectModel({
                id: 'subj-forensic',
                name: 'Forensic Medicine',
                description: 'Study of medical jurisprudence, toxicology, and autopsy.',
                icon: 'Activity'
            }).save();
        }
        // Now normalize BIOCHEMISTRY to Biochemistry
        const biochemSubjectUpper = await SubjectModel.findOne({ name: 'BIOCHEMISTRY' });
        if (biochemSubjectUpper) {
            console.log('Merging subject BIOCHEMISTRY into Biochemistry...');
            await QuestionModel.updateMany({ subject: 'BIOCHEMISTRY' }, { $set: { subject: 'Biochemistry' } });
            await NoteModel.updateMany({ subject: 'BIOCHEMISTRY' }, { $set: { subject: 'Biochemistry' } });
            await PdfModel.updateMany({ subject: 'BIOCHEMISTRY' }, { $set: { subject: 'Biochemistry' } });
            await FlashcardModel.updateMany({ subject: 'BIOCHEMISTRY' }, { $set: { subject: 'Biochemistry' } });
            await ChapterModel.updateMany({ subject: 'BIOCHEMISTRY' }, { $set: { subject: 'Biochemistry' } });
            await SubjectModel.deleteOne({ name: 'BIOCHEMISTRY' });
        }
        const biochemSubjectCamel = await SubjectModel.findOne({ name: 'Biochemistry' });
        if (!biochemSubjectCamel) {
            await new SubjectModel({
                id: 'subj-biochem',
                name: 'Biochemistry',
                description: 'Study of biochemical reactions, metabolism, and molecules.',
                icon: 'Layers'
            }).save();
        }
        // Normalize ANATOMY / Anatomy to Uncategorized (as Anatomy is deleted from the app)
        console.log('Ensuring Anatomy/ANATOMY subject is completely removed from database...');
        await SubjectModel.deleteMany({ name: { $in: ['Anatomy', 'ANATOMY'] } });
        await ChapterModel.deleteMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } });
        await TopicModel.deleteMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } });
        // Ensure Uncategorized exists
        const uncategorizedSubject = await SubjectModel.findOne({ name: 'Uncategorized' });
        if (!uncategorizedSubject) {
            await new SubjectModel({
                id: 'subj-uncategorized',
                name: 'Uncategorized',
                description: 'Questions and learning materials from deleted subjects.',
                icon: 'HelpCircle'
            }).save();
        }
        // Move any existing Anatomy references to Uncategorized so no questions/materials are lost
        await QuestionModel.updateMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } }, { $set: { subject: 'Uncategorized', chapter: 'Uncategorized', topic: 'General' } });
        await NoteModel.updateMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } }, { $set: { subject: 'Uncategorized', chapter: 'Uncategorized', topic: 'General' } });
        await PdfModel.updateMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } }, { $set: { subject: 'Uncategorized', chapter: 'Uncategorized', topic: 'General' } });
        await FlashcardModel.updateMany({ subject: { $in: ['Anatomy', 'ANATOMY'] } }, { $set: { subject: 'Uncategorized', chapter: 'Uncategorized', topic: 'General' } });
        // Normalize ENT to Community Medicine
        // ENT subject contains Community Medicine/PSM questions (Immunization, Epidemiology).
        const entSubject = await SubjectModel.findOne({ name: 'ENT' });
        if (entSubject) {
            console.log('Renaming subject ENT to Community Medicine...');
            await QuestionModel.updateMany({ subject: 'ENT' }, { $set: { subject: 'Community Medicine' } });
            await NoteModel.updateMany({ subject: 'ENT' }, { $set: { subject: 'Community Medicine' } });
            await PdfModel.updateMany({ subject: 'ENT' }, { $set: { subject: 'Community Medicine' } });
            await FlashcardModel.updateMany({ subject: 'ENT' }, { $set: { subject: 'Community Medicine' } });
            await ChapterModel.updateMany({ subject: 'ENT' }, { $set: { subject: 'Community Medicine' } });
            await SubjectModel.deleteOne({ name: 'ENT' });
        }
        const commMedicineSubject = await SubjectModel.findOne({ name: 'Community Medicine' });
        if (!commMedicineSubject) {
            await new SubjectModel({
                id: 'subj-commmed',
                name: 'Community Medicine',
                description: 'Study of epidemiology, biostatistics, preventive health, and immunization.',
                icon: 'Activity'
            }).save();
        }
        // 2. Consolidate duplicate chapters under the same subject (case-insensitive and trimmed)
        const allChapters = await ChapterModel.find({});
        const canonicalChapters = new Map(); // subject_nameKey -> chapterDoc
        for (const chap of allChapters) {
            const subject = chap.subject;
            const normalizedName = chap.name.trim().toLowerCase();
            const key = `${subject}_${normalizedName}`;
            if (!canonicalChapters.has(key)) {
                canonicalChapters.set(key, chap);
            }
            else {
                const canonical = canonicalChapters.get(key);
                console.log(`Merging duplicate chapter "${chap.name}" into "${canonical.name}" under ${subject}...`);
                // Reassign all questions, notes, and PDFs from chap.name to canonical.name
                await QuestionModel.updateMany({ subject, chapter: chap.name }, { $set: { chapter: canonical.name } });
                await NoteModel.updateMany({ subject, chapter: chap.name }, { $set: { chapter: canonical.name } });
                await PdfModel.updateMany({ subject, chapter: chap.name }, { $set: { chapter: canonical.name } });
                await FlashcardModel.updateMany({ subject, chapter: chap.name }, { $set: { chapter: canonical.name } });
                // Delete the duplicate chapter record
                await ChapterModel.deleteOne({ _id: chap._id });
            }
        }
        // Specifically merge some known highly-similar/duplicated chapters across subjects
        const similarMerges = [
            { subject: 'Pathology', from: 'Cardiovascular System', to: 'Cardiovascular Pathology' },
            { subject: 'Pathology', from: 'Endocrine System', to: 'Endocrine Pathology' },
            { subject: 'Pathology', from: 'Renal System', to: 'Renal Pathology' },
            { subject: 'Pathology', from: 'Gastrointestinal System', to: 'Gastrointestinal Pathology' },
            { subject: 'Pathology', from: 'Hematology / General Pathology', to: 'Hematology' },
            { subject: 'Pathology', from: 'Hematology / Clinical Pathology', to: 'Hematology' },
            { subject: 'Pharmacology', from: 'Cardiovascular System', to: 'Cardiovascular Pharmacology' },
            { subject: 'Pharmacology', from: 'Antimicrobial Chemotherapy', to: 'Antimicrobial Drugs' },
            { subject: 'Pharmacology', from: 'Gastrointestinal System', to: 'Gastrointestinal Pharmacology' },
            { subject: 'Physiology', from: 'Cardiovascular System', to: 'Cardiovascular Physiology' },
            { subject: 'Physiology', from: 'Gastrointestinal System', to: 'Gastrointestinal Physiology' },
            { subject: 'Physiology', from: 'Respiratory System', to: 'Respiratory Physiology' },
            { subject: 'Physiology', from: 'Reproductive System', to: 'Reproductive Physiology' },
            { subject: 'Physiology', from: 'Muscle Physiology', to: 'Nerve and Muscle Physiology' },
            { subject: 'Physiology', from: 'Nervous System', to: 'Central Nervous System' },
        ];
        for (const merge of similarMerges) {
            const fromChap = await ChapterModel.findOne({ subject: merge.subject, name: merge.from });
            const toChap = await ChapterModel.findOne({ subject: merge.subject, name: merge.to });
            if (fromChap && toChap) {
                console.log(`Merging highly similar chapter "${merge.from}" into "${merge.to}" under ${merge.subject}...`);
                await QuestionModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await NoteModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await PdfModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await FlashcardModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await ChapterModel.deleteOne({ _id: fromChap._id });
            }
            else if (fromChap && !toChap) {
                // Just rename
                console.log(`Renaming similar chapter "${merge.from}" to "${merge.to}" under ${merge.subject}...`);
                await QuestionModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await NoteModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await PdfModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                await FlashcardModel.updateMany({ subject: merge.subject, chapter: merge.from }, { $set: { chapter: merge.to } });
                fromChap.name = merge.to;
                await fromChap.save();
            }
        }
        // 3. Remove empty/orphaned/glitched chapters (except whitelisted seed chapters)
        const whitelist = [
            'Cell Injury & Adaptation', 'Inflammation & Repair', 'Neoplasia', 'Anemia & Hematology',
            'General Pharmacology', 'Autonomic Nervous System', 'Cardiovascular Drugs', 'Antimicrobials',
            'General Bacteriology', 'Immunology', 'Systemic Bacteriology', 'Virology',
            'Biochemistry', 'Community Medicine', 'Forensic Medicine', 'Medical Jurisprudence'
        ].map(n => n.toLowerCase());
        const remainingChapters = await ChapterModel.find({});
        for (const chap of remainingChapters) {
            if (whitelist.includes(chap.name.trim().toLowerCase())) {
                continue; // Whitelisted, keep even if empty
            }
            const qCount = await QuestionModel.countDocuments({ subject: chap.subject, chapter: chap.name });
            const nCount = await NoteModel.countDocuments({ subject: chap.subject, chapter: chap.name });
            const pCount = await PdfModel.countDocuments({ subject: chap.subject, chapter: chap.name });
            const fCount = await FlashcardModel.countDocuments({ subject: chap.subject, chapter: chap.name });
            const total = qCount + nCount + pCount + fCount;
            if (total === 0) {
                console.log(`Removing empty/unused chapter node: "${chap.name}" under ${chap.subject}`);
                await ChapterModel.deleteOne({ _id: chap._id });
            }
        }
        // 4. Rebuild missing categories to prevent orphans
        // We scan all questions, notes, and PDFs. If any has a subject or chapter not in DB, we create it.
        const uniquePairs = [];
        const collectPairs = async (Model) => {
            const items = await Model.find({}).select('subject chapter').lean();
            for (const item of items) {
                if (!item.subject)
                    continue;
                const sub = item.subject.trim();
                const chap = (item.chapter || 'General').trim();
                const exists = uniquePairs.some(p => p.subject === sub && p.chapter === chap);
                if (!exists) {
                    uniquePairs.push({ subject: sub, chapter: chap });
                }
            }
        };
        await collectPairs(QuestionModel);
        await collectPairs(NoteModel);
        await collectPairs(PdfModel);
        for (const pair of uniquePairs) {
            // Ensure subject exists
            let subDoc = await SubjectModel.findOne({ name: pair.subject });
            if (!subDoc) {
                console.log(`Rebuilding missing subject: "${pair.subject}"`);
                const subId = `subj-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
                subDoc = new SubjectModel({
                    id: subId,
                    name: pair.subject,
                    description: `Auto-generated category for ${pair.subject}`,
                    icon: 'Layers'
                });
                await subDoc.save();
            }
            // Ensure chapter exists
            let chapDoc = await ChapterModel.findOne({ subject: pair.subject, name: pair.chapter });
            if (!chapDoc) {
                console.log(`Rebuilding missing chapter node: "${pair.chapter}" under ${pair.subject}`);
                const chapId = `chap-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
                chapDoc = new ChapterModel({
                    id: chapId,
                    name: pair.chapter,
                    subject: pair.subject,
                    description: `Auto-generated chapter for ${pair.chapter}`,
                    displayOrder: 10,
                    isActive: true
                });
                await chapDoc.save();
            }
        }
        // 5. Build/Sync Topics Collection from actual questions, notes, PDFs topics
        console.log('Synchronizing topics collection with database content...');
        await TopicModel.deleteMany({}); // rebuild fresh to be perfectly accurate
        // Anatomy Migration Logic Fixed
        console.log('Migrating Anatomy questions to 4-part structure...');
        const anatomyMapping = {
            'Part 1: Upper Limb & Thorax': ['General Anatomy', 'Upper Limb', 'Pectoral Region', 'Axilla', 'Shoulder', 'Arm', 'Forearm', 'Hand', 'Thoracic Wall', 'Thoracic Cavity', 'Mediastinum', 'Heart', 'Lungs & Pleura', 'Lungs', 'Pleura', 'Thorax'],
            'Part 2: Lower Limb, Abdomen & Pelvis': ['Gluteal Region', 'Thigh', 'Leg', 'Foot', 'Abdomen', 'Anterior Abdominal Wall', 'Inguinal Region', 'Peritoneum', 'Gastrointestinal Anatomy', 'Liver & Biliary System', 'Liver', 'Biliary', 'Pancreas', 'Spleen', 'Kidneys & Ureters', 'Kidneys', 'Ureters', 'Pelvis', 'Perineum', 'Lower Limb', 'Gastrointestinal'],
            'Part 3: Head & Neck': ['Skull', 'Scalp', 'Face', 'Orbit', 'Nasal Cavity', 'Oral Cavity', 'Pharynx', 'Larynx', 'Neck', 'Cranial Fossae', 'Temporomandibular Joint', 'Salivary Glands', 'Cranial Nerves (Head & Neck relations)', 'Head', 'Cranial Nerves'],
            'Part 4: Brain & Neuroanatomy': ['Embryology of CNS', 'Meninges', 'Ventricular System & CSF', 'Ventricular System', 'CSF', 'Spinal Cord', 'Brainstem', 'Cerebellum', 'Diencephalon', 'Cerebrum', 'Basal Ganglia', 'Internal Capsule', 'Functional Areas of Cortex', 'Ascending Tracts', 'Descending Tracts', 'Cranial Nerve Nuclei', 'Blood Supply of Brain', 'Autonomic Nervous System', 'Clinical Neuroanatomy', 'Brain', 'Neuroanatomy']
        };
        const allAnatomyQuestions = await QuestionModel.find({ subject: 'Anatomy' });
        let mappedCount = 0;
        for (const q of allAnatomyQuestions) {
            let mappedPart = null;
            let mappedTopic = null;
            const textToSearch = ((q.chapter || '') + ' ' + (q.topic || '') + ' ' + (q.system || '')).toLowerCase();
            for (const [part, topics] of Object.entries(anatomyMapping)) {
                for (const top of topics) {
                    if (textToSearch.includes(top.toLowerCase())) {
                        mappedPart = part;
                        mappedTopic = top;
                        if ((q.chapter || '').toLowerCase() === top.toLowerCase() || (q.topic || '').toLowerCase() === top.toLowerCase()) {
                            // highly confident
                            mappedTopic = top;
                        }
                        break;
                    }
                }
                if (mappedPart)
                    break;
            }
            if (mappedPart) {
                q.chapter = mappedPart;
                if (mappedTopic) {
                    q.topic = mappedTopic;
                }
                mappedCount++;
            }
            else {
                q.chapter = 'Uncategorized';
                if (!q.topic || q.topic.trim() === '')
                    q.topic = 'General';
            }
            await q.save();
        }
        const modelsToMigrate = [NoteModel, PdfModel, FlashcardModel];
        for (const model of modelsToMigrate) {
            const items = await model.find({ subject: 'Anatomy' });
            for (const item of items) {
                let mappedPart = null;
                let mappedTopic = null;
                const textToSearch = ((item.chapter || '') + ' ' + (item.topic || '')).toLowerCase();
                for (const [part, topics] of Object.entries(anatomyMapping)) {
                    for (const top of topics) {
                        if (textToSearch.includes(top.toLowerCase())) {
                            mappedPart = part;
                            mappedTopic = top;
                            break;
                        }
                    }
                    if (mappedPart)
                        break;
                }
                if (mappedPart) {
                    item.chapter = mappedPart;
                    if (mappedTopic) {
                        item.topic = mappedTopic;
                    }
                }
                else {
                    item.chapter = 'Uncategorized';
                    if (!item.topic || item.topic.trim() === '')
                        item.topic = 'General';
                }
                await item.save();
            }
        }
        console.log(`Mapped ${mappedCount} anatomy questions to new structure.`);
        const uniqueTopicsMap = new Map(); // "subject_chapter_topic" -> { subject, chapter, topic }
        const collectTopics = async (Model) => {
            const items = await Model.find({}).select('subject chapter topic').lean();
            for (const item of items) {
                if (!item.subject || !item.topic)
                    continue;
                const sub = item.subject.trim();
                const chap = (item.chapter || 'General').trim();
                const top = item.topic.trim();
                if (!sub || !chap || !top)
                    continue;
                const key = `${sub}_${chap}_${top}`.toLowerCase();
                if (!uniqueTopicsMap.has(key)) {
                    uniqueTopicsMap.set(key, { subject: sub, chapter: chap, topic: top });
                }
            }
        };
        await collectTopics(QuestionModel);
        await collectTopics(NoteModel);
        await collectTopics(PdfModel);
        // Also collect default seed topics if they match current chapters
        const defaultMockTopics = [
            { name: 'Necrosis vs Apoptosis', chapterName: 'Cell Injury & Adaptation', subject: 'Pathology', description: 'Morphology, biochemistry, and molecular mechanisms of cell death.' },
            { name: 'Intracellular Accumulations', chapterName: 'Cell Injury & Adaptation', subject: 'Pathology', description: 'Fatty change, amyloidosis, calcification, and pigment storage.' },
            { name: 'Vascular Events', chapterName: 'Inflammation & Repair', subject: 'Pathology', description: 'Vasodilation, increased permeability, and fluid exudation.' },
            { name: 'Cellular Events', chapterName: 'Inflammation & Repair', subject: 'Pathology', description: 'Leukocyte rolling, adhesion, transmigration, and phagocytosis.' },
            { name: 'Tumor Suppressor Genes', chapterName: 'Neoplasia', subject: 'Pathology', description: 'TP53, RB1, BRCA1/2, and APC genes in cancer.' },
            { name: 'Bioavailability & Half-life', chapterName: 'General Pharmacology', subject: 'Pharmacology', description: 'Factors influencing plasma concentration-time curves.' },
            { name: 'Receptor Signaling Mechanisms', chapterName: 'General Pharmacology', subject: 'Pharmacology', description: 'G-proteins, ion channels, enzyme-linked receptors.' },
            { name: 'Adrenergic Agonists', chapterName: 'Autonomic Nervous System', subject: 'Pharmacology', description: 'Epinephrine, Norepinephrine, Dopamine, and selective agonists.' },
            { name: 'Beta Blockers', chapterName: 'Autonomic Nervous System', subject: 'Pharmacology', description: 'Propranolol, Atenolol, Metoprolol, and their clinical uses.' },
            { name: 'Gram Staining & Cell Wall', chapterName: 'General Bacteriology', subject: 'Microbiology', description: 'Differences in Gram-positive and Gram-negative envelope structures.' },
            { name: 'Sterilization Methods', chapterName: 'General Bacteriology', subject: 'Microbiology', description: 'Autoclave parameters, dry heat, radiation, and chemical disinfectants.' },
            { name: 'Hypersensitivity Reactions', chapterName: 'Immunology', subject: 'Microbiology', description: 'Types I, II, III, and IV hypersensitivity with clinical correlations.' }
        ];
        for (const dTop of defaultMockTopics) {
            const key = `${dTop.subject}_${dTop.chapterName}_${dTop.name}`.toLowerCase();
            if (!uniqueTopicsMap.has(key)) {
                uniqueTopicsMap.set(key, { subject: dTop.subject, chapter: dTop.chapterName, topic: dTop.name, description: dTop.description });
            }
            else {
                const existing = uniqueTopicsMap.get(key);
                existing.description = dTop.description;
            }
        }
        let topicIndex = 1;
        for (const info of uniqueTopicsMap.values()) {
            const chapDoc = await ChapterModel.findOne({ subject: info.subject, name: info.chapter });
            const chapId = chapDoc ? chapDoc.id : `chap-${info.chapter.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            const topicId = `top-${topicIndex++}-${Math.random().toString(36).substring(2, 5)}`;
            const newTopic = new TopicModel({
                id: topicId,
                name: info.topic,
                chapterId: chapId,
                subject: info.subject,
                description: info.description || `Study resources and questions for ${info.topic}.`
            });
            await newTopic.save();
        }
        console.log(`Curriculum fully cleaned and rebuilt successfully. Total dynamic topics synchronized: ${uniqueTopicsMap.size}`);
    }
    catch (err) {
        console.error('Error during curriculum cleaning/rebuilding:', err);
    }
}
