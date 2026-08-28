const mongoose = require('mongoose');
const env = require('./env');

let mongoMemoryServer = null;

/**
 * Connect to MongoDB or fallback to In-Memory MongoDB Server for local dev
 */
const connectDB = async () => {
  try {
    let uri = env.MONGODB_URI;

    if (!uri) {
      console.log('ℹ️  No MONGODB_URI provided. Initializing In-Memory MongoDB Server for local development...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log(`✅ In-Memory MongoDB Server started at: ${uri}`);
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    
    // If external URI failed in development mode, attempt fallback to in-memory server
    if (env.NODE_ENV !== 'production' && !mongoMemoryServer) {
      try {
        console.log('🔄 Attempting fallback to In-Memory MongoDB Server...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create();
        const fallbackUri = mongoMemoryServer.getUri();
        const fallbackConn = await mongoose.connect(fallbackUri);
        console.log(`✅ Fallback In-Memory MongoDB Connected at: ${fallbackUri}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`❌ Fallback MongoDB connection failed: ${fallbackError.message}`);
      }
    }

    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
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
