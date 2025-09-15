# NeuroChat Backend - How to Run

## Prerequisites

*   **Node.js:** Version 16+
*   **npm:** Comes with Node.js
*   **Redis Server:** For task queue and caching
*   **MongoDB (Optional):** For persistent data

## How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update the values:
*   `PORT`: Server port (default: `12000`)
*   `OPENROUTER_API_KEY`: Your OpenRouter API key
*   `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`)
*   `MONGODB_URL`: MongoDB connection URL (default: `mongodb://localhost:27017/enhanced-ai-pipeline`)

### 3. Run Required Services
Ensure Redis and MongoDB are running:
*   **Redis:** `redis-server`
*   **MongoDB (Optional):** `mongod`

### 4. Run the Application
*   **Development:** `npm run dev`
*   **Production:** `npm start`

The backend will be available on the configured port (default `12000`).

