/**
 * Clinical Vocabulary & Synonym Expansion Dictionary
 * Maps clinical terms, abbreviations, and colloquial phrases to medical concepts
 * to improve dense and sparse RAG retrieval accuracy.
 */

const CLINICAL_SYNONYM_MAP = {
  // Cardiovascular & Vitals
  'hypertension': ['hypertension', 'blood pressure', 'bp', 'systolic', 'diastolic', 'hypertensive', 'htn'],
  'bp': ['blood pressure', 'bp', 'systolic', 'diastolic', 'hypertension', 'mmhg'],
  'blood pressure': ['blood pressure', 'bp', 'systolic', 'diastolic', 'hypertension', 'mmhg'],
  'tachycardia': ['tachycardia', 'heart rate', 'hr', 'pulse', 'pulse rate', 'bpm', 'tachycardic'],
  'bradycardia': ['bradycardia', 'heart rate', 'hr', 'pulse', 'bpm', 'bradycardic'],
  'heart rate': ['heart rate', 'pulse', 'hr', 'bpm', 'tachycardia', 'bradycardia'],
  'pulse': ['pulse', 'heart rate', 'hr', 'bpm'],
  'hypotension': ['hypotension', 'low blood pressure', 'hypotensive', 'shock', 'systolic'],
  'chest pain': ['chest pain', 'angina', 'myocardial', 'acs', 'cardiac', 'ecg', 'ekg', 'troponin'],

  // Respiratory
  'dyspnea': ['dyspnea', 'shortness of breath', 'sob', 'breathlessness', 'respiratory rate', 'spo2', 'oxygen'],
  'shortness of breath': ['shortness of breath', 'sob', 'dyspnea', 'breathless', 'spo2', 'hypoxia', 'oxygen'],
  'sob': ['shortness of breath', 'sob', 'dyspnea', 'respiratory'],
  'spo2': ['spo2', 'oxygen saturation', 'o2 sat', 'pulse oximetry', 'hypoxia', 'hypoxemia', '%'],
  'oxygen saturation': ['oxygen saturation', 'spo2', 'o2 sat', 'pulse oximetry', 'hypoxia'],
  'cough': ['cough', 'productive cough', 'sputum', 'bronchitis', 'pneumonia', 'wheeze'],
  'wheezing': ['wheezing', 'wheeze', 'asthma', 'bronchospasm', 'stridor'],

  // Endocrine & Metabolism
  'diabetes': ['diabetes', 'diabetic', 'dm', 't2dm', 't1dm', 'glucose', 'blood sugar', 'hba1c', 'glycated hemoglobin'],
  'blood sugar': ['blood sugar', 'glucose', 'fasting glucose', 'rbs', 'fbs', 'postprandial', 'hba1c', 'mg/dl'],
  'glucose': ['glucose', 'blood sugar', 'fasting blood sugar', 'fbs', 'rbs', 'hba1c', 'mg/dl', 'mmol/l'],
  'hba1c': ['hba1c', 'glycated hemoglobin', 'a1c', 'glycohemoglobin', 'diabetes control', '%'],
  'thyroid': ['thyroid', 'tsh', 'free t4', 't3', 'hypothyroidism', 'hyperthyroidism'],
  'tsh': ['tsh', 'thyroid stimulating hormone', 'thyroid', 'free t4', 'hypothyroid'],

  // Hematology & Infection
  'fever': ['fever', 'temperature', 'temp', 'pyrexia', 'febrile', 'hyperthermia', 'chills'],
  'temperature': ['temperature', 'temp', 'fever', 'pyrexia', 'celsius', 'fahrenheit'],
  'infection': ['infection', 'infectious', 'wbc', 'leukocytosis', 'crp', 'esr', 'sepsis', 'neutrophils', 'procalcitonin'],
  'wbc': ['wbc', 'white blood cell count', 'leukocyte', 'leukocytes', 'neutrophils', 'bands', 'cells/mcL'],
  'white blood cell': ['white blood cell', 'wbc', 'leukocyte', 'leukocytes', 'neutrophil'],
  'anemia': ['anemia', 'hemoglobin', 'hgb', 'hb', 'hematocrit', 'hct', 'rbc', 'iron', 'ferritin'],
  'hemoglobin': ['hemoglobin', 'hgb', 'hb', 'anemia', 'g/dl', 'hematocrit'],
  'platelets': ['platelets', 'plt', 'thrombocyte', 'thrombocytes', 'thrombocytopenia'],
  'crp': ['crp', 'c-reactive protein', 'inflammation', 'inflammatory marker', 'mg/l'],
  'esr': ['esr', 'erythrocyte sedimentation rate', 'sed rate', 'inflammation', 'mm/hr'],

  // Renal & Hepatic
  'creatinine': ['creatinine', 'cr', 'kidney function', 'renal', 'egfr', 'gfr', 'bun', 'blood urea nitrogen'],
  'kidney': ['kidney', 'renal', 'creatinine', 'bun', 'egfr', 'urea', 'nephrology', 'proteinuria'],
  'liver': ['liver', 'hepatic', 'alt', 'ast', 'sgot', 'sgpt', 'bilirubin', 'alkaline phosphatase', 'lft'],
  'alt': ['alt', 'alanine aminotransferase', 'sgpt', 'liver enzyme', 'lft'],
  'ast': ['ast', 'aspartate aminotransferase', 'sgot', 'liver enzyme', 'lft'],
  'bilirubin': ['bilirubin', 'total bilirubin', 'direct bilirubin', 'jaundice', 'lft'],

  // Pain & General
  'pain': ['pain', 'ache', 'tenderness', 'discomfort', 'severity', 'scale', 'soreness'],
  'headache': ['headache', 'cephalea', 'migraine', 'cranial', 'head pressure'],
  'dizziness': ['dizziness', 'vertigo', 'lightheadedness', 'presyncope', 'unsteadiness'],
  'allergy': ['allergy', 'allergies', 'allergic', 'anaphylaxis', 'hypersensitivity', 'rash', 'urticaria'],
};

// Key clinical measurement units and acronyms to prioritize during lexical matching
const CLINICAL_BOOST_TOKENS = new Set([
  'bp', 'mmhg', 'bpm', 'spo2', 'hba1c', 'mg/dl', 'mmol/l', 'g/dl', 'mg/l', 'mcg', 'mg', 'ml',
  'wbc', 'rbc', 'plt', 'crp', 'esr', 'bun', 'creatinine', 'egfr', 'tsh', 'alt', 'ast', 'lft',
  'kft', 'cbc', 'ecg', 'ekg', 'ct', 'mri', 'iv', 'po', 'bid', 'tid', 'qid', 'prn', 'od',
  'positive', 'negative', 'normal', 'abnormal', 'high', 'low', 'critical', 'elevated', 'decreased'
]);

/**
 * Expand a search query with clinical synonyms and related terminology
 * @param {string} query - Raw search query from doctor or synthesis engine
 * @returns {{ expandedQuery: string, terms: string[] }}
 */
function expandClinicalQuery(query) {
  if (!query || typeof query !== 'string') {
    return { expandedQuery: '', terms: [] };
  }

  const cleanQuery = query.toLowerCase().trim();
  const rawTokens = cleanQuery.split(/\W+/).filter((t) => t.length > 1);
  const expandedSet = new Set(rawTokens);

  // Check multi-word keys first
  for (const [key, synonyms] of Object.entries(CLINICAL_SYNONYM_MAP)) {
    if (cleanQuery.includes(key)) {
      synonyms.forEach((syn) => expandedSet.add(syn));
    }
  }

  // Check single-token keys
  for (const token of rawTokens) {
    if (CLINICAL_SYNONYM_MAP[token]) {
      CLINICAL_SYNONYM_MAP[token].forEach((syn) => expandedSet.add(syn));
    }
  }

  const terms = Array.from(expandedSet);
  const expandedQuery = terms.join(' ');

  return { expandedQuery, terms };
}

module.exports = {
  CLINICAL_SYNONYM_MAP,
  CLINICAL_BOOST_TOKENS,
  expandClinicalQuery,
};
