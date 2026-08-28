const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../src/server');
const { disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

const PORT = 5001;
process.env.PORT = PORT;
process.env.NODE_ENV = 'test';

const makeRequest = (options, postData) => {
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
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Starting MedBrief_AI Phase 1 Authentication Tests...\n');

  let server;
  try {
    server = await startServer(PORT);

    // 1. Health Check
    console.log('1. Testing /api/health endpoint...');
    const healthRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/health',
      method: 'GET',
    });
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'ok');
    console.log('   ✅ Health check passed.');

    // 2. Register Patient
    console.log('2. Testing /api/auth/register (Patient)...');
    const patientData = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'SecurePassword123!',
      role: 'patient',
    };
    const regPatientRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      patientData
    );
    assert.strictEqual(regPatientRes.status, 201);
    assert.strictEqual(regPatientRes.data.success, true);
    assert.strictEqual(regPatientRes.data.user.role, 'patient');
    assert.strictEqual(regPatientRes.data.user.email, 'jane.doe@example.com');
    assert.ok(regPatientRes.data.token, 'Token must be present');
    console.log('   ✅ Patient registration passed.');

    // 3. Register Doctor
    console.log('3. Testing /api/auth/register (Doctor)...');
    const doctorData = {
      name: 'Dr. Sarah Connor, MD',
      email: 'dr.connor@hospital.org',
      password: 'DocSecurePass2026!',
      role: 'doctor',
    };
    const regDocRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      doctorData
    );
    assert.strictEqual(regDocRes.status, 201);
    assert.strictEqual(regDocRes.data.success, true);
    assert.strictEqual(regDocRes.data.user.role, 'doctor');
    assert.ok(regDocRes.data.token, 'Token must be present');
    console.log('   ✅ Doctor registration passed.');

    // 4. Duplicate Email Registration
    console.log('4. Testing Duplicate Email registration rejection...');
    const dupRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      patientData
    );
    assert.strictEqual(dupRes.status, 400);
    assert.strictEqual(dupRes.data.success, false);
    console.log('   ✅ Duplicate email rejected successfully.');

    // 5. Verify Password Hashing in Database (Cost 12)
    console.log('5. Verifying bcrypt cost factor 12 in database...');
    const dbUser = await User.findOne({ email: 'dr.connor@hospital.org' }).select('+password');
    assert.ok(dbUser.password.startsWith('$2a$12$') || dbUser.password.startsWith('$2b$12$'), 'Bcrypt hash should use cost factor 12 ($2a$12$ or $2b$12$)');
    assert.notStrictEqual(dbUser.password, doctorData.password, 'Password must not be stored in plaintext');
    console.log('   ✅ Password hash verified with bcrypt cost 12.');

    // 6. Login with Valid Credentials
    console.log('6. Testing /api/auth/login with valid credentials...');
    const loginRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'dr.connor@hospital.org',
        password: 'DocSecurePass2026!',
      }
    );
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.success, true);
    assert.strictEqual(loginRes.data.user.role, 'doctor');
    const doctorToken = loginRes.data.token;
    assert.ok(doctorToken, 'JWT token returned');
    console.log('   ✅ Login successful.');

    // 7. Login with Invalid Credentials
    console.log('7. Testing /api/auth/login with invalid password...');
    const badLoginRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'dr.connor@hospital.org',
        password: 'WrongPassword!',
      }
    );
    assert.strictEqual(badLoginRes.status, 401);
    assert.strictEqual(badLoginRes.data.success, false);
    console.log('   ✅ Invalid password rejected.');

    // 8. Access Protected Route /api/auth/me with Token
    console.log('8. Testing /api/auth/me with Bearer token...');
    const meRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
      },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.success, true);
    assert.strictEqual(meRes.data.user.email, 'dr.connor@hospital.org');
    assert.strictEqual(meRes.data.user.role, 'doctor');
    console.log('   ✅ /api/auth/me authenticated successfully.');

    // 9. Access Protected Route without Token
    console.log('9. Testing /api/auth/me without Bearer token...');
    const unauthRes = await makeRequest({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
    });
    assert.strictEqual(unauthRes.status, 401);
    assert.strictEqual(unauthRes.data.success, false);
    console.log('   ✅ Unauthenticated request rejected with 401.');

    console.log('\n🎉 ALL 9 BACKEND TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
}

runTests();
