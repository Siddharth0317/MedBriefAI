const pdfParse = require('pdf-parse');
const PDFParser = require('pdf2json');
const zlib = require('zlib');

/**
 * Extract raw text from uncompressed or flate-compressed PDF streams
 * Fallback when PDF structure / xref table is malformed
 * @param {Buffer} buffer
 * @returns {string}
 */
function extractRawStreamText(buffer) {
  try {
    const rawString = buffer.toString('latin1');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    const extractedParts = [];
    let match;

    while ((match = streamRegex.exec(rawString)) !== null) {
      const rawStream = Buffer.from(match[1], 'latin1');
      let uncompressed;

      try {
        uncompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          uncompressed = zlib.inflateRawSync(rawStream);
        } catch {
          uncompressed = rawStream;
        }
      }

      const content = uncompressed.toString('latin1');

      // Extract ( ... ) Tj strings
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(content)) !== null) {
        extractedParts.push(tjMatch[1]);
      }

      // Extract [ ... ] TJ array strings
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjaMatch;
      while ((tjaMatch = tjArrayRegex.exec(content)) !== null) {
        const innerStrings = tjaMatch[1].match(/\(([^)]+)\)/g);
        if (innerStrings) {
          extractedParts.push(
            innerStrings.map((s) => s.slice(1, -1)).join(' ')
          );
        }
      }
    }

    // Clean and join
    const joined = extractedParts
      .map((p) => p.replace(/\\[rntbf]/g, ' ').replace(/\\/g, ''))
      .filter((p) => p.trim().length > 1)
      .join(' ');

    return joined.trim();
  } catch (err) {
    return '';
  }
}

/**
 * Extract text using pdf2json library
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
function extractWithPdf2Json(buffer) {
  return new Promise((resolve) => {
    try {
      const pdfParser = new PDFParser(null, 1);

      pdfParser.on('pdfParser_dataError', () => {
        resolve('');
      });

      pdfParser.on('pdfParser_dataReady', () => {
        try {
          const rawText = pdfParser.getRawTextContent();
          resolve(rawText ? rawText.trim() : '');
        } catch {
          resolve('');
        }
      });

      pdfParser.parseBuffer(buffer);
    } catch {
      resolve('');
    }
  });
}

/**
 * Robust Multi-Engine PDF Text Extraction
 * Tries: pdf-parse -> pdf2json -> Raw Stream Decompressor
 * @param {Buffer} buffer - PDF file buffer
 * @param {string} filename - Original filename for diagnostics
 * @returns {Promise<{ extractedText: string, pageCount: number, method: string }>}
 */
async function extractTextFromPDF(buffer, filename = 'document.pdf') {
  if (!buffer || buffer.length === 0) {
    return {
      extractedText: '',
      pageCount: 0,
      method: 'none',
    };
  }

  let extractedText = '';
  let pageCount = 1;
  let method = 'pdf-parse';

  // Strategy 1: Standard pdf-parse
  try {
    const data = await pdfParse(buffer, {
      max: 0, // Parse all pages
    });

    if (data && data.text && data.text.trim().length > 0) {
      extractedText = data.text.trim();
      pageCount = data.numpages || 1;
      method = 'pdf-parse';
    }
  } catch (parseError) {
    console.warn(`[PDF Extractor] pdf-parse failed for "${filename}": ${parseError.message}. Trying Strategy 2...`);
  }

  // Strategy 2: pdf2json fallback
  if (!extractedText || extractedText.length < 5) {
    try {
      const pdf2JsonText = await extractWithPdf2Json(buffer);
      if (pdf2JsonText && pdf2JsonText.trim().length > 0) {
        extractedText = pdf2JsonText.trim();
        method = 'pdf2json';
      }
    } catch (err) {
      console.warn(`[PDF Extractor] pdf2json failed for "${filename}": ${err.message}. Trying Strategy 3...`);
    }
  }

  // Strategy 3: Raw PDF Stream Decompressor
  if (!extractedText || extractedText.length < 5) {
    try {
      const rawText = extractRawStreamText(buffer);
      if (rawText && rawText.length > 0) {
        extractedText = rawText;
        method = 'raw-stream';
      }
    } catch (err) {
      console.warn(`[PDF Extractor] raw stream extraction failed: ${err.message}`);
    }
  }

  // Clean up whitespace & control characters
  const cleanedText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/[^\x20-\x7E\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  console.log(`📄 [PDF Extractor] "${filename}" extracted ${cleanedText.length} characters using method: ${method}`);

  return {
    extractedText: cleanedText || `[Notice: Text could not be extracted from this PDF format. Original filename: ${filename}]`,
    pageCount: pageCount || 1,
    method,
  };
}

module.exports = {
  extractTextFromPDF,
  extractRawStreamText,
};
