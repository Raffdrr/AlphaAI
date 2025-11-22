
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  results: AnalysisResult[];
  isLoading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ isOpen, onClose, results, isLoading }) => {
  const gridCols = results.length > 1 ? (results.length >= 3 ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1';

  return (
    <div 
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col max-h-[85vh] shadow-[0_-10px_80px_rgba(0,0,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Drag Handle */}
      <div className="h-12 w-full flex justify-center items-center absolute -top-12 cursor-pointer group" onClick={onClose}>
         <div className="w-16 h-1.5 bg-zinc-600 rounded-full group-hover:bg-white transition-colors shadow-lg"></div>
      </div>

      <div className="bg-black rounded-t-[2rem] flex flex-col h-full border-t border-zinc-800 overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 border-b border-zinc-900 bg-black shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                 <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
               </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Alpha-Vision Report</h2>
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                {isLoading ? 'Elaborazione AI...' : `Report completo per ${results.length} asset`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-black">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full space-y-8 min-h-[400px]">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-zinc-900 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,1)]"></div>
                  </div>
                </div>
                <p className="text-zinc-300 font-medium animate-pulse tracking-wide uppercase text-sm">Generazione insights in corso...</p>
             </div>
          ) : (
            <div className={`grid ${gridCols} gap-16 divide-y divide-zinc-900 md:divide-y-0 md:divide-x`}>
               {results.map((res, idx) => (
                  <div key={idx} className={`flex flex-col ${idx > 0 ? 'pt-10 md:pt-0 md:pl-16' : ''}`}>
                     <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900/50">
                        <div className="flex items-center gap-4">
                           <span className="text-4xl font-bold text-white tracking-tighter">{res.ticker}</span>
                           <span className="bg-blue-600 text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20">AI Analysis</span>
                        </div>
                     </div>
                     
                     <div className="prose prose-invert max-w-none leading-relaxed text-zinc-300">
                        {res.content.split('\n').map((line, i) => {
                          // Headers
                          if (line.trim().startsWith('#') || line.includes('Analisi') || line.includes('Verdetto')) {
                             const text = line.replace(/#/g, '').replace(/\*\*/g, '');
                             return <h3 key={i} className="text-sm font-extrabold text-blue-400 uppercase tracking-widest mt-8 mb-4 flex items-center gap-3">
                               <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                               {text}
                             </h3>;
                          }
                          // Lists
                          if (line.trim().startsWith('-') || line.trim().startsWith('* ')) {
                              return (
                                <div key={i} className="flex items-start gap-3 mb-3 pl-2">
                                   <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0"></span>
                                   <span className="text-zinc-300 leading-7">
                                      {line.replace(/^[-*]\s/, '').split('**').map((part, idx2) => 
                                         idx2 % 2 === 1 ? <strong key={idx2} className="text-white font-semibold border-b border-zinc-700 pb-0.5">{part}</strong> : part
                                      )}
                                   </span>
                                </div>
                              )
                          }
                          // Numbered Boxes (Main Sections)
                          if (/^\d+\./.test(line.trim())) {
                             return (
                                <div key={i} className="mb-6 bg-[#09090b] p-6 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                                  <div className="text-base">
                                    {line.split('**').map((part, idx2) => 
                                       idx2 % 2 === 1 ? <span key={idx2} className="text-blue-400 font-bold text-xs uppercase block mb-3 tracking-widest">{part}</span> : <span key={idx2} className="text-zinc-200 block leading-7">{part}</span>
                                    )}
                                  </div>
                                </div>
                             )
                          }
                          // Paragraphs
                          if (line.trim().length > 0) {
                             return <p key={i} className="mb-4 text-zinc-400 text-base leading-7">
                               {line.split('**').map((part, idx2) => 
                                  idx2 % 2 === 1 ? <strong key={idx2} className="text-white font-semibold">{part}</strong> : part
                               )}
                             </p>;
                          }
                          return null;
                        })}
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
