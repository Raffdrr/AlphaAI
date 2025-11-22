
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  imageUrl?: string;
  sentimentScore: number; // -1 to 1 (Negative to Positive)
  sentimentLabel: 'Positive' | 'Negative' | 'Neutral';
  associatedChartIndex?: number; // To map onto the chart
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketData {
  price: number;
  changePercent: number;
  changeAmount: number;
  volume: string;
  marketCap?: string;
  peRatio?: string;
  dividendYield?: string;
  rsi: number; 
  news: NewsItem[]; 
  chartData: number[]; // Intraday simulated prices (Legacy Line)
  candles: CandleData[]; // OHLC Data
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  name?: string;
  quantity?: number; 
  avgCost?: number; 
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name?: string;
}

export interface AnalysisResult {
  ticker: string;
  content: string;
  timestamp: number;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  sector?: string;
  description?: string;
  ceo?: string;
  founded?: string;
  headquarters?: string;
  website?: string;
  employees?: string;
}

export interface SmartAlert {
  id: string;
  ticker: string;
  condition: string; // "If CEO resigns", "If sentiment drops below neutral"
  isActive: boolean;
  lastChecked?: number;
  status?: 'triggered' | 'safe' | 'pending';
  triggerReason?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export enum TabType {
  PORTFOLIO = 'PORTFOLIO',
  WATCHLIST = 'WATCHLIST',
  ALERTS = 'ALERTS' // Added for Mobile Nav
}
