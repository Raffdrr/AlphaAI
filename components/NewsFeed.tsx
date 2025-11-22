import React from 'react';
import { NewsItem } from '../types';

interface NewsFeedProps {
    news: NewsItem[];
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
    if (!news || news.length === 0) return (
        <div className="text-zinc-500 text-sm p-4 text-center">Nessuna notizia recente.</div>
    );

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white px-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" /></svg>
                Market News
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {news.map((item) => (
                    <a
                        key={item.id}
                        href="#" // In real app, this would be item.url
                        className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 flex gap-4 transition-all hover:bg-zinc-900"
                    >
                        {/* Image Thumbnail */}
                        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-zinc-800 relative">
                            <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                        {item.source}
                                    </span>
                                    <span className="text-[10px] text-zinc-500">{item.timeAgo}</span>
                                </div>
                                <h4 className="text-sm font-semibold text-zinc-200 leading-snug group-hover:text-white transition-colors line-clamp-2">
                                    {item.title}
                                </h4>
                            </div>

                            {/* Sentiment Badge (Mock) */}
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${item.sentimentLabel === 'Bullish' ? 'bg-emerald-500' : item.sentimentLabel === 'Bearish' ? 'bg-rose-500' : 'bg-zinc-500'}`}></div>
                                <span className="text-[10px] text-zinc-500 font-medium">{item.sentimentLabel || 'Neutral'} Analysis</span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default NewsFeed;
