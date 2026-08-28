import React, { useState } from 'react';
import api from '../services/api';
import { 
  Search, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Layers 
} from 'lucide-react';

/**
 * RAGChunkPreview Component - Real-time vector search testing widget
 * @param {Object} props
 * @param {string} props.intakeId - Patient intake ID
 * @param {number} [props.documentCount=0] - Number of uploaded documents
 */
const RAGChunkPreview = ({ intakeId, documentCount = 0 }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await api.post(`/api/intake/${intakeId}/query-chunks`, {
        query: query.trim(),
        topK: 4,
      });
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Vector search error:', err);
      setError(
        err.response?.data?.message ||
        'Vector similarity search failed. Ensure documents are uploaded.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 0.5) return 'text-cyan-700 bg-cyan-50 border-cyan-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  if (documentCount === 0) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-center">
        <p className="text-xs text-slate-500">
          No medical documents attached to this intake yet. Upload PDF records to enable vector similarity search.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50/40 to-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Vector Search & RAG Chunk Explorer
            </h4>
            <p className="text-[11px] text-slate-500">
              Cosine-similarity retrieval across extracted clinical PDF chunks
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
          Phase 3 Active
        </span>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, lab metrics (e.g. 'glucose', 'allergies', 'blood pressure')..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 flex-shrink-0"
        >
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Search Vector Chunks</span>
        </button>
      </form>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List */}
      {hasSearched && !isSearching && (
        <div className="space-y-2 pt-1 animate-fade-in">
          {results.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No matching clinical excerpts found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Top Matching Clinical Excerpts ({results.length})</span>
                <span className="text-cyan-700 lowercase font-normal">ranked by cosine similarity</span>
              </div>

              {results.map((item, idx) => (
                <div
                  key={`${item.documentId}-${item.chunkIndex}-${idx}`}
                  className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 hover:border-cyan-300 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800 truncate" title={item.fileName}>
                        {item.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        (Chunk #{item.chunkIndex + 1})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(
                        item.similarityScore
                      )}`}
                    >
                      Cosine: {(item.similarityScore * 100).toFixed(1)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-sans">
                    {item.chunkText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RAGChunkPreview;
