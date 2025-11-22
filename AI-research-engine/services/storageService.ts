
import { ChatSession, ChatMessage } from '../types';

const STORAGE_KEY = 'lumina_knowledge_engine_db_v1';

// Simulate Database Schema
interface DBSchema {
  sessions: ChatSession[];
}

// Helper: Get DB State
const getDB = (): DBSchema => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { sessions: [] };
  } catch (e) {
    console.error("Database Error:", e);
    return { sessions: [] };
  }
};

// Helper: Save DB State
const saveDB = (db: DBSchema) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Database Save Error:", e);
  }
};

export const storageService = {
  // --- Logic Layer: Session Management ---

  getAllSessions: (): ChatSession[] => {
    const db = getDB();
    // Sort by last updated (newest first)
    return db.sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
  },

  getSessionById: (id: string): ChatSession | undefined => {
    const db = getDB();
    return db.sessions.find(s => s.id === id);
  },

  createSession: (session: ChatSession) => {
    const db = getDB();
    // Prevent duplicate IDs
    if (!db.sessions.find(s => s.id === session.id)) {
        db.sessions.push(session);
        saveDB(db);
    }
  },

  updateSession: (id: string, updates: Partial<ChatSession>) => {
    const db = getDB();
    const index = db.sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      db.sessions[index] = { 
          ...db.sessions[index], 
          ...updates, 
          lastUpdated: Date.now() 
      };
      saveDB(db);
    }
  },

  deleteSession: (id: string) => {
      const db = getDB();
      db.sessions = db.sessions.filter(s => s.id !== id);
      saveDB(db);
  },

  // --- Logic Layer: Message Appender ---
  
  addMessageToSession: (sessionId: string, message: ChatMessage) => {
      const db = getDB();
      const session = db.sessions.find(s => s.id === sessionId);
      if (session) {
          session.messages.push(message);
          session.lastUpdated = Date.now();
          saveDB(db);
      }
  }
};
