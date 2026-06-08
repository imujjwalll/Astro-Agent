# AstroAgent 🌟

> An AI-powered astrology assistant using real Swiss Ephemeris planetary calculations, LangGraph agent orchestration, and streaming conversational AI.

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-purple)](https://langchain-ai.github.io/langgraphjs/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green)](https://mongodb.com)

---

## Features

- 🔭 **Real Swiss Ephemeris** — Precise planetary positions via `sweph` (N-API native C library)
- 🌍 **City Geocoding** — OpenStreetMap + `geo-tz` for accurate timezone detection
- 🤖 **LangGraph Agent** — Reasoning → Router → Tool loop with GPT-4o-mini
- 💾 **MongoDB Memory** — Persistent conversation history via `MongoDBSaver` (per threadId)
- 📡 **SSE Streaming** — Token-by-token responses with real-time tool execution badges
- ✨ **Modern UI** — Deep space glassmorphism theme, animated stars, auto-scroll chat

---

## Architecture

```
Frontend (React + Vite + Tailwind)
       ↓ SSE / REST
Backend (Express + TypeScript)
       ↓
LangGraph StateGraph (GPT-4o-mini)
  ├── geocode_city tool  → OpenStreetMap + geo-tz
  └── compute_birth_chart tool → Swiss Ephemeris (sweph)
       ↓
MongoDB (profiles + LangGraph checkpoints)
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.0 |
| npm | ≥ 9.0 |
| MongoDB | Local or Atlas |
| OpenAI API Key | GPT-4o-mini access |
| Python / node-gyp | For `sweph` native bindings |

> **Windows users**: Install [node-gyp prerequisites](https://github.com/nodejs/node-gyp#on-windows):
> ```powershell
> npm install --global windows-build-tools
> # or install Visual Studio Build Tools
> ```

---

## Quick Start

### 1. Clone & Configure

```bash
cd astro-agent

# Copy and fill environment variables
copy .env.example .env   # Windows
# cp .env.example .env    # Mac/Linux
```

Edit `.env`:
```env
OPENROUTER_API_KEY=sk-...your-key...
MONGODB_URI=mongodb://localhost:27017/astroagent
PORT=3001
```

### 2. Start MongoDB

```bash
# Local MongoDB
mongod --dbpath ./data

# Or use MongoDB Atlas — update MONGODB_URI in .env
```

### 3. Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
✅ MongoDB connected
✅ Native MongoDB client connected
✅ LangGraph compiled with MongoDBSaver
🚀 AstroAgent backend running on http://localhost:3001
```

### 4. Install & Run Frontend

```bash
# New terminal
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## API Reference

### `POST /api/profile`

Save or update a user birth profile.

**Request:**
```json
{
  "threadId": "uuid-string",
  "name": "Priya Sharma",
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "birthCity": "Mumbai",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "timezone": "Asia/Kolkata"
}
```

**Response:**
```json
{ "success": true, "profile": { "threadId": "...", "name": "Priya Sharma", ... } }
```

---

### `GET /api/profile/:threadId`

Fetch a user profile by thread ID.

---

### `POST /api/chat`

Stream an AI astrology response via SSE.

**Request:**
```json
{ "message": "What is my sun sign?", "threadId": "uuid-string" }
```

**SSE Events:**

| Event | Data | Description |
|-------|------|-------------|
| `token` | `{ content: string }` | Streaming AI token |
| `tool_start` | `{ tool: string, input: object }` | Tool execution started |
| `tool_end` | `{ tool: string, success: boolean }` | Tool execution completed |
| `done` | `{ finished: true }` | Stream complete |
| `error` | `{ message: string }` | Error occurred |

---

## LangGraph Agent

### State

```typescript
{
  messages: BaseMessage[];   // Conversation history (append reducer)
  userProfile: UserProfile | null;  // Birth profile
  birthChart: BirthChart | null;    // Computed chart cache
}
```

### Tools

**`geocode_city`**
- Input: `{ city: string }`
- Uses: node-geocoder (OpenStreetMap) + geo-tz
- Output: `{ city, latitude, longitude, timezone, country }`

**`compute_birth_chart`**
- Input: `{ date, time, latitude, longitude, timezone }`
- Uses: sweph `swe_calc_ut()` + `swe_houses()` (Placidus)
- Output: Full planetary positions, houses, ascendant, midheaven

### Graph Flow

```
START → reasoning → [tool_calls?] → tools → reasoning → END
                        ↓ no
                       END
```

---

## Project Structure

```
astro-agent/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app, routes, SSE
│   │   ├── db/
│   │   │   └── mongo.ts          # Mongoose + UserProfile model
│   │   ├── tools/
│   │   │   ├── geocoder.ts       # Geocoder LangChain tool
│   │   │   ├── ephemeris.ts      # Swiss Ephemeris tool
│   │   │   └── index.ts          # Tool exports
│   │   └── graph/
│   │       ├── state.ts          # LangGraph state annotation
│   │       ├── nodes.ts          # Reasoning, Tool, Router nodes
│   │       └── agent.ts          # Compiled StateGraph
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router
│   │   ├── main.tsx              # Entry point
│   │   ├── index.css             # Global styles
│   │   ├── components/
│   │   │   ├── StarBackground.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ToolBadge.tsx
│   │   │   ├── TypingIndicator.tsx
│   │   │   └── OnboardingForm.tsx
│   │   ├── hooks/
│   │   │   └── useChatStream.ts  # SSE streaming hook
│   │   └── pages/
│   │       ├── OnboardingPage.tsx
│   │       └── ChatPage.tsx
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
├── evals/
│   ├── golden_set.jsonl          # 25 test cases
│   ├── runner.ts                 # Eval runner
│   └── SCORECARD.md              # Auto-generated results
├── .env.example
├── README.md
└── EVALUATION.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ | — | OpenAI API key |
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017/astroagent` | MongoDB connection string |
| `PORT` | ❌ | `3001` | Backend port |
| `NODE_ENV` | ❌ | `development` | Environment |
| `VITE_API_URL` | ❌ | `` (proxy) | Frontend API base URL |

---

## Troubleshooting

### `sweph` native module fails to install

```bash
# Windows — install build tools
npm install --global windows-build-tools
# or install VS Build Tools 2022 from Microsoft

# Then retry
npm install sweph
```

### MongoDB connection fails

```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service (Windows)
net start MongoDB

# Or use MongoDB Atlas and update MONGODB_URI
```

### SSE stream doesn't work behind proxy

Add to your reverse proxy config:
```nginx
proxy_buffering off;
proxy_cache off;
add_header X-Accel-Buffering no;
```

---

## Development

```bash
# Backend type checking
cd backend && npm run typecheck

# Frontend build
cd frontend && npm run build

# Run evaluation suite
cd evals && npx ts-node runner.ts
```

---

## License

MIT © AstroAgent Contributors
