# System Design & Architecture

## 1. High-Level Architecture

The **AI Research Engine** follows a modern **Client-Server** architecture, designed for local deployment with privacy and modularity in mind.

### Core Components:
1.  **Frontend (Client)**: A Single Page Application (SPA) built with **React** and **TypeScript**. It handles user interaction, chat rendering, and state management.
2.  **Backend (Server)**: A RESTful API built with **FastAPI (Python)**. It orchestrates the AI logic, memory management, and external service integration.
3.  **Data Layer**: **MySQL** database for persistent storage of conversations, messages, and citations.
4.  **AI Layer**: **Ollama** for local Large Language Model (LLM) inference.
5.  **Retrieval Layer**: **DuckDuckGo** for web search and **Sentence Transformers** (optional) for reranking.

```mermaid
graph TD
    subgraph Client ["Frontend (React)"]
        UI[User Interface]
        API_Client[API Service]
    end

    subgraph Server ["Backend (FastAPI)"]
        Router[API Router]
        subgraph Services
            Memory[Memory Service]
            RAG[RAG Service]
            LLM_S[LLM Service]
        end
    end

    subgraph Infrastructure
        DB[(MySQL Database)]
        Ollama[Ollama (Local LLM)]
        DDG[DuckDuckGo Search]
    end

    UI --> API_Client
    API_Client -- HTTP/JSON --> Router
    Router --> Memory
    Router --> RAG
    Router --> LLM_S
    
    Memory -- SQL --> DB
    RAG -- HTTP --> DDG
    LLM_S -- HTTP --> Ollama
```

## 2. Sequence Diagram: Chat Flow

This diagram illustrates the lifecycle of a user message, from the frontend request to the final AI response with citations.

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend
    participant BE as Backend API
    participant RAG as RAG Service
    participant DB as MySQL
    participant LLM as Ollama

    User->>FE: Sends Message ("What is X?")
    FE->>BE: POST /api/chat {message, conversation_id}
    
    activate BE
    BE->>DB: Load Conversation History
    
    par Retrieval Phase
        BE->>RAG: search(query)
        RAG->>RAG: DuckDuckGo Search
        RAG-->>BE: Return Search Results
        BE->>RAG: rerank(query, results)
        RAG-->>BE: Return Top-K Relevant Docs
    end
    
    BE->>BE: Construct Prompt (System + Context + History)
    
    BE->>LLM: Invoke(Prompt)
    activate LLM
    LLM-->>BE: Stream/Return Response
    deactivate LLM
    
    par Persistence Phase
        BE->>DB: Save User Message
        BE->>DB: Save AI Response
        BE->>DB: Save Sources (Citations)
    end
    
    BE-->>FE: Return JSON {response, sources, id}
    deactivate BE
    
    FE->>User: Display Answer & Citations
```

## 3. Backend Class Design

The backend is structured around modular services.

```mermaid
classDiagram
    class ChatRequest {
        +str message
        +str conversation_id
    }
    
    class ChatResponse {
        +str response
        +str conversation_id
        +List[SourceModel] sources
    }

    class MemoryService {
        +create_conversation(db, title)
        +get_history(db, conversation_id)
        +add_message(db, conversation_id, role, content)
    }

    class RAGService {
        +search(query, num_results)
        +rerank(query, documents)
    }

    class LLMService {
        +get_llm()
    }
    
    class MySQLChatMessageHistory {
        +session_id: str
        +messages: List[BaseMessage]
        +add_message(message)
    }

    class Conversation {
        +String id
        +String title
        +DateTime created_at
    }

    class Message {
        +Integer id
        +String conversation_id
        +String role
        +String content
    }

    MemoryService ..> Conversation : manages
    MemoryService ..> Message : manages
    MySQLChatMessageHistory --|> BaseChatMessageHistory
    MySQLChatMessageHistory ..> Message : persists
```

## 4. Database Schema

```mermaid
erDiagram
    CONVERSATION ||--|{ MESSAGE : contains
    MESSAGE ||--|{ SOURCE : has

    CONVERSATION {
        string id PK
        string title
        datetime created_at
    }

    MESSAGE {
        int id PK
        string conversation_id FK
        string role
        text content
        datetime created_at
    }

    SOURCE {
        int id PK
        int message_id FK
        string url
        string title
        text snippet
    }
```
