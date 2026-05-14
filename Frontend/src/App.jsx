import { useState, useRef, useEffect } from 'react';
import { chatWithAI, uploadDocuments, getSessions, getSessionDetails, deleteSession, renameSession, getDocuments, deleteDocument } from './services/api'; 
import useAuthStore from './store/useAuthStore';
import Auth from './components/Auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Paperclip, FileText, Plus, BookOpen, ChevronRight, Loader2, Bot, User, LogOut, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';

export default function App() {
  const { user, logout } = useAuthStore();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Knowledge Base State
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Renaming State
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchDocs();
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleDeleteDocument = async (id) => {
    try {
      setUploadStatus('Deleting...');
      await deleteDocument(id);
      fetchDocs(); // Refresh the sidebar
      setUploadStatus('Deleted');
      setTimeout(() => setUploadStatus(''), 2000);
    } catch (error) {
      console.error("Error deleting document", error);
      setUploadStatus('Failed to delete');
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions", error);
    }
  };

  const fetchDocs = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents", error);
    }
  };

  const loadSession = async (id) => {
    try {
      const session = await getSessionDetails(id);
      setCurrentSessionId(session.id);
      setMessages(session.messages);
    } catch (error) {
      console.error("Error loading session", error);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      if (currentSessionId === id) createNewSession();
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session", error);
    }
  };

  const handleStartRename = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = async (id, e) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await renameSession(id, editTitle);
      setEditingSessionId(null);
      fetchSessions();
    } catch (error) {
      console.error("Error renaming session", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await chatWithAI(userMessage.content, currentSessionId);
      
      if (!currentSessionId) {
        setCurrentSessionId(data.session_id);
        fetchSessions();
      }

      const aiMessage = { 
        role: 'assistant', 
        content: data.answer,
        context: data.context_used,
        time: data.query_time_seconds
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Server error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadStatus('Uploading...');
    try {
      await uploadDocuments(files);
      setUploadStatus('Success');
      fetchDocs(); // Refresh from DB!
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (error) {
      setUploadStatus('Failed');
    }
  };

  if (!user) return <Auth />;

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      
      {/* 🖤 SIDEBAR */}
      <div className="w-64 bg-[#0D0D0D] text-[#EAEAEA] flex flex-col border-r border-[#1f1f1f] flex-shrink-0">
        
        <div className="p-5 border-b border-[#1f1f1f] flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-wide text-white">Educator<span className="text-blue-500">RAG</span></h1>
        </div>

        <div className="p-4">
          <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#333] hover:border-blue-500 hover:text-blue-400 text-sm py-2.5 rounded-md transition-colors">
            <Plus size={16} /> New Session
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Recent Chats</h2>
          <div className="space-y-1 mb-6">
            {sessions.map((s) => (
              <div 
                key={s.id} 
                onClick={() => loadSession(s.id)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors group ${currentSessionId === s.id ? 'bg-[#1a1a1a] text-blue-400 border-l-2 border-blue-600' : 'text-gray-400 hover:text-blue-400 hover:bg-[#1a1a1a]'}`}
              >
                {editingSessionId === s.id ? (
                  <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(s.id, e)}
                      autoFocus
                      className="bg-[#2a2a2a] text-white px-2 py-1 rounded w-full text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={(e) => handleSaveRename(s.id, e)} className="text-green-500 hover:text-green-400"><Check size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-gray-500 hover:text-gray-400"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare size={14} className="flex-shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleStartRename(s, e)} className="text-gray-500 hover:text-blue-400"><Pencil size={14} /></button>
                      <button onClick={(e) => handleDeleteSession(s.id, e)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3 flex items-center justify-between">
            Knowledge Base
            {uploadStatus === 'Uploading...' && <Loader2 size={12} className="animate-spin text-blue-500" />}
          </h2>
          <label className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-blue-400 hover:bg-[#1a1a1a] rounded-md cursor-pointer transition-colors group mb-2 border border-dashed border-[#333] hover:border-blue-500">
            <Paperclip size={16} className="group-hover:text-blue-500" />
            <span>Upload PDFs</span>
            <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
          
          {/* Display Mongo Documents */}
          <div className="space-y-1 mb-6">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-3 py-2 text-xs text-gray-400 bg-[#141414] rounded-md group hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={12} className="text-blue-500 flex-shrink-0" />
                  <span className="truncate" title={doc.filename}>{doc.filename}</span>
                </div>
                <button 
                  onClick={() => handleDeleteDocument(doc.id)} 
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Document"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
      </div>
        {/* Profile Footer */}
        <div className="p-4 border-t border-[#1f1f1f] flex items-center justify-between">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 overflow-hidden text-left hover:bg-[#1a1a1a] p-1.5 -ml-1.5 rounded-lg transition-colors flex-1 group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-blue-800 transition-colors">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-white truncate">{user?.name}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </button>
          
          <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2 transition-colors flex-shrink-0" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

      </div>

      {/* 🤍 MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        
        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20 flex flex-col items-center animate-fade-in">
                <BookOpen size={48} className="text-blue-100 mb-4" />
                <h2 className="text-xl font-medium text-gray-700">Welcome back, {user?.name}!</h2>
                <p className="mt-2 text-sm max-w-sm text-gray-500">Ask a question to start a new chat, or select a previous session from the sidebar.</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-100 text-blue-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    {msg.role === 'user' ? (
                      <div className="p-4 text-[15px] leading-relaxed bg-[#F5F5F5] text-black rounded-2xl rounded-tr-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="p-4 bg-white text-black border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
                        <div className="prose prose-sm prose-gray max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-800 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:shadow-inner prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-blue-300 prose-blockquote:text-gray-600 prose-table:text-sm prose-th:bg-gray-50 prose-th:text-gray-700 prose-td:text-gray-600">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {msg.context && msg.context.length > 0 && (
                      <details className="mt-1 group">
                        <summary className="flex items-center gap-1 text-xs font-medium text-blue-600 cursor-pointer hover:underline select-none list-none">
                          <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                          View {msg.context.length} Retrieved Source(s) ({msg.time}s)
                        </summary>
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-100 py-1">
                          {msg.context.map((chunk, i) => (
                            <div key={i} className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100 leading-relaxed">
                              "{chunk}"
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-4 animate-fade-in">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Bot size={16} /></div>
                 <div className="flex gap-1 items-center bg-white border border-gray-100 shadow-sm p-4 rounded-2xl rounded-tl-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ⌨️ INPUT BOX — static at bottom, never overlaps */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 pt-4 pb-5">
          <div className="max-w-3xl mx-auto relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl bg-white border border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about your knowledge base..."
              disabled={isLoading}
              className="w-full pl-5 pr-14 py-4 bg-transparent outline-none text-[15px] text-gray-800 placeholder-gray-400"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">Educator RAG can make mistakes. Consider verifying important information.</p>
        </div>

      </div>
      {/* 👤 USER PROFILE MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              onClick={() => setIsProfileOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg"><User className="text-blue-600" size={20}/></div>
              Account Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 font-medium">{user?.name}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 font-medium">{user?.email}</div>
              </div>
              
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => { setIsProfileOpen(false); logout(); }} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-semibold"
              >
                <LogOut size={16}/> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}