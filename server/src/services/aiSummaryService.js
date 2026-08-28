const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

let genAI = null;
if (env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  } catch (err) {
    console.warn('Failed to initialize GoogleGenerativeAI client:', err.message);
  }
}

/**
 * Deterministic Rule-Based Clinical Parser (Tier 3 Fallback)
 * Extracts vitals, flags risks, and structures a clinical SOAP briefing
 * @param {Object} intake
 * @param {Array<Object>} documents
 * @returns {Object} Structured SOAP JSON
 */
function generateDeterministicSOAP(intake, documents = []) {
  const allDocText = documents.map((d) => d.extractedText || '').join(' ');
  const combinedText = `${intake.symptoms || ''} ${allDocText}`.toLowerCase();

  // 1. Extract Vitals
  const extractedVitals = {};

  // Blood Glucose (e.g. "142 mg/dl", "glucose: 180")
  const glucoseMatch = combinedText.match(/(?:glucose|blood sugar)[\s:=]+(\d{2,3})(?:\s*mg\/dl)?/i);
  if (glucoseMatch) {
    extractedVitals.bloodGlucose = `${glucoseMatch[1]} mg/dL`;
  }

  // Blood Pressure (e.g. "138/86", "bp 120/80")
  const bpMatch = combinedText.match(/(?:bp|blood pressure)[\s:=]+(\d{2,3}\/\d{2,3})/i) || combinedText.match(/(\d{2,3}\/\d{2,3})\s*mmhg/i);
  if (bpMatch) {
    extractedVitals.bloodPressure = bpMatch[1] + (bpMatch[0].includes('mmhg') ? '' : ' mmHg');
  }

  // Heart Rate / Pulse (e.g. "76 bpm", "pulse: 82")
  const hrMatch = combinedText.match(/(?:heart rate|pulse|hr)[\s:=]+(\d{2,3})(?:\s*bpm)?/i) || combinedText.match(/(\d{2,3})\s*bpm/i);
  if (hrMatch) {
    extractedVitals.heartRate = `${hrMatch[1]} bpm`;
  }

  // Total Cholesterol (e.g. "cholesterol: 210 mg/dl")
  const cholMatch = combinedText.match(/cholesterol[\s:=]+(\d{2,3})(?:\s*mg\/dl)?/i);
  if (cholMatch) {
    extractedVitals.cholesterol = `${cholMatch[1]} mg/dL`;
  }

  // SpO2 / Oxygen (e.g. "98%", "spo2 97%")
  const spo2Match = combinedText.match(/(?:spo2|oxygen saturation|o2 sat)[\s:=]+(\d{2,3})%/i);
  if (spo2Match) {
    extractedVitals.oxygenSaturation = `${spo2Match[1]}%`;
  }

  // 2. Flag Clinical Risks
  const flaggedRisks = [];

  // Allergy alerts
  if (intake.allergies && intake.allergies.length > 0) {
    flaggedRisks.push(`Reported Drug Allergies: ${intake.allergies.join(', ')}`);
  }

  // High Glucose / Diabetes check
  if (extractedVitals.bloodGlucose) {
    const gVal = parseInt(extractedVitals.bloodGlucose, 10);
    if (gVal > 140) {
      flaggedRisks.push(`Elevated Fasting Glucose (${extractedVitals.bloodGlucose}): Indicative of impaired glycemic control or hyperglycemia.`);
    }
  }

  // Hypertension check
  if (extractedVitals.bloodPressure) {
    const systolic = parseInt(extractedVitals.bloodPressure.split('/')[0], 10);
    if (systolic >= 140) {
      flaggedRisks.push(`Elevated Blood Pressure (${extractedVitals.bloodPressure}): Stage 1/2 Hypertension range.`);
    }
  }

  // High Risk Keywords
  if (combinedText.includes('chest pain') || combinedText.includes('chest tightness')) {
    flaggedRisks.push('CRITICAL SYMPTOM: Chest pain / tightness reported. Rule out Acute Coronary Syndrome (ACS).');
  }
  if (combinedText.includes('shortness of breath') || combinedText.includes('dyspnea')) {
    flaggedRisks.push('RESPIRATORY ALERT: Shortness of breath reported. Assess pulmonary and cardiac etiologies.');
  }
  if (combinedText.includes('blurred vision') || combinedText.includes('dizziness')) {
    flaggedRisks.push('NEUROLOGICAL/METABOLIC ALERT: Dizziness or blurred vision reported.');
  }

  // 3. Suggested Actions
  const suggestedActions = [
    'Confirm patient identity and review baseline symptom timeline.',
  ];

  if (extractedVitals.bloodGlucose || combinedText.includes('glucose') || combinedText.includes('metformin')) {
    suggestedActions.push('Order comprehensive Metabolic Panel (CMP) and HbA1c lab evaluation.');
  }
  if (flaggedRisks.some((r) => r.includes('Chest pain') || r.includes('RESPIRATORY'))) {
    suggestedActions.push('Perform 12-lead ECG and check troponin / D-dimer if clinically indicated.');
  }
  if (intake.currentMedications && intake.currentMedications.length > 0) {
    suggestedActions.push(`Conduct medication reconciliation for: ${intake.currentMedications.join(', ')}.`);
  }
  suggestedActions.push('Review patient-uploaded PDF diagnostic reports and discuss findings during consultation.');

  return {
    chiefComplaint: intake.symptoms.slice(0, 300),
    historyOfPresentIllness: `Patient reports symptoms persisting for ${intake.duration || 'an unspecified duration'}. Active medications: ${
      intake.currentMedications?.length ? intake.currentMedications.join(', ') : 'None reported'
    }. Allergies: ${intake.allergies?.length ? intake.allergies.join(', ') : 'No known allergies'}. ${
      documents.length > 0 ? `Reviewed ${documents.length} attached clinical report(s).` : 'No prior PDF charts attached.'
    }`,
    flaggedRisks: flaggedRisks.length > 0 ? flaggedRisks : ['No acute critical risk alerts identified.'],
    extractedVitals,
    suggestedActions,
    generatedAt: new Date(),
  };
}

/**
 * Call OpenRouter API for LLM Generation (Tier 2 Fallback)
 * @param {string} prompt
 * @returns {Promise<string|null>}
 */
async function callOpenRouter(prompt, systemPrompt = '') {
  if (!env.OPENROUTER_API_KEY) return null;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://medbrief.ai',
        'X-Title': 'MedBrief AI',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn(`OpenRouter completion failed: ${err.message}`);
    return null;
  }
}

/**
 * Call Gemini Generative AI for text generation (Tier 1 Primary)
 * @param {string} prompt
 * @returns {Promise<string|null>}
 */
async function callGemini(prompt) {
  if (!genAI || !env.GEMINI_API_KEY) return null;

  try {
    // Try gemini-1.5-flash then gemini-1.5-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.warn(`Gemini generation call failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate Structured SOAP Briefing via LLM with 3-tier fallback
 * @param {Object} intake - Patient intake record
 * @param {Array<Object>} documents - Associated medical documents
 * @returns {Promise<Object>} Structured SOAP summary object
 */
async function generateSOAPSummary(intake, documents = []) {
  const documentsContext = documents
    .map(
      (doc, i) =>
        `--- Document #${i + 1}: ${doc.fileName} ---\n${doc.extractedText || ''}`
    )
    .join('\n\n');

  const prompt = `You are an expert clinical triage physician assistant. Synthesize the following patient intake questionnaire and uploaded clinical PDF records into a structured, highly actionable SOAP pre-consultation briefing.

PATIENT INTAKE DETAILS:
- Symptoms: ${intake.symptoms}
- Duration: ${intake.duration}
- Current Medications: ${intake.currentMedications?.join(', ') || 'None'}
- Known Allergies: ${intake.allergies?.join(', ') || 'None'}

UPLOADED CLINICAL DOCUMENTS & LAB REPORTS:
${documentsContext || 'No attached documents.'}

INSTRUCTIONS:
You MUST respond with a valid, clean JSON object ONLY (no markdown fences, no extra text) matching this schema:
{
  "chiefComplaint": "Concise 1-2 sentence description of primary symptoms and reasons for visit",
  "historyOfPresentIllness": "Structured narrative detailing symptom progression, timeline, aggravating/alleviating factors, and prior treatments",
  "flaggedRisks": [
    "High-priority clinical alert (e.g. severe drug allergy, critical vitals, high glucose, cardiac warning)"
  ],
  "extractedVitals": {
    "bloodPressure": "e.g. 138/86 mmHg or null",
    "bloodGlucose": "e.g. 142 mg/dL or null",
    "heartRate": "e.g. 76 bpm or null",
    "cholesterol": "e.g. 210 mg/dL or null",
    "oxygenSaturation": "e.g. 98% or null"
  },
  "suggestedActions": [
    "Specific recommended diagnostic test, lab panel, or physical exam maneuver for the physician"
  ]
}`;

  // 1. Try Gemini (Tier 1)
  let rawText = await callGemini(prompt);

  // 2. Try OpenRouter (Tier 2)
  if (!rawText) {
    rawText = await callOpenRouter(
      prompt,
      'You are a clinical AI assistant that outputs strictly valid JSON for medical SOAP briefings.'
    );
  }

  // If LLM returned text, parse JSON
  if (rawText) {
    try {
      const cleanJSON = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJSON);

      return {
        chiefComplaint: parsed.chiefComplaint || intake.symptoms.slice(0, 300),
        historyOfPresentIllness: parsed.historyOfPresentIllness || '',
        flaggedRisks: Array.isArray(parsed.flaggedRisks) ? parsed.flaggedRisks : [],
        extractedVitals: parsed.extractedVitals || {},
        suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
        generatedAt: new Date(),
      };
    } catch (parseError) {
      console.warn(`Failed to parse LLM JSON output: ${parseError.message}. Using deterministic fallback.`);
    }
  }

  // 3. Deterministic Clinical Fallback (Tier 3)
  return generateDeterministicSOAP(intake, documents);
}

/**
 * Generate context-grounded RAG Q&A response for doctor inquiry
 * @param {Object} intake
 * @param {string} query - Doctor question
 * @param {Array<Object>} relevantChunks - Top-K retrieved vector chunks
 * @returns {Promise<{ answer: string, citations: Array<Object> }>}
 */
async function generateRAGChatResponse(intake, query, relevantChunks = []) {
  const contextText = relevantChunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.fileName} (Chunk #${c.chunkIndex + 1})]\n${c.chunkText}`
    )
    .join('\n\n');

  const prompt = `You are a clinical RAG assistant aiding a consulting physician. Answer the doctor's query based STRICTLY on the patient's intake data and the retrieved clinical document excerpts below.

PATIENT SUMMARY:
- Symptoms: ${intake.symptoms}
- Duration: ${intake.duration}
- Current Medications: ${intake.currentMedications?.join(', ') || 'None'}
- Allergies: ${intake.allergies?.join(', ') || 'None'}

RETRIEVED DOCUMENT EXCERPTS:
${contextText || 'No relevant document excerpts found.'}

DOCTOR'S QUESTION:
"${query}"

INSTRUCTIONS:
1. Provide a direct, professional, concise clinical answer.
2. Explicitly reference findings from the retrieved source excerpts where relevant.
3. If the answer cannot be determined from the provided records, clearly state that the information is not documented in the patient's uploaded files.`;

  // Try LLM Tier 1 & Tier 2
  let answer = await callGemini(prompt);
  if (!answer) {
    answer = await callOpenRouter(prompt);
  }

  // Fallback response if LLM is offline
  if (!answer) {
    if (relevantChunks.length > 0) {
      answer = `Based on the patient's clinical records (${relevantChunks[0].fileName}), the following relevant findings were identified:\n\n"${relevantChunks[0].chunkText}"\n\nPatient reports ${intake.symptoms} lasting ${intake.duration}.`;
    } else {
      answer = `Based on the patient's reported symptoms (${intake.symptoms}, duration: ${intake.duration}), no specific lab document matches were found for "${query}".`;
    }
  }

  const citations = relevantChunks.map((c) => ({
    documentName: c.fileName,
    chunkIndex: c.chunkIndex,
    excerpt: c.chunkText,
    similarityScore: c.similarityScore,
  }));

  return {
    answer: answer.trim(),
    citations,
  };
}

module.exports = {
  generateSOAPSummary,
  generateRAGChatResponse,
  generateDeterministicSOAP,
};
