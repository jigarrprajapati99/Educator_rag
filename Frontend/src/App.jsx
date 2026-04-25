import { useState, useRef, useEffect } from 'react';
import { chatWithAI, uploadDocuments } from './services/api';
import { Send, Paperclip, FileText, Plus, BookOpen, ChevronRight, Loader2, Bot, User } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await chatWithAI(userMessage.content);
      const aiMessage = { 
        role: 'assistant', 
        content: data.answer,
        context: data.context_used,
        time: data.query_time_seconds
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Server error. Please check your backend connection.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadStatus('Uploading...');
    try {
      const response = await uploadDocuments(files);
      setUploadStatus('Success');
      setDocuments(prev => [...prev, ...files.map(f => f.name)]);
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (error) {
      setUploadStatus('Failed');
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      
      {/* 🖤 SIDEBAR (Black Theme) */}
      <div className="w-64 bg-[#0D0D0D] text-[#EAEAEA] flex flex-col border-r border-[#1f1f1f] flex-shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-[#1f1f1f] flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-wide text-white">Educator<span className="text-blue-500">RAG</span></h1>
        </div>

        {/* New Session */}
        <div className="p-4">
          <button 
            onClick={() => setMessages([])}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#333] hover:border-blue-500 hover:text-blue-400 text-sm py-2.5 rounded-md transition-colors"
          >
            <Plus size={16} /> New Session
          </button>
        </div>

        {/* Knowledge Sources */}
        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <h2 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-3">Knowledge Base</h2>
          
          <label className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-blue-400 hover:bg-[#1a1a1a] rounded-md cursor-pointer transition-colors group">
            <Paperclip size={16} className="group-hover:text-blue-500" />
            <span>Upload PDFs</span>
            {uploadStatus === 'Uploading...' && <Loader2 size={14} className="animate-spin ml-auto" />}
            <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          <div className="mt-4 space-y-1">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 bg-[#1a1a1a] rounded-md border-l-2 border-blue-600">
                <FileText size={14} className="text-blue-500 flex-shrink-0" />
                <span className="truncate">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1f1f1f] text-xs text-gray-500">
          <p>System Status: <span className="text-green-500">Online</span></p>
        </div>
      </div>

      {/* 🤍 MAIN CHAT AREA (White Theme) */}
      <div className="flex-1 flex flex-col relative bg-white">
        
        {/* Chat Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20 flex flex-col items-center animate-fade-in">
                <BookOpen size={48} className="text-blue-100 mb-4" />
                <h2 className="text-xl font-medium text-gray-700">Ready to Learn?</h2>
                <p className="mt-2 text-sm max-w-sm text-gray-500">Upload your course materials to the knowledge base and ask me anything to get started.</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-100 text-blue-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  {/* Message Content */}
                  <div className="flex flex-col gap-2">
                    <div className={`p-4 text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-[#F5F5F5] text-black rounded-2xl rounded-tr-sm' : 'bg-white text-black border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                      {msg.content}
                    </div>

                    {/* RAG Component: Source Transparency */}
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
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Bot size={16} />
                 </div>
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

        {/* ⌨️ FLOATING INPUT BOX */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-6">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">Educator RAG can make mistakes. Consider verifying important information.</p>
        </div>

      </div>
    </div>
  );
}