const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const MedicalDocument = require('../src/models/MedicalDocument');
const PatientIntake = require('../src/models/PatientIntake');
const User = require('../src/models/User');

const {
  chunkText,
  detectSection,
  scoreBM25,
  processAndStoreDocumentChunks,
  retrieveTopKChunks,
} = require('../src/services/ragService');

const {
  expandClinicalQuery,
  CLINICAL_BOOST_TOKENS,
} = require('../src/services/clinicalVocabulary');

describe('=== RAG Accuracy & Chunking Upgrade Test Suite ===', () => {
  let mongoServer;
  let testDoctorId;
  let testPatientId;
  let testIntakeId;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const docUser = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'dr.sarah@test.com',
      password: 'password123',
      role: 'doctor',
    });
    testDoctorId = docUser._id;

    const patUser = await User.create({
      name: 'John Doe',
      email: 'john@test.com',
      password: 'password123',
      role: 'patient',
    });
    testPatientId = patUser._id;

    const intake = await PatientIntake.create({
      patientId: testPatientId,
      assignedDoctorId: testDoctorId,
      symptoms: 'Experiencing recurrent headaches, elevated blood pressure readings at home, and fatigue.',
      duration: '3 weeks',
      currentMedications: ['Amlodipine 5mg', 'Metformin 500mg'],
      allergies: ['Penicillin'],
      status: 'Submitted',
    });
    testIntakeId = intake._id;
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // 1. Clinical Vocabulary & Query Expansion Tests
  describe('Clinical Query Expansion', () => {
    it('should expand "hypertension" into BP and blood pressure terms', () => {
      const { expandedQuery, terms } = expandClinicalQuery('Is the patient experiencing hypertension?');
      assert.ok(terms.includes('hypertension'), 'Should include base term');
      assert.ok(terms.includes('blood pressure'), 'Should expand to blood pressure');
      assert.ok(terms.includes('bp'), 'Should expand to BP abbreviation');
      assert.ok(terms.includes('systolic'), 'Should expand to systolic');
    });

    it('should expand "diabetes" into glucose and HbA1c terms', () => {
      const { terms } = expandClinicalQuery('Check diabetes control and sugar');
      assert.ok(terms.includes('diabetes'), 'Should include diabetes');
      assert.ok(terms.includes('glucose'), 'Should include glucose');
      assert.ok(terms.includes('hba1c'), 'Should include hba1c');
    });

    it('should prioritize clinical measurement tokens in BOOST set', () => {
      assert.ok(CLINICAL_BOOST_TOKENS.has('bp'));
      assert.ok(CLINICAL_BOOST_TOKENS.has('hba1c'));
      assert.ok(CLINICAL_BOOST_TOKENS.has('wbc'));
      assert.ok(CLINICAL_BOOST_TOKENS.has('mg/dl'));
    });
  });

  // 2. Medical Section Detection & Chunking Tests
  describe('Medical Section-Aware Chunker', () => {
    it('should accurately detect medical section headers', () => {
      assert.strictEqual(detectSection('LABORATORY FINDINGS:\nComplete Blood Count normal.'), 'LABORATORY FINDINGS');
      assert.strictEqual(detectSection('VITAL SIGNS:\nBP 150/95 mmHg, HR 82 bpm'), 'VITAL SIGNS');
      assert.strictEqual(detectSection('ASSESSMENT AND PLAN:\nStage 2 Hypertension.'), 'ASSESSMENT & PLAN');
      assert.strictEqual(detectSection('CURRENT MEDICATIONS:\nLisinopril 10mg daily.'), 'MEDICATIONS');
    });

    it('should prepend document and section context headers to chunks', () => {
      const sampleClinicalText = `
LABORATORY FINDINGS:
Comprehensive Metabolic Panel:
- Fasting Blood Glucose: 168 mg/dL (High, normal 70-99)
- Glycated Hemoglobin (HbA1c): 8.4% (Elevated, diabetic range)
- Serum Creatinine: 1.1 mg/dL (Normal 0.7-1.3)
- Blood Urea Nitrogen (BUN): 18 mg/dL (Normal 7-20)
- eGFR: >60 mL/min/1.73m2

VITAL SIGNS:
- Blood Pressure: 154/96 mmHg (Sitting, right arm)
- Heart Rate: 84 bpm (Regular)
- Temperature: 98.4 F (Oral)
- SpO2: 98% on room air
`;

      const chunks = chunkText(sampleClinicalText, 650, 80, 'Lab_Report_Jan2026.pdf');
      assert.ok(chunks.length >= 1, 'Should create at least one chunk');
      assert.ok(chunks[0].chunkText.startsWith('[Document: Lab_Report_Jan2026.pdf'), 'Chunk must have document context header');
      assert.ok(chunks[0].chunkText.includes('Section:'), 'Chunk must have section context');
    });
  });

  // 3. BM25 Lexical Matching
  describe('BM25 Lexical Matcher', () => {
    it('should score exact clinical tokens highly', () => {
      const chunkA = '[Document: Blood_Test.pdf | Section: LABORATORY FINDINGS]\nHbA1c level: 8.4% with Fasting Glucose 168 mg/dL.';
      const chunkB = '[Document: Note.pdf | Section: GENERAL]\nPatient was seen for routine checkup without complaints.';
      
      const idfMap = new Map([
        ['hba1c', 2.5],
        ['glucose', 2.2],
        ['mg/dl', 1.8],
      ]);

      const scoreA = scoreBM25(['hba1c', 'glucose'], chunkA, 30, idfMap);
      const scoreB = scoreBM25(['hba1c', 'glucose'], chunkB, 30, idfMap);

      assert.ok(scoreA.score > 0, 'Matching chunk must have score > 0');
      assert.strictEqual(scoreB.score, 0, 'Irrelevant chunk must have score 0');
      assert.ok(scoreA.matchedTerms.includes('hba1c'), 'Matched terms should contain hba1c');
    });
  });

  // 4. End-to-End Hybrid Retrieval via RRF
  describe('Hybrid Retrieval & RRF Ranking Engine', () => {
    before(async () => {
      // Create and index a medical document for test intake
      const doc = await MedicalDocument.create({
        intakeId: testIntakeId,
        fileName: 'Comprehensive_Metabolic_CBC.pdf',
        fileUrl: '/uploads/sample_cbc.pdf',
        fileType: 'application/pdf',
        fileSize: 45000,
        pageCount: 2,
        extractedText: `
PATIENT CLINICAL REPORT
Name: John Doe
Date of Birth: 1980-04-12

LABORATORY RESULTS:
Complete Blood Count (CBC):
- White Blood Cells (WBC): 11.8 x10^3/uL (Mild leukocytosis)
- Hemoglobin: 14.2 g/dL (Normal)
- Platelets: 245 x10^3/uL (Normal)

Endocrine Profile:
- Fasting Blood Sugar: 165 mg/dL (Elevated)
- Glycated Hemoglobin (HbA1c): 8.2% (Diagnostic for Type 2 Diabetes)

Cardiovascular & Vitals:
- Resting Blood Pressure: 156/94 mmHg (Stage 2 Hypertension)
- Resting Heart Rate: 88 bpm (Tachycardia tendency)
- Oxygen Saturation (SpO2): 97% on room air

ASSESSMENT & PLAN:
1. Suboptimally controlled Type 2 Diabetes Mellitus - recommend intensifying Metformin dosage.
2. Essential Hypertension - recommend adding ACE inhibitor.
`,
      });

      await processAndStoreDocumentChunks(doc._id);
    });

    it('should retrieve relevant chunks for exact lab queries using hybrid search', async () => {
      const results = await retrieveTopKChunks(testIntakeId.toString(), 'What is the patient HbA1c and blood sugar?', 3);
      assert.ok(results.length > 0, 'Should return matching chunks');
      assert.ok(results[0].chunkText.toLowerCase().includes('hba1c'), 'Top chunk must contain HbA1c');
      assert.ok(results[0].similarityScore > 0, 'Similarity score must be positive');
      assert.ok(results[0].rrfScore > 0, 'RRF score must be positive');
    });

    it('should retrieve relevant chunks using clinical synonym queries (e.g. hypertension)', async () => {
      const results = await retrieveTopKChunks(testIntakeId.toString(), 'hypertension readings and systolic pressure', 3);
      assert.ok(results.length > 0, 'Should return matching chunks for synonym search');
      assert.ok(results[0].chunkText.includes('Blood Pressure: 156/94 mmHg') || results[0].chunkText.includes('Hypertension'), 'Should surface blood pressure readings');
    });
  });
});
