
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface GlobalChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  bestPerformer?: {ticker: string, change: number} | null;
  worstPerformer?: {ticker: string, change: number} | null;
}

// Type for Speech Recognition (Web API)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const GlobalChatPanel: React.FC<GlobalChatPanelProps> = ({ isOpen, onClose, messages, onSendMessage, isTyping, bestPerformer, worstPerformer }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'it-IT';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        onSendMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onSendMessage]);

  // TTS Logic: Speak the last AI message if in Voice Mode
  useEffect(() => {
    if (!isVoiceMode) {
       window.speechSynthesis.cancel();
       setIsSpeaking(false);
       return;
    }

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'ai' && !isTyping) {
       const utterance = new SpeechSynthesisUtterance(lastMsg.text);
       utterance.lang = 'it-IT';
       utterance.rate = 1.1; // Slightly faster feels more natural
       utterance.onstart = () => setIsSpeaking(true);
       utterance.onend = () => setIsSpeaking(false);
       window.speechSynthesis.cancel(); // Stop previous
       window.speechSynthesis.speak(utterance);
    }
  }, [messages, isTyping, isVoiceMode]);

  // Clean up TTS on close
  useEffect(() => {
     if(!isOpen) {
        window.speechSynthesis.cancel();
        setIsVoiceMode(false);
     }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-[#0A0A0A] border-l border-zinc-800 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-[#0A0A0A] shrink-0 relative overflow-hidden">
        {/* Voice Mode Background Animation */}
        {isVoiceMode && (
           <div className="absolute inset-0 bg-blue-900/20 z-0 animate-pulse"></div>
        )}
        
        <div className="flex items-center gap-3 relative z-10">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${isVoiceMode ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-spin-slow' : 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-900/20'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
               <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3V9h18z"/>
             </svg>
          </div>
          <div>
            <h2 className="font-bold text-white text-lg leading-tight">Portfolio AI</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
               Alpha-Vision {isVoiceMode && <span className="text-blue-400">• Live</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
           <button 
              onClick={() => {
                 if(navigator.vibrate) navigator.vibrate(20);
                 setIsVoiceMode(!isVoiceMode);
              }} 
              className={`p-2 rounded-full transition-all duration-300 ${isVoiceMode ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
           >
              {isVoiceMode ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              )}
           </button>
           <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
               <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
             </svg>
           </button>
        </div>
      </div>

      {/* Voice Visualizer Overlay */}
      {isVoiceMode && (isSpeaking || isListening) && (
         <div className="h-32 bg-[#0A0A0A] border-b border-zinc-800 flex items-center justify-center gap-1">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
               <div 
                 key={i} 
                 className={`w-1.5 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-75 ease-in-out`}
                 style={{
                    height: isSpeaking ? `${Math.random() * 100}%` : (isListening ? '20%' : '10%'),
                    opacity: isSpeaking ? 1 : (isListening ? 0.5 : 0.2),
                    animation: isListening ? `pulse 1s infinite ${i*0.1}s` : 'none'
                 }}
               ></div>
            ))}
         </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0A0A] no-scrollbar">
        {messages.length === 0 && (
           <div className="text-center py-10 opacity-50">
              <p className="text-zinc-400 text-sm mb-6">Ecco alcuni spunti basati sui tuoi dati live:</p>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                 <button onClick={() => onSendMessage("Fammi un'analisi generale del portfolio.")} className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-full transition-colors">
                    📈 Report Generale
                 </button>
                 
                 {worstPerformer && worstPerformer.change < -1 && (
                   <button onClick={() => onSendMessage(`Perché ${worstPerformer.ticker} sta scendendo così tanto?`)} className="text-xs bg-rose-900/20 hover:bg-rose-900/40 border border-rose-800/50 text-rose-300 px-3 py-2 rounded-full transition-colors flex items-center gap-1">
                      ⚠️ Analizza {worstPerformer.ticker} ({worstPerformer.change.toFixed(1)}%)
                   </button>
                 )}

                 {bestPerformer && bestPerformer.change > 1 && (
                   <button onClick={() => onSendMessage(`Cosa sta spingendo ${bestPerformer.ticker}?`)} className="text-xs bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-800/50 text-emerald-300 px-3 py-2 rounded-full transition-colors flex items-center gap-1">
                      🚀 Analizza {bestPerformer.ticker} ({bestPerformer.change.toFixed(1)}%)
                   </button>
                 )}

                 <button onClick={() => onSendMessage("Quali settori sono più esposti oggi?")} className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-full transition-colors">
                    ⚖️ Esposizione Settoriale
                 </button>
              </div>
           </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
               msg.role === 'user' 
               ? 'bg-blue-600 text-white rounded-br-none' 
               : 'bg-zinc-800 text-zinc-200 rounded-bl-none prose prose-invert prose-sm prose-p:my-1 prose-strong:text-white'
            }`}>
               {msg.text.split('\n').map((line, i) => {
                 // Simple markdown parsing for bold and lists
                 if (line.startsWith('- ')) return <div key={i} className="flex gap-2 ml-1"><span className="text-zinc-400">•</span><span>{line.substring(2)}</span></div>;
                 return <p key={i} className="mb-1 last:mb-0">{line}</p>;
               })}
            </div>
          </div>
        ))}

        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-zinc-900 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-[#0A0A0A] shrink-0">
         <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder={isListening ? "Ascolto..." : "Scrivi un messaggio..."}
                 className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                 disabled={isListening}
               />
               {/* Mic Button inside Input */}
               <button 
                 type="button"
                 onClick={toggleListening}
                 className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-zinc-400 hover:text-white'}`}
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                   <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                   <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                 </svg>
               </button>
            </div>

            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="p-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-colors shadow-lg"
            >
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform rotate-90">
                 <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
               </svg>
            </button>
         </div>
      </form>
    </div>
  );
};

export default GlobalChatPanel;
