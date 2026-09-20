# BillSplit India 🇮🇳⚡

> **Stop doing the math after the meal.**

An AI-powered bill splitting and settlement application designed specifically for Indian Gen-Z users. Built for the IQOO Hackathon.

---

## 🎯 What it does

1. **Scan any restaurant bill** → AI extracts items, prices, tax, and totals
2. **Tell AI who had what** → "Rahul had biryani and coke. Kanishk had paneer."
3. **AI assigns items** → Creates exact individual shares (not simple ÷)
4. **Minimum Settlement Engine** → Calculates fewest payments to settle everyone
5. **SplitBot AI** → Real chatbot that reads and modifies your actual data
6. **Human approval always** → AI prepares reminders, you decide to send

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (custom design system) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT (7-day tokens) |
| Deploy FE | Vercel |
| Deploy BE | Render |
| DB Host | Supabase / Railway |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted)
- Google Gemini API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, CORS_ORIGIN
pnpm install
pnpm run db:push     # Push schema to database
pnpm run dev         # Start dev server on :3001
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001
pnpm install
pnpm run dev         # Start on :5173
```

---

## 📁 Project Structure

```
IQOO HACKATHON/
├── backend/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/
│   │   │   ├── aiService.ts       # Gemini AI integration
│   │   │   └── settlementEngine.ts # Min-transaction algorithm
│   │   ├── middleware/     # Auth, error handling
│   │   └── lib/            # Prisma client
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── render.yaml         # Render deployment
└── frontend/
    ├── src/
    │   ├── pages/          # 10 main pages
    │   ├── components/     # Reusable UI components
    │   ├── api/            # Typed API client
    │   ├── store/          # Auth context
    │   ├── styles/         # CSS design system
    │   └── utils/          # Indian formatting, helpers
    └── vercel.json         # Vercel deployment
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/dashboard | Dashboard data |
| GET | /api/groups | List groups |
| POST | /api/groups | Create group |
| GET | /api/groups/:id | Group detail + balances |
| POST | /api/bills/scan | Upload + OCR bill |
| POST | /api/bills | Create bill |
| POST | /api/bills/:id/assign | Assign items to people |
| GET | /api/settlements/group/:id | Calculate min settlements |
| POST | /api/ai/chat | SplitBot chat |
| POST | /api/ai/assign | NL assignment parsing |
| POST | /api/reminders | Create reminder |
| POST | /api/reminders/:id/send | Send (user approved) |

---

## 🧮 Settlement Algorithm

The **Minimum Settlement Engine** uses a greedy algorithm:

1. Calculate each person's net balance (paid - owed)
2. Separate into **creditors** (positive) and **debtors** (negative)
3. Sort both by amount (descending)
4. Match largest debtor → largest creditor
5. Result: minimum possible number of transfers

**Example:**
- 5 people in a group
- Naive: 10 transactions needed
- Optimized: 4 transactions

---

## 🤖 AI Features

### Bill OCR (Gemini Vision)
- Uploads image to Gemini 1.5 Flash
- Extracts items, quantities, prices, GST, service charge, tip
- Returns confidence score (high/medium/low)
- User can edit before confirming

### SplitBot Chat
- Maintains conversation history
- Has context of current group/bill/balances
- Returns structured actions for the app to execute
- **Human approval required** for reminders and payments

### Natural Language Assignment
- "Rahul had biryani and coke. Kanishk had paneer."
- Fuzzy matches names and items
- Returns structured assignments for the UI

---

## 🌐 Deployment

### Vercel (Frontend)

1. Import repo to Vercel
2. Set environment variable: `VITE_API_URL=https://your-render-url.onrender.com`
3. Deploy

### Render (Backend)

1. Create Web Service from repo
2. Root directory: `backend`
3. Build command: `node node_modules/typescript/bin/tsc`
4. Start command: `node dist/index.js`
5. Set all env vars from `.env.example`

### Database (Supabase)

1. Create PostgreSQL project on Supabase
2. Copy connection string
3. Set as `DATABASE_URL` in Render
4. Run `pnpm run db:push` locally with the Supabase URL to create tables

---

## 📱 Pages

1. **Landing** — Hero, features, how it works, CTA
2. **Auth** — Login/Register with toggle
3. **Dashboard** — Balance stats, quick actions, recent bills
4. **Groups** — Create and list groups
5. **Group Detail** — Bills, member balances, add members
6. **Scan Bill** — Upload/manual entry, AI extraction, item editor
7. **Bill Detail** — Receipt display with assignments
8. **Assign People** — Item-to-person assignment with AI assist
9. **Settlement Center** — Min-transaction plan + reminder flow
10. **AI Copilot** — Full SplitBot chat interface
11. **Profile** — User info, logout

---

## 🎨 Design Philosophy

- **Dark mode first** — Deep charcoal background (#0A0A0F)
- **Primary**: Electric violet (#7C3AED)
- **Accent**: Neon green (#10B981)
- **Typography**: Space Grotesk (display) + Inter (body)
- **Glassmorphism cards** with subtle borders
- **Micro-animations** for interactions
- **Mobile-first** responsive — 360px to 1440px+

---

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=min-32-chars-secret
GEMINI_API_KEY=AIzaSy...
CORS_ORIGIN=https://your-vercel-app.vercel.app
PORT=3001
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://your-render-url.onrender.com
```

---

## 📄 License

MIT — Built for IQOO Hackathon 2026
