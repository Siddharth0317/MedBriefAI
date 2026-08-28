const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../src/server');
const { disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const PatientIntake = require('../src/models/PatientIntake');
const MedicalDocument = require('../src/models/MedicalDocument');

const PORT = 5004;
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
<< /Length 215 >>
stream
BT
/F1 12 Tf
72 712 Td
(Clinical Diagnostic Lab: Blood Glucose measured at 182 mg/dL. Blood Pressure recorded as 148/92 mmHg. Total Cholesterol is 240 mg/dL. ECG demonstrates normal sinus rhythm. Patient has known severe allergy to Penicillin.) Tj
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
0000000494 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
561
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

async function runPhase4Tests() {
  console.log('🧪 Starting MedBrief_AI Phase 4 AI SOAP & Doctor Workspace Tests...\n');

  let server;
  try {
    server = await startServer(PORT);
    const uniqueId = Date.now();

    // 1. Register Patient & Doctor
    console.log('1. Registering Patient and Doctor accounts...');
    const patientRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'David AI Patient',
        email: `david.ai_${uniqueId}@test.com`,
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
        name: 'Dr. Meredith Grey, MD',
        email: `grey.ai_${uniqueId}@hospital.org`,
        password: 'Password123!',
        role: 'doctor',
      }
    );
    assert.strictEqual(doctorRes.status, 201);
    const doctorToken = doctorRes.data.token;
    console.log('   ✅ Patient and Doctor registered.');

    // 2. Submit Intake
    console.log('2. Submitting Patient Intake...');
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
        symptoms: 'Experiencing recurrent chest tightness and elevated blood sugar levels.',
        duration: '3 weeks',
        currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
        allergies: ['Penicillin'],
      }
    );
    assert.strictEqual(intakeRes.status, 201);
    const intakeId = intakeRes.data.intake._id;
    console.log(`   ✅ Intake created. ID: ${intakeId}`);

    // 3. Upload Clinical PDF
    console.log('3. Uploading Clinical Lab PDF...');
    const boundary = '----WebKitFormBoundaryMedBriefAITest';
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
    console.log('   ✅ Lab PDF uploaded and vector-embedded.');

    // 4. Generate AI SOAP Briefing
    console.log('4. Triggering AI SOAP Briefing Generation (POST /api/intake/:id/generate-summary)...');
    const summaryRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/intake/${intakeId}/generate-summary`,
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.strictEqual(summaryRes.status, 200);
    assert.strictEqual(summaryRes.data.success, true);
    assert.strictEqual(summaryRes.data.status, 'Briefing_Ready');

    const { aiSummary } = summaryRes.data;
    assert.ok(aiSummary.chiefComplaint, 'Chief complaint must be generated');
    assert.ok(aiSummary.historyOfPresentIllness, 'HPI narrative must be present');
    assert.ok(Array.isArray(aiSummary.flaggedRisks), 'Flagged risks array must be present');
    assert.ok(aiSummary.suggestedActions.length > 0, 'Suggested clinician actions must be present');

    console.log('   ✅ AI SOAP briefing generated successfully:');
    console.log(`      - Chief Complaint: "${aiSummary.chiefComplaint.slice(0, 70)}..."`);
    console.log(`      - Flagged Risks: ${aiSummary.flaggedRisks.length} alert(s)`);
    console.log(`      - Extracted Vitals:`, aiSummary.extractedVitals);
    console.log(`      - Suggested Actions: ${aiSummary.suggestedActions.length} item(s)`);

    // 5. Test Doctor Grounded RAG Chat Assistant
    console.log('5. Testing Doctor RAG Chat Assistant (POST /api/intake/:id/chat)...');
    const chatRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/intake/${intakeId}/chat`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
      },
      {
        message: 'What was the patient blood pressure and glucose level from the lab report?',
      }
    );
    assert.strictEqual(chatRes.status, 200);
    assert.strictEqual(chatRes.data.success, true);
    assert.ok(chatRes.data.answer.length > 0, 'Chat assistant must return a grounded clinical answer');
    assert.ok(Array.isArray(chatRes.data.citations), 'Citations array must be present');
    console.log('   ✅ RAG Chat Assistant response received:');
    console.log(`      - Answer: "${chatRes.data.answer.slice(0, 100)}..."`);
    console.log(`      - Citations: ${chatRes.data.citations.length} source chunk(s) attached`);

    // 6. Test Doctor Consultation Workstation Notes Update
    console.log('6. Doctor updating consultation notes and completing intake (PUT /api/intake/:id)...');
    const updateRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/intake/${intakeId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
      },
      {
        status: 'Completed',
        doctorNotes: 'Consultation finished. Prescribed Metformin 500mg BID. Scheduled fasting lipid re-check in 6 weeks.',
      }
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.intake.status, 'Completed');
    assert.ok(updateRes.data.intake.doctorNotes.includes('Consultation finished'));
    console.log('   ✅ Doctor workstation notes and status updated to Completed.');

    console.log('\n🎉 ALL PHASE 4 AI BRIEFING & DOCTOR WORKSPACE TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Phase 4 test failed with error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
}

runPhase4Tests();
