
import React, { useState } from 'react';
import { SmartAlert } from '../types';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SmartAlert[];
  onAddAlert: (alert: SmartAlert) => void;
  onCheckAlerts: () => void;
  isChecking: boolean;
}

const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, alerts, onAddAlert, onCheckAlerts, isChecking }) => {
  const [newTicker, setNewTicker] = useState('');
  const [newCondition, setNewCondition] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker || !newCondition) return;
    onAddAlert({
      id: Date.now().toString(),
      ticker: newTicker.toUpperCase(),
      condition: newCondition,
      isActive: true
    });
    setNewTicker('');
    setNewCondition('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-lg border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
             <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
             </span>
             Smart Semantic Alerts
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
               <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Form */}
          <form onSubmit={handleAdd} className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50 space-y-3">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nuova Regola Semantica</h3>
             <div className="flex gap-2">
               <input value={newTicker} onChange={e => setNewTicker(e.target.value)} placeholder="Ticker (es. AAPL)" className="w-24 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 outline-none uppercase placeholder-zinc-700" />
               <input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Es. Se il CEO si dimette" className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 outline-none placeholder-zinc-700" />
             </div>
             <button type="submit" className="w-full bg-white text-black font-bold text-sm py-2 rounded-lg hover:bg-zinc-200 transition-colors">Aggiungi Monitoraggio</button>
          </form>

          {/* List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
             {alerts.length === 0 && <p className="text-center text-zinc-600 text-sm py-8">Nessun alert attivo. Crea una regola basata sul linguaggio naturale.</p>}
             {alerts.map(alert => (
                <div key={alert.id} className={`p-4 rounded-xl border ${alert.status === 'triggered' ? 'bg-rose-900/20 border-rose-800' : 'bg-zinc-900/20 border-zinc-800'} transition-all`}>
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-white">{alert.ticker}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.isActive ? 'bg-blue-900/30 text-blue-400' : (alert.status === 'triggered' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-500')}`}>
                         {alert.status === 'triggered' ? 'SCATTATO' : (alert.isActive ? 'MONITORING' : 'INATTIVO')}
                      </span>
                   </div>
                   <p className="text-sm text-zinc-300 mb-2">"{alert.condition}"</p>
                   {alert.status === 'triggered' && (
                      <div className="text-xs text-rose-300 bg-rose-900/30 p-2 rounded mt-2 border border-rose-800/50">
                         ⚠️ <strong>Motivo:</strong> {alert.triggerReason}
                      </div>
                   )}
                </div>
             ))}
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
           <button 
             onClick={onCheckAlerts}
             disabled={isChecking || alerts.length === 0}
             className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-rose-900/20"
           >
             {isChecking ? (
               <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Checking AI...</>
             ) : (
               <>⚡ Controlla Alert Ora</>
             )}
           </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsModal;
