const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

const EMBEDDING_DIMENSION = 768;

let isGeminiEmbeddingDisabled = false;

// Check if Gemini key is in standard AI Studio format (AIzaSy...)
const isValidGeminiKey = env.GEMINI_API_KEY && env.GEMINI_API_KEY.startsWith('AIzaSy');

// Initialize Google Generative AI client if key exists
let genAI = null;
if (isValidGeminiKey) {
  try {
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  } catch (err) {
    console.warn('Failed to initialize GoogleGenerativeAI client:', err.message);
  }
}

/**
 * Local Deterministic Semantic Vectorizer (Tier 3 Fallback)
 * Produces a normalized 768-dimensional vector based on character and subword n-grams.
 * Guaranteed to run locally without internet or external API dependencies.
 * @param {string} text
 * @returns {Array<number>} 768-dimensional normalized vector
 */
function localDeterministicEmbedding(text) {
  const vector = new Float64Array(EMBEDDING_DIMENSION);
  if (!text || typeof text !== 'string') {
    return Array.from(vector);
  }

  const clean = text.toLowerCase().trim();
  const words = clean.split(/\W+/).filter(Boolean);

  // 1. Process words & n-grams
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Word hash
    let hash = 5381;
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 33) ^ word.charCodeAt(j);
    }
    const idx1 = Math.abs(hash) % EMBEDDING_DIMENSION;
    vector[idx1] += 1.0;

    // Bigrams
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let bHash = 5381;
      for (let j = 0; j < bigram.length; j++) {
        bHash = (bHash * 33) ^ bigram.charCodeAt(j);
      }
      const idx2 = Math.abs(bHash) % EMBEDDING_DIMENSION;
      vector[idx2] += 1.5;
    }

    // Character trigrams
    for (let k = 0; k <= word.length - 3; k++) {
      const trigram = word.substring(k, k + 3);
      let tHash = 5381;
      for (let l = 0; l < trigram.length; l++) {
        tHash = (tHash * 33) ^ trigram.charCodeAt(l);
      }
      const idx3 = Math.abs(tHash) % EMBEDDING_DIMENSION;
      vector[idx3] += 0.5;
    }
  }

  // 2. L2 Normalization (unit vector)
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Generate embedding using OpenRouter API (Tier 2 Fallback)
 * @param {string} text
 * @returns {Promise<Array<number>|null>}
 */
async function generateOpenRouterEmbedding(text) {
  if (!env.OPENROUTER_API_KEY) return null;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://medbrief.ai',
        'X-Title': 'MedBrief AI',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter embedding error: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.data?.[0]?.embedding || null;
  } catch (err) {
    console.warn(`OpenRouter embedding fallback failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate 768-dimensional embedding vector for a single text
 * Uses 3-tier fallback: Gemini -> OpenRouter -> Local Deterministic Vectorizer
 * @param {string} text
 * @returns {Promise<Array<number>>}
 */
async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // Tier 1: Gemini text-embedding-004
  if (genAI && isValidGeminiKey && !isGeminiEmbeddingDisabled) {
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result?.embedding?.values && result.embedding.values.length > 0) {
        return result.embedding.values;
      }
    } catch (geminiError) {
      isGeminiEmbeddingDisabled = true;
      console.log(`ℹ️ [Embedding Service] Direct Gemini API unavailable (${geminiError.message.slice(0, 80)}...). Routing through OpenRouter...`);
    }
  }

  // Tier 2: OpenRouter embedding
  if (env.OPENROUTER_API_KEY) {
    const openRouterEmbedding = await generateOpenRouterEmbedding(text);
    if (openRouterEmbedding) {
      return openRouterEmbedding;
    }
  }

  // Tier 3: Local Deterministic Semantic Vectorizer
  return localDeterministicEmbedding(text);
}

/**
 * Generate embeddings in batch for multiple text chunks
 * @param {Array<string>} texts
 * @returns {Promise<Array<Array<number>>>}
 */
async function generateBatchEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  const embeddings = [];
  for (const text of texts) {
    const emb = await generateEmbedding(text);
    embeddings.push(emb);
  }
  return embeddings;
}

/**
 * Calculate cosine similarity between two vector embeddings
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number} Value between -1.0 and 1.0 (or 0.0 if vectors are empty/orthogonal)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp value to [-1, 1] range to avoid floating point precision overflow
  return Math.max(-1, Math.min(1, similarity));
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  localDeterministicEmbedding,
  EMBEDDING_DIMENSION,
};
