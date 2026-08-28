const mongoose = require('mongoose');
const env = require('../src/config/env');
const PatientIntake = require('../src/models/PatientIntake');
const MedicalDocument = require('../src/models/MedicalDocument');

async function clearAllIntakes() {
  if (!env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MongoDB Atlas...`);
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const intakeCount = await PatientIntake.countDocuments();
    const docCount = await MedicalDocument.countDocuments();

    console.log(`Found ${intakeCount} PatientIntakes and ${docCount} MedicalDocuments.`);

    const deletedIntakes = await PatientIntake.deleteMany({});
    const deletedDocs = await MedicalDocument.deleteMany({});

    console.log(`🗑️ Successfully deleted ${deletedIntakes.deletedCount} PatientIntakes and ${deletedDocs.deletedCount} MedicalDocuments.`);
    console.log('✨ All previous intakes and uploaded documents have been cleared.');

    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing intakes:', err);
    process.exit(1);
  }
}

clearAllIntakes();
