import React from 'react';
import { PortfolioItem, MarketData } from '../types';

interface MarketHeatmapProps {
    portfolio: PortfolioItem[];
    marketData: Record<string, MarketData>;
    onSelect: (ticker: string) => void;
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ portfolio, marketData, onSelect }) => {
    if (portfolio.length === 0) return null;

    // Sort by value (mock "Market Cap" or Portfolio Value) to determine size
    const sortedItems = [...portfolio].sort((a, b) => {
        const valA = (marketData[a.ticker]?.price || 0) * (a.quantity || 0);
        const valB = (marketData[b.ticker]?.price || 0) * (b.quantity || 0);
        return valB - valA;
    });

    // Total Value for sizing
    const totalValue = sortedItems.reduce((acc, item) => {
        return acc + ((marketData[item.ticker]?.price || 0) * (item.quantity || 0));
    }, 0);

    return (
        <div className="w-full h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800 p-1 overflow-hidden flex flex-wrap content-start">
            {sortedItems.map((item) => {
                const data = marketData[item.ticker];
                const price = data?.price || 0;
                const change = data?.changePercent || 0;
                const value = price * (item.quantity || 0);
                const percentShare = totalValue > 0 ? (value / totalValue) * 100 : 0;

                // Determine Color
                let bgClass = 'bg-zinc-800';
                if (change > 3) bgClass = 'bg-emerald-500';
                else if (change > 0) bgClass = 'bg-emerald-600/80';
                else if (change > -3) bgClass = 'bg-rose-600/80';
                else bgClass = 'bg-rose-600';

                // Determine Size (Simplified Flex Basis)
                // We use a min-width to ensure visibility
                const flexBasis = `${Math.max(percentShare, 15)}%`;
                const flexGrow = percentShare > 10 ? 2 : 1;

                return (
                    <button
                        key={item.ticker}
                        onClick={() => onSelect(item.ticker)}
                        style={{ flexBasis, flexGrow }}
                        className={`h-1/2 md:h-full p-1 transition-all hover:scale-[0.98] hover:z-10`}
                    >
                        <div className={`w-full h-full rounded-lg ${bgClass} flex flex-col items-center justify-center text-white p-2 shadow-inner border border-white/5`}>
                            <span className="font-bold text-xs md:text-sm truncate">{item.ticker}</span>
                            <span className="text-[10px] font-medium">{change > 0 ? '+' : ''}{change.toFixed(2)}%</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default MarketHeatmap;
