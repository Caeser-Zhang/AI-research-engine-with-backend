export enum MessageRole {
  USER = 'user',
  AI = 'model',
}

export interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  date: string; // ISO date string
  sourceType: 'blog' | 'news' | 'academic' | 'forum';
  selected?: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  relatedSources?: SearchSource[]; // Sources used for this specific answer
  isStreaming?: boolean;
  rating?: 'up' | 'down' | null; // New: For Like/Dislike
}

export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: number;
  messages: ChatMessage[];
  sources: SearchSource[]; // New: Store sources per session
}

export interface SearchConfig {
  depth: 'quick' | 'deep';
  focus: 'all' | 'academic' | 'coding' | 'social';
}

// Filter State Types
export type SourceTypeFilter = 'blog' | 'news' | 'academic' | 'forum';
export type TimeFilter = 'any' | 'day' | 'week' | 'month' | 'year';
export type SortOption = 'relevance' | 'date';
