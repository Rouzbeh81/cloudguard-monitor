
import React, { useState } from 'react';
import { SummaryReport } from '../types';
import { X, Sparkles, ExternalLink, Globe, CheckCircle } from 'lucide-react';

interface SummaryModalProps {
  report: SummaryReport;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(report.executiveSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="summary-title">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="summary-title" className="font-bold text-slate-900">AI Intelligent Digest</h3>
              <p className="text-xs text-slate-500">Analysis completed at {new Date(report.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              Executive Summary
            </h4>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-slate-700 text-sm leading-relaxed">
              {report.executiveSummary}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-600 rounded-full"></div>
              Grounding Sources
            </h4>
            <div className="space-y-2">
              {report.sources.length > 0 ? (
                report.sources.map((source, i) => (
                  <a 
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate">{source.title}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  </a>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No direct links available for this report.</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl text-white">
            <h5 className="text-xs font-bold uppercase opacity-60 mb-2">Technical Insight</h5>
            <p className="text-sm leading-relaxed">
              Based on the latest roadmap data, there is a significant trend towards AI integration in Microsoft 365 services and cost-optimization features in Azure Compute.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            Dismiss
          </button>
          <button 
            onClick={handleCopy}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all shadow-lg flex items-center gap-2 ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              'Copy Summary'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
