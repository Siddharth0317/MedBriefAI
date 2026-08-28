const MedicalDocument = require('../models/MedicalDocument');
const {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
} = require('./embeddingService');

/**
 * Recursive text chunker (500 characters target, 50 characters overlap)
 * Preserves paragraphs, sentences, and words where possible.
 * @param {string} text - Raw extracted text
 * @param {number} [chunkSize=500] - Target maximum chunk character length
 * @param {number} [overlap=50] - Character overlap between consecutive chunks
 * @returns {Array<{ chunkIndex: number, chunkText: string }>}
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') return [];

  const cleanText = text.replace(/\r\n/g, '\n').trim();
  if (!cleanText) return [];

  if (cleanText.length <= chunkSize) {
    return [{ chunkIndex: 0, chunkText: cleanText }];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      const lastChunk = cleanText.substring(startIndex).trim();
      if (lastChunk) {
        chunks.push({ chunkIndex, chunkText: lastChunk });
      }
      break;
    }

    // Attempt to break at natural boundaries: paragraph -> sentence -> word
    let breakPoint = -1;
    const window = cleanText.substring(startIndex, endIndex);

    // 1. Look for double newline (paragraph boundary) near end
    const lastDoubleNewline = window.lastIndexOf('\n\n');
    if (lastDoubleNewline > chunkSize * 0.5) {
      breakPoint = startIndex + lastDoubleNewline + 2;
    }

    // 2. Look for single newline
    if (breakPoint === -1) {
      const lastNewline = window.lastIndexOf('\n');
      if (lastNewline > chunkSize * 0.6) {
        breakPoint = startIndex + lastNewline + 1;
      }
    }

    // 3. Look for sentence termination (. / ? / !)
    if (breakPoint === -1) {
      const sentenceMatch = window.match(/[.!?]\s+(?=[A-Z0-9]|$)/g);
      if (sentenceMatch) {
        const lastSentenceIndex = window.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
        if (lastSentenceIndex > chunkSize * 0.6) {
          breakPoint = startIndex + lastSentenceIndex + sentenceMatch[sentenceMatch.length - 1].length;
        }
      }
    }

    // 4. Look for word boundary (space)
    if (breakPoint === -1) {
      const lastSpace = window.lastIndexOf(' ');
      if (lastSpace > chunkSize * 0.5) {
        breakPoint = startIndex + lastSpace + 1;
      }
    }

    // Fallback: hard character slice if no natural break found
    if (breakPoint === -1 || breakPoint <= startIndex) {
      breakPoint = endIndex;
    }

    const currentChunkText = cleanText.substring(startIndex, breakPoint).trim();
    if (currentChunkText) {
      chunks.push({ chunkIndex: chunkIndex++, chunkText: currentChunkText });
    }

    // Advance startIndex with overlap
    startIndex = Math.max(breakPoint - overlap, startIndex + 1);
  }

  return chunks;
}

/**
 * Process raw text for a MedicalDocument, generate vector chunks, and persist to MongoDB
 * @param {string} documentId
 * @returns {Promise<Array<Object>>} Saved chunks with embeddings
 */
async function processAndStoreDocumentChunks(documentId) {
  const document = await MedicalDocument.findById(documentId);
  if (!document) {
    throw new Error(`Medical document with ID ${documentId} not found.`);
  }

  const rawChunks = chunkText(document.extractedText, 500, 50);
  if (rawChunks.length === 0) {
    document.chunks = [];
    await document.save();
    return [];
  }

  const chunkTexts = rawChunks.map((c) => c.chunkText);
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  const formattedChunks = rawChunks.map((c, i) => ({
    chunkIndex: c.chunkIndex,
    chunkText: c.chunkText,
    embedding: embeddings[i] || [],
  }));

  document.chunks = formattedChunks;
  await document.save();

  return formattedChunks;
}

/**
 * Perform vector similarity search across all documents belonging to a patient intake
 * @param {string} intakeId
 * @param {string} query - Doctor question or search prompt
 * @param {number} [topK=5] - Number of top-matching excerpts to return
 * @returns {Promise<Array<Object>>} Ranked list of matching chunks with similarity scores & source citations
 */
async function retrieveTopKChunks(intakeId, query, topK = 5) {
  if (!query || !query.trim()) return [];

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Retrieve all documents and their vector chunks for this intake
  const documents = await MedicalDocument.find({ intakeId }).lean();
  if (!documents || documents.length === 0) return [];

  const candidates = [];

  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    for (const chunk of doc.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const score = cosineSimilarity(queryEmbedding, chunk.embedding);

      candidates.push({
        documentId: doc._id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        pageCount: doc.pageCount,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        similarityScore: parseFloat(score.toFixed(4)),
      });
    }
  }

  // Sort by highest cosine similarity
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  return candidates.slice(0, topK);
}

module.exports = {
  chunkText,
  processAndStoreDocumentChunks,
  retrieveTopKChunks,
};
