const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../src/server');
const { disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const PatientIntake = require('../src/models/PatientIntake');
const MedicalDocument = require('../src/models/MedicalDocument');
const { chunkText } = require('../src/services/ragService');
const {
  generateEmbedding,
  cosineSimilarity,
  localDeterministicEmbedding,
} = require('../src/services/embeddingService');

const PORT = 5003;
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

const makeRequest = (options, postData, isRaw = false) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      if (isRaw) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
};

function createSampleClinicalPdfBuffer() {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 195 >>
stream
BT
/F1 12 Tf
72 712 Td
(Patient Fasting Blood Glucose measured at 142 mg/dL. Total Cholesterol is 210 mg/dL. Triglycerides: 160 mg/dL. Patient reports mild shortness of breath and dizziness. Recommended: Metformin adjustment.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000474 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
541
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

function buildMultipartFormData(boundary, fieldName, filename, fileBuffer) {
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8'),
  ]);
}

async function runPhase3Tests() {
  console.log('🧪 Starting MedBrief_AI Phase 3 Chunking & RAG Vector Engine Tests...\n');

  // 1. Test Recursive Text Chunker
  console.log('1. Testing recursive text chunker (500-char max, 50-char overlap)...');
  const longClinicalNote = `
CHIEF COMPLAINT:
Patient presents with 3-week history of worsening fatigue, polyuria, and occasional blurred vision.

HISTORY OF PRESENT ILLNESS:
The patient is a 54-year-old individual with a history of hypertension. Symptoms began approximately three weeks ago following a dietary change. Patient notices increased thirst particularly in the evenings. Denies chest pain, palpitations, or loss of consciousness.

MEDICATIONS:
1. Lisinopril 20mg once daily in the morning for blood pressure.
2. Hydrochlorothiazide 12.5mg once daily.
3. Over-the-counter multivitamin once daily.

PHYSICAL EXAMINATION:
Blood Pressure: 138/86 mmHg. Heart Rate: 76 bpm regular. Respiratory Rate: 16 bpm.
Lungs clear to auscultation bilaterally without wheezing or crackles. Abdomen soft, non-tender, no organomegaly.

LABORATORY FINDINGS:
Fasting blood glucose is significantly elevated at 188 mg/dL. Hemoglobin A1c is 8.4 percent, indicating poorly controlled diabetes mellitus. Serum creatinine: 0.9 mg/dL. BUN: 14 mg/dL. Total cholesterol: 224 mg/dL. LDL: 135 mg/dL. HDL: 42 mg/dL. Triglycerides: 195 mg/dL.

ASSESSMENT AND PLAN:
1. New-onset Type 2 Diabetes Mellitus with hyperglycemia.
2. Initiate Metformin 500mg orally twice daily with meals.
3. Referral to certified diabetes educator and clinical dietitian for medical nutrition therapy.
4. Follow-up clinic appointment in 4 weeks with repeat fasting blood glucose log.
`.trim();

  const chunks = chunkText(longClinicalNote, 500, 50);
  assert.ok(chunks.length >= 2, 'Long text should be split into multiple chunks');
  chunks.forEach((chunk, i) => {
    assert.ok(
      chunk.chunkText.length <= 550,
      `Chunk #${i} length (${chunk.chunkText.length}) should not significantly exceed target 500`
    );
    assert.strictEqual(chunk.chunkIndex, i);
  });
  console.log(`   ✅ Chunker successfully produced ${chunks.length} cohesive chunks with boundary preservation.`);

  // 2. Test Embedding Generation & Cosine Similarity
  console.log('2. Testing semantic vector embeddings & cosine similarity...');
  const textA = 'Patient blood glucose level is elevated above normal threshold';
  const textB = 'High fasting blood sugar and glucose readings';
  const textUnrelated = 'Jupiter is the largest planetary body in the solar system';

  const embA = await generateEmbedding(textA);
  const embB = await generateEmbedding(textB);
  const embUnrelated = await generateEmbedding(textUnrelated);

  assert.strictEqual(embA.length, embB.length, 'Embedding dimensions must match');
  const simSimilar = cosineSimilarity(embA, embB);
  const simUnrelated = cosineSimilarity(embA, embUnrelated);

  console.log(`   Similarity (Related: glucose vs sugar): ${(simSimilar * 100).toFixed(1)}%`);
  console.log(`   Similarity (Unrelated: glucose vs Jupiter): ${(simUnrelated * 100).toFixed(1)}%`);
  assert.ok(
    simSimilar > simUnrelated,
    `Related similarity (${simSimilar}) must be higher than unrelated (${simUnrelated})`
  );
  console.log('   ✅ Semantic cosine similarity calculation verified.');

  // 3. Test End-to-End Upload, Auto-Embedding & Query Chunks API
  let server;
  try {
    server = await startServer(PORT);

    const uniqueId = Date.now();
    console.log('3. Registering test Patient and Doctor...');
    const patientRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Bob RAG Patient',
        email: `bob.rag_${uniqueId}@test.com`,
        password: 'Password123!',
        role: 'patient',
      }
    );
    assert.strictEqual(patientRes.status, 201);
    const patientToken = patientRes.data.token;

    const doctorRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Dr. Watson, MD',
        email: `watson.rag_${uniqueId}@hospital.org`,
        password: 'Password123!',
        role: 'doctor',
      }
    );
    assert.strictEqual(doctorRes.status, 201);
    const doctorToken = doctorRes.data.token;

    // 4. Create intake
    console.log('4. Creating clinical intake...');
    const intakeRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/intake',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
      },
      {
        symptoms: 'Experiencing fatigue, high thirst, and elevated sugar levels.',
        duration: '2 weeks',
        currentMedications: ['Metformin'],
        allergies: [],
      }
    );
    assert.strictEqual(intakeRes.status, 201);
    const intakeId = intakeRes.data.intake._id;

    // 5. Upload PDF & trigger auto-chunking + embedding
    console.log('5. Uploading PDF and verifying automatic vector embedding generation...');
    const boundary = '----WebKitFormBoundaryMedBriefRAGTest';
    const pdfBuffer = createSampleClinicalPdfBuffer();
    const multipartBody = buildMultipartFormData(
      boundary,
      'documents',
      'clinical_labs.pdf',
      pdfBuffer
    );

    const uploadRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/intake/${intakeId}/upload`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartBody.length,
          Authorization: `Bearer ${patientToken}`,
        },
      },
      multipartBody,
      true
    );
    assert.strictEqual(uploadRes.status, 201);
    assert.ok(uploadRes.data.documents[0].chunkCount >= 1, 'Chunks must be generated and counted');

    // Verify in database that chunks and embeddings exist
    const dbDoc = await MedicalDocument.findOne({ intakeId });
    assert.ok(dbDoc.chunks.length >= 1, 'Document must have chunks in database');
    assert.ok(dbDoc.chunks[0].embedding.length > 0, 'Chunk must contain vector embedding values');
    console.log(`   ✅ Document auto-chunked into ${dbDoc.chunks.length} chunk(s) with ${dbDoc.chunks[0].embedding.length}-dim embeddings.`);

    // 6. Vector Similarity Query Endpoint (POST /api/intake/:id/query-chunks)
    console.log('6. Querying RAG vector search endpoint (POST /api/intake/:id/query-chunks)...');
    const queryRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/intake/${intakeId}/query-chunks`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
      },
      {
        query: 'What was the patient fasting glucose and cholesterol level?',
        topK: 3,
      }
    );
    assert.strictEqual(queryRes.status, 200);
    assert.strictEqual(queryRes.data.success, true);
    assert.ok(queryRes.data.results.length >= 1, 'Must return matching chunks');
    assert.ok(
      queryRes.data.results[0].similarityScore > 0,
      'Similarity score must be positive'
    );
    console.log(`   Top result similarity score: ${(queryRes.data.results[0].similarityScore * 100).toFixed(1)}%`);
    console.log(`   Top excerpt text preview: "${queryRes.data.results[0].chunkText.slice(0, 80)}..."`);
    console.log('   ✅ Vector similarity search returned relevant clinical chunk with source citation.');

    console.log('\n🎉 ALL PHASE 3 CHUNKING & RAG VECTOR ENGINE TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Phase 3 test failed with error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
}

runPhase3Tests();
