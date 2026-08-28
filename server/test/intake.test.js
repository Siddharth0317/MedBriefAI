const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../src/server');
const { disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const PatientIntake = require('../src/models/PatientIntake');
const MedicalDocument = require('../src/models/MedicalDocument');

const PORT = 5002;
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

function createSamplePdfBuffer() {
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
<< /Length 80 >>
stream
BT
/F1 12 Tf
72 712 Td
(Patient Fasting Glucose: 142 mg/dL. Total Cholesterol: 210 mg/dL. Vitals Stable.) Tj
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
0000000359 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
426
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

async function runPhase2Tests() {
  console.log('🧪 Starting MedBrief_AI Phase 2 Intake & Upload Tests...\n');

  let server;
  try {
    server = await startServer(PORT);

    // 1. Register Patient
    const uniqueId = Date.now();
    console.log('1. Registering Patient user...');
    const patientRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Alice Patient',
        email: `alice.phase2_${uniqueId}@test.com`,
        password: 'PatientPassword123!',
        role: 'patient',
      }
    );
    assert.strictEqual(patientRes.status, 201);
    const patientToken = patientRes.data.token;
    console.log('   ✅ Patient registered and JWT token acquired.');

    // 2. Register Doctor
    console.log('2. Registering Doctor user...');
    const doctorRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Dr. Gregory House, MD',
        email: `house.phase2_${uniqueId}@hospital.org`,
        password: 'DoctorPassword123!',
        role: 'doctor',
      }
    );
    assert.strictEqual(doctorRes.status, 201);
    const doctorToken = doctorRes.data.token;
    console.log('   ✅ Doctor registered and JWT token acquired.');

    // 3. Create Patient Intake
    console.log('3. Submitting new patient intake (POST /api/intake)...');
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
        symptoms: 'Experiencing recurrent severe migraines and elevated blood sugar levels after meals.',
        duration: '3 weeks',
        currentMedications: ['Metformin 500mg', 'Sumatriptan 50mg'],
        allergies: ['Penicillin', 'Sulfa drugs'],
      }
    );
    assert.strictEqual(intakeRes.status, 201);
    assert.strictEqual(intakeRes.data.success, true);
    assert.strictEqual(intakeRes.data.intake.status, 'Submitted');
    const intakeId = intakeRes.data.intake._id;
    console.log(`   ✅ Intake created successfully. ID: ${intakeId}`);

    // 4. Upload PDF document and parse text
    console.log('4. Uploading PDF and extracting text (POST /api/intake/:id/upload)...');
    const boundary = '----WebKitFormBoundaryMedBriefPhase2Test';
    const pdfBuffer = createSamplePdfBuffer();
    const multipartBody = buildMultipartFormData(
      boundary,
      'documents',
      'lab_report_glucose.pdf',
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
    assert.strictEqual(uploadRes.data.success, true);
    assert.strictEqual(uploadRes.data.documents.length, 1);
    assert.strictEqual(uploadRes.data.documents[0].fileName, 'lab_report_glucose.pdf');
    assert.ok(
      uploadRes.data.documents[0].extractedTextPreview.includes('Blood Glucose') ||
        uploadRes.data.documents[0].extractedTextPreview.length > 0,
      'Extracted text preview must contain parsed clinical text'
    );
    console.log('   ✅ PDF uploaded and text parsed successfully via pdf-parse.');

    // 5. Patient lists intakes (GET /api/intake)
    console.log('5. Patient querying own intakes (GET /api/intake)...');
    const patientListRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/intake',
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.strictEqual(patientListRes.status, 200);
    assert.strictEqual(patientListRes.data.intakes.length, 1);
    assert.strictEqual(patientListRes.data.intakes[0].documentCount, 1);
    console.log('   ✅ Patient receives own intake with document count.');

    // 6. Doctor lists triage queue (GET /api/intake)
    console.log('6. Doctor querying clinical triage queue (GET /api/intake)...');
    const doctorListRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/intake',
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.strictEqual(doctorListRes.status, 200);
    assert.strictEqual(doctorListRes.data.intakes.length, 1);
    assert.strictEqual(doctorListRes.data.intakes[0].patientId.name, 'Alice Patient');
    console.log('   ✅ Doctor receives populated queue with patient details.');

    // 7. Retrieve full intake details & document records (GET /api/intake/:id)
    console.log('7. Retrieving full intake by ID (GET /api/intake/:id)...');
    const getDetailRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/intake/${intakeId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.strictEqual(getDetailRes.status, 200);
    assert.strictEqual(getDetailRes.data.intake._id, intakeId);
    assert.strictEqual(getDetailRes.data.documents.length, 1);
    console.log('   ✅ Intake details & document list retrieved.');

    // 8. Doctor updates status & notes (PUT /api/intake/:id)
    console.log('8. Doctor updating intake status and clinical notes (PUT /api/intake/:id)...');
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
        status: 'Under_Review',
        doctorNotes: 'Assigned for endocrinology consultation. Fasting glucose labs to be verified.',
      }
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.intake.status, 'Under_Review');
    assert.strictEqual(
      updateRes.data.intake.doctorNotes,
      'Assigned for endocrinology consultation. Fasting glucose labs to be verified.'
    );
    console.log('   ✅ Intake status and notes updated.');

    // 9. Cascade delete intake & documents (DELETE /api/intake/:id)
    console.log('9. Testing cascade delete of intake & documents (DELETE /api/intake/:id)...');
    const deleteRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/intake/${intakeId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.strictEqual(deleteRes.status, 200);

    const remainingDocs = await MedicalDocument.find({ intakeId });
    assert.strictEqual(remainingDocs.length, 0, 'All attached documents must be cascade-deleted');
    console.log('   ✅ Intake and associated documents successfully deleted.');

    console.log('\n🎉 ALL 9 PHASE 2 TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Phase 2 test failed with error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
}

runPhase2Tests();
