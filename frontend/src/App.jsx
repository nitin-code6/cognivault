import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, UploadCloud, MessageSquare, Shield, Activity, HardDrive, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to Cognivault. Upload a document or ask a question to begin.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.filter(m => m.role !== 'system') // pass history context
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection to AI Service failed.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus(`Uploading ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadStatus(`Success! Extracted ${data.metadata.total_chunks} chunks.`);
      } else {
        setUploadStatus(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      setUploadStatus('Upload failed (Network Error)');
    }
    
    setTimeout(() => setUploadStatus(''), 5000);
  };

  return (
    <div className="flex h-screen bg-brand-dark text-slate-200">
      
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-slate-700/50 bg-brand-surface/40 p-4 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 py-4 text-brand-blue font-bold text-xl tracking-tight">
          <Shield className="w-8 h-8" />
          COGNIVAULT
        </div>
        
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-3 p-3 rounded-lg bg-brand-blue/10 text-brand-blue font-medium transition-colors cursor-pointer">
            <MessageSquare className="w-5 h-5" /> Chat Interface
          </button>
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 text-slate-400 font-medium transition-colors cursor-pointer">
            <HardDrive className="w-5 h-5" /> Knowledge Base
          </button>
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 text-slate-400 font-medium transition-colors cursor-pointer">
            <Activity className="w-5 h-5" /> AI Evaluation
          </button>
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 text-slate-400 font-medium transition-colors cursor-pointer">
            <LayoutDashboard className="w-5 h-5" /> System Logs
          </button>
        </nav>
        
        <div className="mt-auto p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-blue" />
            Ingest Document
          </h3>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 hover:border-brand-blue/50 transition-all group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-8 h-8 mb-2 text-slate-400 group-hover:text-brand-blue transition-colors" />
              <p className="text-xs text-slate-400">PDFs Only</p>
            </div>
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
          </label>
          {uploadStatus && (
            <p className="mt-2 text-xs text-center text-brand-blue font-medium animate-pulse">{uploadStatus}</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-brand-dark to-slate-900">
        
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-700/50 flex items-center px-8 bg-brand-surface/20 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-slate-200">Secure AI Assistant</h2>
          <div className="ml-auto flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            System Online
          </div>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-5 shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-brand-blue text-white rounded-br-sm border border-blue-400/30' 
                  : 'bg-brand-surface text-slate-200 rounded-bl-sm border border-slate-600/30'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-brand-blue font-bold text-xs uppercase tracking-wider">
                    <Shield className="w-3 h-3" /> Cognivault AI
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-brand-surface rounded-2xl p-4 rounded-bl-sm border border-slate-600/30 flex items-center gap-2">
                 <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-6 bg-brand-surface/30 backdrop-blur-md border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto relative group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about your documents or company policies..."
              className="w-full bg-slate-800/50 border border-slate-600/50 text-slate-200 rounded-xl pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all shadow-inner placeholder:text-slate-500"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-blue hover:bg-blue-600 disabled:bg-slate-700 text-white rounded-lg transition-all shadow-lg hover:shadow-brand-blue/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-3">
            AI-generated responses may be inaccurate. Please verify critical information.
          </p>
        </div>
        
      </div>
    </div>
  );
}
