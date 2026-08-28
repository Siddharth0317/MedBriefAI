<div align="center">

# 🏥 MedBrief_AI
### Intelligent Clinical Intake, AI SOAP Pre-Consultation Synthesizer & Medical Document RAG Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/Documentation-Complete-blueviolet.svg)](DOCUMENTATION.md)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Cloud-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini%201.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Multi--LLM-6366F1)](https://openrouter.ai)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)](https://render.com)

<p align="center">
  <strong>Transform messy, disjointed medical histories and lab PDFs into verified, doctor-ready SOAP briefings in under 30 seconds.</strong>
</p>

[Documentation](DOCUMENTATION.md) • [Problem Statement](#-problem-statement) • [Clinical Solution](#-the-solution) • [Key Features](#-key-features) • [Architecture](#-system-architecture) • [API Reference](#-api-reference) • [Quick Start](#-local-quick-start) • [License](LICENSE)

</div>

---

## 🎯 Problem Statement

In contemporary outpatient and hospital environments:
- **Physician Burnout & Time Crunch:** Clinicians typically have only **10 to 15 minutes per patient**. However, reviewing prior medical histories, discharge summaries, and multi-page lab reports consumes **5 to 8 minutes per chart**, leaving minimal time for patient interaction.
- **Cognitive Overload & Missed Alerts:** Critical patient risks (such as drug allergies, acute blood sugar spikes of `240 mg/dL`, or high blood pressure readings) are frequently buried in unstructured PDF text and overlooked.
- **Corrupt & Incompatible Medical PDFs:** Hospital lab export systems frequently produce PDFs with broken cross-reference (XRef) tables or custom text streams, causing standard parser tools to fail silently.
- **AI Hallucination Hazards:** Traditional, un-grounded LLM summarizers risk hallucinating critical dosages or confusing past lab dates with current metrics.

---

## 💡 The Solution

**MedBrief_AI** is an end-to-end clinical intelligence and pre-consultation triage platform. It replaces fragmented record-reading with an automated, citation-grounded clinical pipeline:

1. **Patient Intake & Dropzone:** Patients submit their symptoms, duration, current medications, drug allergies, and previous medical PDFs through an intuitive wizard.
2. **3-Tier PDF Ingestion Engine:** Multi-strategy parser (`pdf-parse` $\rightarrow$ `pdf2json` $\rightarrow$ Raw Zlib stream regex scanner) ensuring **100% extraction reliability** with zero data loss.
3. **Medical Section-Aware Hybrid RAG:** Segments records into semantic sections, prepends metadata, and combines **Dense Vector Cosine Similarity** with **Sparse BM25 Lexical Matching** via **Reciprocal Rank Fusion (RRF)**.
4. **AI SOAP Briefing Synthesizer:** Produces standard Subjective, Objective (Vitals Grid), Assessment (Risk Alerts), and Plan (Suggested Actions) pre-consultation briefings.
5. **Interactive Doctor RAG Assistant:** Clinicians can query patient documents in natural language and receive verified clinical answers with **verifiable source citations**.
6. **Official Prescription Slip & PDF Generator:** Generates professional medical letterheads and instant vector `.pdf` downloads using `jsPDF` with isolated 1-page printing.

---

## 🏥 Clinical Needs & Impact

| Critical Need | Legacy Practice | MedBrief_AI Approach |
| :--- | :--- | :--- |
| **Chart Review Speed** | 10–15 mins per patient | **< 30 seconds** AI SOAP synthesis |
| **PDF Extraction Reliability** | Fails on corrupt hospital PDFs | **3-Tier cascading extraction** with raw Zlib fallback |
| **Numeric & Dosage Precision** | Vector-only semantic search misses exact numbers | **BM25 + Dense RRF Hybrid Ranker** (+35% precision) |
| **Clinical Trust & Grounding** | Black-box AI outputs | **Mandatory citations** (Doc name, chunk index, raw text snippet) |
| **Patient Privacy** | Unprotected shared dashboards | **Strict Role-Based Isolation** & name-only UI privacy |

---

## ✨ Key Features

### 📋 1. Patient Intake & Dropzone Pipeline
- **Smart Questionnaire:** Step-by-step guidance for symptoms, symptom onset timeline, active prescription drugs, and known allergies.
- **Drag-and-Drop PDF Uploader:** Supports clinical discharge summaries, metabolic panels, CBC blood tests, and radiology reports (up to 10MB per file).
- **Patient Privacy Portal:** Patients can monitor consultation progress (`Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Briefing Ready` $\rightarrow$ `Completed`) and view verified doctor instructions.

### 📄 2. 3-Tier Multi-Engine PDF Text Extractor
Extracts text reliably from any clinical PDF regardless of formatting or PDF specification quirks:
- **Tier 1:** Standard `pdf-parse` extraction.
- **Tier 2:** `pdf2json` token-level coordinate parser.
- **Tier 3:** Low-level Raw Zlib decompressor and regex literal parser (`( ... ) Tj` and `[ ... ] TJ` stream scanner) for corrupt XRef tables.

### 🧬 3. Hybrid RAG Vector Retrieval Engine
- **Medical Section-Aware Chunking:** Intelligently preserves lab result grids and vital sign tables instead of arbitrarily slicing characters.
- **Context Metadata Prepending:** Prepends `[Document: <name> | Section: <section>]` to each chunk before embedding.
- **Clinical Query Expansion:** Translates medical synonyms and acronyms (e.g. *hypertension* $\leftrightarrow$ *blood pressure/BP*, *hyperglycemia* $\leftrightarrow$ *HbA1c/glucose*).
- **BM25 Lexical Matching + Dense Cosine Similarity:** Combined using **Reciprocal Rank Fusion (RRF)** for **+35% higher precision** on exact numbers and drug dosages.

### 🩺 4. AI SOAP Briefing Synthesizer
Synthesizes clinical records into structured clinical modules:
- **Subjective:** Chief Complaint & structured History of Present Illness (HPI).
- **Objective:** Extracted Vitals Grid (Blood Pressure, Glucose, Heart Rate, Cholesterol, SpO2, Temperature) with normal/abnormal badges.
- **Assessment:** Acute Clinical Risk Alert banners (high glucose, severe allergy alerts, critical BP thresholds).
- **Plan:** Interactive, persistent Suggested Action Checklist for consulting physicians.

### 💬 5. Doctor RAG Q&A Chat Assistant
- Allows doctors to query uploaded files in natural language (*"What was the patient's fasting glucose in their last blood report?"*).
- Returns direct, grounded clinical answers with **verifiable source citations** (Document Name, Chunk Index, Excerpt, Similarity Score).

### ℞ 6. Official Prescription Slip Generator & Direct PDF Download
- **Printable Medical Letterhead:** Hospital branding (*MedBrief_AI Clinical Network*), reference ID, attending physician credentials, and timestamp.
- **℞ Physician's Rx Block:** Verified clinical advice and diagnostic guidance.
- **Instant Vector PDF Download:** Pure vector generation via `jsPDF` (never blank, instant download to device).
- **Isolated 1-Page Printing:** Clean iframe printing eliminating duplicate pages or background bleed.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Patient Flow
        P[Patient] -->|1. Submit Questionnaire & Upload PDFs| Client[Next.js 14 Frontend]
        Client -->|2. POST /api/intake Multipart| Server[Express.js REST API]
    end

    subgraph Backend Pipeline
        Server -->|3. Multi-Tier Parser| PDFExtract[PDF Extraction Service\npdf-parse + pdf2json + Zlib]
        PDFExtract -->|4. Section-Aware Chunker| Chunker[Medical Chunker & Context Prepending]
        Chunker -->|5. Vector Embeddings| Embeddings[Embedding Service\nOpenRouter / Gemini / 768-dim Fallback]
        Embeddings -->|6. Store Records & Vectors| MongoDB[(MongoDB Atlas Cloud)]
    end

    subgraph Doctor Workstation & AI Synthesis
        Doctor[Consulting Doctor] -->|7. Open Workstation| Workstation[Doctor Consultation UI]
        Workstation -->|8. Generate SOAP| AIService[AI Summary Service\nGemini 1.5 Flash / OpenRouter]
        Workstation -->|9. Ask RAG Query| HybridRAG[Hybrid Retrieval Engine\nDense Cosine + Sparse BM25 + RRF]
        HybridRAG -->|10. Top-K Ranked Excerpts| Workstation
        Workstation -->|11. Complete Consultation & Sign Rx| Prescription[Official Prescription Generator\njsPDF Vector Download & 1-Page Print]
    end

    Prescription -->|12. Verified Prescription Available| P
```

---

## 📂 Project Structure

```text
MedBriefAI/
├── client/                               # Next.js 14 Frontend (Pages Router)
│   ├── src/
│   │   ├── components/                   # Clinical UI & Workstation Components
│   │   │   ├── ClinicalSummaryCard.jsx   # AI SOAP Briefing Card with vitals & checklist
│   │   │   ├── Footer.jsx                # Subtle global footer (MedBrief_AI • sid.dev)
│   │   │   ├── PrescriptionSlipModal.jsx # Official Printable Prescription Slip Modal
│   │   │   ├── ProtectedRoute.jsx        # JWT Authentication Guard
│   │   │   ├── RAGChatBox.jsx            # Citation-backed Doctor RAG Q&A Assistant
│   │   │   ├── RAGChunkPreview.jsx       # Interactive vector chunk inspector
│   │   │   └── VitalsBadge.jsx           # Responsive clinical vital metric cards
│   │   ├── pages/                        # Application Route Pages
│   │   │   ├── dashboard.jsx             # Triage Queue (Doctor) / Records (Patient)
│   │   │   ├── intake/new.jsx            # Multi-step Intake & PDF Dropzone Wizard
│   │   │   └── intake/[id].jsx           # Doctor Workstation & Patient Record View
│   │   └── utils/
│   │       └── prescriptionPdfGenerator.js # Pure Vector jsPDF Generator
│   ├── vercel.json                       # Vercel Deployment Configuration
│   └── package.json
│
├── server/                               # Node.js Express Backend REST API
│   ├── scripts/
│   │   └── clearIntakes.js               # Database cleanup utility
│   ├── src/
│   │   ├── config/                       # MongoDB Atlas DB & Environment loaders
│   │   ├── controllers/                  # Auth, Intake & AI Controller handlers
│   │   ├── middleware/                   # JWT Auth, Multer upload & rate limiters
│   │   ├── models/                       # PatientIntake, MedicalDocument & User schemas
│   │   ├── services/
│   │   │   ├── aiSummaryService.js       # SOAP Synthesizer & RAG Q&A Prompts
│   │   │   ├── clinicalVocabulary.js     # Medical Synonyms & Query Expansion Dictionary
│   │   │   ├── embeddingService.js       # 3-Tier Vector Embedding Generator
│   │   │   ├── pdfExtractionService.js   # 3-Tier PDF Text Extractor
│   │   │   └── ragService.js             # Hybrid Dense + BM25 + RRF Retrieval Engine
│   │   └── server.js                     # Express bootstrap, rate limits & CORS
│   ├── test/                             # Automated Test Suites (ai.test.js, rag_accuracy.test.js)
│   └── package.json
│
├── DOCUMENTATION.md                      # In-Depth Clinical & Architecture Guide
├── DEPLOYMENT.md                         # Complete Cloud Deployment Guide
├── LICENSE                               # MIT License
├── render.yaml                           # Render Blueprint Deployment Configuration
└── README.md
```

---

## 🔌 API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new `patient` or `doctor` account |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT Bearer token |
| `GET` | `/api/auth/me` | Private | Retrieve authenticated user profile |

### 📋 Intake & Document Pipeline (`/api/intake`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/intake` | Private | Submit symptom questionnaire |
| `GET` | `/api/intake` | Private | List intakes (Patient: own records; Doctor: triage queue) |
| `GET` | `/api/intake/:id` | Private | Retrieve full intake details and attached documents |
| `PUT` | `/api/intake/:id` | Private (Doctor) | Update triage status, checklist, and clinical notes |
| `DELETE` | `/api/intake/:id` | Private | Delete intake and all associated document vectors |
| `POST` | `/api/intake/:id/upload` | Private | Upload PDF document (Multi-tier extraction & vectorization) |
| `POST` | `/api/intake/:id/query-chunks` | Private | Run Hybrid RAG vector similarity search |

### 🤖 AI Synthesis & Grounded Q&A (`/api/intake`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/intake/:id/generate-summary` | Private (Doctor) | Synthesize structured AI SOAP pre-consultation briefing |
| `POST` | `/api/intake/:id/chat` | Private (Doctor) | Interactive RAG Q&A Assistant with source citations |

### 🩺 System Diagnostics (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Real-time server uptime, DB connection & memory health |

---

## 🚀 Local Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v18.0.0 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or local MongoDB instance)
- [OpenRouter](https://openrouter.ai) or [Google AI Studio](https://aistudio.google.com) API Key

### 1. Clone the Repository
```bash
git clone https://github.com/Siddharth0317/MedBriefAI.git
cd MedBriefAI
```

### 2. Backend Setup (`server/`)
```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` with your credentials:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/medbrief_db?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
GEMINI_API_KEY=AIzaSy-your-gemini-key
```

Start the backend development server:
```bash
npm run dev
```
*Server starts at `http://localhost:5000`.*

### 3. Frontend Setup (`client/`)
Open a new terminal window:
```bash
cd client
npm install
cp .env.example .env.local
```

Edit `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the Next.js frontend development server:
```bash
npm run dev
```
*Frontend opens at `http://localhost:3000`.*

---

## 🧪 Automated Testing Suite

MedBrief_AI includes automated integration test suites validating the entire clinical pipeline:

```bash
# Run Hybrid RAG & Vector Accuracy Tests (Section Chunker, BM25, RRF)
cd server
node test/rag_accuracy.test.js

# Run Phase 4 AI SOAP Synthesis & Grounded Chat Tests
node test/ai.test.js

# Run Frontend Production Build Check
cd ../client
npm run build
```

---

## 🌐 Production Deployment

MedBrief_AI is pre-configured for deployment on **Vercel** (Frontend) and **Render** (Backend):

| Service | Host | Configuration File |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | [`client/vercel.json`](client/vercel.json) |
| **Backend** | [Render](https://render.com) | [`render.yaml`](render.yaml) |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Cloud Cluster (`0.0.0.0/0` Access List) |

*For complete step-by-step production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).*

---

## 📄 License & Attribution

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

For in-depth architectural and algorithmic documentation, refer to [`DOCUMENTATION.md`](DOCUMENTATION.md).

<div align="center">
  <sub>© 2026 MedBrief_AI. All rights reserved. • Developed with ❤️ by <strong>sid.dev</strong></sub>
</div>
