# AI Research Engine

A powerful, local AI research assistant that combines **RAG (Retrieval-Augmented Generation)** with a modern **React frontend** and a robust **Python FastAPI backend**.

## 🚀 Features

-   **Hybrid RAG System**: Fetches real-time information from the web (DuckDuckGo) and reranks results for high relevance.
-   **Local LLM Support**: Fully integrated with **Ollama** (default: `qwen3:14b`) for privacy-focused, local inference.
-   **Persistent Memory**: Stores conversation history and sources in **MySQL**, managed via **LangChain**.
-   **Modern UI**: Responsive React interface built with Vite and TailwindCSS.
-   **Source Citations**: AI responses include direct references to the sources used.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Styling**: TailwindCSS
-   **Icons**: Lucide React

### Backend
-   **Framework**: FastAPI (Python 3.10+)
-   **Database**: MySQL (SQLAlchemy ORM)
-   **AI Orchestration**: LangChain
-   **Search**: DuckDuckGo Search (`duckduckgo-search`)
-   **Reranking**: `sentence-transformers` (Optional)

## 📋 Prerequisites

-   **Node.js** (v16+)
-   **Python** (v3.10+)
-   **MySQL Server**
-   **Ollama** (Running locally)
    -   Pull the model: `ollama pull qwen3:14b`

## ⚡ Quick Start

### 1. Database Setup
Create a MySQL database named `lumina_search`.

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

Create a `.env` file:
```ini
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_SERVER=localhost
MYSQL_PORT=3306
MYSQL_DB=lumina_search
OLLAMA_BASE_URL=http://localhost:11434
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Initialize the database:
```bash
python -m app.init_db
```

Run the server:
```bash
python -m app.main
```
*Server runs on `http://localhost:8000`*

### 3. Frontend Setup
Navigate to the `AI-research-engine` directory:
```bash
cd AI-research-engine
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
*App runs on `http://localhost:3001`*

## 📝 Usage

1.  Open the frontend URL.
2.  Type a query (e.g., "Latest advancements in quantum computing").
3.  The system will:
    -   Search the web.
    -   Rerank results.
    -   Generate an answer using the local LLM.
    -   Save the conversation to the database.

## 🤝 Contributing

Feel free to submit issues and pull requests.

## 📄 License

MIT
