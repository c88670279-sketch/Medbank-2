import { MCQ, Chapter, Topic, PDFNote, RecentActivity, UserStats, SubjectName, TestAttempt } from '../types';
import { saveDBNote, saveDBQuestion, deleteDBQuestion, saveDBTestResult, saveDBUser } from './api';
import { safeStorage } from './safeStorage';
import { GUYTON_PHYSIOLOGY_DATA } from './guytonPhysiology';

const mappedGuytonChapters: Chapter[] = GUYTON_PHYSIOLOGY_DATA.map(ch => ({
  id: `phys-guyton-c${ch.chapterNum}`,
  name: ch.name,
  subject: 'Physiology',
  section: ch.section,
  description: ch.description
}));

const mappedGuytonTopics: Topic[] = GUYTON_PHYSIOLOGY_DATA.flatMap((ch) =>
  ch.topics.map((t, idx) => ({
    id: `phys-guyton-t-${ch.chapterNum}-${idx}`,
    name: t,
    chapterId: `phys-guyton-c${ch.chapterNum}`,
    subject: 'Physiology',
    description: `Core concepts and detailed review of ${t}`
  }))
);

// Chapters Mapping
export const MOCK_CHAPTERS: Chapter[] = [
  // Pathology
  { id: 'path-c1', name: 'Cell Injury & Adaptation', subject: 'Pathology', description: 'Reversible and irreversible cell injury, necrosis, apoptosis, and intracellular accumulations.' },
  { id: 'path-c2', name: 'Inflammation & Repair', subject: 'Pathology', description: 'Acute and chronic inflammation, chemical mediators, and tissue regeneration and wound healing.' },
  { id: 'path-c3', name: 'Neoplasia', subject: 'Pathology', description: 'Characteristics of benign and malignant tumors, oncogenes, tumor suppressors, and metastasis.' },
  { id: 'path-c4', name: 'Anemia & Hematology', subject: 'Pathology', description: 'Microcytic, macrocytic, hemolytic anemias, and leukemia classifications.' },

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
  { id: 'phar-app-c3', name: 'Drugs in Breastfeeding', subject: 'Pharmacology', section: 'Appendices', description: 'Excretion of drugs in breast milk, safety profiles, and infant risk assessments.' },
  { id: 'phar-app-c4', name: 'Drugs and Fixed Dose Combinations Banned in India', subject: 'Pharmacology', section: 'Appendices', description: 'Banned formulations, irrational drug combinations, and regulatory directives in India.' },

  // Microbiology
  { id: 'micro-c1', name: 'General Bacteriology', subject: 'Microbiology', description: 'Bacterial cell structure, growth, nutrition, and disinfection.' },
  { id: 'micro-c2', name: 'Immunology', subject: 'Microbiology', description: 'Antigens, antibodies, hypersensitivity reactions, and autoimmune disorders.' },
  { id: 'micro-c3', name: 'Systemic Bacteriology', subject: 'Microbiology', description: 'Staphylococci, Streptococci, Enterobacteriaceae, and Mycobacteria.' },
  { id: 'micro-c4', name: 'Virology', subject: 'Microbiology', description: 'DNA viruses, RNA viruses, HIV, hepatitis, and antiviral defenses.' },
  ...mappedGuytonChapters
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
  { id: 'pharm-t1', name: 'Bioavailability & Half-life', chapterId: 'phar-sec1-c2', subject: 'Pharmacology', description: 'Factors influencing plasma concentration-time curves.' },
  { id: 'pharm-t2', name: 'Receptor Signaling Mechanisms', chapterId: 'phar-sec1-c4', subject: 'Pharmacology', description: 'G-proteins, ion channels, enzyme-linked receptors.' },
  // Pharmacology - ANS
  { id: 'pharm-t3', name: 'Adrenergic Agonists', chapterId: 'phar-sec2-c3', subject: 'Pharmacology', description: 'Epinephrine, Norepinephrine, Dopamine, and selective agonists.' },
  { id: 'pharm-t4', name: 'Beta Blockers', chapterId: 'phar-sec2-c4', subject: 'Pharmacology', description: 'Propranolol, Atenolol, Metoprolol, and their clinical uses.' },

  // Microbiology - General
  { id: 'micro-t1', name: 'Gram Staining & Cell Wall', chapterId: 'micro-c1', subject: 'Microbiology', description: 'Differences in Gram-positive and Gram-negative envelope structures.' },
  { id: 'micro-t2', name: 'Sterilization Methods', chapterId: 'micro-c1', subject: 'Microbiology', description: 'Autoclave parameters, dry heat, radiation, and chemical disinfectants.' },
  // Microbiology - Immunology
  { id: 'micro-t3', name: 'Hypersensitivity Reactions', chapterId: 'micro-c2', subject: 'Microbiology', description: 'Types I, II, III, and IV hypersensitivity with clinical correlations.' },
  ...mappedGuytonTopics
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
    chapter: 'Adrenergic Transmission and Adrenergic Drugs',
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
    chapter: 'Antiadrenergic Drugs (Adrenergic Receptor Antagonists) and Drugs for Glaucoma',
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
    chapter: 'Adrenergic Transmission and Adrenergic Drugs',
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
    chapter: 'Anticancer Drugs',
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
