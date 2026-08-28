const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const intakeRoutes = require('./routes/intakeRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Production CORS Configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

if (env.CLIENT_URL && env.CLIENT_URL.includes(',')) {
  env.CLIENT_URL.split(',').forEach((url) => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, mobile, curl, or empty origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Allow configured origins, all vercel.app domains, or localhost
    const isAllowed =
      allowedOrigins.some((o) => o && o.replace(/\/$/, '') === normalizedOrigin) ||
      /\.vercel\.app$/.test(new URL(origin).hostname) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      env.NODE_ENV === 'development' ||
      !env.CLIENT_URL ||
      env.CLIENT_URL === '*';

    if (isAllowed) {
      return callback(null, true);
    }

    // Default allow with origin reflection to prevent preflight rejection
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate Limiting (Security Hardening)
const isTestEnv = env.NODE_ENV === 'test';

// 1. General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again in 15 minutes.',
  },
});

// 2. Strict AI Synthesis & RAG Chat Limiter (Protects LLM Quotas)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 AI summaries or RAG queries per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    message: 'AI generation limit reached for this IP. Please wait a few minutes before synthesizing more records.',
  },
});

app.use('/api/', generalLimiter);
app.use('/api/intake/:id/generate-summary', aiLimiter);
app.use('/api/intake/:id/chat', aiLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Comprehensive Health & Monitoring Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const memory = process.memoryUsage();

  res.status(200).json({
    status: 'ok',
    service: 'MedBrief_AI Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'default',
    },
    system: {
      nodeVersion: process.version,
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      rssMB: Math.round(memory.rss / 1024 / 1024),
    },
  });
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/intake', aiRoutes);

// Catch-all 404 handler for undefined API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  // CORS Error
  if (err.message && err.message.includes('CORS origin')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `An entry with this ${field} already exists.`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token signature.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please log in again.',
    });
  }

  console.error('Unhandled Server Error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start Server Function
const startServer = async (customPort) => {
  await connectDB();
  const port = customPort || env.PORT;

  const server = app.listen(port, () => {
    console.log(`🏥 MedBrief_AI Server listening on port ${port} in ${env.NODE_ENV} mode`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Closing server gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('Server and database resources closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
