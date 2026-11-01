# Procurement AI — Frontend

A modern, responsive Angular frontend for the **Procurement AI Assistant**. It connects to a LangGraph/FastAPI backend to deliver real-time insights on procurement data, spending analytics, and orders.

---

## ✨ Features

- **Real-Time Streaming**: Token-by-token SSE streaming with smooth loading and typing indicators.
- **Database Query Inspector**: View and copy generated MongoDB queries and aggregation pipelines directly under assistant responses.
- **Dark / Light Theme**: One-click theme toggle with persistent storage and system preference detection.
- **Quick Prompts**: Interactive starter queries to explore data instantly.
- **Thread Continuity**: Preserves conversation context across messages via thread IDs.

---

## 🛠 Tech Stack

- **Framework**: Angular 22 (Standalone Components & Signals)
- **Styling**: SCSS with design tokens (inspired by Linear & Vercel)


---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- Backend running at `http://localhost:8000`

### Installation

```bash
# Clone the repository and navigate into the folder
cd procurement-ai-frontend

# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm start
```

Navigate to `http://localhost:4200/`. The app will automatically reload on source changes.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Runs the app in development mode on port 4200 |
| `npm run build` | Compiles the production build into `dist/` |

