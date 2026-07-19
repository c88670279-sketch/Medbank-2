// Guyton and Hall Physiology 84 Chapters list mapping to Unit Sections
import { Chapter } from '../types.js';

export interface GuytonChapterData {
  chapterNum: number;
  name: string;
  section: string;
  description: string;
  topics: string[];
}

export const GUYTON_PHYSIOLOGY_DATA: GuytonChapterData[] = [
  // Unit I
  {
    chapterNum: 1,
    name: "Chapter 1: Functional Organization of the Human Body and Control of the 'Internal Environment'",
    section: "Unit I – Introduction to Physiology: The Cell and General Physiology",
    description: "Cells as the living units, homeostasis, extracellular fluid, and control systems.",
    topics: ["1.1. Cells as the Living Units of the Body", "1.2. Homeostatic Control Systems", "1.3. Extracellular Fluid as the Internal Environment"]
  },
  {
    chapterNum: 2,
    name: "Chapter 2: The Cell and its Functions",
    section: "Unit I – Introduction to Physiology: The Cell and General Physiology",
    description: "Physical structure of the cell, organelles, functional systems, and cell locomotion.",
    topics: ["2.1. Cell Organelles and Structures", "2.2. Functional Systems of the Cell", "2.3. Ameboid and Ciliary Locomotion"]
  },
  {
    chapterNum: 3,
    name: "Chapter 3: Genetic Control of Protein Synthesis, Cell Function, and Cell Reproduction",
    section: "Unit I – Introduction to Physiology: The Cell and General Physiology",
    description: "Genes, DNA transcription and translation, cell division, and apoptosis.",
    topics: ["3.1. DNA Transcription and RNA Translation", "3.2. Gene Expression and Regulation", "3.3. Cell Mitosis and Apoptosis"]
  },

  // Unit II
  {
    chapterNum: 4,
    name: "Chapter 4: Transport of Substances Through Cell Membranes",
    section: "Unit II – Membrane Physiology, Nerve, and Muscle",
    description: "Lipid barrier, diffusion (simple vs facilitated), and active transport (primary vs secondary).",
    topics: ["4.1. Passive Diffusion and Osmosis", "4.2. Primary and Secondary Active Transport", "4.3. Ion Channels and Selectivity"]
  },
  {
    chapterNum: 5,
    name: "Chapter 5: Membrane Potentials and Action Potentials",
    section: "Unit II – Membrane Physiology, Nerve, and Muscle",
    description: "Nernst equation, resting membrane potential, nerve action potential, and propagation.",
    topics: ["5.1. Nernst and Goldman-Hodgkin-Katz Equations", "5.2. Action Potential Phases and Ion Conductances", "5.3. Saltatory Conduction in Myelinated Fibers"]
  },
  {
    chapterNum: 6,
    name: "Chapter 6: Contraction of Skeletal Muscle",
    section: "Unit II – Membrane Physiology, Nerve, and Muscle",
    description: "Physiologic anatomy of skeletal muscle, sliding filament theory, and walk-along mechanism.",
    topics: ["6.1. Sliding Filament Mechanism of Contraction", "6.2. Actin and Myosin Interactions", "6.3. Muscle Twitch and Summation of Contraction"]
  },
  {
    chapterNum: 7,
    name: "Chapter 7: Excitation of Skeletal Muscle: Neuromuscular Transmission and Excitation-Contraction Coupling",
    section: "Unit II – Membrane Physiology, Nerve, and Muscle",
    description: "Neuromuscular junction, acetylcholine release, end-plate potential, and calcium release via sarcoplasmic reticulum.",
    topics: ["7.1. Neuromuscular Junction Transmission", "7.2. Excitation-Contraction Coupling", "7.3. Sarcoplasmic Reticulum and Calcium Release"]
  },
  {
    chapterNum: 8,
    name: "Chapter 8: Excitation and Contraction of Smooth Muscle",
    section: "Unit II – Membrane Physiology, Nerve, and Muscle",
    description: "Smooth muscle anatomy, calcium activation, calmodulin, latch mechanism, and autonomic regulation.",
    topics: ["8.1. Smooth Muscle Contraction Mechanism", "8.2. Calmodulin and Myosin Light Chain Kinase", "8.3. Latch Mechanism of Smooth Muscle"]
  },

  // Unit III
  {
    chapterNum: 9,
    name: "Chapter 9: Cardiac Muscle; The Heart as a Pump and Function of the Heart Valves",
    section: "Unit III – The Heart",
    description: "Syncytial nature of cardiac muscle, cardiac cycle, and regulation of heart pumping.",
    topics: ["9.1. Cardiac Cycle Phases and Pressures", "9.2. Frank-Starling Mechanism", "9.3. Function of Atrioventricular and Semilunar Valves"]
  },
  {
    chapterNum: 10,
    name: "Chapter 10: Rhythmical Excitation of the Heart",
    section: "Unit III – The Heart",
    description: "Sinoatrial node pacemaker, specialized conductive pathways, and autonomic control of rhythmicity.",
    topics: ["10.1. Sinoatrial Node Pacemaker Action Potentials", "10.2. Atrioventricular Node Delay", "10.3. Purkinje System and Ventricular Excitation"]
  },
  {
    chapterNum: 11,
    name: "Chapter 11: The Normal Electrocardiogram",
    section: "Unit III – The Heart",
    description: "ECG waves, segments, intervals, and standard bipolar/unipolar leads.",
    topics: ["11.1. P-QRS-T Waves and Intervals", "11.2. Einthoven's Triangle and ECG Leads", "11.3. Vectorial Analysis of the Normal ECG"]
  },
  {
    chapterNum: 12,
    name: "Chapter 12: Electrocardiographic Interpretation of Cardiac Muscle and Coronary Blood Flow Abnormalities: Vectorial Analysis",
    section: "Unit III – The Heart",
    description: "Mean electrical axis determination, hypertrophy, bundle branch blocks, and myocardial ischemia.",
    topics: ["12.1. Axis Deviation Determination", "12.2. Ischemic Currents of Injury", "12.3. ECG Signs of Myocardial Infarction"]
  },
  {
    chapterNum: 13,
    name: "Chapter 13: Cardiac Arrhythmias and Their Electrocardiographic Interpretation",
    section: "Unit III – The Heart",
    description: "Tachycardia, bradycardia, sinus arrhythmia, heart blocks, extrasystoles, and fibrillations.",
    topics: ["13.1. Sinoatrial and Atrioventricular Heart Blocks", "13.2. Premature Ventricular Contractions (PVCs)", "13.3. Atrial and Ventricular Fibrillation"]
  },

  // Unit IV
  {
    chapterNum: 14,
    name: "Chapter 14: Overview of the Circulation; Biophysics of Pressure, Flow, and Resistance",
    section: "Unit IV – The Circulation",
    description: "Physical characteristics, vascular distensibility, Ohm's law, and Poiseuille's law.",
    topics: ["14.1. Pressure-Flow-Resistance Relationships", "14.2. Poiseuille's Law and Viscosity", "14.3. Laminar vs Turbulent Blood Flow"]
  },
  {
    chapterNum: 15,
    name: "Chapter 15: Vascular Distensibility and Functions of the Arterial and Venous Systems",
    section: "Unit IV – The Circulation",
    description: "Arterial pressure pulsations, damping, venous return, and venous pump.",
    topics: ["15.1. Arterial Compliance and Pulse Pressure", "15.2. Venous Pressures and Right Atrial Pressure", "15.3. Muscle Pump and Venous Valves"]
  },
  {
    chapterNum: 16,
    name: "Chapter 16: The Microcirculation and Lymphatic System: Capillary Fluid Exchange, Interstitial Fluid, and Lymph Flow",
    section: "Unit IV – The Circulation",
    description: "Capillary structure, vasomotion, Starling forces, and lymph kinetics.",
    topics: ["16.1. Starling Hydrostatic and Oncotic Forces", "16.2. Capillary Fluid Filtration and Reabsorption", "16.3. Lymphatic System Structure and Flow Control"]
  },
  {
    chapterNum: 17,
    name: "Chapter 17: Local and Humoral Control of Tissue Blood Flow",
    section: "Unit IV – The Circulation",
    description: "Acute vs long-term local blood flow control, vasodilators, oxygen-demand, and autoregulation.",
    topics: ["17.1. Active and Reactive Hyperemia", "17.2. Nitric Oxide and Endothelin Vasoactivity", "17.3. Angiogenesis and Collateral Circulation"]
  },
  {
    chapterNum: 18,
    name: "Chapter 18: Nervous Regulation of the Circulation, and Rapid Control of Arterial Pressure",
    section: "Unit IV – The Circulation",
    description: "Vasomotor center, sympathetic/parasympathetic effects, baroreceptor and chemoreceptor reflexes.",
    topics: ["18.1. Vasomotor Center Regulation", "18.2. Arterial Baroreceptor Reflex", "18.3. Chemoreceptor Reflex and CNS Ischemic Response"]
  },
  {
    chapterNum: 19,
    name: "Chapter 19: Role of the Kidneys in Long-Term Control of Arterial Pressure and in Hypertension: The Integrated System for Arterial Pressure Regulation",
    section: "Unit IV – The Circulation",
    description: "Renal-fluid volume mechanism, pressure natriuresis/diuresis, and renin-angiotensin-aldosterone system.",
    topics: ["19.1. Pressure Diuresis and Pressure Natriuresis", "19.2. Renin-Angiotensin-Aldosterone System (RAAS)", "19.3. Primary and Secondary Hypertension Pathophysiology"]
  },
  {
    chapterNum: 20,
    name: "Chapter 20: Cardiac Output, Venous Return, and Their Regulation",
    section: "Unit IV – The Circulation",
    description: "Normal values, cardiac output curves, venous return curves, and mean systemic filling pressure.",
    topics: ["20.1. Venous Return Curves", "20.2. Mean Systemic Filling Pressure (MSFP)", "20.3. Regulation of Cardiac Output by Tissue Need"]
  },
  {
    chapterNum: 21,
    name: "Chapter 21: Muscle Blood Flow and Cardiac Output During Exercise; the Coronary Circulation and Ischemic Heart Disease",
    section: "Unit IV – The Circulation",
    description: "Coronary blood flow, cardiac metabolism, angina, myocardial infarction, and collateral circulation.",
    topics: ["21.1. Coronary Blood Flow Autoregulation", "21.2. Myocardial Oxygen Demand and Angina", "21.3. Myocardial Infarction and Left Ventricular Work"]
  },
  {
    chapterNum: 22,
    name: "Chapter 22: Cardiac Failure",
    section: "Unit IV – The Circulation",
    description: "Acute and chronic heart failure, compensated vs decompensated, and peripheral edema.",
    topics: ["22.1. Compensated and Decompensated Heart Failure", "22.2. Left-sided vs Right-sided Heart Failure", "22.3. Pathophysiology of Cardiac Edema"]
  },
  {
    chapterNum: 23,
    name: "Chapter 23: Heart Valves and Heart Sounds; Valvular and Congenital Heart Defects",
    section: "Unit IV – The Circulation",
    description: "Aortic/mitral stenosis and regurgitation, patent ductus arteriosus, tetralogy of Fallot.",
    topics: ["23.1. First, Second, and Third Heart Sounds", "23.2. Valvular Stenosis and Regurgitation Murmurs", "23.3. Congenital Shunts: ASD, VSD, PDA"]
  },
  {
    chapterNum: 24,
    name: "Chapter 24: Circulatory Shock and Its Treatment",
    section: "Unit IV – The Circulation",
    description: "Hypovolemic, cardiogenic, neurogenic, anaphylactic, and septic shock phases.",
    topics: ["24.1. Hypovolemic Shock and Compensatory Phases", "24.2. Septic and Anaphylactic Shock Pathogenesis", "24.3. Treatment Modalities for Circulatory Shock"]
  },

  // Unit V
  {
    chapterNum: 25,
    name: "Chapter 25: The Body Fluid Compartments: Extracellular and Intracellular Fluids; Edema",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Intracellular and extracellular fluids, indicator-dilution principle, and intracellular/extracellular edema.",
    topics: ["25.1. Indicator-Dilution Measurement of Body Fluids", "25.2. Osmotic Equilibrium and Tonicity", "25.3. Intracellular vs Extracellular Edema Pathogenesis"]
  },
  {
    chapterNum: 26,
    name: "Chapter 26: Urine Formation by the Kidneys: I. Glomerular Filtration, Renal Blood Flow, and Their Control",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Glomerular filtration rate, renal blood flow, autoregulation, and tubuloglomerular feedback.",
    topics: ["26.1. Determinants of Glomerular Filtration Rate (GFR)", "26.2. Autoregulation of GFR and Renal Blood Flow", "26.3. Tubuloglomerular Feedback Mechanism"]
  },
  {
    chapterNum: 27,
    name: "Chapter 27: Urine Formation by the Kidneys: II. Tubular Reabsorption and Secretion",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Reabsorption in proximal tubule, loop of Henle, distal tubule, and collecting duct.",
    topics: ["27.1. Proximal Tubule Reabsorption mechanisms", "27.2. Loop of Henle and Distal Tubule Ion Transport", "27.3. Medullary Collecting Duct Secretion"]
  },
  {
    chapterNum: 28,
    name: "Chapter 28: Urine Concentration and Dilution; Regulation of Extracellular Fluid Osmolarity and Sodium Concentration",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Countercurrent multiplier, urea recirculation, ADH-osmpreceptor system, and thirst mechanism.",
    topics: ["28.1. Countercurrent Multiplier System", "28.2. ADH Regulation of Collecting Duct Water Channels", "28.3. Osmoreceptor-ADH Feedback and Thirst Control"]
  },
  {
    chapterNum: 29,
    name: "Chapter 29: Renal Regulation of Potassium, Calcium, Phosphate, and Magnesium; Integration of Renal Mechanisms for Control of Extracellular Fluid Volume and Extracellular Fluid Sodium Concentration",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Potassium secretion, calcium/phosphate homeostasis, and volume-regulation receptors.",
    topics: ["29.1. Renal Potassium Secretion and Aldosterone", "29.2. Calcium and Phosphate Renal Handling", "29.3. Volume Expansion and Atrial Natriuretic Peptide (ANP)"]
  },
  {
    chapterNum: 30,
    name: "Chapter 30: Acid-Base Regulation",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Bicarbonate/phosphate buffers, respiratory regulation, and renal acid-base compensation.",
    topics: ["30.1. Bicarbonate and Phosphate Buffer Systems", "30.2. Renal Acid Secretion and Bicarbonate Reabsorption", "30.3. Respiratory and Metabolic Acidosis/Alkalosis"]
  },
  {
    chapterNum: 31,
    name: "Chapter 31: Diuretics, Kidney Diseases",
    section: "Unit V – The Body Fluids and Kidneys",
    description: "Loop, thiazide, osmotic, and potassium-sparing diuretics; acute and chronic renal failure.",
    topics: ["31.1. Diuretics Mechanisms of Action", "31.2. Acute Kidney Injury Pathophysiology", "31.3. Chronic Kidney Disease and Uremic Syndrome"]
  },

  // Unit VI
  {
    chapterNum: 32,
    name: "Chapter 32: Red Blood Cells, Anemia, and Polycythemia",
    section: "Unit VI – Blood Cells, Immunity, and Blood Coagulation",
    description: "Erythropoiesis, erythropoietin, iron metabolism, anemias, and polycythemia.",
    topics: ["32.1. Erythropoiesis and Erythropoietin Regulation", "32.2. Iron Absorption, Transport, and Storage", "32.3. Microcytic, Macrocytic, and Hemolytic Anemias"]
  },
  {
    chapterNum: 33,
    name: "Chapter 33: Resistance of the Body to Infection: I. Leukocytes, Granulocytes, the Monocyte-Macrophage System, and Inflammation",
    section: "Unit VI – Blood Cells, Immunity, and Blood Coagulation",
    description: "Granulocyte production, neutrophils, macrophages, chemotaxis, and phagocytosis.",
    topics: ["33.1. Granulocyte and Monocyte Lineages", "33.2. Chemotaxis, Diapedesis, and Phagocytosis", "33.3. Reticuloendothelial (Monocyte-Macrophage) System"]
  },
  {
    chapterNum: 34,
    name: "Chapter 34: Resistance of the Body to Infection: II. Immunity and Allergy Innate Immunity",
    section: "Unit VI – Blood Cells, Immunity, and Blood Coagulation",
    description: "Innate immunity, acquired (adaptive) immunity, T-cells, B-cells, antibodies, and vaccination.",
    topics: ["34.1. Innate vs Adaptive Immunity", "34.2. T-Cell Activation and Cell-Mediated Immunity", "34.3. B-Cell Humoral Immunity and Antibodies"]
  },
  {
    chapterNum: 35,
    name: "Chapter 35: Blood Types; Transfusion; Tissue and Organ Transplantation",
    section: "Unit VI – Blood Cells, Immunity, and Blood Coagulation",
    description: "ABO blood groups, Rh factor, transfusion reactions, erythroblastosis fetalis, and graft rejection.",
    topics: ["35.1. ABO Blood Groups and Genotypes", "35.2. Rh Incompatibility and Erythroblastosis Fetalis", "35.3. HLA Complexes and Graft Rejection"]
  },
  {
    chapterNum: 36,
    name: "Chapter 36: Hemostasis and Blood Coagulation",
    section: "Unit VI – Blood Cells, Immunity, and Blood Coagulation",
    description: "Vascular spasm, platelet plug, intrinsic/extrinsic coagulation, clot retraction, and anticoagulants.",
    topics: ["36.1. Platelet Activation and Aggregation", "36.2. Intrinsic and Extrinsic Coagulation Cascades", "36.3. Clot Lysis and Endogenous Anticoagulants"]
  },

  // Unit VII
  {
    chapterNum: 37,
    name: "Chapter 37: Pulmonary Ventilation",
    section: "Unit VII – Respiration",
    description: "Mechanics of pulmonary ventilation, pleural pressure, lung compliance, surfactant, and work of breathing.",
    topics: ["37.1. Pleural, Alveolar, and Transpulmonary Pressures", "37.2. Lung Compliance and Surfactant Action", "37.3. Spirometry: Lung Volumes and Capacities"]
  },
  {
    chapterNum: 38,
    name: "Chapter 38: Pulmonary Circulation, Pulmonary Edema, Pleural Fluid",
    section: "Unit VII – Respiration",
    description: "Pressures in pulmonary system, blood distribution, pulmonary capillary dynamics, and pleural cavity.",
    topics: ["38.1. Pulmonary Vascular Pressures and Resistance", "38.2. Ventilation-Perfusion (V/Q) Mismatch", "38.3. Pulmonary Edema Pathophysiology"]
  },
  {
    chapterNum: 39,
    name: "Chapter 39: Physical Principles of Gas Exchange; Diffusion of Oxygen and Carbon Dioxide Through the Respiratory Membrane",
    section: "Unit VII – Respiration",
    description: "Partial pressures, gas solubility, composition of alveolar air, and respiratory membrane diffusing capacity.",
    topics: ["39.1. Alveolar Gas Composition and Partial Pressures", "39.2. Fick's Law of Gas Diffusion", "39.3. Factors Affecting Carbon Dioxide and Oxygen Diffusion"]
  },
  {
    chapterNum: 40,
    name: "Chapter 40: Transport of Oxygen and Carbon Dioxide in Blood and Tissue Fluids",
    section: "Unit VII – Respiration",
    description: "Oxygen-hemoglobin dissociation curve, Bohr effect, carbon dioxide transport forms, and Haldane effect.",
    topics: ["40.1. Oxygen-Hemoglobin Dissociation Curve Shifts", "40.2. Bohr Effect vs Haldane Effect", "40.3. Carbon Dioxide Transport as Bicarbonate and Carbaminohemoglobin"]
  },
  {
    chapterNum: 41,
    name: "Chapter 41: Regulation of Respiration",
    section: "Unit VII – Respiration",
    description: "Respiratory center, dorsal/ventral respiratory groups, chemical control, and chemoreceptors.",
    topics: ["41.1. Medullary Respiratory Center Control", "41.2. Central and Peripheral Chemoreceptors", "41.3. Hering-Breuer Inflation Reflex"]
  },
  {
    chapterNum: 42,
    name: "Chapter 42: Respiratory Insufficiency—Pathophysiology, Diagnosis, Oxygen Therapy",
    section: "Unit VII – Respiration",
    description: "Hypoxia types, hypercapnia, emphysema, pneumonia, asthma, atelectasis, and oxygen therapy.",
    topics: ["42.1. Hypoxic, Anemic, and Stagnant Hypoxia", "42.2. Obstructive vs Restrictive Lung Diseases", "42.3. Pathophysiology of Asthma and Atelectasis"]
  },

  // Unit VIII
  {
    chapterNum: 43,
    name: "Chapter 43: Aviation, High-Altitude, and Space Physiology",
    section: "Unit VIII – Aviation, Space, and Deep-Sea Diving Physiology",
    description: "Low oxygen pressure, acute mountain sickness, acclimatization, accelerative forces.",
    topics: ["43.1. Acclimatization to High Altitude", "43.2. Acute Mountain Sickness (AMS)", "43.3. Effects of G-forces on Cardiovascular System"]
  },
  {
    chapterNum: 44,
    name: "Chapter 44: Physiology of Deep-Sea Diving and Other Hyperbaric Conditions",
    section: "Unit VIII – Aviation, Space, and Deep-Sea Diving Physiology",
    description: "High partial pressures, nitrogen narcosis, decompression sickness (bends), and hyperbaric oxygen.",
    topics: ["44.1. Nitrogen Narcosis and Oxygen Toxicity", "44.2. Decompression Sickness (The Bends) Pathogenesis", "44.3. SCUBA Diving Principles and Hyperbaric Therapy"]
  },

  // Unit IX
  {
    chapterNum: 45,
    name: "Chapter 45: Organization of the Nervous System, Basic Functions of Synapses, and Neurotransmitters",
    section: "Unit IX – Nervous System A: General Principles and Sensory Physiology",
    description: "Sensory and motor divisions, levels of CNS function, synapses, EPSP/IPSP, and neurotransmitters.",
    topics: ["45.1. Chemical vs Electrical Synapses", "45.2. Postsynaptic Potentials (EPSPs and IPSPs)", "45.3. High-Yield Neurotransmitters and Receptors"]
  },
  {
    chapterNum: 46,
    name: "Chapter 46: Sensory Receptors, Neuronal Circuits for Processing Information",
    section: "Unit IX – Nervous System A: General Principles and Sensory Physiology",
    description: "Receptor transduction, adaptation, sensory pathways, spatial/temporal summation, and neuronal pools.",
    topics: ["46.1. Receptor Transduction and Generator Potential", "46.2. Tonic vs Phasic Receptor Adaptation", "46.3. SUMMATION mechanisms: Spatial vs Temporal"]
  },
  {
    chapterNum: 47,
    name: "Chapter 47: Somatic Sensations: I. General Organization, the Tactile and Position Senses",
    section: "Unit IX – Nervous System A: General Principles and Sensory Physiology",
    description: "Dorsal column-medial lemniscal system vs anterolateral system, somatosensory cortex.",
    topics: ["47.1. Dorsal Column-Medial Lemniscal System", "47.2. Anterolateral Pathway", "47.3. Somatosensory Cortex Organization (Homunculus)"]
  },
  {
    chapterNum: 48,
    name: "Chapter 48: Somatic Sensations: II. Pain, Headache, and Thermal Sensations",
    section: "Unit IX – Nervous System A: General Principles and Sensory Physiology",
    description: "Fast and slow pain pathways, neospinothalamic vs paleospinothalamic, referred pain, and thermal receptors.",
    topics: ["48.1. Fast vs Slow Pain Pathways", "48.2. Referred Pain and Dermatomal Rules", "48.3. Analgesia System of the Brain and Opioid Receptors"]
  },

  // Unit X
  {
    chapterNum: 49,
    name: "Chapter 49: The Eye: I. Optics of Vision",
    section: "Unit X – Nervous System B: The Special Senses",
    description: "Refraction of light, lenses, accommodation, pupillary aperture, errors of refraction.",
    topics: ["49.1. Refraction and Diopters", "49.2. Mechanism of Accommodation and Presbyopia", "49.3. Myopia, Hyperopia, and Astigmatism Refractive Errors"]
  },
  {
    chapterNum: 50,
    name: "Chapter 50: The Eye: II. Receptor and Neural Function of the Retina",
    section: "Unit X – Nervous System B: The Special Senses",
    description: "Photochemistry of vision, rhodopsin cycle, rods vs cones, color vision, neural circuits of retina.",
    topics: ["50.1. Rhodopsin Decoloration and Regeneration Cycle", "50.2. Photoreceptor Hyperpolarization Mechanism", "50.3. Trichromatic Theory and Color Blindness"]
  },
  {
    chapterNum: 51,
    name: "Chapter 51: The Eye: III. Central Neurophysiology of Vision",
    section: "Unit X – Nervous System B: The Special Senses",
    description: "Visual pathways, primary visual cortex, optokinetic movements, and pupillary light reflex.",
    topics: ["51.1. Visual Pathway and Field Defects", "51.2. Primary Visual Cortex (V1) Functional Columns", "51.3. Pupillary Light Reflex Pathway"]
  },
  {
    chapterNum: 52,
    name: "Chapter 52: The Sense of Hearing",
    section: "Unit X – Nervous System B: The Special Senses",
    description: "Tympanic membrane, ossicles, cochlea, organ of Corti, and central auditory pathways.",
    topics: ["52.1. Sound Transmission via Middle Ear Ossicles", "52.2. Organ of Corti and Hair Cell Transduction", "52.3. Auditory Cortex and Conductive vs Sensorineural Deafness"]
  },
  {
    chapterNum: 53,
    name: "Chapter 53: The Chemical Senses—Taste and Smell",
    section: "Unit X – Nervous System B: The Special Senses",
    description: "Primary taste sensations, taste buds, olfactory membrane, receptors, and pathways.",
    topics: ["53.1. Primary Taste Sensations and Bud Transduction", "53.2. Olfactory Receptor Activation and Adaptation", "53.3. Central Olfactory Pathways"]
  },

  // Unit XI
  {
    chapterNum: 54,
    name: "Chapter 54: Motor Functions of the Spinal Cord; the Cord Reflexes",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Somatic motor neurons, muscle spindles, Golgi tendon organs, withdrawal reflexes, spinal shock.",
    topics: ["54.1. Alpha and Gamma Motor Neurons", "54.2. Stretch Reflex and Muscle Spindle Mechanism", "54.3. Flexor Withdrawal and Crossed Extensor Reflexes"]
  },
  {
    chapterNum: 55,
    name: "Chapter 55: Cortical and Brain Stem Control of Motor Function",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Primary motor cortex, corticospinal tract, brainstem nuclei, vestibular apparatus, and equilibrium.",
    topics: ["55.1. Corticospinal (Pyramidal) Tract", "55.2. Vestibular System and Semicircular Canals", "55.3. Brainstem Nuclei Control of Posture"]
  },
  {
    chapterNum: 56,
    name: "Chapter 56: Contributions of the Cerebellum and Basal Ganglia to Overall Motor Control",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Cerebellar lobes, Purkinje cells, basal ganglia pathways, Parkinson's disease, Huntington's chorea.",
    topics: ["56.1. Cerebellar Functional Zones and Error Correction", "56.2. Direct and Indirect Basal Ganglia Pathways", "56.3. Parkinson's Disease Pathophysiology"]
  },
  {
    chapterNum: 57,
    name: "Chapter 57: Cerebral Cortex, Intellectual Functions of the Brain, Learning, and Memory",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Cortical layers, Wernicke's aphasia, Broca's aphasia, memory consolidation, prefrontal cortex.",
    topics: ["57.1. Wernicke's Aphasia vs Broca's Aphasia", "57.2. Synaptic Mechanisms of Memory Consolidation", "57.3. Prefrontal Cortex and Executive Function"]
  },
  {
    chapterNum: 58,
    name: "Chapter 58: Behavioral and Motivational Mechanisms of the Brain—The Limbic System and the Hypothalamus",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Hypothalamus homeostatic functions, amygdala, hippocampus, reward and punishment centers.",
    topics: ["58.1. Hypothalamus Control of Body Temperature and Water", "58.2. Amygdala Role in Emotional Behavior", "58.3. Hippocampus and Consolidation of Memory"]
  },
  {
    chapterNum: 59,
    name: "Chapter 59: States of Brain Activity—Sleep, Brain Waves, Epilepsy, Psychoses",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "EEG waves, REM vs NREM sleep, epilepsy types (grand mal, petit mal), and schizophrenia neurotransmitters.",
    topics: ["59.1. NREM vs REM Sleep Characteristics", "59.2. EEG Brain Wave Frequencies", "59.3. Grand Mal and Petit Mal Epilepsy Electro-clinical Signs"]
  },
  {
    chapterNum: 60,
    name: "Chapter 60: The Autonomic Nervous System and the Adrenal Medulla",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Sympathetic and parasympathetic systems, cholinergic vs adrenergic receptors, adrenal medulla co-secretion.",
    topics: ["60.1. Preganglionic vs Postganglionic Autonomic Fibers", "60.2. Adrenergic Alpha and Beta Receptors", "60.3. Adrenal Medulla Secretion of Catecholamines"]
  },
  {
    chapterNum: 61,
    name: "Chapter 61: Cerebral Blood Flow, Cerebrospinal Fluid, and Brain Metabolism",
    section: "Unit XI – Nervous System C: Motor and Integrative Neurophysiology",
    description: "Autoregulation of CBF, CSF formation and absorption, blood-brain barrier, and brain glucose consumption.",
    topics: ["61.1. Autoregulation of Cerebral Blood Flow", "61.2. Cerebrospinal Fluid Circulation and Hydrocephalus", "61.3. Blood-Brain Barrier (BBB) Transport Properties"]
  },

  // Unit XII
  {
    chapterNum: 62,
    name: "Chapter 62: General Principles of Gastrointestinal Function—Motility, Nervous Control, and Blood Circulation",
    section: "Unit XII – Gastrointestinal Physiology",
    description: "Enteric nervous system (Myenteric and Meissner plexus), slow waves, spike potentials, and splanchnic circulation.",
    topics: ["62.1. Enteric Nervous System Plexuses", "62.2. Gastrointestinal Slow Waves and Spike Potentials", "62.3. Splanchnic Circulation and Vasoactive Peptides"]
  },
  {
    chapterNum: 63,
    name: "Chapter 63: Propulsion and Mixing of Food in the Alimentary Tract",
    section: "Unit XII – Gastrointestinal Physiology",
    description: "Mastication, swallowing phases, gastric motility, intestinal segmentation, and defecation reflex.",
    topics: ["63.1. Swallowing Reflex and Esophageal Peristalsis", "63.2. Gastric Emptying and Mixing Movements", "63.3. Intestinal Segmentation and Defecation Reflex"]
  },
  {
    chapterNum: 64,
    name: "Chapter 64: Secretory Functions of the Alimentary Tract",
    section: "Unit XII – Gastrointestinal Physiology",
    description: "Salivary glands, gastric acid (HCl) secretion mechanism, pancreatic enzymes, bile secretion, and Brunner's glands.",
    topics: ["64.1. Parietal Cell Hydrochloric Acid Secretion", "64.2. Pancreatic Enzyme and Bicarbonate Secretion", "64.3. Enterohepatic Circulation of Bile Salts"]
  },
  {
    chapterNum: 65,
    name: "Chapter 65: Digestion and Absorption in the Gastrointestinal Tract",
    section: "Unit XII – Gastrointestinal Physiology",
    description: "Carbohydrate, protein, and lipid digestion; sodium, water, and nutrient absorption in the small intestine.",
    topics: ["65.1. Carbohydrate and Protein Luminal Digestion", "65.2. Lipid Emulsification and Micellar Absorption", "65.3. Active Transport of Glucose and Amino Acids"]
  },
  {
    chapterNum: 66,
    name: "Chapter 66: Physiology of Gastrointestinal Disorders",
    section: "Unit XII – Gastrointestinal Physiology",
    description: "Achalasia, gastritis, peptic ulcers, pancreatitis, malabsorption, and diarrhea pathophysiology.",
    topics: ["66.1. Peptic Ulcer Disease Pathogenesis", "66.2. Pancreatitis and Malabsorption Syndrome", "66.3. Secretory vs Osmotic Diarrhea"]
  },

  // Unit XIII
  {
    chapterNum: 67,
    name: "Chapter 67: Metabolism of Carbohydrates, and Formation of Adenosine Triphosphate",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Glucose transport, glycolysis, citric acid cycle, glycogenesis, and ATP yield.",
    topics: ["67.1. Facilitated Glucose Transport (GLUTs)", "67.2. Glycolysis and Krebs Cycle Anaerobic/Aerobic Yields", "67.3. Glycogenolysis and Gluconeogenesis Regulation"]
  },
  {
    chapterNum: 68,
    name: "Chapter 68: Lipid Metabolism",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Chylomicrons, lipoproteins (VLDL, LDL, HDL), beta-oxidation, and ketogenesis.",
    topics: ["68.1. Lipoprotein Synthesis and Receptors", "68.2. Fatty Acid Beta-Oxidation Energetics", "68.3. Ketone Body Synthesis and Ketoacidosis"]
  },
  {
    chapterNum: 69,
    name: "Chapter 69: Protein Metabolism",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Amino acid transport, deamination, urea cycle, and essential vs non-essential amino acids.",
    topics: ["69.1. Amino Acid Transamination and Deamination", "69.2. Urea Cycle in the Liver", "69.3. Plasma Protein Functions and Colloid Osmotic Pressure"]
  },
  {
    chapterNum: 70,
    name: "Chapter 70: The Liver as an Organ",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Vascular structures, metabolic functions, bilirubin formation, excretion, and jaundice.",
    topics: ["70.1. Functional Anatomy of the Liver Lobule", "70.2. Bilirubin Metabolism and Glucuronidation", "70.3. Pre-hepatic, Hepatic, and Post-hepatic Jaundice"]
  },
  {
    chapterNum: 71,
    name: "Chapter 71: Dietary Balances; Regulation of Feeding; Obesity and Starvation; Vitamins and Minerals",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Energy balance, feeding center, leptin, ghrelin, vitamins (A, D, E, K, B, C) deficiencies.",
    topics: ["71.1. Hypothalamic Feeding Centers and Satiety Signals", "71.2. Leptin, Ghrelin, and Neuropeptide Y Regulation", "71.3. Water-soluble and Fat-soluble Vitamin Deficiencies"]
  },
  {
    chapterNum: 72,
    name: "Chapter 72: Energetics and Metabolic Rate",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Basal metabolic rate (BMR), thyroid influence, and energy expenditures.",
    topics: ["72.1. Basal Metabolic Rate (BMR) Determinants", "72.2. Factors Affecting Energy Expenditure", "72.3. Specific Dynamic Action of Food"]
  },
  {
    chapterNum: 73,
    name: "Chapter 73: Body Temperature Regulation, and Fever",
    section: "Unit XIII – Metabolism and Temperature Regulation",
    description: "Hypothalamic thermostat, heat loss mechanisms, sweating, shivering, and pyrogens.",
    topics: ["73.1. Hypothalamic Set-point and Thermoregulation", "73.2. Mechanisms of Heat Loss: Radiation, Convection, Evaporation", "73.3. Pathophysiology of Fever and Interleukin-1 Action"]
  },

  // Unit XIV
  {
    chapterNum: 74,
    name: "Chapter 74: Introduction to Endocrinology",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Hormone chemical nature, synthesis, receptor locations, second messenger systems.",
    topics: ["74.1. Amine, Peptide, and Steroid Hormone Classes", "74.2. cAMP and IP3/DAG Second Messenger Systems", "74.3. Hormone Receptor Downregulation and Upregulation"]
  },
  {
    chapterNum: 75,
    name: "Chapter 75: Pituitary Hormones and Their Control by the Hypothalamus",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Hypothalamic-hypophysial portal system, anterior pituitary hormones, ADH, and oxytocin.",
    topics: ["75.1. Hypothalamic-Hypophysial Portal System", "75.2. Growth Hormone Secretion and Somatomedins", "75.3. ADH and Oxytocin Synthesis and Action"]
  },
  {
    chapterNum: 76,
    name: "Chapter 76: Thyroid Metabolic Hormones",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Thyroxine synthesis, iodination, transport, metabolic effects, Graves' disease, and myxedema.",
    topics: ["76.1. Thyroid Hormone Synthesis and Iodination", "76.2. Cellular Actions of T3 and T4", "76.3. Graves' Disease vs Myxedema Pathophysiology"]
  },
  {
    chapterNum: 77,
    name: "Chapter 77: Adrenocortical Hormones",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Cortisol metabolic effects, aldosterone mineralocorticoid actions, Addison's disease, and Cushing's syndrome.",
    topics: ["77.1. Aldosterone Regulation and Renal Action", "77.2. Cortisol anti-inflammatory and Metabolic Actions", "77.3. Cushing's Syndrome vs Addison's Disease"]
  },
  {
    chapterNum: 78,
    name: "Chapter 78: Insulin, Glucagon, and Diabetes Mellitus",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Beta cell insulin secretion, tyrosine kinase receptor, glucagon actions, Type 1 vs Type 2 diabetes.",
    topics: ["78.1. Insulin Secretion Mechanism in Beta Cells", "78.2. Insulin Receptor Tyrosine Kinase Activation", "78.3. Type 1 vs Type 2 Diabetes Mellitus Pathophysiology"]
  },
  {
    chapterNum: 79,
    name: "Chapter 79: Parathyroid Hormone, Calcitonin, Calcium and Phosphate Metabolism, Vitamin D, Bone, and Teeth",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Calcium pools, bone resorption, osteoblasts/osteoclasts, PTH, calcitonin, rickets, and osteoporosis.",
    topics: ["79.1. Parathyroid Hormone Bone and Renal Effects", "79.2. Vitamin D Activation Pathway", "79.3. Osteoclast Bone Resorption Mechanism"]
  },
  {
    chapterNum: 80,
    name: "Chapter 80: Reproductive and Hormonal Functions of the Male (and Function of the Pineal Gland)",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Spermatogenesis, Leydig and Sertoli cell functions, testosterone synthesis, and LH/FSH feedback.",
    topics: ["80.1. Spermatogenesis Stages and Sertoli Cells", "80.2. Testosterone Metabolic and Sexual Actions", "80.3. Hypothalamic-Pituitary-Testicular Axis Feedback"]
  },
  {
    chapterNum: 81,
    name: "Chapter 81: Female Physiology Before Pregnancy and Female Hormones",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Ovarian cycle, endometrial (menstrual) cycle, estrogen, progesterone, LH surge, and menopause.",
    topics: ["81.1. Ovarian Follicular Phase and Luteal Phase", "81.2. Menstrual Cycle Endometrial Proliferation and Secretion", "81.3. LH Surge Mechanism and Ovulation Trigger"]
  },
  {
    chapterNum: 82,
    name: "Chapter 82: Pregnancy and Lactation",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Placental hCG, estrogen, progesterone, fetal circulation, parturition, prolactin, and oxytocin.",
    topics: ["82.1. Human Chorionic Gonadotropin (hCG) Placental Secretion", "82.2. Parturition Reflex and Estrogen/Progesterone Ratios", "82.3. Prolactin and Oxytocin Roles in Lactation"]
  },
  {
    chapterNum: 83,
    name: "Chapter 83: Fetal and Neonatal Physiology",
    section: "Unit XIV – Endocrinology and Reproduction",
    description: "Fetal respiration, neonatal cardiovascular changes (foramen ovale, ductus arteriosus closing).",
    topics: ["83.1. Fetal Circulation Shunts", "83.2. Neonatal Respiratory Adaptation", "83.3. Closure of Ductus Arteriosus and Foramen Ovale"]
  },

  // Unit XV
  {
    chapterNum: 84,
    name: "Chapter 84: Sports Physiology",
    section: "Unit XV – Sports Physiology",
    description: "Aerobic vs anaerobic systems, muscle strength/power, cardiovascular/respiratory changes in exercise.",
    topics: ["84.1. Phosphagen, Glycogen-Lactic Acid, and Aerobic Systems", "84.2. Exercise Effects on Cardiac Output and Stroke Volume", "84.3. Muscle Fiber Types: Slow Twitch vs Fast Twitch"]
  }
];
