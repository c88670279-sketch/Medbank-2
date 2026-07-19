import mongoose from 'mongoose';
import { GUYTON_PHYSIOLOGY_DATA } from '../lib/guytonPhysiology.js';

// Disable command buffering globally so that queries fail fast when offline instead of hanging
mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URI;

function getCleanedURI(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  
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
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if ((mongoose.connection.readyState as any) !== 2) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
    if ((mongoose.connection.readyState as any) === 1) {
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
    } else {
      await seedInitialData();
    }
    
    return conn.connection;
  } catch (error: any) {
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
  section: { type: String, default: '' },
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
  images: { type: [String], default: [] },
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

export const UserModel: mongoose.Model<any> = mongoose.models.User || mongoose.model('User', UserSchema);
export const SubjectModel: mongoose.Model<any> = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
export const ChapterModel: mongoose.Model<any> = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
export const NoteModel: mongoose.Model<any> = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export const PdfModel: mongoose.Model<any> = mongoose.models.Pdf || mongoose.model('Pdf', PdfSchema);
export const QuestionModel: mongoose.Model<any> = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const TestModel: mongoose.Model<any> = mongoose.models.Test || mongoose.model('Test', TestSchema);
export const TestResultModel: mongoose.Model<any> = mongoose.models.TestResult || mongoose.model('TestResult', TestResultSchema);
export const AnnouncementModel: mongoose.Model<any> = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const FlashcardModel: mongoose.Model<any> = mongoose.models.Flashcard || mongoose.model('Flashcard', FlashcardSchema);
export const VideoModel: mongoose.Model<any> = mongoose.models.Video || mongoose.model('Video', VideoSchema);
export const TopicModel: mongoose.Model<any> = mongoose.models.Topic || mongoose.model('Topic', TopicSchema);
export const TrashModel: mongoose.Model<any> = mongoose.models.Trash || mongoose.model('Trash', TrashSchema);

export async function seedInitialData() {
  try {
    // Check if the correct canonical chapters have already been seeded.
    // If 'anat-c1' exists AND the official 92-chapter Microbiology syllabus exists, we are seeded.
    const isSeeded = await ChapterModel.findOne({ id: 'anat-c1' });
    const hasSectionSyllabus = await ChapterModel.findOne({ id: 'micr-c3', name: '3. General Bacteriology' });
    const hasPharmacologySyllabus = await ChapterModel.findOne({ id: 'phar-sec1-c1' });
    
    if (!isSeeded || !hasSectionSyllabus || !hasPharmacologySyllabus) {
      console.log('--- REBUILDING MBBS SECTION-BASED SYLLABUS DATASET (TASK RESET) ---');
      
      // 1. Delete all previously imported MCQs, chapters, and extracted question data
      console.log('Wiping legacy imported MCQs, chapters, topics, notes, PDFs, tests, results, flashcards, videos, and trash...');
      await QuestionModel.deleteMany({});
      await ChapterModel.deleteMany({});
      await TopicModel.deleteMany({});
      await PdfModel.deleteMany({});
      await NoteModel.deleteMany({});
      await TestModel.deleteMany({});
      await TestResultModel.deleteMany({});
      await FlashcardModel.deleteMany({});
      await VideoModel.deleteMany({});
      await TrashModel.deleteMany({});

      // Note: User accounts (UserModel) are kept completely intact as requested.

      // 2. Seed standard 14 subjects perfectly
      console.log('Seeding standard 14 MBBS subjects to SubjectModel...');
      await SubjectModel.deleteMany({});
      const standardSubjects = [
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
      await SubjectModel.insertMany(standardSubjects);

      // 3. Rebuild the chapter structure using the correct MBBS syllabus
      console.log('Seeding correct canonical MBBS syllabus chapter structure to ChapterModel...');
      const standardChapters = [
        // Anatomy
        { id: 'anat-c1', name: 'Part 1: Upper Limb & Thorax', subject: 'Anatomy', description: 'Detailed study of upper limb osteology, musculature, vasculature, and thoracic organs.' },
        { id: 'anat-c2', name: 'Part 2: Lower Limb, Abdomen & Pelvis', subject: 'Anatomy', description: 'Study of lower limb structures, abdominal viscera, peritoneal cavity, and pelvis.' },
        { id: 'anat-c3', name: 'Part 3: Head & Neck', subject: 'Anatomy', description: 'Gross anatomy of face, scalp, skull bones, neck compartments, and cranial nerves.' },
        { id: 'anat-c4', name: 'Part 4: Brain & Neuroanatomy', subject: 'Anatomy', description: 'Neuroanatomical structures of the cerebrum, brainstem, tracts, ventricular system, and blood supply.' },

        // Physiology (Guyton 84 Chapters Syllabus)
        ...GUYTON_PHYSIOLOGY_DATA.map((ch) => ({
          id: `phys-guyton-c${ch.chapterNum}`,
          name: ch.name,
          subject: 'Physiology',
          section: ch.section,
          description: ch.description,
          displayOrder: ch.chapterNum,
          isActive: true
        })),

        // Biochemistry
        { id: 'bioc-c1', name: 'Cell Biology & Biomolecules', subject: 'Biochemistry', description: 'Structure and function of carbohydrates, lipids, proteins, nucleic acids, and cell organelles.' },
        { id: 'bioc-c2', name: 'Enzymology & Bioenergetics', subject: 'Biochemistry', description: 'Enzyme kinetics, inhibition, coenzymes, and oxidative phosphorylation.' },
        { id: 'bioc-c3', name: 'Carbohydrate Metabolism', subject: 'Biochemistry', description: 'Glycolysis, TCA cycle, gluconeogenesis, glycogen metabolism, and HMP shunt.' },
        { id: 'bioc-c4', name: 'Lipid Metabolism', subject: 'Biochemistry', description: 'Beta-oxidation, fatty acid synthesis, cholesterol metabolism, and lipoprotein transport.' },
        { id: 'bioc-c5', name: 'Protein & Amino Acid Metabolism', subject: 'Biochemistry', description: 'Urea cycle, transamination, and metabolism of specialized amino acids.' },
        { id: 'bioc-c6', name: 'Molecular Biology & Genetics', subject: 'Biochemistry', description: 'DNA replication, transcription, translation, gene regulation, and recombinant DNA technology.' },
        { id: 'bioc-c7', name: 'Clinical Biochemistry & Nutrition', subject: 'Biochemistry', description: 'Organ function tests, acid-base balance, vitamins, minerals, and inborn errors of metabolism.' },

        // Pathology
        { id: 'path-c1', name: 'General Pathology (Cell Injury, Inflammation, Neoplasia)', subject: 'Pathology', description: 'Cell injury, necrosis, apoptosis, acute/chronic inflammation, hemodynamic disorders, and neoplasia characteristics.' },
        { id: 'path-c2', name: 'Hematology & Blood Banking', subject: 'Pathology', description: 'Anemias, leukemias, bleeding disorders, bone marrow examination, and transfusion medicine.' },
        { id: 'path-c3', name: 'Cardiovascular & Respiratory Pathology', subject: 'Pathology', description: 'Atherosclerosis, ischemic heart disease, valvular diseases, pneumonia, lung tumors, and COPD.' },
        { id: 'path-c4', name: 'Gastrointestinal & Hepatobiliary Pathology', subject: 'Pathology', description: 'Gastritis, peptic ulcers, inflammatory bowel disease, cirrhosis, hepatitis, and GI cancers.' },
        { id: 'path-c5', name: 'Renal & Urinary Tract Pathology', subject: 'Pathology', description: 'Glomerulonephritis, nephrotic syndrome, acute kidney injury, renal calculi, and bladder tumors.' },
        { id: 'path-c6', name: 'Endocrine & Reproductive Pathology', subject: 'Pathology', description: 'Thyroiditis, goiter, adrenal hyper/hypofunction, endometrial hyperplasia, breast carcinomas.' },
        { id: 'path-c7', name: 'Neuropathology & Musculoskeletal Pathology', subject: 'Pathology', description: 'Meningitis, stroke, neurodegenerative diseases, osteomyelitis, bone tumors, and joint diseases.' },

        // Pharmacology
        { id: 'phar-sec1-c1', name: 'Introduction, Routes of Drug Administration', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Overview of pharmacology, history, drug nomenclature, and various routes of drug administration.' },
        { id: 'phar-sec1-c2', name: 'Membrane Transport, Absorption and Distribution of Drugs', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Mechanisms of drug transport across biological membranes, absorption kinetics, bioavailability, and drug distribution.' },
        { id: 'phar-sec1-c3', name: 'Metabolism and Excretion of Drugs, Kinetics of Elimination', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Biotransformation pathways, microsomal enzymes, renal and non-renal excretion, and clearance kinetics.' },
        { id: 'phar-sec1-c4', name: 'Mechanism of Drug Action; Receptor Pharmacology', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Receptor families, signal transduction, dose-response relationships, agonists, antagonists, and therapeutic index.' },
        { id: 'phar-sec1-c5', name: 'Aspects of Pharmacotherapy, Clinical Pharmacology and Drug Development', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Clinical trials, drug regulation, orphan drugs, essential medicine list, and rational prescribing.' },
        { id: 'phar-sec1-c6', name: 'Adverse Drug Effects', subject: 'Pharmacology', section: 'Section 1: General Pharmacological Principles', description: 'Classification of adverse drug reactions, side effects, toxicities, drug allergies, and pharmacovigilance.' },

        { id: 'phar-sec2-c1', name: 'Cholinergic Transmission and Cholinergic Drugs', subject: 'Pharmacology', section: 'Section 2: Drugs Acting on Autonomic Nervous System', description: 'Synthesis, storage, and release of acetylcholine; cholinomimetics and anticholinesterases.' },
        { id: 'phar-sec2-c2', name: 'Anticholinergic Drugs and Drugs Acting on Autonomic Ganglia', subject: 'Pharmacology', section: 'Section 2: Drugs Acting on Autonomic Nervous System', description: 'Atropine and its congeners, ganglionic stimulants, and ganglionic blockers.' },
        { id: 'phar-sec2-c3', name: 'Adrenergic Transmission and Adrenergic Drugs', subject: 'Pharmacology', section: 'Section 2: Drugs Acting on Autonomic Nervous System', description: 'Synthesis and reuptake of catecholamines; sympathomimetics, alpha and beta receptor agonists.' },
        { id: 'phar-sec2-c4', name: 'Antiadrenergic Drugs (Adrenergic Receptor Antagonists) and Drugs for Glaucoma', subject: 'Pharmacology', section: 'Section 2: Drugs Acting on Autonomic Nervous System', description: 'Alpha and beta blockers, clinical pharmacology, and medical management of glaucoma.' },

        { id: 'phar-sec3-c1', name: 'Histamine and Antihistaminics', subject: 'Pharmacology', section: 'Section 3: Autacoids and Related Drugs', description: 'Physiological roles of histamine, H1 and H2 receptor antagonists, and their clinical uses.' },
        { id: 'phar-sec3-c2', name: '5-Hydroxytryptamine, its Antagonists and Drug Therapy of Migraine', subject: 'Pharmacology', section: 'Section 3: Autacoids and Related Drugs', description: 'Serotonergic pathways, agonists, antagonists, and acute & prophylactic management of migraine.' },
        { id: 'phar-sec3-c3', name: 'Prostaglandins, Leukotrienes (Eicosanoids) and Platelet Activating Factor', subject: 'Pharmacology', section: 'Section 3: Autacoids and Related Drugs', description: 'Biosynthesis of eicosanoids, physiological effects, and clinical applications of prostaglandins.' },
        { id: 'phar-sec3-c4', name: 'Nonsteroidal Antiinflammatory Drugs and Antipyretic-Analgesics', subject: 'Pharmacology', section: 'Section 3: Autacoids and Related Drugs', description: 'Mechanism of action of COX inhibitors, aspirin, paracetamol, selective COX-2 inhibitors, and NSAID toxicities.' },
        { id: 'phar-sec3-c5', name: 'Antirheumatoid and Antigout Drugs', subject: 'Pharmacology', section: 'Section 3: Autacoids and Related Drugs', description: 'Disease-modifying antirheumatic drugs (DMARDs), treatment of acute and chronic gout.' },

        { id: 'phar-sec4-c1', name: 'Drugs for Cough and Bronchial Asthma', subject: 'Pharmacology', section: 'Section 4: Respiratory System Drugs', description: 'Antitussives, expectorants, bronchodilators, inhaled corticosteroids, and leukotriene antagonists.' },

        { id: 'phar-sec5-c1', name: 'Anterior Pituitary Hormones', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Growth hormone, prolactin, gonadotropins, and their hypothalamic releasing/inhibiting factors.' },
        { id: 'phar-sec5-c2', name: 'Thyroid Hormones and Thyroid Inhibitors', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Thyroxine synthesis, replacement therapy, antithyroid drugs, and radioiodine.' },
        { id: 'phar-sec5-c3', name: 'Insulin, Oral Antidiabetic Drugs and Glucagon', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Insulin regimens, sulfonylureas, biguanides, SGLT2 inhibitors, GLP-1 agonists, and management of diabetes mellitus.' },
        { id: 'phar-sec5-c4', name: 'Corticosteroids', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Glucocorticoids, mineralocorticoids, physiological actions, therapeutic uses, and adverse effects.' },
        { id: 'phar-sec5-c5', name: 'Androgens and Related Drugs, Drugs for Erectile Dysfunction', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Testosterone, anabolic steroids, antiandrogens, and PDE-5 inhibitors.' },
        { id: 'phar-sec5-c6', name: 'Estrogens, Progestins and Contraceptives', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Hormonal replacement therapy, oral contraceptives, injectable contraceptives, and selective estrogen receptor modulators.' },
        { id: 'phar-sec5-c7', name: 'Oxytocin and Other Drugs Acting on Uterus', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Uterine stimulants (oxytocin, ergot alkaloids) and uterine relaxants (tocolytics).' },
        { id: 'phar-sec5-c8', name: 'Hormones and Drugs Affecting Calcium Balance', subject: 'Pharmacology', section: 'Section 5: Hormones and Related Drugs', description: 'Parathyroid hormone, calcitonin, Vitamin D, bisphosphonates, and management of osteoporosis.' },

        { id: 'phar-sec6-c1', name: 'Skeletal Muscle Relaxants', subject: 'Pharmacology', section: 'Section 6: Drugs Acting on Peripheral (Somatic) Nervous System', description: 'Neuromuscular blockers, depolarizing and non-depolarizing agents, and spasmolytics.' },
        { id: 'phar-sec6-c2', name: 'Local Anaesthetics', subject: 'Pharmacology', section: 'Section 6: Drugs Acting on Peripheral (Somatic) Nervous System', description: 'Mechanism of local anesthetic action, lidocaine, bupivacaine, and addition of adrenaline.' },

        { id: 'phar-sec7-c1', name: 'General Anaesthetics', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Inhalational and intravenous anesthetics, stages of anesthesia, and preanesthetic medication.' },
        { id: 'phar-sec7-c2', name: 'Ethyl and Methyl Alcohols', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Pharmacology of ethanol, acute and chronic alcoholism, disulfiram, and treatment of methanol poisoning.' },
        { id: 'phar-sec7-c3', name: 'Sedative-Hypnotics', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Barbiturates, benzodiazepines, non-benzodiazepine hypnotics (Z-drugs), and flumazenil.' },
        { id: 'phar-sec7-c4', name: 'Antiepileptic Drugs', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Mechanisms of seizure control, phenytoin, valproate, carbamazepine, newer anticonvulsants, and status epilepticus.' },
        { id: 'phar-sec7-c5', name: 'Antiparkinsonian Drugs', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Levodopa-carbidopa, dopamine agonists, MAO-B inhibitors, COMT inhibitors, and anticholinergic agents.' },
        { id: 'phar-sec7-c6', name: 'Drugs Used in Mental Illness: Antipsychotic and Antimanic Drugs', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Typical and atypical antipsychotics, lithium, and mood stabilizers.' },
        { id: 'phar-sec7-c7', name: 'Drugs Used in Mental Illness: Antidepressant and Antianxiety Drugs', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'SSRIs, SNRIs, TCAs, MAOIs, and benzodiazepines used for anxiety.' },
        { id: 'phar-sec7-c8', name: 'Opioid Analgesics and Antagonists', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Morphine, fentanyl, opioid receptors, endogenous peptides, and naloxone/naltrexone.' },
        { id: 'phar-sec7-c9', name: 'CNS Stimulants and Cognition Enhancers', subject: 'Pharmacology', section: 'Section 7: Drugs Acting on Central Nervous System', description: 'Amphetamines, methylphenidate, nootropics, and drugs for Alzheimer\'s disease.' },

        { id: 'phar-sec8-c1', name: 'Drugs Affecting Renin-Angiotensin System', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'ACE inhibitors, Angiotensin Receptor Blockers (ARBs), and direct renin inhibitors.' },
        { id: 'phar-sec8-c2', name: 'Nitric Oxide and Vasoactive Peptide Signal Molecules', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'Endogenous nitric oxide, donors, endothelin antagonists, and vasoactive peptides.' },
        { id: 'phar-sec8-c3', name: 'Cardiac Glycosides and Drugs for Heart Failure', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'Digoxin, beta-blockers, aldosterone antagonists, and newer drugs like ARNIs.' },
        { id: 'phar-sec8-c4', name: 'Antiarrhythmic Drugs', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'Vaughan Williams classification (Class I-IV) and management of arrhythmias.' },
        { id: 'phar-sec8-c5', name: 'Antianginal and Other Anti-ischaemic Drugs', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'Organic nitrates, calcium channel blockers, beta-blockers, and metabolic modulators (ranolazine).' },
        { id: 'phar-sec8-c6', name: 'Antihypertensive Drugs', subject: 'Pharmacology', section: 'Section 8: Cardiovascular Drugs', description: 'First-line drugs, step-care therapy, and management of hypertensive emergencies.' },

        { id: 'phar-sec9-c1', name: 'Diuretics', subject: 'Pharmacology', section: 'Section 9: Drugs Acting on Kidney', description: 'Loop diuretics, thiazides, potassium-sparing diuretics, carbonic anhydrase inhibitors, and osmotic diuretics.' },
        { id: 'phar-sec9-c2', name: 'Antidiuretics', subject: 'Pharmacology', section: 'Section 9: Drugs Acting on Kidney', description: 'Vasopressin, desmopressin, and treatment of diabetes insipidus.' },

        { id: 'phar-sec10-c1', name: 'Haematinics and Erythropoietin', subject: 'Pharmacology', section: 'Section 10: Drugs Affecting Blood and Blood Formation', description: 'Iron, Vitamin B12, folic acid formulations, and erythropoiesis-stimulating agents.' },
        { id: 'phar-sec10-c2', name: 'Drugs Affecting Coagulation, Bleeding and Thrombosis', subject: 'Pharmacology', section: 'Section 10: Drugs Affecting Blood and Blood Formation', description: 'Anticoagulants (heparin, warfarin, DOACs), antiplatelets, fibrinolytics, and antifibrinolytics.' },
        { id: 'phar-sec10-c3', name: 'Hypolipidaemic Drugs', subject: 'Pharmacology', section: 'Section 10: Drugs Affecting Blood and Blood Formation', description: 'Statins, fibrates, ezetimibe, PCSK9 inhibitors, and bile acid sequestrants.' },

        { id: 'phar-sec11-c1', name: 'Drugs for Peptic Ulcer and Gastroesophageal Reflux Disease', subject: 'Pharmacology', section: 'Section 11: Gastrointestinal Drugs', description: 'H2 blockers, PPIs, mucosal protectants, antacids, and H. pylori eradication regimens.' },
        { id: 'phar-sec11-c2', name: 'Antiemetic, Prokinetic and Digestant Drugs', subject: 'Pharmacology', section: 'Section 11: Gastrointestinal Drugs', description: 'D2 antagonists, 5-HT3 antagonists, NK1 antagonists, prokinetics, and pancreatic enzymes.' },
        { id: 'phar-sec11-c3', name: 'Drugs for Constipation and Diarrhoea', subject: 'Pharmacology', section: 'Section 11: Gastrointestinal Drugs', description: 'Laxatives, purgatives, oral rehydration salts (ORS), loperamide, and racecadotril.' },

        { id: 'phar-sec12-c1', name: 'Antimicrobial Drugs: General Considerations', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Classification, mechanism of action, bacterial resistance, and general principles of chemotherapy.' },
        { id: 'phar-sec12-c2', name: 'Sulfonamides, Cotrimoxazole and Quinolones', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Folate antagonists, fluoroquinolones, and their therapeutic applications.' },
        { id: 'phar-sec12-c3', name: 'Beta-Lactam Antibiotics', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Penicillins, cephalosporins, monobactams, carbapenems, and beta-lactamase inhibitors.' },
        { id: 'phar-sec12-c4', name: 'Tetracyclines and Chloramphenicol (Broad-Spectrum Antibiotics)', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Mechanism of action, spectrum, and notable adverse effects (teeth discoloration, gray baby syndrome).' },
        { id: 'phar-sec12-c5', name: 'Aminoglycoside Antibiotics', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Gentamicin, amikacin, streptomycin, ototoxicity, and nephrotoxicity.' },
        { id: 'phar-sec12-c6', name: 'Macrolide, Lincosamide, Glycopeptide and Other Antibacterial Antibiotics; Urinary Antiseptics', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Erythromycin, azithromycin, clindamycin, vancomycin, linezolid, and nitrofurantoin.' },
        { id: 'phar-sec12-c7', name: 'Antitubercular Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'First-line (HRZES) and second-line anti-TB drugs, and MDR/XDR-TB treatment regimens.' },
        { id: 'phar-sec12-c8', name: 'Antileprotic Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Dapsone, clofazimine, rifampicin, and WHO multi-drug therapy (MDT) for leprosy.' },
        { id: 'phar-sec12-c9', name: 'Antifungal Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Amphotericin B, azoles, echinocandins, terbinafine, and superficial vs systemic mycoses.' },
        { id: 'phar-sec12-c10', name: 'Antiviral Drugs (Non-retroviral)', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Acyclovir, ganciclovir, oseltamivir, and drugs for chronic hepatitis B and C.' },
        { id: 'phar-sec12-c11', name: 'Antiviral Drugs (Anti-retrovirus)', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'NRTIs, NNRTIs, protease inhibitors, integrase inhibitors, and HAART regimens.' },
        { id: 'phar-sec12-c12', name: 'Antimalarial Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Chloroquine, artemisinin derivatives, quinine, primaquine, and prophylaxis regimens.' },
        { id: 'phar-sec12-c13', name: 'Antiamoebic and Other Antiprotozoal Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Metronidazole, tinidazole, and treatment of giardiasis, trichomoniasis, and toxoplasmosis.' },
        { id: 'phar-sec12-c14', name: 'Anthelmintic Drugs', subject: 'Pharmacology', section: 'Section 12: Antimicrobial Drugs', description: 'Albendazole, mebendazole, ivermectin, praziquantel, and diethylcarbamazine (DEC).' },

        { id: 'phar-sec13-c1', name: 'Anticancer Drugs', subject: 'Pharmacology', section: 'Section 13: Chemotherapy of Neoplastic Diseases', description: 'Alkylating agents, antimetabolites, plant alkaloids, targeted therapies, immunotherapy, and cancer toxicities.' },

        { id: 'phar-sec14-c1', name: 'Immunosuppressant Drugs', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Cyclosporine, tacrolimus, azathioprine, mycophenolate mofetil, and monoclonal antibodies.' },
        { id: 'phar-sec14-c2', name: 'Drugs Acting on Skin and Mucous Membranes', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Topical steroids, retinoids, emollients, and melanizing agents.' },
        { id: 'phar-sec14-c3', name: 'Antiseptics, Disinfectants and Ectoparasiticides', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Phenols, halogens, alcohols, aldehydes, and scabicides/pediculicides.' },
        { id: 'phar-sec14-c4', name: 'Chelating Agents', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'BAL, EDTA, penicillamine, desferrioxamine, and treatment of heavy metal poisoning.' },
        { id: 'phar-sec14-c5', name: 'Vitamins', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Water-soluble and fat-soluble vitamins, therapeutic indications, and hypervitaminosis.' },
        { id: 'phar-sec14-c6', name: 'Vaccines, Antisera and Immunoglobulins', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Active and passive immunization, types of vaccines, and cold chain.' },
        { id: 'phar-sec14-c7', name: 'Drug Interactions', subject: 'Pharmacology', section: 'Section 14: Miscellaneous Drugs', description: 'Pharmacokinetic and pharmacodynamic drug interactions with high-yield clinical examples.' },

        { id: 'phar-app-c1', name: 'Appendix 1: Solution to Problem Directed Study', subject: 'Pharmacology', section: 'Appendices', description: 'Analytical studies, case scenarios, and clinical problem-solving guides.' },
        { id: 'phar-app-c2', name: 'Appendix 2: Prescribing in Pregnancy', subject: 'Pharmacology', section: 'Appendices', description: 'FDA pregnancy categories, teratogenic drugs, and safe alternatives during gestation.' },
        { id: 'phar-app-c3', name: 'Appendix 3: Drugs in Breastfeeding', subject: 'Pharmacology', section: 'Appendices', description: 'Excretion of drugs in breast milk, safety profiles, and infant risk assessments.' },
        { id: 'phar-app-c4', name: 'Appendix 4: Drugs and Fixed Dose Combinations Banned in India', subject: 'Pharmacology', section: 'Appendices', description: 'Banned formulations, irrational drug combinations, and regulatory directives in India.' },

        // Microbiology (Canonical 11 Sections + Annexures + Unassigned)
        { id: 'micr-c1', name: '1. Introduction and History', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Historical milestones, scientists, and introduction to microorganisms.' },
        { id: 'micr-c2', name: '2. Microscopy', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Principles and types of microscopy: light, darkfield, phase-contrast, fluorescent, electron.' },
        { id: 'micr-c3', name: '3. General Bacteriology', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Classification, morphology, physiology, lab diagnosis, genetics, antimicrobials, and pathogenesis.' },
        { id: 'micr-c4', name: '4. General Virology and Overview of Viral Infections', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Structure, replication, classification, and general pathology of viruses.' },
        { id: 'micr-c5', name: '5. General Parasitology and Overview of Parasitic Infections', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Introduction to protozoa, helminths, life cycles, and general pathogenesis.' },
        { id: 'micr-c6', name: '6. General Mycology and Overview of Fungal Infections', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Morphology, taxonomy, pathogenesis, and lab diagnosis of fungi.' },
        { id: 'micr-c7', name: '7. Normal Human Microbiota', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Distribution and clinical significance of normal microflora.' },
        { id: 'micr-c8', name: '8. Epidemiology of Infectious Diseases', subject: 'Microbiology', section: 'Section 1: General Microbiology', description: 'Source, transmission, outbreaks, and control of infectious diseases.' },
        { id: 'micr-c9', name: '9. Immunity (Innate and Acquired)', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Non-specific and specific defense mechanisms.' },
        { id: 'micr-c10', name: '10. Antigen', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Properties, types, and factors influencing antigenicity.' },
        { id: 'micr-c11', name: '11. Antibody', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Structure, classes, functions, and monoclonal antibodies.' },
        { id: 'micr-c12', name: '12. Antigen-antibody Reaction', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Precipitation, agglutination, ELISA, RIA, Western Blot, and immunofluorescence.' },
        { id: 'micr-c13', name: '13. Complement', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Classical, alternative, and lectin pathways; complement deficiencies.' },
        { id: 'micr-c14', name: '14. Components of Immune System: Organs, Cells and Products', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Lymphoid organs, T-cells, B-cells, macrophages, and cytokines.' },
        { id: 'micr-c15', name: '15. Immune Responses: Cell-mediated and Antibody-mediated', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Humoral and cellular immune response pathways.' },
        { id: 'micr-c16', name: '16. Hypersensitivity', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Type I, II, III, and IV hypersensitivity mechanisms and clinical examples.' },
        { id: 'micr-c17', name: '17. Autoimmunity', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Mechanisms and major autoimmune disorders.' },
        { id: 'micr-c18', name: '18. Immunodeficiency Disorders', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Primary and secondary immunodeficiencies.' },
        { id: 'micr-c19', name: '19. Transplant and Cancer Immunology', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Graft rejection, tumor antigens, and immune surveillance.' },
        { id: 'micr-c20', name: '20. Immunoprophylaxis', subject: 'Microbiology', section: 'Section 2: Immunology', description: 'Vaccines, immunoglobulins, and national immunization schedule.' },
        { id: 'micr-c21', name: '21. Healthcare-associated Infections', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Epidemiology, risk factors, and prevention of HAIs.' },
        { id: 'micr-c22', name: '22. Major Healthcare-associated Infection Types', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'VAP, CLABSI, CAUTI, and surgical site infections.' },
        { id: 'micr-c23', name: '23. Sterilization and Disinfection', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Physical and chemical agents, autoclave, and monitoring.' },
        { id: 'micr-c24', name: '24. Biomedical Waste Management', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Color coding, segregation, and disposal guidelines.' },
        { id: 'micr-c25', name: '25. Needle Stick Injury', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Post-exposure prophylaxis and prevention protocols.' },
        { id: 'micr-c26', name: '26. Antimicrobial Stewardship', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Principles and guidelines for rational antibiotic use.' },
        { id: 'micr-c27', name: '27. Environmental Surveillance (Bacteriology of Water, Air and Surface)', subject: 'Microbiology', section: 'Section 3: Hospital Infection Control', description: 'Testing of water, air, and surfaces in healthcare settings.' },
        { id: 'micr-c28', name: '28. Cardiovascular System Infections: Infective Endocarditis and Acute Rheumatic Fever', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Pathogenesis, causative agents, and Duke criteria.' },
        { id: 'micr-c29', name: '29. Bloodstream Infections', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Sepsis, bacteremia, and blood culture guidelines.' },
        { id: 'micr-c30', name: '30. Enteric Fever (Salmonella Typhi and Salmonella Paratyphi)', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Pathogenesis, Widal, and culture diagnosis.' },
        { id: 'micr-c31', name: '31. Rickettsial Infections', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Scrub typhus, Weil-Felix test, and vectors.' },
        { id: 'micr-c32', name: '32. Miscellaneous Bacterial Bloodstream Infections: Brucellosis, Leptospirosis and Borreliosis', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Zoonotic bloodstream pathogens.' },
        { id: 'micr-c33', name: '33. HIV/AIDS', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Pathogenesis, opportunistic infections, and lab monitoring.' },
        { id: 'micr-c34', name: '34. Viral Hemorrhagic Fever (VHF)', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Dengue, Chikungunya, Ebola, and yellow fever.' },
        { id: 'micr-c35', name: '35. Malaria and Babesiosis', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Plasmodium species, life cycle, and peripheral smear.' },
        { id: 'micr-c36', name: '36. Visceral Leishmaniasis and Trypanosomiasis', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Kala-azar, vector, and LD bodies.' },
        { id: 'micr-c37', name: '37. Lymphatic Filariasis', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Wuchereria bancrofti, microfilariae, and lymphedema.' },
        { id: 'micr-c38', name: '38. Systemic Candidiasis and Systemic Mycoses', subject: 'Microbiology', section: 'Section 4: Bloodstream and Cardiovascular System Infections', description: 'Histoplasmosis, Coccidioidomycosis, and invasive Candida.' },
        { id: 'micr-c39', name: '39. Gastrointestinal Infective Syndromes', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Approach to acute diarrhea, dysentery, and vomiting.' },
        { id: 'micr-c40', name: '40. Food Poisoning: S. aureus, Bacillus cereus, Clostridium botulinum and Others', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Toxin-mediated gastrointestinal diseases.' },
        { id: 'micr-c41', name: '41. Gastrointestinal Infections due to Enterobacteriaceae: Diarrheagenic Escherichia coli, Shigellosis, Nontyphoidal Salmonellosis and Yersiniosis', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Bacterial enteritis.' },
        { id: 'micr-c42', name: '42. Cholera, Halophilic Vibrio and Aeromonas Infections', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Vibrio cholerae, rice water stools, and TCBS agar.' },
        { id: 'micr-c43', name: '43. Miscellaneous Bacterial Infections of Gastrointestinal System: Helicobacter, Campylobacter and Clostridioides difficile Infections', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Peptic ulcer, pseudomembranous colitis.' },
        { id: 'micr-c44', name: '44. Viral Gastroenteritis: Rotaviruses and Others', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Rotavirus, Norovirus, and infantile diarrhea.' },
        { id: 'micr-c45', name: '45. Intestinal Protozoan Infections: Intestinal Amoebiasis, Giardiasis, Coccidian Parasitic Infections, Balantidiasis, Blastocystosis, and Others', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'E. histolytica, Giardia lamblia, and Cryptosporidium.' },
        { id: 'micr-c46', name: '46. Intestinal Helminthic Infections', subject: 'Microbiology', section: 'Section 5: Gastrointestinal (GI) Infections', description: 'Cestodes, nematodes, and trematodes of the intestine.' },
        { id: 'micr-c47', name: '47. Infective Syndromes of Hepatobiliary System and Abdomen', subject: 'Microbiology', section: 'Section 6: Hepatobiliary System Infections', description: 'Peritonitis, cholecystitis, and intra-abdominal abscess.' },
        { id: 'micr-c48', name: '48. Viruses Causing Hepatitis - Hepatitis Viruses, Yellow Fever and Others', subject: 'Microbiology', section: 'Section 6: Hepatobiliary System Infections', description: 'Hepatitis A, B, C, D, and E viruses.' },
        { id: 'micr-c49', name: '49. Parasitic Infections of Hepatobiliary System - Amoebic Liver Abscess, Hydatid Disease (Echinococcus), Trematode Infections (Fasciola hepatica, Clonorchis and Opisthorchis) and Others', subject: 'Microbiology', section: 'Section 6: Hepatobiliary System Infections', description: 'Liver parasites.' },
        { id: 'micr-c50', name: '50. Infective Syndromes of Skin, Soft Tissue and Musculoskeletal Systems', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Cellulitis, impetigo, and necrotizing fasciitis.' },
        { id: 'micr-c51', name: '51. Staphylococcal Infections', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Staphylococcus aureus, MRSA, osteomyelitis, and toxic shock syndrome.' },
        { id: 'micr-c52', name: '52. Beta-hemolytic Streptococcal Infections', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Streptococcus pyogenes, erysipelas, and glomerulonephritis.' },
        { id: 'micr-c53', name: '53. Gas gangrene (Clostridium perfringens) and Infections due to Nonsporing Anaerobes', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Myonecrosis and anaerobic wound infections.' },
        { id: 'micr-c54', name: '54. Leprosy (Mycobacterium leprae)', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Hansen disease, clinical types, and Ridley-Jopling classification.' },
        { id: 'micr-c55', name: '55. Miscellaneous Bacterial Infections of Skin and Soft Tissues: Anthrax (Bacillus anthracis), Actinomycosis, Nocardiosis, Nonvenereal Treponematoses and Others', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Atypical skin infections.' },
        { id: 'micr-c56', name: '56. Viral Exanthems and Other Cutaneous Viral Infections', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Measles, rubella, varicella-zoster, HPV, and molluscum.' },
        { id: 'micr-c57', name: '57. Parasitic Infections of Skin, Soft Tissue and Musculoskeletal System', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Cutaneous leishmaniasis, scabies, and guinea worm.' },
        { id: 'micr-c58', name: '58. Fungal Infections of Skin, Soft Tissue and Musculoskeletal System', subject: 'Microbiology', section: 'Section 7: Skin, Soft Tissue and Musculoskeletal System Infections', description: 'Dermatophytosis, Mycetoma, and Sporotrichosis.' },
        { id: 'micr-c59', name: '59. Infective Syndromes of Respiratory Tract', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'URI, bronchitis, and pneumonia.' },
        { id: 'micr-c60', name: '60. Bacterial Pharyngitis: Streptococcus pyogenes Pharyngitis, Diphtheria and Others', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Corynebacterium diphtheriae and sore throat.' },
        { id: 'micr-c61', name: '61. Bacterial Lobar Pneumonia: Pneumococcal Pneumonia, Haemophilus influenzae Pneumonia and Others', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Community-acquired bacterial pneumonia.' },
        { id: 'micr-c62', name: '62. Bacterial Atypical (Interstitial) Pneumonia: Mycoplasma, Chlamydia, Legionella and Others', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Atypical pneumonia pathogens.' },
        { id: 'micr-c63', name: '63. Tuberculosis and Nontuberculous Mycobacteria Infections', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Mycobacterium tuberculosis, GeneXpert, and Mantoux.' },
        { id: 'micr-c64', name: '64. Pertussis (Bordetella pertussis)', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Whooping cough and cough plates.' },
        { id: 'micr-c65', name: '65. Infections due to Non-fermenting Gram-negative Bacilli: Pseudomonas, Acinetobacter, Burkholderia and Others', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Multidrug-resistant hospital pathogens.' },
        { id: 'micr-c66', name: '66. Myxovirus Infections of Respiratory Tract: Influenza, Parainfluenza, Mumps, Respiratory Syncytial Virus and Others', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Respiratory RNA viruses.' },
        { id: 'micr-c67', name: '67. Coronavirus Infections Including COVID-19', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'SARS-CoV-2, MERS, and general Coronaviridae.' },
        { id: 'micr-c68', name: '68. Miscellaneous Viral Infections of Respiratory Tract: Rhinovirus, Adenovirus and Infectious Mononucleosis (Epstein-Barr Virus)', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Common cold and glandular fever.' },
        { id: 'micr-c69', name: '69. Parasitic and Fungal Infections of Respiratory Tract', subject: 'Microbiology', section: 'Section 8: Respiratory Tract Infections', description: 'Pneumocystis jirovecii, pulmonary eosinophilia, and Aspergillosis.' },
        { id: 'micr-c70', name: '70. Infective Syndromes of Central Nervous System', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'Meningitis, encephalitis, and brain abscess diagnostics.' },
        { id: 'micr-c71', name: '71. Bacterial Meningitis', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'N. meningitidis, S. pneumoniae, H. influenzae, and CSF examination.' },
        { id: 'micr-c72', name: '72. Tetanus', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'Clostridium tetani, spastic paralysis, and tetanospasmin.' },
        { id: 'micr-c73', name: '73. Viral Meningitis and Myelitis: Poliomyelitis, Coxsackievirus Infections, and Others', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'Enterovirus diseases.' },
        { id: 'micr-c74', name: '74. Viral Encephalitis and Encephalopathy - Rabies, HSV Encephalitis, Arboviral Encephalitis (Japanese Encephalitis and West Nile), Nipah and Hendra, Slow Virus and Prion Disease, and Others', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'Rabies, JE, and prion diseases.' },
        { id: 'micr-c75', name: '75. Parasitic and Fungal Infections of Central Nervous System', subject: 'Microbiology', section: 'Section 9: Central Nervous System Infections', description: 'Cryptococcal meningitis, Neurocysticercosis, and Toxoplasmosis.' },
        { id: 'micr-c76', name: '76. Infective Syndromes of Urinary Tract and Sexually-transmitted Infections', subject: 'Microbiology', section: 'Section 10: Urogenital Tract Infections', description: 'UTI pathogens, quantitative urine culture, and urethritis.' },
        { id: 'micr-c77', name: '77. Infective Syndromes of Genital Tract', subject: 'Microbiology', section: 'Section 10: Urogenital Tract Infections', description: 'Syphilis, gonorrhea, chancroid, chlamydia, and vaginitis.' },
        { id: 'micr-c78', name: '78. Ocular and Ear Infections', subject: 'Microbiology', section: 'Section 11: Miscellaneous Infective Syndromes', description: 'Trachoma, otitis externa, and endophthalmitis.' },
        { id: 'micr-c79', name: '79. Congenital Infections', subject: 'Microbiology', section: 'Section 11: Miscellaneous Infective Syndromes', description: 'TORCH agents and congenital syphilis.' },
        { id: 'micr-c80', name: '80. Organisms with Oncogenic Potential', subject: 'Microbiology', section: 'Section 11: Miscellaneous Infective Syndromes', description: 'HPV, EBV, HBV, HCV, HHV-8, and H. pylori oncogenesis.' },
        { id: 'micr-c81', name: '81. Zoonotic Infections: Plague, Tularaemia and Bite Wound Infections', subject: 'Microbiology', section: 'Section 11: Miscellaneous Infective Syndromes', description: 'Yersinia pestis and animal bite infections.' },
        { id: 'micr-c82', name: 'Annexure 1: Opportunistic Infections', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Infections in immunocompromised hosts.' },
        { id: 'micr-c83', name: 'Annexure 2: Transplant Infections', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Infections in solid organ and bone marrow transplant recipients.' },
        { id: 'micr-c84', name: 'Annexure 3: Emerging and Re-emerging Infections', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Zika, Nipah, avian influenza, and monkeypox.' },
        { id: 'micr-c85', name: 'Annexure 4: Microbial Agents of Bioterrorism', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Anthrax, smallpox, plague, botulism, and tularemia.' },
        { id: 'micr-c86', name: 'Annexure 5: Laboratory Acquired Infections', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Biosafety cabinets, levels, and containment.' },
        { id: 'micr-c87', name: 'Annexure 6: National Health Programmes for Communicable Diseases', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'NTEP, NACP, NVBDCP, and integrated surveillance.' },
        { id: 'micr-c88', name: 'Annexure 7: Vector-borne Infections and Ectoparasite Infestations', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Ticks, mites, fleas, and lice infestations.' },
        { id: 'micr-c89', name: 'Annexure 8: Transfusion-transmitted Infections', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Screening protocols for blood donors.' },
        { id: 'micr-c90', name: 'Annexure 9: AETCOM in Microbiology', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Ethics, communications, and empathy in clinical microbiology.' },
        { id: 'micr-c91', name: 'Annexure 10: Pandemic Management', subject: 'Microbiology', section: 'Section 12: Annexures', description: 'Outbreak response, contact tracing, and quarantine.' },
        { id: 'micr-unassigned', name: 'Unassigned Questions', subject: 'Microbiology', section: 'Section 13: Unassigned Questions', description: 'Questions requiring manual review for classification.' }
      ];
      await ChapterModel.insertMany(standardChapters);

      // 4. Seed clean, default topics matching the canonical syllabus
      console.log('Seeding initial topics associated with canonical chapters...');
      const defaultTopics = [
        { name: 'Upper Limb Gross Anatomy', chapterId: 'anat-c1', subject: 'Anatomy', description: 'Osteology of clavicle, scapula, humerus; brachial plexus and clinical syndromes.' },
        { name: 'Thorax & Mediastinum', chapterId: 'anat-c1', subject: 'Anatomy', description: 'Anatomy of heart chambers, blood vessels, coronary supply, and lungs.' },
        { name: 'Necrosis vs Apoptosis', chapterId: 'path-c1', subject: 'Pathology', description: 'Morphological, biochemical, and genetic differences between cell death pathways.' },
        { name: 'ADME Principles', chapterId: 'phar-sec1-c2', subject: 'Pharmacology', description: 'Absorption, Distribution, Metabolism, and Excretion profiles of drugs.' },
        { name: 'Adrenergic Agonists & Antagonists', chapterId: 'phar-sec2-c3', subject: 'Pharmacology', description: 'Receptor profiles, mechanisms, and therapeutic applications of sympathomimetics and sympatholytics.' },
        // Topics/Exercises for Chapter 3: General Bacteriology (Exercises 3.1 - 3.7)
        { name: '3.1. Bacterial Taxonomy', chapterId: 'micr-c3', subject: 'Microbiology', description: 'Classification, nomenclature, and identification of bacteria.' },
        { name: '3.2. Morphology and Physiology of Bacteria', chapterId: 'micr-c3', subject: 'Microbiology', description: 'Bacterial cell wall, structure, organelles, growth curve, and metabolism.' },
        { name: '3.3. Laboratory Diagnosis of Bacterial Infections', chapterId: 'micr-c3', subject: 'Microbiology', description: 'Specimen collection, microscopy, culture media, biochemical tests, and molecular methods.' },
        { name: '3.4. Bacterial Genetics', chapterId: 'micr-c3', subject: 'Microbiology', description: 'DNA replication, mutation, plasmids, gene transfer (conjugation, transduction, transformation), and recombinant DNA.' },
        { name: '3.5. Antimicrobial Agents and Antimicrobial Resistance', chapterId: 'micr-c3', subject: 'Microbiology', description: 'Mechanism of action, resistance mechanisms, and susceptibility testing.' },
        { name: '3.6. Pathogenesis of Bacterial Infections', chapterId: 'micr-c3', subject: 'Microbiology', description: 'Virulence factors, endotoxins, exotoxins, and mechanisms of tissue damage.' },
        { name: '3.7. Overview of Bacterial Infections', chapterId: 'micr-c3', subject: 'Microbiology', description: 'General patterns of bacterial diseases and clinical presentations.' },
        { name: 'Hypersensitivity Reactions', chapterId: 'micr-c16', subject: 'Microbiology', description: 'Detailed classification of Types I, II, III, and IV hypersensitivities with clinical examples.' },
        ...GUYTON_PHYSIOLOGY_DATA.flatMap((ch) =>
          ch.topics.map((t) => ({
            name: t,
            chapterId: `phys-guyton-c${ch.chapterNum}`,
            subject: 'Physiology',
            description: `Core concepts and detailed review of ${t}`
          }))
        )
      ];
      await TopicModel.insertMany(defaultTopics);

      console.log('--- REBUILD COMPLETED SUCCESSFULLY ---');
    } else {
      console.log('Database already contains correct MBBS chapters. Skipping reset to preserve newly imported questions.');
    }

    // Ensure Physiology is always upgraded to Guyton 84-chapter syllabus even if database is already seeded.
    const hasPhysiologyGuytonSyllabus = await ChapterModel.findOne({ id: 'phys-guyton-c1' });
    if (!hasPhysiologyGuytonSyllabus) {
      console.log('--- DB UPGRADE: Seeding Guyton 84-Chapter Physiology Syllabus... ---');
      await ChapterModel.deleteMany({ subject: 'Physiology' });
      await TopicModel.deleteMany({ subject: 'Physiology' });
      
      const guytonChaptersMapped = GUYTON_PHYSIOLOGY_DATA.map((ch) => ({
        id: `phys-guyton-c${ch.chapterNum}`,
        name: ch.name,
        subject: 'Physiology',
        section: ch.section,
        description: ch.description,
        displayOrder: ch.chapterNum,
        isActive: true
      }));
      await ChapterModel.insertMany(guytonChaptersMapped);
      
      const guytonTopicsMapped = GUYTON_PHYSIOLOGY_DATA.flatMap((ch) => 
        ch.topics.map((t) => ({
          name: t,
          chapterId: `phys-guyton-c${ch.chapterNum}`,
          subject: 'Physiology',
          description: `Core concepts and detailed review of ${t}`
        }))
      );
      await TopicModel.insertMany(guytonTopicsMapped);
      console.log('--- DB UPGRADE: Guyton Physiology Syllabus upgrade completed! ---');
    }
  } catch (err) {
    console.error('Error during data seeding:', err);
  }
}

export async function normalizeAndRebuildCurriculum() {
  try {
    console.log('Running clean curriculum topic sync...');
    // Sync any topics that might be orphaned or missing chapterId references
    const allTopics = await TopicModel.find({});
    for (const topic of allTopics) {
      if (!topic.chapterId || topic.chapterId.startsWith('chap-')) {
        const canonicalChapter = await ChapterModel.findOne({ subject: topic.subject, name: topic.chapterName || topic.chapter });
        if (canonicalChapter) {
          topic.chapterId = canonicalChapter.id;
          await topic.save();
        }
      }
    }
    console.log('Curriculum topic sync completed.');
  } catch (err) {
    console.error('Error in topic sync:', err);
  }
}
