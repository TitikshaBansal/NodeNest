
# NodeNest - AI Workflow Builder

NodeNest is a visual, node-based AI workflow platform for building, managing, and executing complex AI pipelines with parallel execution and convergence nodes. Built with Next.js, Trigger.dev, React Flow, and Prisma, it enables drag-and-drop orchestration of AI, image, and video processing tasks.

---

## 🚀 Features

- **Visual Drag-and-Drop Builder** (React Flow)
- **Parallel Branch Execution** & Convergence Nodes
- **DAG-Based Execution** (cycle detection, topological sort)
- **Node Types:**
  - 📝 Text Node
  - 🖼️ Upload Image Node (Transloadit)
  - 🎥 Upload Video Node (Transloadit)
  - 🤖 LLM Node (Google Gemini, vision support)
  - ✂️ Crop Image Node (FFmpeg via Trigger.dev)
  - 🎬 Extract Frame Node (FFmpeg via Trigger.dev)
- **Real-Time Execution Status** (pulsating glow)
- **Node-Level History & Workflow History Panel**
- **Workflow Persistence** (PostgreSQL + Prisma)
- **Export/Import Workflows as JSON**
- **API Routes with Zod Validation**
- **Clerk Authentication** (Google OAuth, email/password)
- **Background Jobs** (Trigger.dev)
- **Media Uploads** (Transloadit)
- **TypeScript, Tailwind CSS, Zustand**

---

## 📸 Screenshots

<div align="center">
  <img src="public/screenshots/landing.png" alt="Landing Page" width="80%">
</div>

---

## 🛠️ Installation Guide

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase/Neon recommended)
- Clerk account (authentication)
- Google AI Studio API Key (Gemini)
- Trigger.dev account (background jobs)
- Transloadit account (media uploads)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/NodeNest.git
cd NodeNest
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Trigger.dev
TRIGGER_PROJECT_ID=proj_...
TRIGGER_SECRET_KEY=tr_dev_...

# Google Gemini API
GEMINI_API_KEY=AIza...

# Transloadit
TRANSLOADIT_AUTH_KEY=...
TRANSLOADIT_AUTH_SECRET=...

# Next.js (Optional)
NODE_ENV=development
```

See [ENV_CHECKLIST.md](ENV_CHECKLIST.md) for details on obtaining API keys.

### 3. Database Setup

```bash
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Run migrations
# or
npm run db:push          # Push schema directly (quick setup)
npm run db:studio        # Open Prisma Studio (http://localhost:5555)
```

### 4. Clerk Webhook Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Your App → Webhooks
2. Add endpoint: `http://localhost:3000/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `.env.local` as `CLERK_WEBHOOK_SECRET`

### 5. Running the App

**Terminal 1:**
```bash
npm run dev
# App at http://localhost:3000
```
**Terminal 2:**
```bash
npx trigger.dev@latest dev
# Background job processor
```

---

## 🌐 Deployment (Vercel)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com/new), set environment variables
3. Update Clerk webhook to `https://your-vercel-domain.vercel.app/api/webhooks/clerk`
4. Deploy Trigger.dev: `npx trigger.dev@latest deploy`

---

## 📁 Project Structure

```
NodeNest/
├── src/
│   ├── app/           # Next.js App Router & API routes
│   ├── components/    # UI components (nodes, landing, canvas, sidebar)
│   ├── lib/           # DAG engine, Prisma, Transloadit, etc.
│   ├── trigger/       # Trigger.dev entry & tasks
│   ├── store/         # Zustand workflow state
│   └── types/         # TypeScript types
├── prisma/            # Prisma schema & migrations
├── public/            # Static assets
├── trigger.config.ts  # Trigger.dev config
└── package.json
```

---

## ✨ Usage

1. **Sign In** (Clerk)
2. **Create Workflow** (Dashboard → Create New Workflow)
3. **Add Nodes** (drag from sidebar)
4. **Connect Nodes** (drag handles)
5. **Configure Nodes** (click to edit)
6. **Run Workflow** (top toolbar)
7. **View Progress** (pulsating glow, history panel)
8. **Export/Import** (JSON)

**Node Types:**
- Text, Upload Image, Upload Video, LLM, Crop Image, Extract Frame

**Run Options:**
- Run single node, full workflow, or selected nodes

---

## 🔑 API Endpoints

| Method | Endpoint                        | Description                       |
|--------|----------------------------------|-----------------------------------|
| POST   | `/api/webhooks/clerk`           | Clerk webhook handler              |
| POST   | `/api/gemini`                   | Gemini LLM proxy                   |
| POST   | `/api/upload`                   | Transloadit upload handler         |
| GET    | `/api/workflows`                | List user workflows                |
| POST   | `/api/workflows`                | Create new workflow                |
| GET    | `/api/workflows/[id]`           | Get workflow by ID                 |
| PUT    | `/api/workflows/[id]`           | Update workflow                    |
| DELETE | `/api/workflows/[id]`           | Delete workflow                    |
| POST   | `/api/workflows/[id]/run`       | Execute workflow                   |

---

## 🐛 Troubleshooting

- **Invalid response from server:**
  - Check database connection, run `npm run db:generate` and `npm run db:push`, verify `DATABASE_URL`.
- **User not found:**
  - Check Clerk webhook secret and endpoint URL.
- **Workflows don't execute:**
  - Ensure Trigger.dev dev server is running.
- **Media uploads fail:**
  - Verify Transloadit credentials.
- **LLM nodes don't run:**
  - Check Gemini API key and quota.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit and push your changes
4. Open a Pull Request

---

## 📄 License

MIT License

---

<div align="center">
  <strong>⭐ Star this repo if you found it helpful!</strong>
</div>
