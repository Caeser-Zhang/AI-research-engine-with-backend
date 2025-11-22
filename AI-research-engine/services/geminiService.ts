import { SearchSource } from "../types";

const API_BASE_URL = "http://localhost:8000/api";

// --- AI Interface Module ---
export const generateStreamingResponse = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[],
  sources: SearchSource[],
  onChunk: (text: string) => void,
  conversationId?: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
        conversation_id: conversationId
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // The backend returns { response: string, conversation_id: int, sources: ... }
    // We pass the full text to onChunk
    onChunk(data.response);

    // We also get sources back from the backend! 
    // The current frontend logic fetches sources BEFORE calling this.
    // This is a bit of a mismatch. 
    // The backend does RAG internally.
    // The frontend does "performMockSearch" then calls "generateStreamingResponse".

    // To align with the user's request "backend... contains... retrieval module",
    // we should rely on the backend for search.

  } catch (error) {
    console.error("Backend API Error:", error);
    onChunk("\n\n[System Error: Unable to connect to the Backend API. Please ensure the Python server is running.]");
  }
};

// --- Retrieval & Rerank Module ---
export const performMockSearch = async (query: string): Promise<SearchSource[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
      }),
    });

    if (!response.ok) {
      console.warn(`Search API Error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Map backend SourceModel to frontend SearchSource
    return data.map((s: any, index: number) => ({
      id: `src_${Date.now()}_${index}`,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      date: new Date().toISOString(), // Backend doesn't return date yet, use current
      sourceType: 'web' // Default to web
    }));

  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};
