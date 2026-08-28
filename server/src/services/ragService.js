const MedicalDocument = require('../models/MedicalDocument');
const {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
} = require('./embeddingService');
const {
  expandClinicalQuery,
  CLINICAL_BOOST_TOKENS,
} = require('./clinicalVocabulary');

// Common clinical report section patterns
const SECTION_PATTERNS = [
  { name: 'CHIEF COMPLAINT', regex: /(?:CHIEF\s+COMPLAINT|REASON\s+FOR\s+VISIT|PRESENTING\s+COMPLAINT)\s*[:\n]/i },
  { name: 'HISTORY OF PRESENT ILLNESS', regex: /(?:HISTORY\s+OF\s+PRESENT\s+ILLNESS|HPI|HISTORY)\s*[:\n]/i },
  { name: 'PAST MEDICAL HISTORY', regex: /(?:PAST\s+MEDICAL\s+HISTORY|PMH|MEDICAL\s+HISTORY|PAST\s+HISTORY)\s*[:\n]/i },
  { name: 'MEDICATIONS', regex: /(?:MEDICATIONS?|CURRENT\s+MEDICATIONS|MEDICATION\s+HISTORY|PRESCRIPTIONS)\s*[:\n]/i },
  { name: 'ALLERGIES', regex: /(?:ALLERGIES|DRUG\s+ALLERGIES|ALLERGIC\s+HISTORY)\s*[:\n]/i },
  { name: 'VITAL SIGNS', regex: /(?:VITAL\s+SIGNS|VITALS|PHYSICAL\s+MEASUREMENTS)\s*[:\n]/i },
  { name: 'PHYSICAL EXAMINATION', regex: /(?:PHYSICAL\s+EXAMINATION|PHYSICAL\s+EXAM|PE|OBJECTIVE)\s*[:\n]/i },
  { name: 'LABORATORY FINDINGS', regex: /(?:LABORATORY\s+FINDINGS|LABORATORY\s+RESULTS|LAB\s+REPORT|INVESTIGATIONS|DIAGNOSTICS|BLOOD\s+TESTS)\s*[:\n]/i },
  { name: 'ASSESSMENT & PLAN', regex: /(?:ASSESSMENT\s+AND\s+PLAN|ASSESSMENT|IMPRESSION|DIAGNOSIS|PLAN|CLINICAL\s+IMPRESSION)\s*[:\n]/i },
  { name: 'DISCHARGE SUMMARY', regex: /(?:DISCHARGE\s+SUMMARY|DISCHARGE\s+INSTRUCTIONS|FOLLOW\s+UP)\s*[:\n]/i },
];

/**
 * Identify clinical section of a text fragment
 * @param {string} text
 * @returns {string} Detected section name or 'CLINICAL NOTES'
 */
function detectSection(text) {
  if (!text) return 'CLINICAL NOTES';
  for (const { name, regex } of SECTION_PATTERNS) {
    if (regex.test(text)) {
      return name;
    }
  }
  return 'CLINICAL NOTES';
}

/**
 * Section-Aware & Table-Preserving Medical Text Chunker
 * Keeps clinical blocks, lab grids, and medication lists intact.
 * @param {string} text - Raw extracted text
 * @param {string} [fileName='Document'] - Original file name for context prepending
 * @param {number} [targetChunkSize=650] - Target character length per chunk
 * @param {number} [overlap=80] - Character overlap between consecutive chunks
 * @returns {Array<{ chunkIndex: number, chunkText: string, section: string }>}
 */
function chunkText(text, targetChunkSize = 650, overlap = 80, fileName = 'Document') {
  if (!text || typeof text !== 'string') return [];

  const cleanText = text.replace(/\r\n/g, '\n').trim();
  if (!cleanText) return [];

  // If text is short, return as a single contextual chunk
  if (cleanText.length <= targetChunkSize) {
    const section = detectSection(cleanText);
    return [{
      chunkIndex: 0,
      chunkText: `[Document: ${fileName} | Section: ${section}]\n${cleanText}`,
      section,
    }];
  }

  // Split into raw semantic paragraphs/blocks
  const rawParagraphs = cleanText.split(/\n{2,}/);
  const chunks = [];
  let currentBlock = '';
  let currentSection = 'CLINICAL NOTES';
  let chunkIndex = 0;

  for (let i = 0; i < rawParagraphs.length; i++) {
    const paragraph = rawParagraphs[i].trim();
    if (!paragraph) continue;

    // Check if this paragraph starts a new clinical section
    const detected = detectSection(paragraph);
    if (detected !== 'CLINICAL NOTES') {
      currentSection = detected;
    }

    if (!currentBlock) {
      currentBlock = paragraph;
    } else if ((currentBlock.length + paragraph.length + 2) <= targetChunkSize) {
      currentBlock += '\n\n' + paragraph;
    } else {
      // Current block is full, finalize chunk with context header
      const formattedText = `[Document: ${fileName} | Section: ${currentSection}]\n${currentBlock}`;
      chunks.push({
        chunkIndex: chunkIndex++,
        chunkText: formattedText,
        section: currentSection,
      });

      // Prepare next block with overlap from end of current block
      const overlapText = currentBlock.length > overlap 
        ? currentBlock.substring(currentBlock.length - overlap).trim() 
        : '';
      
      currentBlock = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
    }
  }

  if (currentBlock.trim()) {
    const formattedText = `[Document: ${fileName} | Section: ${currentSection}]\n${currentBlock.trim()}`;
    chunks.push({
      chunkIndex: chunkIndex++,
      chunkText: formattedText,
      section: currentSection,
    });
  }

  return chunks;
}

/**
 * Process raw text for a MedicalDocument, generate hybrid vector chunks, and persist to MongoDB
 * @param {string} documentId
 * @returns {Promise<Array<Object>>} Saved chunks with embeddings
 */
async function processAndStoreDocumentChunks(documentId) {
  const document = await MedicalDocument.findById(documentId);
  if (!document) {
    throw new Error(`Medical document with ID ${documentId} not found.`);
  }

  const rawChunks = chunkText(document.extractedText, 650, 80, document.fileName || 'Document');
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

// -------------------------------------------------------------
// BM25 Sparse Lexical Scoring Algorithm
// -------------------------------------------------------------

/**
 * Tokenize text into normalized lowercase alphanumeric terms
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[^a-z0-9/%.-]+/).filter((t) => t.length > 0);
}

/**
 * Compute BM25 lexical relevance score for a query against a document chunk
 * @param {string[]} queryTerms - Tokenized query terms
 * @param {string} chunkText - Raw chunk text
 * @param {number} avgDocLen - Average document length across corpus
 * @param {Map<string, number>} idfMap - Inverse document frequency map
 * @param {number} [k1=1.5] - BM25 term frequency saturation parameter
 * @param {number} [b=0.75] - BM25 document length normalization parameter
 * @returns {{ score: number, matchedTerms: string[] }}
 */
function scoreBM25(queryTerms, chunkText, avgDocLen, idfMap, k1 = 1.5, b = 0.75) {
  const docTokens = tokenize(chunkText);
  const docLen = docTokens.length;
  if (docLen === 0 || queryTerms.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  // Count term frequencies in chunk
  const tfMap = new Map();
  for (const token of docTokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1);
  }

  let score = 0;
  const matchedTerms = [];

  for (const term of queryTerms) {
    const tf = tfMap.get(term) || 0;
    if (tf > 0) {
      matchedTerms.push(term);
      const idf = idfMap.get(term) || 1.0;
      
      // Clinical token multiplier (give higher priority to specific lab/drug tokens)
      const tokenBoost = CLINICAL_BOOST_TOKENS.has(term) ? 1.8 : 1.0;

      // Standard BM25 formula
      const numerator = tf * (k1 + 1) * tokenBoost;
      const denominator = tf + k1 * (1 - b + b * (docLen / (avgDocLen || 1)));
      score += idf * (numerator / denominator);
    }
  }

  return { score, matchedTerms };
}

/**
 * Build IDF (Inverse Document Frequency) dictionary across a set of chunks
 * @param {Array<{ chunkText: string }>} chunks
 * @returns {{ idfMap: Map<string, number>, avgDocLen: number }}
 */
function buildCorpusStats(chunks) {
  const N = chunks.length;
  const dfMap = new Map();
  let totalLen = 0;

  for (const chunk of chunks) {
    const tokens = new Set(tokenize(chunk.chunkText));
    totalLen += tokens.size;
    for (const term of tokens) {
      dfMap.set(term, (dfMap.get(term) || 0) + 1);
    }
  }

  const idfMap = new Map();
  for (const [term, df] of dfMap.entries()) {
    // Robertson-Spärck Jones IDF
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    idfMap.set(term, Math.max(0.1, idf));
  }

  const avgDocLen = N > 0 ? totalLen / N : 1;
  return { idfMap, avgDocLen };
}

// -------------------------------------------------------------
// Hybrid RAG Retrieval with Reciprocal Rank Fusion (RRF)
// -------------------------------------------------------------

/**
 * Perform Hybrid (Dense Vector + Sparse BM25 + Synonym Expansion) search
 * across all documents belonging to a patient intake.
 * @param {string} intakeId
 * @param {string} query - Doctor question or search prompt
 * @param {number} [topK=5] - Number of top-matching excerpts to return
 * @returns {Promise<Array<Object>>} Ranked list of matching chunks with similarity scores & source citations
 */
async function retrieveTopKChunks(intakeId, query, topK = 5) {
  if (!query || !query.trim()) return [];

  // 1. Expand query with clinical synonyms
  const { expandedQuery, terms: queryTerms } = expandClinicalQuery(query);

  // 2. Generate dense query embedding for expanded query
  const queryEmbedding = await generateEmbedding(expandedQuery);

  // 3. Retrieve all documents and their vector chunks for this intake
  const documents = await MedicalDocument.find({ intakeId }).lean();
  if (!documents || documents.length === 0) return [];

  // Flatten all candidate chunks
  const allCandidates = [];
  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    for (const chunk of doc.chunks) {
      allCandidates.push({
        documentId: doc._id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        pageCount: doc.pageCount,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        embedding: chunk.embedding || [],
      });
    }
  }

  if (allCandidates.length === 0) return [];

  // 4. Compute Corpus Statistics for BM25
  const { idfMap, avgDocLen } = buildCorpusStats(allCandidates);

  // 5. Compute Dense Similarity & BM25 Scores
  const denseScores = [];
  const sparseScores = [];

  allCandidates.forEach((candidate, idx) => {
    // Dense Vector Cosine Similarity
    let vectorSim = 0;
    if (candidate.embedding && candidate.embedding.length > 0) {
      vectorSim = cosineSimilarity(queryEmbedding, candidate.embedding);
    }
    denseScores.push({ idx, score: vectorSim });

    // Sparse BM25 Score
    const { score: bm25Score, matchedTerms } = scoreBM25(queryTerms, candidate.chunkText, avgDocLen, idfMap);
    sparseScores.push({ idx, score: bm25Score, matchedTerms });
  });

  // Sort separately to determine relative ranks for RRF
  denseScores.sort((a, b) => b.score - a.score);
  sparseScores.sort((a, b) => b.score - a.score);

  // Map candidate indices to ranks (1-based)
  const denseRankMap = new Map();
  denseScores.forEach((item, rank) => denseRankMap.set(item.idx, rank + 1));

  const sparseRankMap = new Map();
  sparseScores.forEach((item, rank) => sparseRankMap.set(item.idx, rank + 1));

  // 6. Reciprocal Rank Fusion (RRF)
  // RRF Score = (0.6 / (60 + denseRank)) + (0.4 / (60 + sparseRank))
  const RRF_K = 60;
  const DENSE_WEIGHT = 0.6;
  const SPARSE_WEIGHT = 0.4;

  const rankedCandidates = allCandidates.map((candidate, idx) => {
    const denseRank = denseRankMap.get(idx) || allCandidates.length;
    const sparseRank = sparseRankMap.get(idx) || allCandidates.length;

    const rrfScore = (DENSE_WEIGHT / (RRF_K + denseRank)) + (SPARSE_WEIGHT / (RRF_K + sparseRank));

    const vectorSim = denseScores.find((d) => d.idx === idx)?.score || 0;
    const sparseInfo = sparseScores.find((s) => s.idx === idx) || { score: 0, matchedTerms: [] };

    // Normalized combined score for UI display (0 to 1.0)
    const normalizedScore = Math.min(1.0, (vectorSim * 0.5) + (Math.min(sparseInfo.score, 10) / 10 * 0.5));

    return {
      documentId: candidate.documentId,
      fileName: candidate.fileName,
      fileUrl: candidate.fileUrl,
      pageCount: candidate.pageCount,
      chunkIndex: candidate.chunkIndex,
      chunkText: candidate.chunkText,
      similarityScore: parseFloat(normalizedScore.toFixed(4)),
      denseScore: parseFloat(vectorSim.toFixed(4)),
      bm25Score: parseFloat(sparseInfo.score.toFixed(4)),
      matchedTerms: sparseInfo.matchedTerms,
      rrfScore: parseFloat(rrfScore.toFixed(6)),
    };
  });

  // Sort by highest RRF score
  rankedCandidates.sort((a, b) => b.rrfScore - a.rrfScore);

  return rankedCandidates.slice(0, topK);
}

module.exports = {
  chunkText,
  processAndStoreDocumentChunks,
  retrieveTopKChunks,
  detectSection,
  scoreBM25,
};
