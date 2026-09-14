# 🛡️ Project RAKSHAK Monorepo

Project **RAKSHAK** is a full-stack, state-of-the-art security and resource node monitoring dashboard. It features a modern Next.js admin dashboard utilizing Tailwind CSS for the frontend, a Node.js/Express TypeScript backend API, and a robust PostgreSQL database layer orchestrated via Prisma ORM.

---

## 📂 Project Structure

```
rakshak-monorepo/
├── 📁 backend/                  # Node.js/Express API (TypeScript)
│   ├── 📁 prisma/               # Prisma Database Schemas & Seeds
│   │   ├── schema.prisma        # PostgreSQL Schema Definitions
│   │   └── seed.ts              # Database Seed Script
│   ├── 📁 src/                  # Express Codebase
│   │   ├── app.ts               # Core server routes & middleware
│   │   ├── db.ts                # Prisma client singleton
│   │   └── index.ts             # Server launcher (ESM)
│   ├── package.json             # Backend dependencies & Prisma commands
│   └── tsconfig.json            # Target compiler settings (ES2022/NodeNext)
│
├── 📁 frontend/                 # Next.js Dashboard (TypeScript)
│   ├── 📁 src/
│   │   └── 📁 app/              # Next.js App Router Structure
│   │       ├── globals.css      # CSS styling using Tailwind CSS v4
│   │       ├── layout.tsx       # Core page layout
│   │       └── page.tsx         # RAKSHAK Operations Center page
│   ├── next.config.js           # Next.js project settings
│   ├── package.json             # Frontend UI engines
│   └── tsconfig.json            # React compiler presets
│
├── .env.example                 # Template for shared environment variables
├── .gitignore                   # Standard exclusion filter
└── package.json                 # Monorepo Orchestration package (npm workspaces)
```

---

## ⚙️ Configuration Files Generated

1. **Root `package.json`**: Uses npm workspaces to orchestrate scripts and dependencies.
2. **Root `.env.example`**: Defines connection urls for Prisma (`DATABASE_URL`), Express server (`PORT`), and Next.js APIs (`NEXT_PUBLIC_API_URL`).
3. **Backend `package.json` & `tsconfig.json`**: Configured as an ES Module (`"type": "module"`) targeting `ES2022` with `NodeNext` resolution.
4. **Prisma Schema (`schema.prisma`)**: Configures PostgreSQL models for `User` (Admin roles), `Node` (telemetry statistics), and `Alert` (active incidents).
5. **Frontend `next.config.js`**: Standard ES module configurations.
6. **Frontend `page.tsx`**: Dynamic cyber-dashboard featuring live simulation and seamless API fallback.

---

## 🚀 Getting Started

### 1. Installation

From the root directory, install all dependencies for the entire monorepo workspace:
```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` in the root:
```bash
copy .env.example .env
```
Update your `DATABASE_URL` with your local PostgreSQL connection credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/rakshak_db?schema=public"
```

### 3. Database Layer Setup

When your PostgreSQL instance is running, generate the client and apply the migrations:
```bash
# Apply database schema changes and seed initial nodes
npm run prisma:migrate -w backend
```

---

## 💻 Running the Project

You can run the frontend, backend, or both concurrently from the root directory:

### Run Everything Concurrently (Development Mode)
```bash
npm run dev
```
- **Backend API**: Running on [http://localhost:5000/api](http://localhost:5000/api)
- **Frontend Dashboard**: Running on [http://localhost:3000](http://localhost:3000)

### Run Workspaces Individually
- **Run Backend Only**: `npm run dev -w backend`
- **Run Frontend Only**: `npm run dev -w frontend`

---

## 🖥️ Administrative Dashboard Telemetry Features

The Next.js frontend is built as a responsive **Operations Center** providing:
* **Connection Fallback**: If PostgreSQL or Express is offline, the client automatically switches to a fully interactive **Mock Mode** (marked by an indicator in the top header) so you can test features out-of-the-box.
* **Telemetry Simulation**: An integrated periodic simulation updates cpu load, ram load, and triggers warnings dynamically. (Can be toggled via the `Simulating`/`Static` button).
* **Live Incident Feed**: Chronological log of alerts which you can select and resolve.
* **System Registration**: Modal to register and monitor new nodes.
