
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PortfolioItem, WatchlistItem, TabType, MarketData, CompanyInfo, SmartAlert, ChatMessage } from './types';
import GlobalChatPanel from './components/GlobalChatPanel';
import CompanyDetailView from './components/CompanyDetailView';
import AlertsModal from './components/AlertsModal';
import AddAssetModal from './components/AddAssetModal';
import { fetchMarketData, searchCompanies, getCompanyInfo, getCompanyInfoSync } from './services/marketService';
import { checkSmartAlerts, chatWithPortfolio } from './services/geminiService';

const REFRESH_RATE = 3000;

const App: React.FC = () => {
   // -- State --
   const [activeTab, setActiveTab] = useState<TabType>(TabType.PORTFOLIO);
   const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
   const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

   const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

   const [inputTicker, setInputTicker] = useState('');
   const [inputQty, setInputQty] = useState('');
   const [inputCost, setInputCost] = useState('');
   const [suggestions, setSuggestions] = useState<CompanyInfo[]>([]);
   const [showSuggestions, setShowSuggestions] = useState(false);

   // New State for Add Modal
   const [isAddModalOpen, setIsAddModalOpen] = useState(false);

   const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
   const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
   const [flashingTickers, setFlashingTickers] = useState<Set<string>>(new Set());

   // Global Chat State
   const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
   const [globalChatMessages, setGlobalChatMessages] = useState<ChatMessage[]>([]);
   const [isGlobalChatTyping, setIsGlobalChatTyping] = useState(false);

   // Alerts State
   const [alerts, setAlerts] = useState<SmartAlert[]>([]);
   const [isAlertsOpen, setIsAlertsOpen] = useState(false);
   const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

   const searchRef = useRef<HTMLDivElement>(null);

   // -- Load/Save Data --
   useEffect(() => {
      const savedPortfolio = localStorage.getItem('alpha-portfolio');
      const savedWatchlist = localStorage.getItem('alpha-watchlist');
      const savedAlerts = localStorage.getItem('alpha-alerts');
      if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio));
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
   }, []);

   useEffect(() => { localStorage.setItem('alpha-portfolio', JSON.stringify(portfolio)); }, [portfolio]);
   useEffect(() => { localStorage.setItem('alpha-watchlist', JSON.stringify(watchlist)); }, [watchlist]);
   useEffect(() => { localStorage.setItem('alpha-alerts', JSON.stringify(alerts)); }, [alerts]);

   // -- Click Outside Handler --
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
         }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   // -- Market Data Fetching & Flash Logic --
   const updateMarketData = useCallback(async () => {
      const allTickers = new Set([
         ...portfolio.map(p => p.ticker),
         ...watchlist.map(w => w.ticker),
         ...alerts.map(a => a.ticker)
      ]);
      if (selectedTicker) allTickers.add(selectedTicker);

      if (allTickers.size === 0) return;

      const updates: { ticker: string, data: MarketData }[] = [];
      const newPrices: Record<string, number> = {};
      const newFlashes = new Set<string>();

      await Promise.all(Array.from(allTickers).map(async (ticker) => {
         try {
            const data = await fetchMarketData(ticker);
            updates.push({ ticker, data });
            newPrices[ticker] = data.price;

            // Flash logic
            if (prevPrices[ticker] && prevPrices[ticker] !== data.price) {
               newFlashes.add(ticker);
            }
         } catch (e) {
            // ignore
         }
      }));

      setPrevPrices(prev => ({ ...prev, ...newPrices }));
      setFlashingTickers(newFlashes);

      // Remove flash after animation
      setTimeout(() => {
         setFlashingTickers(new Set());
      }, 800);

      setMarketData(prev => {
         const next = { ...prev };
         updates.forEach(u => {
            if (u) next[u.ticker] = u.data;
         });
         return next;
      });
   }, [portfolio, watchlist, selectedTicker, alerts, prevPrices]);

   useEffect(() => { updateMarketData(); }, [portfolio.length, watchlist.length]); // Initial load

   useEffect(() => {
      const intervalId = setInterval(() => updateMarketData(), REFRESH_RATE);
      return () => clearInterval(intervalId);
   }, [updateMarketData]);

   // -- Handlers --
   const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputTicker(val);
      if (val.length > 1) {
         const results = await searchCompanies(val);
         setSuggestions(results);
         setShowSuggestions(true);
      } else {
         setSuggestions([]);
         setShowSuggestions(false);
      }
   };

   const selectSuggestion = (company: CompanyInfo) => {
      if (navigator.vibrate) navigator.vibrate(10);
      setInputTicker(company.symbol);
      setShowSuggestions(false);
   };

   const handleAddToPortfolio = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputTicker) return;
      if (navigator.vibrate) navigator.vibrate(20);
      const info = await getCompanyInfo(inputTicker);
      if (portfolio.some(p => p.ticker === info.symbol)) { alert("Asset già presente"); return; }
      const newItem: PortfolioItem = {
         id: Date.now().toString(),
         ticker: info.symbol,
         name: info.name,
         quantity: inputQty ? parseFloat(inputQty) : 0,
         avgCost: inputCost ? parseFloat(inputCost) : 0
      };
      setPortfolio([...portfolio, newItem]);
      resetForm();
   };

   const handleAddToWatchlist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputTicker) return;
      if (navigator.vibrate) navigator.vibrate(20);
      const info = await getCompanyInfo(inputTicker);
      if (watchlist.some(w => w.ticker === info.symbol)) { alert("Asset già presente"); return; }
      const newItem: WatchlistItem = { id: Date.now().toString(), ticker: info.symbol, name: info.name };
      setWatchlist([...watchlist, newItem]);
      resetForm();
   };

   const handleAddSubmit = (e: React.FormEvent) => {
      if (activeTab === TabType.PORTFOLIO) handleAddToPortfolio(e);
      else handleAddToWatchlist(e);
   };

   const resetForm = () => {
      setInputTicker('');
      setInputQty('');
      setInputCost('');
      setShowSuggestions(false);
      setIsAddModalOpen(false); // Close modal on success
   };

   const handleSelectStock = (ticker: string) => {
      if (navigator.vibrate) navigator.vibrate(10);
      setSelectedTicker(ticker);
   };

   const handleTabChange = (tab: TabType) => {
      if (navigator.vibrate) navigator.vibrate(10);
      setActiveTab(tab);
      if (tab === TabType.ALERTS) {
         setIsAlertsOpen(true);
      }
   };

   // -- Global Chat Logic --
   const handleGlobalChatOpen = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      setIsGlobalChatOpen(true);
   };

   const handleSendGlobalMessage = async (text: string) => {
      if (navigator.vibrate) navigator.vibrate(10);
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
      setGlobalChatMessages(prev => [...prev, userMsg]);
      setIsGlobalChatTyping(true);

      const history = [...globalChatMessages, userMsg].map(m => ({ role: m.role, text: m.text }));
      const responseText = await chatWithPortfolio(history, portfolio, watchlist, marketData);

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: responseText, timestamp: Date.now() };
      setGlobalChatMessages(prev => [...prev, aiMsg]);
      setIsGlobalChatTyping(false);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
   };

   // -- Alerts Logic --
   const handleCheckAlerts = async () => {
      if (navigator.vibrate) navigator.vibrate(20);
      setIsCheckingAlerts(true);
      try {
         const tickersWithAlerts: string[] = Array.from(new Set(alerts.filter(a => a.isActive).map(a => a.ticker)));
         let updatedAlerts = [...alerts];

         for (const ticker of tickersWithAlerts) {
            let data = marketData[ticker];
            if (!data) data = await fetchMarketData(ticker);
            updatedAlerts = await checkSmartAlerts(updatedAlerts, ticker, data);
         }
         setAlerts(updatedAlerts);
      } finally {
         setIsCheckingAlerts(false);
      }
   };

   // -- Dashboard Calculations --
   const calculatePortfolioStats = () => {
      let totalValue = 0;
      let totalCost = 0;
      let dayChangeValue = 0;

      // Find best/worst for suggestions
      let bestPerformer: { ticker: string, change: number } | null = null;
      let worstPerformer: { ticker: string, change: number } | null = null;

      portfolio.forEach(item => {
         const data = marketData[item.ticker];
         const qty = item.quantity || 0;
         if (data) {
            const currentVal = data.price * qty;
            totalValue += currentVal;
            totalCost += (item.avgCost || 0) * qty;

            // Approximate day change value based on percentage
            dayChangeValue += currentVal * (data.changePercent / 100);

            if (!bestPerformer || data.changePercent > bestPerformer.change) bestPerformer = { ticker: item.ticker, change: data.changePercent };
            if (!worstPerformer || data.changePercent < worstPerformer.change) worstPerformer = { ticker: item.ticker, change: data.changePercent };
         }
      });

      const totalPnl = totalValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      return { totalValue, totalPnl, totalPnlPercent, dayChangeValue, bestPerformer, worstPerformer };
   };

   const stats = calculatePortfolioStats();

   // -- Sector Distribution Logic --
   const sectorData = useMemo(() => {
      if (activeTab !== TabType.PORTFOLIO || portfolio.length === 0) return [];

      const sectors: Record<string, number> = {};
      let totalVal = 0;

      portfolio.forEach(item => {
         const info = getCompanyInfoSync(item.ticker);
         const data = marketData[item.ticker];
         const val = data ? data.price * (item.quantity || 0) : 0;
         const sector = info.sector || 'Other';

         sectors[sector] = (sectors[sector] || 0) + val;
         totalVal += val;
      });

      return Object.entries(sectors)
         .map(([name, value]) => ({ name, value, percent: (value / totalVal) * 100 }))
         .sort((a, b) => b.value - a.value);

   }, [portfolio, marketData, activeTab]);

   // -- Render Helpers --
   const currentList = activeTab === TabType.PORTFOLIO ? portfolio : watchlist;
   const triggeredAlertsCount = alerts.filter(a => a.status === 'triggered' && !a.isActive).length;

   const renderPnl = (currentPrice: number, avgCost: number = 0, qty: number = 0) => {
      if (!qty || qty === 0 || !avgCost || avgCost === 0) return <span className="text-[10px] text-zinc-600 font-mono">NEW</span>;
      const totalValue = currentPrice * qty;
      const costBasis = avgCost * qty;
      const pnl = totalValue - costBasis;
      const pnlPercent = (pnl / costBasis) * 100;
      const isPositive = pnl >= 0;

      return (
         <div className="text-right tabular-nums flex flex-col items-end">
            <div className={`font-bold text-[11px] md:text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
               {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
            </div>
            <div className={`text-[10px] ${isPositive ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
               {pnlPercent.toFixed(2)}%
            </div>
         </div>
      );
   };

   // Donut Chart SVG Render
   const renderDonutChart = () => {
      let cumulativePercent = 0;
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

      return (
         <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
               {sectorData.map((sector, i) => {
                  const dashArray = `${sector.percent} ${100 - sector.percent}`;
                  const offset = 100 - cumulativePercent;
                  cumulativePercent += sector.percent;
                  return (
                     <circle
                        key={sector.name}
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={colors[i % colors.length]}
                        strokeWidth="12"
                        strokeDasharray={dashArray}
                        strokeDashoffset={offset}
                        className="transition-all duration-500"
                     />
                  )
               })}
               {sectorData.length === 0 && <circle cx="50" cy="50" r="40" fill="none" stroke="#333" strokeWidth="12" />}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
               <span className="text-[10px] text-zinc-500 font-bold uppercase">Settori</span>
            </div>
         </div>
      )
   };

   return (
      <div className="min-h-screen bg-black text-white flex font-sans selection:bg-blue-500/40 selection:text-white antialiased pb-20 md:pb-0">

         {/* Desktop Sidebar */}
         <aside className={`w-80 bg-black border-r border-zinc-800 flex-col sticky top-0 h-screen z-30 hidden md:flex transition-all duration-300 ${selectedTicker ? 'w-0 opacity-0 overflow-hidden border-0' : ''}`}>
            <div className="p-6 border-b border-zinc-900">
               <div className="flex items-center gap-3 text-blue-500">
                  const data = await fetchMarketData(ticker);
                  updates.push({ticker, data});
                  newPrices[ticker] = data.price;
                  if (prevPrices[ticker] && prevPrices[ticker] !== data.price) {
                     newFlashes.add(ticker);
        }
      } catch (e) { /* ignore */}
    }));

    setPrevPrices(prev => ({...prev, ...newPrices }));
                  setFlashingTickers(newFlashes);
    setTimeout(() => {setFlashingTickers(new Set()); }, 800);

    setMarketData(prev => {
       const next = {...prev};
       updates.forEach(u => { if (u) next[u.ticker] = u.data; });
                  return next;
    });
  }, [portfolio, watchlist, selectedTicker, alerts, prevPrices]);

  useEffect(() => {updateMarketData(); }, [portfolio.length, watchlist.length]);
  useEffect(() => {
    const intervalId = setInterval(() => updateMarketData(), REFRESH_RATE);
    return () => clearInterval(intervalId);
  }, [updateMarketData]);

                  // -- Handlers --
                  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
                     setInputTicker(val);
    if (val.length > 1) {
      const results = await searchCompanies(val);
                     setSuggestions(results);
                     setShowSuggestions(true);
    } else {
                        setSuggestions([]);
                     setShowSuggestions(false);
    }
  };

  const selectSuggestion = (company: CompanyInfo) => {
                        setInputTicker(company.symbol);
                     setShowSuggestions(false);
  };

  const handleAddToPortfolio = async (e: React.FormEvent) => {
                        e.preventDefault();
                     if (!inputTicker) return;
                     const info = await getCompanyInfo(inputTicker);
    if (portfolio.some(p => p.ticker === info.symbol)) {alert("Asset già presente"); return; }
                     const newItem: PortfolioItem = {
                        id: Date.now().toString(),
                     ticker: info.symbol,
                     name: info.name,
                     quantity: inputQty ? parseFloat(inputQty) : 0,
                     avgCost: inputCost ? parseFloat(inputCost) : 0
    };
                     setPortfolio([...portfolio, newItem]);
                     resetForm();
  };

  const handleAddToWatchlist = async (e: React.FormEvent) => {
                        e.preventDefault();
                     if (!inputTicker) return;
                     const info = await getCompanyInfo(inputTicker);
    if (watchlist.some(w => w.ticker === info.symbol)) {alert("Asset già presente"); return; }
                     const newItem: WatchlistItem = {id: Date.now().toString(), ticker: info.symbol, name: info.name };
                     setWatchlist([...watchlist, newItem]);
                     resetForm();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    if (activeTab === TabType.PORTFOLIO) handleAddToPortfolio(e);
                     else handleAddToWatchlist(e);
  };

  const resetForm = () => {
                        setInputTicker('');
                     setInputQty('');
                     setInputCost('');
                     setShowSuggestions(false);
                     setIsAddModalOpen(false);
  };

  const handleGlobalChatOpen = () => setIsGlobalChatOpen(true);

  const handleSendGlobalMessage = async (text: string) => {
    const userMsg: ChatMessage = {id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setGlobalChatMessages(prev => [...prev, userMsg]);
                     setIsGlobalChatTyping(true);

    const history = [...globalChatMessages, userMsg].map(m => ({role: m.role, text: m.text }));
                     const responseText = await chatWithPortfolio(history, portfolio, watchlist, marketData);

                     const aiMsg: ChatMessage = {id: (Date.now() + 1).toString(), role: 'ai', text: responseText, timestamp: Date.now() };
    setGlobalChatMessages(prev => [...prev, aiMsg]);
                     setIsGlobalChatTyping(false);
  };

  const handleCheckAlerts = async () => {
                        setIsCheckingAlerts(true);
                     try {
      const tickersWithAlerts: string[] = Array.from(new Set(alerts.filter(a => a.isActive).map(a => a.ticker)));
                     let updatedAlerts = [...alerts];
                     for (const ticker of tickersWithAlerts) {
                        let data = marketData[ticker];
                     if (!data) data = await fetchMarketData(ticker);
                     updatedAlerts = await checkSmartAlerts(updatedAlerts, ticker, data);
      }
                     setAlerts(updatedAlerts);
    } finally {
                        setIsCheckingAlerts(false);
    }
  };

  // -- Stats --
  const stats = useMemo(() => {
                        let totalValue = 0;
                     let totalCost = 0;
                     let dayChangeValue = 0;
                     let bestPerformer: {ticker: string, change: number} | null = null;
                     let worstPerformer: {ticker: string, change: number} | null = null;

    portfolio.forEach(item => {
       const data = marketData[item.ticker];
                     const qty = item.quantity || 0;
                     if(data) {
          const currentVal = data.price * qty;
                     totalValue += currentVal;
                     totalCost += (item.avgCost || 0) * qty;
                     dayChangeValue += currentVal * (data.changePercent / 100);

          if(!bestPerformer || data.changePercent > bestPerformer.change) bestPerformer = {ticker: item.ticker, change: data.changePercent};
                     if(!worstPerformer || data.changePercent < worstPerformer.change) worstPerformer = {ticker: item.ticker, change: data.changePercent};
       }
    });

                     const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
                     return {totalValue, totalPnl, totalPnlPercent, dayChangeValue, bestPerformer, worstPerformer};
  }, [portfolio, marketData]);

  // -- Aggregated News --
  const aggregatedNews = useMemo(() => {
    const allNews: any[] = [];
    const tickers = activeTab === TabType.PORTFOLIO ? portfolio.map(p => p.ticker) : watchlist.map(w => w.ticker);
    tickers.forEach(t => {
      if (marketData[t]?.news) {
                        allNews.push(...marketData[t].news);
      }
    });
    // Shuffle/Sort
    return allNews.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [portfolio, watchlist, marketData, activeTab]);

                     const currentList = activeTab === TabType.PORTFOLIO ? portfolio : watchlist;
  const triggeredAlertsCount = alerts.filter(a => a.status === 'triggered' && !a.isActive).length;

                     return (
                     <div className="min-h-screen bg-[#000000] text-zinc-100 font-sans antialiased pb-20 md:pb-0">

                        {/* --- HEADER (Google Finance Style) --- */}
                        <header className="sticky top-0 z-30 bg-[#000000]/90 backdrop-blur-md border-b border-zinc-800">
                           <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
                              {/* Logo */}
                              <div className="flex items-center gap-2 text-blue-500 shrink-0">
                                 <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                                 </div>
                                 <span className="text-lg font-bold tracking-tight text-white hidden md:block">Alpha-Vision</span>
                              </div>

                              {/* Search Bar (Material Style) */}
                              <div className="flex-1 max-w-2xl relative" ref={searchRef}>
                                 <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-500 transition-colors">
                                       <Icons.Search />
                                    </div>
                                    <input
                                       type="text"
                                       value={inputTicker}
                                       onChange={handleSearchChange}
                                       className="block w-full pl-10 pr-3 py-2.5 border-none rounded-full leading-5 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm shadow-sm transition-all"
                                       placeholder="Cerca azioni, ETF e altro..."
                                    />
                                 </div>
                                 {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-[#1e1f20] rounded-xl shadow-2xl border border-zinc-800 overflow-hidden py-1">
                                       {suggestions.map((c) => (
                                          <button key={c.symbol} onClick={() => selectSuggestion(c)} className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center justify-between group">
                                             <div>
                                                <span className="font-bold text-blue-400">{c.symbol}</span>
                                                <span className="text-zinc-400 text-xs ml-2">{c.name}</span>
                                             </div>
                                             <span className="text-xs text-zinc-600 group-hover:text-zinc-400">{c.sector}</span>
                                          </button>
                                       ))}
                                    </div>
                                 )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                 <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all">
                                    <Icons.Settings />
                                 </button>
                                 <button onClick={() => setIsAlertsOpen(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all relative">
                                    <Icons.Bell />
                                    {triggeredAlertsCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
                                 </button>
                                 <button onClick={() => setIsAddModalOpen(true)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
                                    <Icons.Plus />
                                    <span>Nuovo</span>
                                 </button>
                              </div>
                           </div>
                        </header>

                        <div className="max-w-[1600px] mx-auto flex items-start pt-6 px-4 gap-6">

                           {/* --- SIDEBAR (Desktop) --- */}
                           <aside className="w-64 sticky top-24 hidden lg:block shrink-0 space-y-1">
                              <button onClick={() => setActiveTab(TabType.PORTFOLIO)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-full text-sm font-medium transition-all border-l-4 ${activeTab === TabType.PORTFOLIO ? 'bg-blue-500/10 text-blue-400 border-blue-500' : 'text-zinc-400 hover:bg-zinc-900 border-transparent'}`}>
                                 <Icons.Home /> Portfolio
                              </button>
                              <button onClick={() => setActiveTab(TabType.WATCHLIST)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-full text-sm font-medium transition-all border-l-4 ${activeTab === TabType.WATCHLIST ? 'bg-blue-500/10 text-blue-400 border-blue-500' : 'text-zinc-400 hover:bg-zinc-900 border-transparent'}`}>
                                 <Icons.List /> Watchlist
                              </button>
                              <button onClick={() => setIsAlertsOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-full text-sm font-medium transition-all border-l-4 ${isAlertsOpen ? 'bg-blue-500/10 text-blue-400 border-blue-500' : 'text-zinc-400 hover:bg-zinc-900 border-transparent'}`}>
                                 <Icons.Bell /> Alerts
                              </button>

                              <div className="pt-8 px-4">
                                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Market Overview</h3>
                                 <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                       <span className="text-zinc-400">S&P 500</span>
                                       <span className="text-emerald-400 font-medium">+0.45%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                       <span className="text-zinc-400">Nasdaq</span>
                                       <span className="text-emerald-400 font-medium">+0.82%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                       <span className="text-zinc-400">Bitcoin</span>
                                       <span className="text-rose-400 font-medium">-1.20%</span>
                                    </div>
                                 </div>
                              </div>
                           </aside>

                           {/* --- MAIN CONTENT (Hybrid Grid) --- */}
                           <main className="flex-1 min-w-0 space-y-6">

                              {/* 1. Market Summary Cards (Google Style) */}
                              {activeTab === TabType.PORTFOLIO && (
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#1e1f20] rounded-2xl p-5 border border-zinc-800 shadow-sm relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                          <Icons.TrendingUp />
                                       </div>
                                       <div className="text-zinc-400 text-xs font-medium uppercase mb-1">Valore Totale</div>
                                       <div className="text-2xl font-bold text-white tracking-tight">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                       <div className="mt-2 flex items-center gap-2">
                                          <span className={`text-sm font-medium ${stats.dayChangeValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                             {stats.dayChangeValue >= 0 ? '+' : ''}{stats.dayChangeValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                          </span>
                                          <span className="text-xs text-zinc-500">Oggi</span>
                                       </div>
                                    </div>

                                    <div className="bg-[#1e1f20] rounded-2xl p-5 border border-zinc-800 shadow-sm">
                                       <div className="text-zinc-400 text-xs font-medium uppercase mb-1">P&L Totale</div>
                                       <div className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                          {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </div>
                                       <div className="mt-2">
                                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${stats.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                             {stats.totalPnlPercent.toFixed(2)}% All Time
                                          </span>
                                       </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-900/20 to-[#1e1f20] rounded-2xl p-5 border border-blue-500/20 shadow-sm flex flex-col justify-center items-start">
                                       <div className="flex items-center gap-2 mb-2">
                                          <div className="p-1.5 bg-blue-500 rounded-lg text-white"><Icons.MessageSquare /></div>
                                          <span className="text-sm font-bold text-blue-100">Alpha-Coach</span>
                                       </div>
                                       <p className="text-xs text-blue-200/80 leading-relaxed line-clamp-2">
                                          Il settore Tech sta guidando il tuo portfolio oggi. Controlla le news su {stats.bestPerformer?.ticker || 'i tuoi asset'}.
                                       </p>
                                       <button onClick={handleGlobalChatOpen} className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                          Chiedi all'AI &rarr;
                                       </button>
                                    </div>
                                 </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                 {/* 2. Asset Table with Sparklines (Yahoo Style) */}
                                 <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-[#1e1f20] rounded-2xl border border-zinc-800 overflow-hidden">
                                       <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                                          <h2 className="text-lg font-bold text-white">I tuoi Asset</h2>
                                          <span className="text-xs text-zinc-500">{currentList.length} items</span>
                                       </div>

                                       <div className="overflow-x-auto">
                                          <table className="w-full text-left border-collapse">
                                             <thead>
                                                <tr className="text-xs text-zinc-500 border-b border-zinc-800/50">
                                                   <th className="px-6 py-3 font-medium uppercase tracking-wider">Simbolo</th>
                                                   <th className="px-6 py-3 font-medium uppercase tracking-wider text-right">Prezzo</th>
                                                   <th className="px-6 py-3 font-medium uppercase tracking-wider text-right">Var %</th>
                                                   <th className="px-6 py-3 font-medium uppercase tracking-wider hidden md:table-cell">7 Giorni</th>
                                                   <th className="px-6 py-3 font-medium uppercase tracking-wider text-right">Valore</th>
                                                </tr>
                                             </thead>
                                             <tbody className="divide-y divide-zinc-800/50">
                                                {currentList.map((item) => {
                                                   const data = marketData[item.ticker];
                                                   const price = data?.price || 0;
                                                   const change = data?.changePercent || 0;
                                                   const isPositive = change >= 0;
                                                   const portItem = item as PortfolioItem;
                                                   const isFlashing = flashingTickers.has(item.ticker);

                                                   return (
                                                      <tr
                                                         key={item.id}
                                                         onClick={() => setSelectedTicker(item.ticker)}
                                                         className={`group hover:bg-zinc-800/50 cursor-pointer transition-colors ${isFlashing ? 'bg-zinc-800' : ''}`}
                                                      >
                                                         <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isFlashing ? (isPositive ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white') : 'bg-zinc-800 text-zinc-400 group-hover:text-white'}`}>
                                                                  {item.ticker[0]}
                                                               </div>
                                                               <div>
                                                                  <div className="font-bold text-white text-sm">{item.ticker}</div>
                                                                  <div className="text-xs text-zinc-500 hidden sm:block">{item.name}</div>
                                                               </div>
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-4 text-right">
                                                            <div className={`font-medium tabular-nums text-sm ${isFlashing ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-zinc-200'}`}>
                                                               ${price.toFixed(2)}
                                                            </div>
                                                         </td>
                                                         <td className="px-6 py-4 text-right">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tabular-nums ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                               {isPositive ? '+' : ''}{change.toFixed(2)}%
                                                            </span>
                                                         </td>
                                                         <td className="px-6 py-4 hidden md:table-cell w-32">
                                                            <Sparkline data={data?.chartData || []} width={100} height={30} />
                                                         </td>
                                                         <td className="px-6 py-4 text-right">
                                                            <div className="font-medium tabular-nums text-sm text-white">
                                                               ${activeTab === TabType.PORTFOLIO ? (price * (portItem.quantity || 0)).toFixed(2) : (data?.marketCap || '--')}
                                                            </div>
                                                         </td>
                                                      </tr>
                                                   )
                                                })}
                                             </tbody>
                                          </table>
                                          {currentList.length === 0 && (
                                             <div className="p-12 text-center text-zinc-500 text-sm">
                                                Nessun asset trovato. Usa il tasto "Nuovo" per iniziare.
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>

                                 {/* 3. Sidebar Widgets (Heatmap & News) */}
                                 <div className="space-y-6">
                                    {/* Heatmap Widget */}
                                    <div className="bg-[#1e1f20] rounded-2xl border border-zinc-800 p-4">
                                       <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Market Heatmap</h3>
                                       <MarketHeatmap portfolio={portfolio} marketData={marketData} onSelect={setSelectedTicker} />
                                    </div>

                                    {/* News Feed Widget */}
                                    <NewsFeed news={aggregatedNews} />
                                 </div>
                              </div>

                           </main>
                        </div>

                        {/* --- MODALS & OVERLAYS --- */}

                        {/* Detail View Overlay */}
                        {selectedTicker && (
                           <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                              <div className="w-full max-w-5xl h-[90vh] bg-[#000000] rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl relative">
                                 <button onClick={() => setSelectedTicker(null)} className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-full text-white hover:bg-zinc-800 z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                 </button>
                              </div>

                              <div className="p-4 flex-1 overflow-y-auto space-y-6">
                                 {/* Add Asset Box (Desktop) */}
                                 <div className="bg-zinc-900/30 rounded-xl p-5 border border-zinc-800/50">
                                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                                       Nuovo Asset
                                    </h3>
                                    <form onSubmit={activeTab === TabType.PORTFOLIO ? handleAddToPortfolio : handleAddToWatchlist} className="space-y-3">

                                       <div className="relative" ref={searchRef}>
                                          <div className="flex items-center bg-black rounded-lg border border-zinc-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden group">
                                             <div className="pl-3 text-zinc-500 group-focus-within:text-blue-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.72 0 3.31-.67 4.53-1.81l.28.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
                                             </div>
                                             <input
                                                type="text"
                                                value={inputTicker}
                                                onChange={handleSearchChange}
                                                className="w-full bg-transparent border-none text-sm text-white placeholder-zinc-600 px-3 py-2.5 focus:ring-0 outline-none font-medium"
                                                placeholder="Cerca ticker..."
                                             />
                                          </div>
                                          {showSuggestions && suggestions.length > 0 && (
                                             <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] rounded-lg shadow-xl overflow-hidden border border-zinc-800">
                                                {suggestions.map((c) => (
                                                   <button key={c.symbol} type="button" onClick={() => selectSuggestion(c)} className="w-full text-left px-4 py-3 hover:bg-zinc-900 text-sm text-white border-b border-zinc-800 last:border-0 transition-colors">
                                                      <span className="font-bold text-blue-400">{c.symbol}</span> <span className="text-zinc-400 text-xs ml-1 truncate block">{c.name}</span>
                                                   </button>
                                                ))}
                                             </div>
                                          )}
                                       </div>

                                       {activeTab === TabType.PORTFOLIO && (
                                          <div className="grid grid-cols-2 gap-2">
                                             <input type="number" placeholder="Q.tà" value={inputQty} onChange={e => setInputQty(e.target.value)} className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-zinc-600 font-medium transition-all" />
                                             <input type="number" placeholder="Prezzo" value={inputCost} onChange={e => setInputCost(e.target.value)} className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-zinc-600 font-medium transition-all" />
                                          </div>
                                       )}

                                       <button type="submit" disabled={!inputTicker} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-blue-900/10">
                                          Aggiungi
                                       </button>
                                    </form>
                                 </div>
                              </div>
                           </aside>

         {/* Main Area */}
                        <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
                           {selectedTicker ? (
                              <CompanyDetailView
                                 ticker={selectedTicker}
                                 data={marketData[selectedTicker]}
                                 info={getCompanyInfoSync(selectedTicker)}
                                 onClose={() => setSelectedTicker(null)}
                                 onAnalyze={() => handleGlobalChatOpen()}
                              />
                           ) : (
                              <>
                                 {/* Dashboard Header */}
                                 <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-zinc-800 pt-6 px-4 md:px-8 pb-4">
                                    {/* Top Bar */}
                                    <div className="flex items-center justify-between mb-6">
                                       <div className="flex gap-8">
                                          <button onClick={() => handleTabChange(TabType.PORTFOLIO)} className={`text-sm font-bold uppercase tracking-wide transition-all pb-1 border-b-[2px] px-1 ${activeTab === TabType.PORTFOLIO ? 'text-blue-500 border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                                             Il Mio Portfolio
                                          </button>
                                          <button onClick={() => handleTabChange(TabType.WATCHLIST)} className={`text-sm font-bold uppercase tracking-wide transition-all pb-1 border-b-[2px] px-1 ${activeTab === TabType.WATCHLIST ? 'text-blue-500 border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                                             Watchlist
                                          </button>
                                       </div>
                                       <button onClick={() => setIsAlertsOpen(true)} className="relative group p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white hidden md:block">
                                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full z-10 ${triggeredAlertsCount > 0 ? 'bg-rose-500 animate-ping' : 'hidden'}`}></div>
                                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full z-10 ${triggeredAlertsCount > 0 ? 'bg-rose-500' : 'hidden'}`}></div>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" /></svg>
                                       </button>
                                    </div>

                                    {/* Summary Dashboard (Only for Portfolio Tab) */}
                                    {activeTab === TabType.PORTFOLIO && (
                                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-2 animate-in slide-in-from-top-4 duration-500">
                                          {/* Stats Column */}
                                          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                                             <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
                                                </div>
                                                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Valore Totale</div>
                                                <div className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tight">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                             </div>

                                             <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z" /></svg>
                                                </div>
                                                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">P&L Totale</div>
                                                <div className="flex items-baseline gap-2">
                                                   <span className={`text-xl md:text-2xl font-bold tabular-nums tracking-tight ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                      {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                   </span>
                                                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stats.totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                      {stats.totalPnlPercent.toFixed(2)}%
                                                   </span>
                                                </div>
                                             </div>

                                             <div className="hidden md:flex bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 flex-col justify-center relative overflow-hidden">
                                                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Variazione Giornaliera</div>
                                                <div className={`text-xl font-bold tabular-nums tracking-tight mb-1 ${stats.dayChangeValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                   {stats.dayChangeValue >= 0 ? '+' : ''}{stats.dayChangeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] text-zinc-600 font-medium flex items-center gap-1">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                                                   Intraday Est.
                                                </div>
                                             </div>
                                          </div>

                                          {/* Sector Distribution Card */}
                                          <div className="md:col-span-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                                             <div className="flex-1 pr-4 min-w-0">
                                                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Diversificazione</div>
                                                <div className="space-y-1.5">
                                                   {sectorData.slice(0, 3).map((s, i) => (
                                                      <div key={s.name} className="flex items-center justify-between text-[11px]">
                                                         <div className="flex items-center gap-1.5 truncate">
                                                            <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'][i] }}></span>
                                                            <span className="text-zinc-300 truncate">{s.name}</span>
                                                         </div>
                                                         <span className="text-white font-medium">{s.percent.toFixed(0)}%</span>
                                                      </div>
                                                   ))}
                                                </div>
                                             </div>
                                             {renderDonutChart()}
                                          </div>
                                       </div>
                                    )}
                                 </header>

                                 <div className="flex-1 overflow-y-auto pb-32 scroll-smooth no-scrollbar">
                                    <div className="max-w-7xl mx-auto">

                                       {/* Table Header */}
                                       <div className="grid grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-3 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-black/50 backdrop-blur-sm sticky top-0 z-10">
                                          <div className="col-span-4 pl-2">Asset</div>
                                          <div className="col-span-4 text-right">Prezzo</div>
                                          <div className="col-span-4 text-right pr-2">{activeTab === TabType.PORTFOLIO ? 'Valore' : 'Cap.'}</div>
                                       </div>

                                       {/* Table Rows */}
                                       <div className="bg-black">
                                          {currentList.map((item) => {
                                             const data = marketData[item.ticker];
                                             const price = data?.price || 0;
                                             const change = data?.changePercent || 0;
                                             const isPositive = change >= 0;
                                             const portItem = item as PortfolioItem;
                                             const isFlashing = flashingTickers.has(item.ticker);

                                             return (
                                                <div
                                                   key={item.id}
                                                   onClick={() => handleSelectStock(item.ticker)}
                                                   className={`group grid grid-cols-12 gap-2 md:gap-4 items-center px-4 md:px-6 py-4 border-b border-zinc-800/50 cursor-pointer transition-all duration-300 active:bg-zinc-800 ${isFlashing ? (isPositive ? 'bg-emerald-900/10' : 'bg-rose-900/10') : ''}`}
                                                >
                                                   {/* 1. Asset Column */}
                                                   <div className="col-span-4 pl-2 flex items-center gap-3">
                                                      <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-300 ${isFlashing ? (isPositive ? 'bg-emerald-500 text-black scale-110' : 'bg-rose-500 text-white scale-110') : 'bg-zinc-900 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white'}`}>
                                                         {item.ticker[0]}
                                                      </div>
                                                      <div className="min-w-0">
                                                         <div className="font-bold text-white text-sm tracking-tight leading-none truncate">{item.ticker}</div>
                                                         <div className="text-[10px] text-zinc-500 font-medium mt-1 truncate hidden sm:block">{item.name}</div>
                                                         {portItem.quantity && portItem.quantity > 0 && (
                                                            <div className="text-[10px] text-zinc-500 font-medium mt-1 sm:hidden">{portItem.quantity} azioni</div>
                                                         )}
                                                      </div>
                                                   </div>

                                                   {/* 2. Price Column */}
                                                   <div className="col-span-4 text-right flex flex-col items-end justify-center">
                                                      <div className={`font-semibold tabular-nums text-sm transition-colors duration-300 ${isFlashing ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}`}>
                                                         ${price.toFixed(2)}
                                                      </div>
                                                      <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums transition-all duration-300 ${isFlashing ? 'scale-105' : ''} ${isPositive ? 'text-emerald-400 bg-emerald-900/10' : 'text-rose-400 bg-rose-900/10'}`}>
                                                         {isPositive ? '+' : ''}{change.toFixed(2)}%
                                                      </span>
                                                   </div>

                                                   {/* 3. Value Column */}
                                                   <div className="col-span-4 text-right pr-2 flex flex-col items-end justify-center">
                                                      {activeTab === TabType.PORTFOLIO && portItem.quantity
                                                         ? (
                                                            <>
                                                               <div className="tabular-nums text-sm font-medium text-zinc-200">${(price * portItem.quantity).toFixed(2)}</div>
                                                               <div className="mt-0.5 opacity-90">{renderPnl(price, portItem.avgCost, portItem.quantity)}</div>
                                                            </>
                                                         )
                                                         : <div className="tabular-nums text-xs text-zinc-500">{data?.marketCap || '--'}</div>
                                                      }
                                                   </div>
                                                </div>
                                             )
                                          })}

                                          {currentList.length === 0 && (
                                             <div className="text-center py-20 md:py-32">
                                                <p className="text-white font-bold text-lg mb-2">Nessun asset tracciato</p>
                                                <p className="text-zinc-500 text-sm max-w-xs mx-auto px-4">Usa il pulsante + per aggiungere azioni.</p>
                                             </div>
                                          )}

                                       </div>
                                    </div>
                                 </div>
                              </>
                           )}
                        </main>

                        {/* Mobile Bottom Navigation Bar */}
                        {!selectedTicker && (
                           <div className="md:hidden fixed bottom-0 inset-x-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 pb-safe pt-2 z-40 flex justify-around items-center h-20">
                              <button onClick={() => handleTabChange(TabType.PORTFOLIO)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === TabType.PORTFOLIO ? 'text-blue-500' : 'text-zinc-500'}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z" /></svg>
                                 <span className="text-[10px] font-bold">Portfolio</span>
                              </button>
                              <button onClick={() => handleTabChange(TabType.WATCHLIST)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === TabType.WATCHLIST ? 'text-blue-500' : 'text-zinc-500'}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-1.34-3-3-3z" /></svg>
                                 <span className="text-[10px] font-bold">Watchlist</span>
                              </button>
                              <button onClick={() => handleTabChange(TabType.ALERTS)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${isAlertsOpen ? 'text-rose-500' : 'text-zinc-500'}`}>
                                 <div className="relative">
                                    {triggeredAlertsCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" /></svg>
                                 </div>
                                 <span className="text-[10px] font-bold">Alerts</span>
                              </button>
                           </div>
                        )}

                        {/* Fixed FAB Container - Moved outside main to be truly fixed above all content */}
                        {!selectedTicker && (
                           <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-center gap-4">
                              {/* Add Asset FAB */}
                              <button
                                 onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(10);
                                    setIsAddModalOpen(true);
                                 }}
                                 className="flex md:hidden items-center justify-center w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg border border-zinc-700 transition-all hover:scale-110 active:scale-95"
                              >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                              </button>

                              {/* Chat FAB */}
                              <button
                                 onClick={handleGlobalChatOpen}
                                 className="group relative flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all hover:scale-110 active:scale-95"
                              >
                                 <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse"></div>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                                 </svg>
                              </button>
                           </div>
                        )}

                        {/* Global Chat Panel */}
                        <GlobalChatPanel
                           isOpen={isGlobalChatOpen}
                           onClose={() => setIsGlobalChatOpen(false)}
                           messages={globalChatMessages}
                           onSendMessage={handleSendGlobalMessage}
                           isTyping={isGlobalChatTyping}
                           bestPerformer={activeTab === TabType.PORTFOLIO ? stats.bestPerformer : null}
                           worstPerformer={activeTab === TabType.PORTFOLIO ? stats.worstPerformer : null}
                        />

                        {/* Smart Alerts Modal */}
                        <AlertsModal
                           isOpen={isAlertsOpen}
                           onClose={() => setIsAlertsOpen(false)}
                           alerts={alerts}
                           onAddAlert={(alert) => setAlerts([...alerts, alert])}
                           onCheckAlerts={handleCheckAlerts}
                           isChecking={isCheckingAlerts}
                        />

                        {/* Add Asset Modal */}
                        <AddAssetModal
                           isOpen={isAddModalOpen}
                           onClose={() => setIsAddModalOpen(false)}
                           activeTab={activeTab}
                           searchTerm={inputTicker}
                           onSearchChange={handleSearchChange}
                           suggestions={suggestions}
                           onSelectSuggestion={selectSuggestion}
                           qty={inputQty}
                           setQty={setInputQty}
                           cost={inputCost}
                           setCost={setInputCost}
                           onAdd={handleAddSubmit}
                        />
                     </div>
                     );
};

                     export default App;
