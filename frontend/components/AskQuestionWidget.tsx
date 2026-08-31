'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  Send, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';

interface Citation {
  field: string;
  label: string;
  value: string;
  source_url: string;
  tier?: string;
}

interface QAResponse {
  answer: string;
  citations: Citation[];
  status: 'FULLY_ANSWERED' | 'PARTIALLY_ANSWERED' | 'UNANSWERED_IN_RECORD' | string;
  confidence: number;
}

interface AskQuestionWidgetProps {
  record: Record<string, string | null>;
  fieldMetadata: Record<string, any>;
}

const SAMPLE_QUESTIONS = [
  "What voltage and amperage does this dishwasher run on?",
  "What are the mounting type and water line connection requirements?",
  "Does this model support Wi-Fi smart control with Apple HomeKit?",
  "What is the operational sound level rating in decibels?",
];

export default function AskQuestionWidget({ record, fieldMetadata }: AskQuestionWidgetProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaResult, setQaResult] = useState<QAResponse | null>(null);

  const handleAsk = async (queryText?: string) => {
    const query = queryText || question;
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          record: record,
          field_metadata: fieldMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`QA request failed with status: ${response.status}`);
      }

      const data: QAResponse = await response.json();
      setQaResult(data);
    } catch (err: any) {
      alert(`QA Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Ask-It-A-Question
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
                Strict Grounded Fact Retrieval
              </span>
            </h3>
            <p className="text-xs text-slate-400">Answers queries strictly from the enriched record with zero hallucinations and exact field citations.</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>No Re-fetching • Provenance Verified</span>
        </div>
      </div>

      {/* Suggested Query Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-400 block">Suggested Questions:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(sq);
                handleAsk(sq);
              }}
              className="text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Ask anything about this product's specifications, electrical ratings, dimensions, warranty..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
        >
          {loading ? (
            <span>Retrieving...</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Ask Record</span>
            </>
          )}
        </button>
      </form>

      {/* Answer & Citation Display */}
      {qaResult && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Grounded Answer
            </span>

            {/* Status Badge */}
            {qaResult.status === 'FULLY_ANSWERED' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Fully Answered (Verified in Record)
              </span>
            )}
            {qaResult.status === 'PARTIALLY_ANSWERED' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Partially Answered (Incomplete Record)
              </span>
            )}
            {qaResult.status === 'UNANSWERED_IN_RECORD' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Not Covered in Record
              </span>
            )}
          </div>

          {/* Answer Prose */}
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            {qaResult.answer}
          </div>

          {/* Citations List */}
          {qaResult.citations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Cited Schema Fields & Verified Provenance Sources:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {qaResult.citations.map((cit, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400 font-sans">{cit.label}</span>
                      <span className="text-[10px] text-slate-500">{cit.field}</span>
                    </div>
                    <div className="text-slate-200 truncate">Value: <strong>{cit.value}</strong></div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-sans">
                      <span>Source:</span>
                      {cit.source_url.startsWith('http') ? (
                        <a
                          href={cit.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline truncate flex items-center gap-0.5"
                        >
                          <span className="truncate">{cit.source_url}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400">{cit.source_url}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
