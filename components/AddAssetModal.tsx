
import React, { useEffect, useRef, useState } from 'react';
import { CompanyInfo, TabType } from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions: CompanyInfo[];
  onSelectSuggestion: (c: CompanyInfo) => void;
  qty: string;
  setQty: (v: string) => void;
  cost: string;
  setCost: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen, onClose, activeTab, searchTerm, onSearchChange, 
  suggestions, onSelectSuggestion, qty, setQty, cost, setCost, onAdd
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Show details if we have a search term and we are in portfolio mode.
  // We treat length > 1 as "potentially selected" for the accordion effect to feel responsive.
  const showDetails = activeTab === TabType.PORTFOLIO && searchTerm.length > 1;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Click outside to close area (Desktop) */}
      <div className="absolute inset-0 md:block hidden" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="bg-[#121212] w-full md:max-w-md md:rounded-3xl rounded-t-[2rem] border-t md:border border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 relative z-10 max-h-[90vh]">
        
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
           <div className="w-12 h-1.5 bg-zinc-800 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeTab === TabType.PORTFOLIO ? 'Nuova Posizione' : 'Aggiungi a Watchlist'}
            </h2>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              {activeTab === TabType.PORTFOLIO ? 'Inserisci i dettagli del tuo investimento' : 'Monitora un nuovo asset'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors border border-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onAdd} className="p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
           
           {/* Search Input Section */}
           <div className="relative z-20">
              <div className={`relative flex items-center bg-zinc-900 border rounded-2xl px-4 py-3.5 transition-all duration-300 group ${searchTerm ? 'border-blue-500/50 ring-1 ring-blue-500/20 bg-blue-900/10' : 'border-zinc-800 focus-within:border-zinc-600'}`}>
                 <div className="text-zinc-500 mr-3">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 transition-colors ${searchTerm ? 'text-blue-400' : ''}`}>
                     <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                   </svg>
                 </div>
                 <div className="flex-1">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider transition-all ${searchTerm ? 'text-blue-400 mb-0' : 'text-zinc-500 mb-0 hidden'}`}>
                       Asset
                    </label>
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={searchTerm}
                      onChange={onSearchChange}
                      placeholder="Cerca (es. AAPL, BTC)..."
                      className="w-full bg-transparent border-none p-0 text-white placeholder-zinc-600 focus:ring-0 outline-none font-bold text-lg"
                      autoComplete="off"
                    />
                 </div>
                 {searchTerm && (
                    <button 
                      type="button" 
                      onClick={() => {
                        // Quick clear logic handled by parent via event simulation or ref, 
                        // but here we rely on user backspacing or parent clearing.
                        // Visually just an icon for now.
                      }}
                      className="animate-in fade-in zoom-in"
                    >
                       <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                    </button>
                 )}
              </div>
              
              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                  {suggestions.map((c) => (
                    <button 
                      key={c.symbol} 
                      type="button" 
                      onClick={() => onSelectSuggestion(c)} 
                      className="w-full text-left px-5 py-4 hover:bg-zinc-800/50 border-b border-zinc-800/50 last:border-0 flex items-center justify-between group transition-colors"
                    >
                       <div>
                         <div className="flex items-center gap-2">
                            <span className="font-black text-white text-lg tracking-tight">{c.symbol}</span>
                            {c.sector && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">{c.sector}</span>}
                         </div>
                         <span className="text-zinc-500 text-xs font-medium truncate block mt-0.5">{c.name}</span>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                          </svg>
                       </div>
                    </button>
                  ))}
                </div>
              )}
           </div>

           {/* Accordion: Portfolio Details */}
           {activeTab === TabType.PORTFOLIO && (
             <div className={`overflow-hidden transition-all duration-500 ease-spring ${showDetails ? 'max-h-[300px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}`}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="h-px bg-zinc-800 flex-1"></div>
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dettagli Posizione</span>
                     <div className="h-px bg-zinc-800 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {/* Quantity Input */}
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 focus-within:border-blue-500/50 focus-within:bg-zinc-900 transition-colors">
                         <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Quantità</label>
                         <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={qty} 
                              onChange={e => setQty(e.target.value)} 
                              placeholder="0"
                              className="w-full bg-transparent border-none p-0 text-white text-2xl font-bold placeholder-zinc-700 focus:ring-0 outline-none tabular-nums"
                            />
                         </div>
                      </div>

                      {/* Price Input */}
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 focus-within:border-blue-500/50 focus-within:bg-zinc-900 transition-colors">
                         <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Prezzo Medio</label>
                         <div className="flex items-center gap-1">
                            <span className="text-zinc-500 text-xl font-medium">$</span>
                            <input 
                              type="number" 
                              value={cost} 
                              onChange={e => setCost(e.target.value)} 
                              placeholder="0.00"
                              className="w-full bg-transparent border-none p-0 text-white text-2xl font-bold placeholder-zinc-700 focus:ring-0 outline-none tabular-nums"
                            />
                         </div>
                      </div>
                  </div>
                </div>
             </div>
           )}

           {/* Spacer to push button down on mobile */}
           <div className="flex-1 min-h-[20px]"></div>

           {/* Submit Button (Bottom Sticky feel) */}
           <div className="pt-2 pb-4 md:pb-0">
              <button 
                type="submit" 
                disabled={!searchTerm} 
                className={`w-full font-bold text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl ${searchTerm ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 translate-y-0' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                {activeTab === TabType.PORTFOLIO ? (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                       <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                     </svg>
                     Aggiungi al Portfolio
                   </>
                ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                       <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                       <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                     </svg>
                     Segui in Watchlist
                   </>
                )}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
