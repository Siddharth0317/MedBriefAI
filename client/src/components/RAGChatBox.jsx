import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { 
  Send, 
  Bot, 
  User, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What abnormal lab values or vitals are present?',
  'Are there any drug allergy warnings?',
  'What is the symptom timeline and duration?',
  'Summarize the key recommendations for this patient',
];

/**
 * RAGChatBox Component - Doctor interactive consultation drawer
 * @param {Object} props
 * @param {string} props.intakeId
 * @param {number} [props.documentCount=0]
 */
const RAGChatBox = ({ intakeId, documentCount = 0 }) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello, Doctor. I am your RAG Clinical Assistant. Ask any questions regarding this patient’s symptoms, medical history, or uploaded PDF lab reports. All answers are grounded with source citations.',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openCitations, setOpenCitations] = useState({});

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleCitation = (msgId) => {
    setOpenCitations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSendMessage = async (queryText) => {
    const q = (queryText || inputText).trim();
    if (!q || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post(`/api/intake/${intakeId}/chat`, {
        message: q,
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.data.answer,
        citations: res.data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('RAG Chat error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to get answer from clinical assistant.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              RAG Clinical Assistant
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                Grounded
              </span>
            </h4>
            <p className="text-[10px] text-slate-500">
              Querying {documentCount} attached PDF document(s)
            </p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[420px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-start gap-2 max-w-[90%]">
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Citations section if present */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => toggleCitation(msg.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:text-cyan-800"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{msg.citations.length} Source Citation(s)</span>
                      {openCitations[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {openCitations[msg.id] && (
                      <div className="mt-2 space-y-1.5 animate-fade-in">
                        {msg.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-800 text-[10px] mb-1">
                              <span>
                                {c.documentName || 'Document'} (Chunk #{c.chunkIndex + 1})
                              </span>
                              {c.similarityScore && (
                                <span className="text-cyan-600">
                                  Score: {(c.similarityScore * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <p className="italic text-slate-500 bg-slate-50 p-1.5 rounded">
                              &ldquo;{c.excerpt}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1 text-right ${
                    msg.role === 'user' ? 'text-cyan-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
            <span>Consulting patient document vector chunks...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mb-1.5">
          <HelpCircle className="w-3 h-3" />
          <span>Suggested Questions:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="text-[10px] bg-white border border-slate-200 hover:border-cyan-400 hover:text-cyan-700 text-slate-600 px-2.5 py-1 rounded-lg transition text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 bg-white">
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-50 text-red-700 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything about this patient's records..."
            disabled={isLoading}
            className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl disabled:opacity-50 transition shadow-sm flex items-center justify-center flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RAGChatBox;
