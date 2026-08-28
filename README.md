# MedBrief_AI — AI Patient Intake & Clinical Record Summarizer

MedBrief_AI is a modern digital clinical intake and briefing platform. It allows patients to submit symptom questionnaires and medical records (PDFs), extracting and summarizing records into a doctor-ready pre-consultation SOAP briefing with retrieval-augmented generation (RAG) capabilities.

---

## 🏗️ Architecture Overview

- **Frontend:** Next.js (Pages Router), React, Tailwind CSS, Zustand, Axios, Lucide React.
- **Backend:** Node.js, Express.js, MongoDB (Mongoose) with In-Memory fallback, JWT Authentication, bcryptjs (cost factor 12).
- **AI & RAG Engine (Upcoming Phases):** Google Gemini 1.5 Flash / Text-Embedding-004, Vector similarity search.

```
MedBriefAI/
├── client/                     # Next.js Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI components & ProtectedRoute
│   │   ├── pages/              # Next.js Pages (Landing, Login, Register, Dashboard)
│   │   ├── services/           # Axios HTTP client with JWT interceptors
│   │   ├── store/              # Zustand Auth Store with persistence
│   │   └── styles/             # Global styles and Tailwind CSS
│   └── .env.example
├── server/                     # Express.js REST API Backend
│   ├── src/
│   │   ├── config/             # DB and Environment variable loaders
│   │   ├── controllers/        # Auth & Business controllers
│   │   ├── middleware/         # Auth, Rate-limiting & Error handlers
│   │   ├── models/             # Mongoose schemas (User, PatientIntake, MedicalDocument)
│   │   ├── routes/             # Express API route declarations
│   │   └── server.js           # Server bootstrap & middleware chain
│   └── .env.example
├── spec.md                     # Technical Architecture & Specification Contract
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup (`server/`)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

> **Note:** If `MONGODB_URI` is not provided in `server/.env`, the server automatically starts an in-memory MongoDB instance for immediate local testing.

### 2. Frontend Setup (`client/`)

```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Environment Variables

### Backend (`server/.env`)
- `PORT`: Backend server port (Default: `5000`)
- `NODE_ENV`: `development` | `production`
- `CLIENT_URL`: Allowed CORS origin (Default: `http://localhost:3000`)
- `MONGODB_URI`: MongoDB connection string (optional in dev; falls back to in-memory)
- `JWT_SECRET`: Secret key for signing JWT tokens (min 32 chars)
- `GEMINI_API_KEY`: API key for Google Generative AI (Phase 3+)

### Frontend (`client/.env.local`)
- `NEXT_PUBLIC_API_URL`: Backend API base URL (Default: `http://localhost:5000`)

---

## 📌 Implementation Status

- [x] **Phase 1: Foundation & Authentication** (Scaffolding, MongoDB, JWT auth, Role selector, Protected routes)
- [ ] **Phase 2: Intake Flow & Document Upload Pipeline**
- [ ] **Phase 3: Chunking & RAG Vector Engine**
- [ ] **Phase 4: AI Briefing Synthesizer & Doctor Workspace**
- [ ] **Phase 5: Testing, Hardening & Deployment**
