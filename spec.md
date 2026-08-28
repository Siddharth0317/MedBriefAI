# Specification Document: MedBrief_AI
**Project Title:** AI Patient Intake & Clinical Record Summarizer (MedBrief_AI)  
**Target Persona:** Hospital triage staff, general practitioners, and outpatient clinical operators.  
**Architecture:** Decoupled Full-Stack Web Application with Retrieval-Augmented Generation (RAG).

---

## 1. Project Overview & Problem Statement
* **Problem Statement:** Physicians and clinical staff spend an average of 15–20 minutes per consultation manually reviewing past patient records, deciphering messy paper forms, and checking lab results, which increases diagnostic overhead and physician burnout.
* **Solution:** MedBrief_AI provides an end-to-end digital clinical intake system. Patients submit symptoms and upload previous medical records/lab reports (PDFs). The platform extracts text, chunks data, generates vector embeddings, and uses a Retrieval-Augmented Generation (RAG) pipeline to synthesize a structured, doctor-ready pre-consultation SOAP briefing (Subjective, Objective, Assessment, Plan) with flagged critical risks. An interactive doctor-facing RAG assistant allows clinicians to query patient files with citation-backed responses.

---

## 2. Tech Stack Specification
* **Frontend:** Next.js (Pages Router) or React (Vite), Tailwind CSS, Zustand (state persistence), Axios, Lucide-React icons.
* **Backend:** Node.js, Express.js, JSON Web Tokens (JWT), bcryptjs, Multer (file uploads), pdf-parse (text extraction), cors, helmet, express-validator[cite: 2, 3].
* **Database & Vector Store:**
  * Primary Database: MongoDB Atlas (via Mongoose).
  * Vector Store: MongoDB Atlas Vector Search OR an In-Memory cosine-similarity vector store fallback for local execution.
* **AI & LLM Services:** Google Generative AI SDK (`@google/genai` or `@google/generative-ai`) using `gemini-1.5-flash` / `text-embedding-004` (Primary), OpenRouter API (Secondary fallback), and a deterministic rule-based summarizer fallback when API keys are absent.
* **Deployment Targets:**
  * Source: GitHub.
  * Frontend: Vercel.
  * Backend: Render.
  * Database: MongoDB Atlas.

---

## 3. Core Functional Requirements

### Must-Have Core Features (Compulsory)
1. **User Authentication & Role-Based Access Control:**
   * Role separation: `patient` and `doctor`.
   * Registration, login, password hashing (bcrypt, cost 12), and JWT session verification on protected routes.
2. **Patient Intake Workflow:**
   * Multi-step form capturing chief complaints, symptom duration, current medications, and past medical history.
   * Multi-file PDF upload pipeline for lab reports and past clinical records.
3. **Document Extraction & Processing Engine:**
   * Server-side text parsing of uploaded PDFs using `pdf-parse`.
   * Recursive chunking (500-character chunks with 50-character overlap).
4. **Vector Embedding & RAG Pipeline:**
   * Vector embedding generation for text chunks via Gemini/OpenRouter embedding models.
   * Cosine-similarity retrieval to find the top-k relevant clinical excerpts based on doctor queries.
5. **AI Clinical Briefing Synthesizer:**
   * Generates a structured clinical summary containing:
     * Chief Complaint & HPI (History of Present Illness)
     * Extracted Vitals & Lab Trends
     * Flagged Clinical Alerts (Allergies, high-risk drug interactions, abnormal vitals)
     * Preliminary Differential Considerations & Suggested Action Checklist.
6. **Doctor Consultation Workspace:**
   * Interactive search and RAG-powered Q&A chat grounded strictly in the patient's uploaded documents with source page/chunk citation.
   * Status lifecycle: `Submitted` -> `Under_Review` -> `Briefing_Ready` -> `Completed`.
7. **Full CRUD & Data Management:**
   * Doctors can review, edit clinical notes, update intake statuses, and archive records.

### Bonus / Optional Features
* Structured lab value extraction into a visual metrics card.
* Export clinical briefing to a formatted PDF summary or external spreadsheet[cite: 1, 3].
* Multi-language translation for patient intake questionnaires.

---

## 4. Database Collections & Data Models

### `User` Collection
```javascript
{
  _id: ObjectId,
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  createdAt: { type: Date, default: Date.now }
}
```

### `PatientIntake` Collection
```javascript
{
  _id: ObjectId,
  patientId: { type: ObjectId, ref: 'User', required: true },
  assignedDoctorId: { type: ObjectId, ref: 'User', default: null },
  symptoms: { type: String, required: true },
  duration: { type: String, required: true },
  currentMedications: [String],
  allergies: [String],
  status: { 
    type: String, 
    enum: ['Submitted', 'Under_Review', 'Briefing_Ready', 'Completed'], 
    default: 'Submitted' 
  },
  aiSummary: {
    chiefComplaint: String,
    historyOfPresentIllness: String,
    flaggedRisks: [String],
    extractedVitals: Object,
    suggestedActions: [String],
    generatedAt: Date
  },
  doctorNotes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

[cite: 1, 3]

### `MedicalDocument` Collection
```javascript
{
  _id: ObjectId,
  intakeId: { type: ObjectId, ref: 'PatientIntake', required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  extractedText: { type: String, required: true },
  chunks: [
    {
      chunkText: String,
      chunkIndex: Number,
      embedding: [Number]
    }
  ],
  createdAt: { type: Date, default: Date.now }
}
```

[cite: 1, 3]

## 5. API Route Specifications
### Authentication Routes
POST /api/auth/register — Create a new patient or doctor account.  
POST /api/auth/login — Authenticate credentials and return signed JWT.  
GET /api/auth/me — Return authenticated user session info. 

### Patient Intake & Clinical Routes
POST /api/intake — Submit symptom questionnaire.  
GET /api/intake — List intakes (Patients see their own; Doctors see triage queue)[cite: 1].
GET /api/intake/:id — Retrieve full intake details, summaries, and document list[cite: 1].
PUT /api/intake/:id — Update intake status and doctor notes.
DELETE /api/intake/:id — Delete intake and cascade delete associated vector chunks[cite: 1, 2].

### Document & AI RAG Routes
POST /api/intake/:id/upload — Upload PDF, extract text, chunk, embed, and store in vector index[cite: 1].

POST /api/intake/:id/generate-summary — Trigger LLM extraction to generate structured SOAP briefing[cite: 1].

POST /api/intake/:id/chat — Doctor queries patient records; executes vector similarity search and streams LLM answer with source citations[cite: 1, 3].

## 6. Frontend Architecture & Page Routes
/ — Public landing page explaining MedBrief_AI clinical triage.  
/login & /register — Authentication pages with role selector tabs.  
/dashboard — Unified layout based on user role:  
Doctor View: Intake queue table, risk-level badges, pending triage cards[cite: 1].
Patient View: Active submission status tracker, new intake CTA[cite: 1].
/intake/new — Multi-step patient intake wizard with drag-and-drop PDF dropzone[cite: 1].
/intake/[id] — Doctor consultation workstation:
Left Column: Patient profile, symptoms, uploaded document previews[cite: 1].
Center Column: AI SOAP Summary with highlighted high-risk badges[cite: 1].
Right Column: RAG Chat Assistant for ad-hoc queries with cited excerpts[cite: 1].

## 7. Folder Structure Contract
medbrief-ai/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ClinicalSummaryCard.jsx
│   │   │   ├── DocumentDropzone.jsx
│   │   │   ├── RAGChatBox.jsx
│   │   │   └── VitalsBadge.jsx
│   │   ├── pages/
│   │   │   ├── _app.jsx
│   │   │   ├── index.jsx
│   │   │   ├── login.jsx
│   │   │   ├── register.jsx
│   │   │   ├── dashboard.jsx
│   │   │   └── intake/
│   │   │       ├── new.jsx
│   │   │       └── [id].jsx
│   │   ├── store/
│   │   │   └── authStore.js
│   │   └── services/
│   │       └── api.js
│   ├── package.json
│   └── .env.example
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── env.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── intakeController.js
│   │   │   └── aiController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── PatientIntake.js
│   │   │   └── MedicalDocument.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── intakeRoutes.js
│   │   │   └── aiRoutes.js
│   │   ├── services/
│   │   │   ├── ragService.js
│   │   │   ├── embeddingService.js
│   │   │   └── aiSummaryService.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md

## 8. Security & Environment Configuration
### Required Environment Variables
#### Backend (`server/.env`):
PORT=5000
NODE_ENV=production
CLIENT_URL=[https://your-medbrief-frontend.vercel.app](https://your-medbrief-frontend.vercel.app)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/medbrief
JWT_SECRET=your_jwt_strong_secret_key_minimum_32_chars
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_optional_openrouter_key

#### Frontend (`client/.env.local`):
NEXT_PUBLIC_API_URL=[https://your-medbrief-backend.onrender.com](https://your-medbrief-backend.onrender.com)
# If using Vite:
# VITE_API_URL=[https://your-medbrief-backend.onrender.com](https://your-medbrief-backend.onrender.com)

### Security Rules
Never commit .env or credential files to GitHub; strictly enforce .gitignore[cite: 1, 2].

Store user passwords hashed with bcrypt cost 12[cite: 3].

Implement helmet middleware, strict CORS origins matching CLIENT_URL, and rate-limiting on /api/auth/*[cite: 3].

Frontend code must never access database connection strings or LLM private API keys[cite: 1, 2].

## 9. Phased Implementation Roadmap
### Phase 1: Project Scaffolding & Authentication
Initialize repository with client/ and server/ subfolders[cite: 1, 2].
Configure Express server, MongoDB Atlas connection, User models, and JWT authentication flows[cite: 2, 3].

### Phase 2: Intake Flow & Document Upload Pipeline
Build patient multi-step questionnaire and PDF upload UI with dropzone[cite: 1].
Implement backend Multer parser and pdf-parse extraction service[cite: 1].
### Phase 3: Chunking & RAG Vector Engine
Implement recursive text chunking and vector embedding generation via Gemini API[cite: 1, 3].
Build cosine-similarity vector retrieval engine[cite: 1].
### Phase 4: AI Briefing Synthesizer & Doctor Workspace
Implement prompt engineering for structured SOAP briefings and risk extraction[cite: 1].
Build doctor dashboard, citation-backed RAG Q&A chat drawer, and intake status update CRUD[cite: 1, 2].
### Phase 5: Local Testing, Hardening & Production Deployment
Validate end-to-end CRUD, CORS setup, and error handling. Deploy backend to Render, database to MongoDB Atlas, and frontend to Vercel[cite: 1, 2].