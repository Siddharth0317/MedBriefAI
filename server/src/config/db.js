const mongoose = require('mongoose');
const env = require('./env');

let mongoMemoryServer = null;

/**
 * Connect to MongoDB Atlas (Production & Staging)
 * Strictly persists to external MongoDB URI without silent in-memory data loss.
 */
const connectDB = async () => {
  const uri = env.MONGODB_URI;

  if (uri && uri.trim()) {
    const sanitizedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`📡 Connecting to MongoDB Atlas (${sanitizedUri})...`);

    let retries = 5;
    while (retries > 0) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        });

        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host} / ${conn.connection.name}`);
        return conn;
      } catch (err) {
        retries -= 1;
        console.error(`❌ MongoDB Atlas connection attempt failed: ${err.message}. Retries remaining: ${retries}`);

        if (retries === 0) {
          if (env.NODE_ENV === 'production') {
            console.error('💥 FATAL ERROR: Could not connect to MongoDB Atlas in production. Verify MONGODB_URI and Atlas IP Access List (0.0.0.0/0). Exiting...');
            process.exit(1);
          }
          throw err;
        }

        // Wait 2 seconds before retrying
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  // Fallback to in-memory server ONLY in local development when no URI is provided
  if (env.NODE_ENV !== 'production') {
    console.log('ℹ️  No MONGODB_URI provided in local development. Starting In-Memory MongoDB Server for testing...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`✅ In-Memory MongoDB Server Connected at: ${memUri}`);
    return conn;
  }

  console.error('💥 FATAL ERROR: MONGODB_URI is required in production.');
  process.exit(1);
};

/**
 * Disconnect and cleanup DB connections
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
