import React, { useState } from 'react';
import VitalsBadge from './VitalsBadge';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Activity, 
  Loader2, 
  RefreshCw, 
  ListChecks, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';

/**
 * ClinicalSummaryCard Component
 * @param {Object} props
 * @param {Object} props.aiSummary - Structured AI SOAP summary
 * @param {Function} props.onGenerate - Callback to trigger/refresh AI summary
 * @param {boolean} [props.isGenerating=false] - Generating loading state
 * @param {boolean} [props.canEdit=true] - Can trigger generation
 */
const ClinicalSummaryCard = ({
  aiSummary,
  onGenerate,
  isGenerating = false,
  canEdit = true,
}) => {
  const [completedActions, setCompletedActions] = useState({});

  const toggleAction = (idx) => {
    setCompletedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const hasSummary =
    aiSummary &&
    (aiSummary.chiefComplaint ||
      aiSummary.historyOfPresentIllness ||
      (aiSummary.flaggedRisks && aiSummary.flaggedRisks.length > 0));

  const vitals = aiSummary?.extractedVitals || {};
  const vitalKeys = Object.keys(vitals).filter((k) => Boolean(vitals[k]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold mb-1 border border-cyan-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            AI SOAP Pre-Consultation Briefing
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
            Synthesized Clinical Summary
          </h3>
          {aiSummary?.generatedAt && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Generated on {new Date(aiSummary.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing SOAP...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{hasSummary ? 'Refresh Briefing' : 'Generate AI Briefing'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Body */}
      {!hasSummary ? (
        <div className="p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              AI SOAP Briefing Not Yet Generated
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the button above to extract lab metrics, analyze symptoms, flag clinical risks, and synthesize a doctor-ready briefing.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Generate Briefing Now
            </button>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-6 flex-1">
          {/* Flagged Clinical Risks Alerts */}
          {aiSummary.flaggedRisks && aiSummary.flaggedRisks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Flagged Clinical Alerts ({aiSummary.flaggedRisks.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {aiSummary.flaggedRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-red-50/90 border border-red-200 flex items-start gap-2.5 text-red-900 text-xs font-medium"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Vitals Grid */}
          {vitalKeys.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-cyan-600" />
                <span>Extracted Vitals & Lab Trends</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {vitalKeys.map((k) => (
                  <VitalsBadge key={k} vitalKey={k} value={vitals[k]} />
                ))}
              </div>
            </div>
          )}

          {/* Chief Complaint & HPI */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Subjective: Chief Complaint
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                {aiSummary.chiefComplaint || 'None provided'}
              </div>
            </div>

            {aiSummary.historyOfPresentIllness && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  History of Present Illness (HPI)
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {aiSummary.historyOfPresentIllness}
                </div>
              </div>
            )}
          </div>

          {/* Clinician Action Checklist */}
          {aiSummary.suggestedActions && aiSummary.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-900 uppercase tracking-wider">
                <ListChecks className="w-4 h-4 text-cyan-600" />
                <span>Suggested Action Checklist</span>
              </div>
              <div className="space-y-2">
                {aiSummary.suggestedActions.map((action, idx) => {
                  const isDone = Boolean(completedActions[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through'
                          : 'bg-white border-slate-200 hover:border-cyan-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-xs">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-slate-50'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-medium">{action}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClinicalSummaryCard;
