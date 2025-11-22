
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings2, ArrowRight, Sparkles } from 'lucide-react';
import { generateStreamingResponse, performMockSearch } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { SearchConfig, MessageRole, ChatSession, ChatMessage } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [config, setConfig] = useState<SearchConfig>({ depth: 'quick', focus: 'all' });
  const [isSearching, setIsSearching] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Store transient result to pass to DB
  const [transientSources, setTransientSources] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setShowResults(true);
    setQuickAnswer('');

    // 1. Fetch Results (Retrieval Module)
    const sources = await performMockSearch(query);
    setTransientSources(sources);

    // 2. Start AI Stream (Model Layer)
    const systemPrompt = `You are a helpful AI assistant. Provide a concise, 2-sentence summary answer to: "${query}".`;

    await generateStreamingResponse(
      systemPrompt,
      [],
      sources,
      (chunk) => {
        setQuickAnswer(prev => prev + chunk);
      }
    );

    setIsSearching(false);
  };

  const goToDeepDive = () => {
    // Logic Layer: Create Session in DB before navigation
    const sessionId = `sess_${Date.now()}`;
    const initialUserMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: MessageRole.USER,
      content: query,
      timestamp: Date.now()
    };

    const initialAiMsg: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      role: MessageRole.AI,
      content: quickAnswer,
      timestamp: Date.now(),
      relatedSources: transientSources
    };

    const newSession: ChatSession = {
      id: sessionId,
      title: query,
      lastUpdated: Date.now(),
      messages: quickAnswer ? [initialUserMsg, initialAiMsg] : [initialUserMsg],
      sources: transientSources
    };

    storageService.createSession(newSession);

    // Pass ID only, ChatPage will fetch from DB
    navigate('/chat', { state: { sessionId: sessionId } });
  };

  const handleConfigClick = (category: string) => {
    setConfig(prev => ({ ...prev, focus: category.toLowerCase() as any }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-violet-50/50">
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-8">

        {/* Branding */}
        <div className="space-y-2 animate-fade-in">
          <div className="inline-flex items-center justify-center p-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-transparent bg-clip-text text-xs font-bold px-3 py-1 uppercase tracking-widest">
              Lumina Engine 4.0
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 tracking-tight">
            Know <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">Everything.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            The knowledge engine that thinks with you. Powered by local Qwen3 & Gemini.
          </p>
        </div>

        {/* Search Box */}
        <div className="w-full group relative z-10 animate-slide-up">
          <div className={`
            absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200
          `}></div>
          <form onSubmit={handleSearch} className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-violet-100/50 p-2 border border-slate-100">
            <div className="pl-4 text-slate-400">
              <Search size={24} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything complex..."
              className="flex-1 bg-transparent border-none outline-none text-lg p-4 text-slate-800 placeholder-slate-400 font-medium"
            />

            {/* Mock Config Trigger */}
            <button type="button" className="p-3 text-slate-400 hover:text-violet-600 transition-colors rounded-xl hover:bg-slate-50 mr-2">
              <Settings2 size={20} />
            </button>

            <button
              type="submit"
              disabled={isSearching || !query}
              className="bg-slate-900 text-white p-4 rounded-xl hover:bg-slate-800 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {isSearching ? 'Thinking...' : 'Search'}
              {!isSearching && <ArrowRight size={18} />}
            </button>
          </form>
        </div>

        {/* Quick Answer Preview Card */}
        {showResults && (
          <div className="w-full animate-fade-in mt-8 text-left">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/40">
              <div className="flex items-center gap-2 mb-3 text-violet-600 font-semibold">
                <Sparkles size={18} className="animate-pulse" />
                <span>Quick Overview</span>
              </div>
              <div className="min-h-[60px]">
                {quickAnswer ? (
                  <MarkdownRenderer content={quickAnswer} className="text-slate-700 leading-relaxed" />
                ) : (
                  <div className="flex space-x-2 animate-pulse">
                    <div className="h-2 w-full bg-slate-200 rounded"></div>
                    <div className="h-2 w-2/3 bg-slate-200 rounded"></div>
                  </div>
                )}
              </div>

              {/* Deep Dive Action */}
              {!isSearching && quickAnswer && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={goToDeepDive}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl font-medium transition-colors text-sm"
                  >
                    <span>Open AI Deep Dive</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Config Tags */}
        {!showResults && (
          <div className="flex gap-3 flex-wrap justify-center animate-fade-in opacity-80">
            {['Academic', 'Coding', 'Financial', 'Creative'].map(tag => (
              <button
                key={tag}
                onClick={() => handleConfigClick(tag)}
                className={`px-4 py-2 border text-sm font-medium rounded-full transition-all duration-200
                            ${config.focus === tag.toLowerCase()
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'}
                        `}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
