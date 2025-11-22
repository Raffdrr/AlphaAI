import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarketData, CompanyInfo, ChatMessage, CandleData } from '../types';
import { getChartDataForRange, calculateSMA, calculateEMA, calculateBollingerBands } from '../services/marketService';
import { chatWithAlphaVision } from '../services/geminiService';

interface CompanyDetailViewProps {
  ticker: string;
  data: MarketData | null;
  info: CompanyInfo;
  onClose: () => void;
  onAnalyze: () => void;
}

type ChartType = 'LINE' | 'CANDLE';

const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({ ticker, data, info, onClose, onAnalyze }) => {
  const [selectedRange, setSelectedRange] = useState('1G');
  const [chartPoints, setChartPoints] = useState<number[]>([]);
  const [candles, setCandles] = useState<CandleData[]>([]);
  
  const [chartType, setChartType] = useState<ChartType>('LINE');
  
  // Indicators State
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);

  const [hoverData, setHoverData] = useState<{price: number, x: number, index: number, candle?: CandleData} | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRefInternal = useRef<HTMLDivElement>(null);

  // Force scroll to top when ticker changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [ticker]);

  // Initialize chart data
  useEffect(() => {
    if (data) {
      setChartPoints(data.chartData);
      setCandles(data.candles || []);
      // Reset chat
      setChatMessages([{
         id: 'welcome', role: 'ai', timestamp: Date.now(), 
         text: `Ciao! Sono Alpha-Vision. Chiedimi qualsiasi cosa su ${info.name} (${ticker}).`
      }]);
    }
  }, [data, ticker, info.name]);

  // Auto scroll chat
  useEffect(() => {
    if (chatContainerRefInternal.current) {
      const { scrollHeight, clientHeight } = chatContainerRefInternal.current;
      if (scrollHeight > clientHeight) {
        chatContainerRefInternal.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [chatMessages]);

  const handleRangeChange = async (range: string) => {
    if(navigator.vibrate) navigator.vibrate(5);
    setSelectedRange(range);
    if (data) {
       // Updated to use Async with Ticker
       const newData = await getChartDataForRange(data.price, range, ticker);
       setChartPoints(newData.line);
       setCandles(newData.candles);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !data) return;

    if(navigator.vibrate) navigator.vibrate(10);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    const history = [...chatMessages, userMsg].map(m => ({ role: m.role, text: m.text }));
    const aiText = await chatWithAlphaVision(ticker, history, data);

    if(navigator.vibrate) navigator.vibrate([10, 30, 10]); // Success vibration

    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText, timestamp: Date.now() };
    setChatMessages(prev => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(chatInput);
    setChatInput('');
  };

  const handleAICandleAnalysis = () => {
    if(navigator.vibrate) navigator.vibrate(20);
    // Construct a technical prompt using data
    const prompt = `Analizza il grafico a candele attuale. Ecco i dati delle ultime 10 candele: ${
      candles.slice(-10).map(c => `[O:${c.open.toFixed(2)} C:${c.close.toFixed(2)}]`).join(' ')
    }. Identifica eventuali pattern di inversione o continuazione e dimmi cosa aspettarmi.`;
    
    handleSendMessage(prompt);
  };

  const toggleChartType = (type: ChartType) => {
    if(navigator.vibrate) navigator.vibrate(10);
    setChartType(type);
  };

  // Calculations for drawing
  const currentPrice = hoverData ? hoverData.price : (data?.price || 0);
  const baselinePrice = chartPoints.length > 0 ? chartPoints[0] : (data?.price || 0);
  const priceChange = currentPrice - baselinePrice;
  const changePercent = baselinePrice !== 0 ? (priceChange / baselinePrice) * 100 : 0;
  const isRangePositive = priceChange >= 0;
  const chartColor = isRangePositive ? '#34d399' : '#f43f5e'; 
  
  const width = 800;
  const height = 400;
  const paddingY = 40;
  const availableHeight = height - (paddingY * 2);

  const { min, max, range } = useMemo(() => {
    let dataMin = 0;
    let dataMax = 0;
    
    if (chartType === 'CANDLE' && candles.length > 0) {
       const highs = candles.map(c => c.high);
       const lows = candles.map(c => c.low);
       dataMin = Math.min(...lows);
       dataMax = Math.max(...highs);
    } else {
       dataMin = Math.min(...chartPoints);
       dataMax = Math.max(...chartPoints);
    }
    
    // Add buffer for indicators
    const rangeVal = dataMax - dataMin || 1;
    return { min: dataMin - (rangeVal * 0.1), max: dataMax + (rangeVal * 0.1), range: (dataMax - dataMin) * 1.2 || 1 };
  }, [chartPoints, candles, chartType]);

  const getY = (val: number) => (height - paddingY) - ((val - min) / range) * availableHeight;

  // Indicator Paths
  const smaPath = useMemo(() => {
    if (!showSMA) return '';
    const smaData = calculateSMA(chartPoints, 20);
    return smaData.map((p, i) => {
      if(isNaN(p)) return '';
      const x = (i / (chartPoints.length - 1)) * width;
      return `${i === 0 || isNaN(smaData[i-1]) ? 'M' : 'L'} ${x.toFixed(2)} ${getY(p).toFixed(2)}`;
    }).join(' ');
  }, [chartPoints, showSMA, min, range, width, availableHeight]);

  const emaPath = useMemo(() => {
    if (!showEMA) return '';
    const emaData = calculateEMA(chartPoints, 12);
    return emaData.map((p, i) => {
      if(isNaN(p)) return '';
      const x = (i / (chartPoints.length - 1)) * width;
      return `${i === 0 || isNaN(emaData[i-1]) ? 'M' : 'L'} ${x.toFixed(2)} ${getY(p).toFixed(2)}`;
    }).join(' ');
  }, [chartPoints, showEMA, min, range, width, availableHeight]);

  const bollingerPaths = useMemo(() => {
    if (!showBollinger) return { upper: '', lower: '' };
    const bands = calculateBollingerBands(chartPoints, 20);
    const genPath = (arr: number[]) => arr.map((p, i) => {
      if(isNaN(p)) return '';
      const x = (i / (chartPoints.length - 1)) * width;
      return `${i === 0 || isNaN(arr[i-1]) ? 'M' : 'L'} ${x.toFixed(2)} ${getY(p).toFixed(2)}`;
    }).join(' ');
    return { upper: genPath(bands.upper), lower: genPath(bands.lower) };
  }, [chartPoints, showBollinger, min, range, width, availableHeight]);

  const chartPath = useMemo(() => {
    if (chartType !== 'LINE') return '';
    return chartPoints.map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * width;
      const y = getY(p);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }, [chartPoints, min, range, width, height, availableHeight, chartType]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const totalPoints = chartType === 'LINE' ? chartPoints.length : candles.length;
    const index = Math.round((clampedX / rect.width) * (totalPoints - 1));
    
    if (index >= 0 && index < totalPoints) {
       if (chartType === 'LINE') {
          setHoverData({ price: chartPoints[index], x: clampedX, index: index });
       } else {
          setHoverData({ price: candles[index].close, x: clampedX, index: index, candle: candles[index] });
       }
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  if (!data) return <div className="flex h-full items-center justify-center text-zinc-500 animate-pulse font-medium">Caricamento dati di mercato...</div>;

  return (
    <div ref={mainScrollRef} className="absolute inset-0 bg-black overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-300 pb-24 md:pb-0">
      
      {/* Header Navigation */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 md:px-8 py-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900 pl-2 pr-4 py-2 rounded-full transition-colors text-sm font-bold tracking-wide">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          INDIETRO
        </button>
        
        <button onClick={onAnalyze} className="flex items-center gap-2 px-4 md:px-6 py-2 bg-white hover:bg-zinc-200 text-black rounded-full text-xs md:text-sm font-bold transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
               <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
             </svg>
             ANALISI AI
        </button>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-16 pb-32">
        
        {/* Top Section */}
        <div>
           <div className="flex items-center justify-between mb-8">
             <div>
               <div className="flex items-center gap-4 mb-1">
                 <h1 className="text-white text-3xl md:text-5xl font-bold tracking-tighter">{info.name}</h1>
                 {info.sector && (
                   <span className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest transform translate-y-1 hidden md:inline-block">
                     {info.sector}
                   </span>
                 )}
               </div>
               <div className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest">{ticker} • Nasdaq Real Time Price</div>
             </div>
           </div>

           {/* Dynamic Price Block */}
           <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-6 mb-8">
              <span className="text-5xl md:text-7xl text-white font-bold tracking-tighter tabular-nums">
                ${currentPrice.toFixed(2)}
              </span>
              <div className="flex flex-col mb-2">
                <span className={`text-lg md:text-xl font-bold flex items-center gap-1 tabular-nums tracking-tight ${isRangePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isRangePositive ? '+' : ''}{priceChange.toFixed(2)} ({changePercent.toFixed(2)}%)
                </span>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                   Performance {selectedRange === '1G' ? 'Giornaliera' : selectedRange}
                </span>
              </div>
           </div>

           {/* Controls & Toggle */}
           <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {['1G', '5G', '1M', '6M', 'YTD', '1A'].map((r) => (
                      <button key={r} onClick={() => handleRangeChange(r)} className={`text-[10px] md:text-[11px] font-bold px-3 md:px-4 py-1.5 rounded-full transition-all tracking-wide shrink-0 ${selectedRange === r ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  
                  {/* Technical Indicators Toggles */}
                  <div className="h-6 w-[1px] bg-zinc-800 mx-2 hidden md:block"></div>
                  <div className="flex gap-2">
                     <button onClick={() => setShowSMA(!showSMA)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${showSMA ? 'bg-blue-900/30 border-blue-600 text-blue-400' : 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                        SMA 20
                     </button>
                     <button onClick={() => setShowEMA(!showEMA)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${showEMA ? 'bg-purple-900/30 border-purple-600 text-purple-400' : 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                        EMA 12
                     </button>
                     <button onClick={() => setShowBollinger(!showBollinger)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${showBollinger ? 'bg-orange-900/30 border-orange-600 text-orange-400' : 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                        BOLL
                     </button>
                  </div>
              </div>
              
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 self-start">
                 <button 
                   onClick={() => toggleChartType('LINE')}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${chartType === 'LINE' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
                    LINEA
                 </button>
                 <button 
                   onClick={() => toggleChartType('CANDLE')}
                   className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${chartType === 'CANDLE' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v2h2v6H9v2H7v-2H5V6h2V4h2zm10 8v2h2v6h-2v2h-2v-2h-2v-6h2v-2h2zM13 8V2h-2v6h2z"/></svg>
                    CANDELE
                 </button>
              </div>
           </div>

           {/* Interactive Chart */}
           <div className="relative select-none bg-zinc-900/20 rounded-3xl border border-zinc-800/50 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
              <div ref={chartContainerRef} className="h-[300px] md:h-[450px] w-full relative cursor-crosshair group" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                 <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                       <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                       </linearGradient>
                       <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                       </filter>
                    </defs>

                    {/* TECHNICAL INDICATORS LAYER (Behind Price) */}
                    {showSMA && <path d={smaPath} fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" strokeDasharray="4 4" />}
                    {showEMA && <path d={emaPath} fill="none" stroke="#c084fc" strokeWidth="1.5" opacity="0.7" />}
                    {showBollinger && (
                        <>
                           <path d={bollingerPaths.upper} fill="none" stroke="#fb923c" strokeWidth="1" opacity="0.5" />
                           <path d={bollingerPaths.lower} fill="none" stroke="#fb923c" strokeWidth="1" opacity="0.5" />
                           {/* Fill area between bands could be tricky in simple path, skipping for clarity */}
                        </>
                    )}

                    {/* LINE CHART */}
                    {chartType === 'LINE' && (
                       <>
                          <path d={`${chartPath} L ${width} ${height} L 0 ${height} Z`} fill="url(#chartFill)" />
                          <path d={chartPath} fill="none" stroke={chartColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" className="transition-all duration-300"/>
                       </>
                    )}

                    {/* CANDLESTICK CHART */}
                    {chartType === 'CANDLE' && candles.map((c, i) => {
                        const x = (i / (candles.length - 1)) * width;
                        const candleWidth = (width / candles.length) * 0.6;
                        
                        const yOpen = getY(c.open);
                        const yClose = getY(c.close);
                        const yHigh = getY(c.high);
                        const yLow = getY(c.low);
                        
                        const isUp = c.close >= c.open;
                        const color = isUp ? '#34d399' : '#f43f5e';
                        const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
                        const bodyY = Math.min(yOpen, yClose);

                        return (
                           <g key={i}>
                              {/* Wick */}
                              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                              {/* Body */}
                              <rect x={x - candleWidth/2} y={bodyY} width={candleWidth} height={bodyHeight} fill={color} />
                           </g>
                        );
                    })}
                    
                    {/* NEWS MARKERS (Only on Line Chart) */}
                    {chartType === 'LINE' && selectedRange === '1G' && data.news.map((n, idx) => {
                       if (n.associatedChartIndex === undefined) return null;
                       const idxPt = n.associatedChartIndex;
                       const p = chartPoints[idxPt];
                       const x = (idxPt / (chartPoints.length - 1)) * width;
                       const y = getY(p);
                       
                       const markerColor = n.sentimentLabel === 'Positive' ? '#34d399' : (n.sentimentLabel === 'Negative' ? '#f43f5e' : '#a1a1aa');

                       return (
                         <g key={n.id} className="group/marker cursor-pointer">
                           <circle cx={x} cy={y} r="6" fill={markerColor} stroke="#000" strokeWidth="2" className="animate-pulse" />
                           <foreignObject x={Math.min(x - 75, width - 150)} y={y - 80} width="150" height="70" className="opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none">
                             <div className="bg-black/90 border border-zinc-700 rounded p-2 shadow-xl">
                                <div className="text-[10px] font-bold uppercase mb-1" style={{color: markerColor}}>{n.sentimentLabel} Impact</div>
                                <div className="text-[10px] text-white leading-tight line-clamp-2">{n.title}</div>
                             </div>
                           </foreignObject>
                         </g>
                       );
                    })}

                    {/* HOVER LINE & TOOLTIP */}
                    {hoverData && (
                       <line x1={hoverData.x * (width / chartContainerRef.current!.clientWidth)} y1="0" x2={hoverData.x * (width / chartContainerRef.current!.clientWidth)} y2={height} stroke="#52525b" strokeWidth="1" strokeDasharray="4 4"/>
                    )}
                 </svg>

                 {hoverData && (
                    <div className="absolute top-0 pointer-events-none flex flex-col items-center bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-2xl z-10" style={{ left: Math.min(Math.max(hoverData.x - 60, 0), chartContainerRef.current!.clientWidth - 120), top: -60 }}>
                       {chartType === 'LINE' ? (
                          <>
                             <div className="text-[10px] text-zinc-400 mb-0.5 font-bold uppercase tracking-wider">Prezzo</div>
                             <div className="text-white font-bold text-lg tabular-nums tracking-tight">${hoverData.price.toFixed(2)}</div>
                          </>
                       ) : (
                          <div className="flex flex-col items-start text-[10px] w-32">
                             <div className="flex justify-between w-full"><span className="text-zinc-500">O:</span> <span className="text-white tabular-nums">{hoverData.candle?.open.toFixed(2)}</span></div>
                             <div className="flex justify-between w-full"><span className="text-zinc-500">H:</span> <span className="text-white tabular-nums">{hoverData.candle?.high.toFixed(2)}</span></div>
                             <div className="flex justify-between w-full"><span className="text-zinc-500">L:</span> <span className="text-white tabular-nums">{hoverData.candle?.low.toFixed(2)}</span></div>
                             <div className="flex justify-between w-full border-t border-zinc-700 mt-1 pt-1"><span className="text-zinc-500 font-bold">C:</span> <span className="text-white tabular-nums font-bold">{hoverData.candle?.close.toFixed(2)}</span></div>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* AI Candle Analysis Button (Visible when Candle mode is on) */}
              {chartType === 'CANDLE' && (
                <div className="absolute bottom-4 right-4 animate-in fade-in slide-in-from-bottom-2">
                   <button 
                     onClick={handleAICandleAnalysis}
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg shadow-blue-900/50 transition-all hover:scale-105 active:scale-95"
                   >
                      <span className="text-lg">✨</span> AI Candle Analysis
                   </button>
                </div>
              )}
           </div>
        </div>

        {/* Info & Chat Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-zinc-800 pt-8 md:pt-16">
           
           {/* Left Column: Chat & News (8 cols) */}
           <div className="lg:col-span-8 space-y-8 md:space-y-16">
              
              {/* Feature 1: Chat with Portfolio */}
              <section className="bg-[#0A0A0A] border border-zinc-800 rounded-3xl p-1 overflow-hidden">
                 <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                       <h3 className="font-bold text-white tracking-wide text-sm uppercase">Alpha-Vision Chat</h3>
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Context: {ticker}</span>
                 </div>
                 
                 <div ref={chatContainerRefInternal} className="h-[350px] overflow-y-auto p-6 space-y-4 bg-black/50 no-scrollbar scroll-smooth">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-6 ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-zinc-800 text-zinc-200 rounded-bl-sm prose prose-invert prose-sm prose-strong:text-white'
                         }`}>
                            {/* Handle markdown-like bold rendering simply */}
                            {msg.text.split('\n').map((line, i) => (
                               <p key={i} className="mb-1 last:mb-0">{line}</p>
                            ))}
                         </div>
                      </div>
                    ))}
                    {isChatLoading && (
                       <div className="flex justify-start"><div className="bg-zinc-800 rounded-2xl px-5 py-3 text-zinc-400 text-sm animate-pulse">Alpha-Vision sta analizzando...</div></div>
                    )}
                 </div>

                 <form onSubmit={onFormSubmit} className="p-2 bg-zinc-900/30 border-t border-zinc-800 flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      placeholder="Fai una domanda sul titolo..." 
                      className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-zinc-600"
                    />
                    <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="bg-white text-black font-bold rounded-xl px-4 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform rotate-90">
                         <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                       </svg>
                    </button>
                 </form>
              </section>
              
              {/* News Section (Legacy) */}
              <section>
                 <h3 className="text-lg text-white font-bold mb-8 flex items-center gap-2.5"><span className="w-1 h-5 bg-purple-500 rounded-full"></span>Rassegna Stampa & Sentiment</h3>
                 <div className="grid grid-cols-1 gap-5">
                    {data.news.map((newsItem, idx) => (
                       <div key={idx} className="group flex flex-col sm:flex-row gap-5 cursor-pointer bg-[#09090b] hover:bg-zinc-900 border border-zinc-800 p-5 rounded-2xl transition-all duration-200 relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${newsItem.sentimentLabel === 'Positive' ? 'bg-emerald-500' : (newsItem.sentimentLabel === 'Negative' ? 'bg-rose-500' : 'bg-zinc-500')}`}></div>
                          {newsItem.imageUrl && (
                             <div className="w-full sm:w-32 h-20 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                                <img src={newsItem.imageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                             </div>
                          )}
                          <div className="flex-1 flex flex-col justify-center">
                             <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-2 font-bold uppercase tracking-wide">
                                <span className="text-blue-400">{newsItem.source}</span>
                                <span>•</span>
                                <span>{newsItem.timeAgo}</span>
                             </div>
                             <h4 className="text-zinc-200 text-lg font-semibold leading-snug group-hover:text-white transition-colors tracking-tight">{newsItem.title}</h4>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           </div>

           {/* Right Column: Company Profile (4 cols) */}
           <div className="lg:col-span-4 space-y-10">
               {/* Stats */}
              <section className="bg-[#09090b] border border-zinc-800 rounded-3xl p-8">
                 <h3 className="text-lg text-white font-bold mb-6 flex items-center gap-2.5"><span className="w-1 h-5 bg-blue-500 rounded-full"></span>Market Stats</h3>
                 <div className="space-y-6">
                     {[
                        { label: 'Cap. di Mercato', value: data.marketCap },
                        { label: 'Rapporto P/E', value: data.peRatio },
                        { label: 'Rendimento Div.', value: data.dividendYield },
                        { label: 'Max 52 Settimane', value: `$${(data.price * 1.15).toFixed(2)}` },
                        { label: 'Volume Medio', value: data.volume }
                     ].map((stat, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                           <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</span>
                           <span className="text-white font-semibold text-sm tabular-nums">{stat.value || '--'}</span>
                        </div>
                     ))}
                  </div>
              </section>

              <section className="bg-[#09090b] border border-zinc-800 rounded-3xl p-8">
                 <h3 className="text-lg text-white font-bold mb-6 flex items-center gap-2.5"><span className="w-1 h-5 bg-emerald-500 rounded-full"></span>Profilo Aziendale</h3>
                 <p className="text-sm text-zinc-400 leading-7 font-normal mb-8 border-b border-zinc-900 pb-6">
                    {info.description || "Descrizione non disponibile."}
                 </p>
                 <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CEO</span>
                        <span className="text-white text-sm font-medium">{info.ceo}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fondata nel</span>
                        <span className="text-white text-sm font-medium">{info.founded}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pt-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Sito Web</span>
                        <span className="text-blue-400 text-sm font-bold">{info.website}</span>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailView;