
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  ticker: string;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysis, isLoading, ticker }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E1F20] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl ring-1 ring-[#444746] overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#303134] bg-[#1E1F20]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#A8C7FA] flex items-center justify-center shadow-md">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#060606]">
                 <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
               </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#E3E3E3]">Alpha-Vision Report</h2>
              <div className="text-sm text-[#9AA0A6]">Analisi per <span className="font-bold text-[#E3E3E3]">{ticker}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9AA0A6] hover:text-[#E3E3E3] p-2 hover:bg-[#303134] rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 text-[#C4C7C5] leading-relaxed space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="w-12 h-12 border-4 border-[#303134] border-t-[#A8C7FA] rounded-full animate-spin"></div>
              <p className="text-[#E3E3E3] font-medium">Analisi in corso...</p>
            </div>
          ) : analysis ? (
            <div className="prose prose-invert max-w-none prose-headings:text-[#A8C7FA] prose-strong:text-[#E3E3E3] prose-p:text-[#C4C7C5] prose-li:marker:text-[#A8C7FA]">
              {analysis.content.split('\n').map((line, i) => {
                // Headers
                if (line.trim().startsWith('#')) {
                   return <h3 key={i} className="text-base font-bold text-[#A8C7FA] uppercase tracking-wide mt-6 mb-2">
                     {line.replace(/#/g, '')}
                   </h3>;
                }
                // Bullet points
                if (line.trim().startsWith('-') || line.trim().startsWith('* ')) {
                    return (
                      <div key={i} className="flex items-start gap-3 mb-2">
                         <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#A8C7FA] shrink-0"></span>
                         <p className="m-0">
                            {line.replace(/^[-*]\s/, '').split('**').map((part, idx) => 
                               idx % 2 === 1 ? <strong key={idx} className="font-semibold text-white">{part}</strong> : part
                            )}
                         </p>
                      </div>
                    )
                }
                // Numbered lists
                if (/^\d+\./.test(line.trim())) {
                    return (
                       <div key={i} className="mb-4 bg-[#28292A] p-4 rounded-xl border border-[#303134]">
                          <p className="m-0 text-sm">
                            {line.split('**').map((part, idx) => 
                               idx % 2 === 1 ? <strong key={idx} className="text-[#A8C7FA] font-bold uppercase text-xs block mb-1">{part}</strong> : part
                            )}
                          </p>
                       </div>
                    )
                }
                // Standard Paragraphs
                if (line.trim().length > 0) {
                   return <p key={i} className="mb-3">
                     {line.split('**').map((part, idx) => 
                        idx % 2 === 1 ? <strong key={idx} className="text-white">{part}</strong> : part
                     )}
                   </p>;
                }
                return null;
              })}
            </div>
          ) : (
             <div className="text-center text-[#F28B82] py-10">Errore di caricamento.</div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-[#1E1F20] border-t border-[#303134] flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-[#303134] hover:bg-[#3C4043] text-[#E3E3E3] rounded-full font-medium text-sm transition-colors">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
