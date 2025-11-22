
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Search, Clock, ChevronRight, Send,
    RefreshCw, Filter, ThumbsUp, ThumbsDown, List,
    Calendar, ArrowUpDown, Layers, CheckSquare, BookOpen, Globe, MessageCircle, FileText
} from 'lucide-react';
import { SearchSource, ChatSession, ChatMessage, MessageRole, SourceTypeFilter, TimeFilter, SortOption } from '../types';
import { performMockSearch, generateStreamingResponse } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SearchResultCard } from '../components/SearchResultCard';

const ChatPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const bottomRef = useRef<HTMLDivElement>(null);

    // --- State: Data Layer ---
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sources, setSources] = useState<SearchSource[]>([]);

    // --- State: Interaction ---
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);

    // --- State: Filtering & UI ---
    const [activeTab, setActiveTab] = useState<'sources' | 'details'>('sources');
    const [selectedSourceTypes, setSelectedSourceTypes] = useState<SourceTypeFilter[]>(['blog', 'news', 'academic', 'forum']);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('any');
    const [sortOrder, setSortOrder] = useState<SortOption>('relevance');
    const [isFilterOpen, setIsFilterOpen] = useState(true);

    // --- Lifecycle: Initialization ---
    useEffect(() => {
        refreshSessions();

        const state = location.state as { sessionId?: string } | null;

        if (state?.sessionId) {
            loadSessionFromDB(state.sessionId);
        } else {
            // Load most recent session if available
            const all = storageService.getAllSessions();
            if (all.length > 0) {
                loadSessionFromDB(all[0].id);
            } else {
                // No sessions at all? Maybe prompt user
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll on message update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Logic Layer: Data Access ---

    const refreshSessions = () => {
        setSessions(storageService.getAllSessions());
    };

    const loadSessionFromDB = (sessionId: string) => {
        const session = storageService.getSessionById(sessionId);
        if (session) {
            setActiveSessionId(session.id);
            setMessages(session.messages);
            setSources(session.sources || []);
            // Reset Filters when loading a session to ensure user sees sources
            setSelectedSourceTypes(['blog', 'news', 'academic', 'forum']);
            setTimeFilter('any');
        }
    };

    const createNewSession = () => {
        setActiveSessionId(null);
        setMessages([]);
        setSources([]);
        setInput('');
        navigate('/');
    };

    // --- Logic Layer: AI Interaction ---

    const handleSend = async (
        text: string = input,
        contextSources: SearchSource[] = activeSources,
        existingMessages: ChatMessage[] = messages
    ) => {
        if (!text.trim() || isGenerating) return;

        // 1. Create or Get Session ID
        let currentSessionId = activeSessionId;
        let currentSources = contextSources;

        // If sending a message in a "clean" state without navigating from Home (edge case), create session
        if (!currentSessionId) {
            const newSessionId = `sess_${Date.now()}`;
            const fetchedSources = await performMockSearch(text);
            currentSources = fetchedSources;

            const newSession: ChatSession = {
                id: newSessionId,
                title: text,
                lastUpdated: Date.now(),
                messages: [],
                sources: fetchedSources
            };
            storageService.createSession(newSession);
            currentSessionId = newSessionId;
            setActiveSessionId(newSessionId);
            setSources(fetchedSources);
            refreshSessions();
        }

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}_u`,
            role: MessageRole.USER,
            content: text,
            timestamp: Date.now()
        };

        // Optimistic UI Update
        const updatedMessages = [...existingMessages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsGenerating(true);

        // Persist User Message
        if (currentSessionId) storageService.addMessageToSession(currentSessionId, userMsg);

        // AI Placeholder
        const aiMsgId = `msg_${Date.now()}_a`;
        setMessages(prev => [...prev, {
            id: aiMsgId,
            role: MessageRole.AI,
            content: '',
            timestamp: Date.now(),
            isStreaming: true
        }]);

        // Prepare History for API (Langchain Memory Logic Simulation)
        const historyForApi = updatedMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        let fullContent = '';
        const sourcesToUse = currentSources.filter(s => s.selected !== false);

        // Stream Response
        await generateStreamingResponse(text, historyForApi, sourcesToUse, (chunk) => {
            fullContent += chunk;
            setMessages(prev => prev.map(m =>
                m.id === aiMsgId
                    ? { ...m, content: fullContent }
                    : m
            ));
        }, currentSessionId || undefined);

        // Finalize AI Message
        const finalizedAiMsg: ChatMessage = {
            id: aiMsgId,
            role: MessageRole.AI,
            content: fullContent,
            timestamp: Date.now(),
            isStreaming: false,
            relatedSources: sourcesToUse
        };

        setMessages(prev => prev.map(m => m.id === aiMsgId ? finalizedAiMsg : m));

        // Persist AI Message
        if (currentSessionId) {
            storageService.addMessageToSession(currentSessionId, finalizedAiMsg);
            refreshSessions(); // Update sidebar list order
        }

        setIsGenerating(false);
    };

    const handleRegenerateFromMessage = (aiMessageId: string) => {
        if (isGenerating) return;
        const msgIndex = messages.findIndex(m => m.id === aiMessageId);
        if (msgIndex <= 0) return;

        const userMsg = messages[msgIndex - 1];
        if (userMsg.role !== MessageRole.USER) return;

        // Rollback in UI
        const rollbackMessages = messages.slice(0, msgIndex - 1); // Remove User msg + AI msg
        setMessages(rollbackMessages);

        // Note: In a real app, we might want to delete these from DB or mark them as "overwritten"
        // For this demo, we just append the new path to the DB as if it continues, 
        // or we could implement `storageService.deleteMessagesAfter(...)`

        // Retrigger Send with user content
        handleSend(userMsg.content, activeSources, rollbackMessages);
    };

    const handleRateMessage = (msgId: string, rating: 'up' | 'down') => {
        setMessages(prev => prev.map(m =>
            m.id === msgId
                ? { ...m, rating: m.rating === rating ? null : rating }
                : m
        ));
        // In real app, update this rating in DB
    };

    // --- Interaction: Sources ---

    const handleSourceClick = (sourceId: string) => {
        setActiveTab('sources');
        setHighlightedSourceId(sourceId);
        // Ensure it's visible if filtered out
        const source = sources.find(s => s.id === sourceId);
        if (source && !selectedSourceTypes.includes(source.sourceType)) {
            setSelectedSourceTypes(prev => [...prev, source.sourceType]);
        }
    };

    const toggleSourceSelection = (id: string) => {
        const newSources = sources.map(s => s.id === id ? { ...s, selected: !s.selected } : s);
        setSources(newSources);
        if (activeSessionId) {
            storageService.updateSession(activeSessionId, { sources: newSources });
        }
    };

    // --- Filtering Logic ---

    const filteredSources = sources.filter(source => {
        if (!selectedSourceTypes.includes(source.sourceType)) return false;
        const date = new Date(source.date).getTime();
        const now = Date.now();
        const day = 86400000;
        if (timeFilter === 'day' && (now - date) > day) return false;
        if (timeFilter === 'week' && (now - date) > day * 7) return false;
        if (timeFilter === 'month' && (now - date) > day * 30) return false;
        if (timeFilter === 'year' && (now - date) > day * 365) return false;
        return true;
    });

    const activeSources = [...filteredSources].sort((a, b) => {
        // Handle highlighted source by putting it first or just using highlight prop
        if (sortOrder === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
        return 0;
    });

    const toggleSourceType = (type: SourceTypeFilter) => {
        setSelectedSourceTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // --- Helper Icons ---
    const getSourceIcon = (type: string) => {
        switch (type) {
            case 'academic': return <BookOpen size={12} />;
            case 'news': return <Globe size={12} />;
            case 'forum': return <MessageCircle size={12} />;
            default: return <FileText size={12} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">

            {/* Left Sidebar - History (Collapsible) */}
            <div className="w-20 hover:w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-30 shadow-sm transition-all duration-300 ease-in-out group/sidebar relative">
                {/* Header */}
                <div className="h-20 flex items-center px-5 border-b border-slate-100 cursor-pointer whitespace-nowrap" onClick={() => navigate('/')}>
                    <div className="min-w-[36px] w-9 h-9 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-violet-200">
                        L
                    </div>
                    <span className="ml-3 font-display font-bold text-xl text-slate-800 tracking-tight opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 overflow-hidden">
                        Lumina
                    </span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 overflow-x-hidden">
                    <button
                        onClick={createNewSession}
                        className="w-full flex items-center px-3 py-3 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 rounded-xl border border-transparent hover:border-violet-100 transition-all group mb-6 whitespace-nowrap"
                    >
                        <div className="min-w-[32px] flex justify-center">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <MessageSquare size={16} className="text-violet-500" />
                            </div>
                        </div>
                        <span className="ml-3 opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 overflow-hidden">
                            New Research
                        </span>
                    </button>

                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Recent Chats
                    </div>

                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => loadSessionFromDB(session.id)}
                            className={`w-full flex items-center px-3 py-3 text-sm rounded-xl transition-all text-left group relative whitespace-nowrap
                        ${activeSessionId === session.id
                                    ? 'bg-white shadow-md shadow-slate-100 border border-slate-100 text-violet-700 font-medium'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }
                    `}
                        >
                            <div className="min-w-[24px] flex justify-center">
                                <Clock size={18} className={`${activeSessionId === session.id ? 'text-violet-500' : 'opacity-40 group-hover:opacity-70'}`} />
                            </div>
                            <span className="ml-3 truncate flex-1 opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 overflow-hidden">
                                {session.title}
                            </span>
                            {activeSessionId === session.id && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-500 opacity-0 group-hover/sidebar:opacity-100 transition-opacity"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 whitespace-nowrap">
                    <div className="flex items-center p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="min-w-[36px] w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm">
                            JD
                        </div>
                        <div className="ml-3 flex-1 min-w-0 opacity-0 w-0 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 transition-all duration-300 overflow-hidden">
                            <div className="font-semibold text-slate-700 text-sm truncate">John Doe</div>
                            <div className="text-xs text-slate-400">Pro Member</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Center - Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-white/50">

                {/* Chat Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-slate-400"><Search size={18} /></span>
                        <h2 className="font-semibold text-slate-800 truncate text-lg">
                            {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title : 'New Conversation'}
                        </h2>
                    </div>
                </header>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div key={msg.id} className={`flex gap-4 md:gap-6 max-w-3xl mx-auto animate-fade-in group ${msg.role === MessageRole.USER ? 'flex-row-reverse' : ''}`}>

                            {/* Avatar */}
                            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shadow-lg transform transition-transform hover:scale-110
                        ${msg.role === MessageRole.AI
                                    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600'
                                    : 'bg-slate-800'}
                    `}>
                                {msg.role === MessageRole.AI ? <Search size={16} /> : <span className="font-bold">Y</span>}
                            </div>

                            {/* Message Content */}
                            <div className={`flex flex-col min-w-0 max-w-[85%] ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-2xl p-5 shadow-sm border text-base leading-relaxed w-full overflow-hidden
                            ${msg.role === MessageRole.USER
                                        ? 'bg-slate-800 text-white border-slate-700 rounded-tr-none'
                                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none shadow-md shadow-slate-100/50'}
                        `}>
                                    <MarkdownRenderer content={msg.content} className={msg.role === MessageRole.USER ? 'text-white/90' : 'text-slate-700'} />

                                    {/* Streaming Cursor */}
                                    {msg.isStreaming && (
                                        <span className="inline-block w-2 h-4 ml-1 bg-violet-500 animate-pulse align-middle"></span>
                                    )}
                                </div>

                                {/* Compact Source References (Inside Chat Stream) */}
                                {msg.role === MessageRole.AI && msg.relatedSources && msg.relatedSources.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {msg.relatedSources.slice(0, 4).map((src, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSourceClick(src.id)}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg hover:border-violet-300 hover:shadow-sm transition-all group/chip"
                                            >
                                                <div className="text-slate-400 group-hover/chip:text-violet-500">
                                                    {getSourceIcon(src.sourceType)}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 group-hover/chip:text-violet-600">{i + 1}</span>
                                                <span className="text-[10px] text-slate-400 max-w-[100px] truncate group-hover/chip:text-slate-600">{src.title}</span>
                                            </button>
                                        ))}
                                        {msg.relatedSources.length > 4 && (
                                            <span className="text-[10px] text-slate-400 py-1 px-1">+{msg.relatedSources.length - 4} more</span>
                                        )}
                                    </div>
                                )}

                                {/* AI Actions */}
                                {msg.role === MessageRole.AI && !msg.isStreaming && (
                                    <div className="flex items-center gap-3 mt-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="flex bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                                            <button
                                                onClick={() => handleRateMessage(msg.id, 'up')}
                                                className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${msg.rating === 'up' ? 'text-green-500' : 'text-slate-400'}`}
                                            >
                                                <ThumbsUp size={14} />
                                            </button>
                                            <div className="w-px bg-slate-200 my-1"></div>
                                            <button
                                                onClick={() => handleRateMessage(msg.id, 'down')}
                                                className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${msg.rating === 'down' ? 'text-red-500' : 'text-slate-400'}`}
                                            >
                                                <ThumbsDown size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => handleRegenerateFromMessage(msg.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 rounded-full text-xs font-medium shadow-sm transition-all"
                                        >
                                            <RefreshCw size={12} />
                                            Regenerate
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 max-w-3xl mx-auto w-full z-20">
                    <div className="relative bg-white rounded-2xl shadow-xl shadow-violet-100/50 border border-slate-200 overflow-hidden ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask a follow-up..."
                            className="w-full p-4 max-h-32 bg-transparent border-none outline-none resize-none text-slate-700 placeholder-slate-400 font-medium text-base"
                            rows={1}
                            disabled={isGenerating}
                        />
                        <div className="flex items-center justify-between px-4 pb-3 bg-white/50">
                            <div className="flex gap-2 text-xs text-slate-400 font-medium px-2">
                                {activeSources.length > 0 ? (
                                    <span className="flex items-center gap-1 text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                                        <CheckSquare size={12} /> Using {activeSources.filter(s => s.selected !== false).length} sources
                                    </span>
                                ) : (
                                    <span>No sources selected</span>
                                )}
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isGenerating}
                                className={`p-2.5 rounded-xl transition-all duration-200 ${input.trim() && !isGenerating
                                        ? 'bg-violet-600 text-white hover:bg-violet-700 hover:scale-105 shadow-md shadow-violet-200'
                                        : 'bg-slate-100 text-slate-300'
                                    }`}
                            >
                                {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400">AI can make mistakes. Check sources.</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Retrieval & Config */}
            <div className="w-80 bg-white border-l border-slate-200 hidden xl:flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
                {/* Tabs */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex gap-1 p-1.5 bg-slate-100/80 rounded-xl">
                        <button
                            onClick={() => setActiveTab('sources')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'sources' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Results
                        </button>
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'details' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Details
                        </button>
                    </div>
                </div>

                {/* Filter Panel (Collapsible) */}
                {activeTab === 'sources' && (
                    <div className="border-b border-slate-100 bg-slate-50/50">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-500 uppercase hover:bg-slate-100 transition-colors"
                        >
                            <span className="flex items-center gap-2"><Filter size={14} /> Configuration</span>
                            <ChevronRight size={14} className={`transform transition-transform ${isFilterOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <div className="px-4 pb-4 space-y-4 animate-slide-up">
                                {/* Source Types */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 mb-2 block">SOURCE TYPES</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['blog', 'news', 'academic', 'forum'] as SourceTypeFilter[]).map(type => (
                                            <label key={type} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSourceTypes.includes(type)}
                                                    onChange={() => toggleSourceType(type)}
                                                    className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                                                />
                                                <span className="capitalize">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Time & Sort */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">TIME RANGE</label>
                                        <div className="relative">
                                            <select
                                                value={timeFilter}
                                                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                                                className="w-full appearance-none bg-white border border-slate-200 text-xs text-slate-700 py-1.5 pl-2 pr-6 rounded-lg focus:outline-none focus:border-violet-400"
                                            >
                                                <option value="any">Any time</option>
                                                <option value="day">Past 24h</option>
                                                <option value="week">Past Week</option>
                                                <option value="month">Past Month</option>
                                                <option value="year">Past Year</option>
                                            </select>
                                            <Calendar size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">SORT BY</label>
                                        <div className="relative">
                                            <select
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value as SortOption)}
                                                className="w-full appearance-none bg-white border border-slate-200 text-xs text-slate-700 py-1.5 pl-2 pr-6 rounded-lg focus:outline-none focus:border-violet-400"
                                            >
                                                <option value="relevance">Relevance</option>
                                                <option value="date">Newest</option>
                                            </select>
                                            <ArrowUpDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {activeTab === 'sources' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-slate-400">FOUND {activeSources.length} RESULTS</span>
                                <button className="text-violet-600 text-xs font-medium hover:underline">Select All</button>
                            </div>

                            {activeSources.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                                    <Layers size={24} className="mb-2 opacity-50" />
                                    <p>No matching sources</p>
                                    <button onClick={() => { setSelectedSourceTypes(['blog', 'news', 'academic', 'forum']); setTimeFilter('any'); }} className="text-violet-500 font-medium mt-2 hover:underline">Clear filters</button>
                                </div>
                            ) : (
                                activeSources.map(source => (
                                    <SearchResultCard
                                        key={source.id}
                                        source={source}
                                        selectable
                                        selected={source.selected !== false}
                                        onToggle={toggleSourceSelection}
                                        // Highlight visual
                                        isHighlighted={highlightedSourceId === source.id}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-5 rounded-2xl text-white shadow-lg shadow-violet-200">
                                <h4 className="font-bold text-lg mb-1">AI Mode: Active</h4>
                                <p className="text-white/80 text-sm">Engine v4.0 • Hybrid RAG</p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Session Stats</h4>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex justify-between items-center">
                                        <span className="text-slate-600">Messages</span>
                                        <span className="font-mono font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">{messages.length}</span>
                                    </li>
                                    <li className="flex justify-between items-center">
                                        <span className="text-slate-600">Sources Scanned</span>
                                        <span className="font-mono font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">{sources.length}</span>
                                    </li>
                                    <li className="flex justify-between items-center">
                                        <span className="text-slate-600">Context Window</span>
                                        <span className="font-mono font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">4k / 128k</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
