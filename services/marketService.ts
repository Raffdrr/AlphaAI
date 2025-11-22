
import { MarketData, CompanyInfo, NewsItem, CandleData } from '../types';

// --- CONFIGURAZIONE API ---
let API_KEY = '';
let USE_REAL_DATA = false;

export const setMarketApiKey = (key: string) => {
  API_KEY = key;
  USE_REAL_DATA = !!key && key.length > 5; // Basic validation
};

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// --- MOCK DATA (FALLBACK) ---
const STOCK_DB: CompanyInfo[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    description: 'Apple Inc. progetta, produce e commercializza smartphone, personal computer, tablet, dispositivi indossabili e accessori in tutto il mondo.',
    ceo: 'Tim Cook',
    founded: '1 apr 1976',
    headquarters: 'Cupertino, California',
    website: 'apple.com',
    employees: '164.000'
  },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', description: 'Microsoft Corporation sviluppa software, servizi e soluzioni.', ceo: 'Satya Nadella' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto Manufacturers', description: 'Tesla produce veicoli elettrici.', ceo: 'Elon Musk' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Software', description: 'Salesforce è leader nel CRM cloud.', ceo: 'Marc Benioff' },
];

// --- TECHNICAL INDICATORS MATH ---

export const calculateSMA = (data: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

export const calculateEMA = (data: number[], period: number): number[] => {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let initialSum = 0;
  for (let i = 0; i < period; i++) initialSum += data[i];
  let prevEma = initialSum / period;
  for (let i = 0; i < period - 1; i++) ema.push(NaN);
  ema.push(prevEma);
  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] * k) + (prevEma * (1 - k));
    ema.push(currentEma);
    prevEma = currentEma;
  }
  return ema;
};

export const calculateBollingerBands = (data: number[], period: number, multiplier: number = 2) => {
  const bands: { upper: number[], lower: number[], middle: number[] } = { upper: [], lower: [], middle: [] };
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      bands.middle.push(NaN);
      bands.upper.push(NaN);
      bands.lower.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
    bands.middle.push(mean);
    bands.upper.push(mean + (stdDev * multiplier));
    bands.lower.push(mean - (stdDev * multiplier));
  }
  return bands;
};

// --- API HELPERS ---

// Cache semplice per evitare di bruciare le chiamate API gratuite
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minuto

async function fetchWithCache(url: string) {
  const now = Date.now();
  if (cache[url] && (now - cache[url].timestamp < CACHE_DURATION)) {
    return cache[url].data;
  }
  try {
    const res = await fetch(url);
    const data = await res.json();
    // Check for API Error (FMP returns error messages sometimes)
    if (data['Error Message']) throw new Error(data['Error Message']);

    cache[url] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error("API Fetch Error:", error);
    return null;
  }
}

// --- MAIN FUNCTIONS ---

export const searchCompanies = async (query: string): Promise<CompanyInfo[]> => {
  if (!query) return [];

  if (USE_REAL_DATA) {
    const url = `${BASE_URL}/search?query=${query}&limit=5&apikey=${API_KEY}`;
    const data = await fetchWithCache(url);
    if (data && Array.isArray(data)) {
      return data.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        sector: item.sector || 'Unknown' // L'endpoint search a volte non ha il settore completo
      }));
    }
  }

  // Fallback Mock
  const lowerQ = query.toLowerCase();
  return STOCK_DB.filter(c => c.symbol.toLowerCase().includes(lowerQ) || c.name.toLowerCase().includes(lowerQ)).slice(0, 5);
};

export const getCompanyInfo = async (ticker: string): Promise<CompanyInfo> => {
  const upperTicker = ticker.toUpperCase();

  if (USE_REAL_DATA) {
    const url = `${BASE_URL}/profile/${upperTicker}?apikey=${API_KEY}`;
    const data = await fetchWithCache(url);
    if (data && Array.isArray(data) && data.length > 0) {
      const p = data[0];
      return {
        symbol: p.symbol,
        name: p.companyName,
        sector: p.sector,
        description: p.description,
        ceo: p.ceo,
        founded: 'N/A', // FMP profile non sempre ha founded date preciso in questo endpoint
        headquarters: `${p.city}, ${p.state || p.country}`,
        website: p.website,
        employees: p.fullTimeEmployees
      };
    }
  }

  // Fallback Mock
  const found = STOCK_DB.find(c => c.symbol === upperTicker);
  return found || { symbol: upperTicker, name: upperTicker, sector: 'Other' };
};

// Wrapper sincrono per compatibilità UI immediata (in un'app reale useremmo React Query o useEffect asincroni ovunque)
// Per ora usiamo una versione semplificata che ritorna i dati mock se la chiamata async non è pronta o gestita nei componenti
export const getCompanyInfoSync = (ticker: string): CompanyInfo => {
  const found = STOCK_DB.find(c => c.symbol === ticker.toUpperCase());
  return found || { symbol: ticker.toUpperCase(), name: ticker.toUpperCase(), sector: 'Other' };
}

// --- CHART GENERATORS (MOCK) ---
const generateMockCandles = (basePrice: number, count: number): CandleData[] => {
  const candles: CandleData[] = [];
  let currentClose = basePrice;
  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.008;
    const move = (Math.random() - 0.5) * volatility * 2;
    const close = currentClose;
    const open = close - move;
    const high = Math.max(open, close) + (Math.random() * volatility * 0.5);
    const low = Math.min(open, close) - (Math.random() * volatility * 0.5);
    candles.unshift({ time: `${count - i}m ago`, open, high, low, close });
    currentClose = open + ((Math.random() - 0.5) * volatility * 0.5);
  }
  return candles;
};

export const getChartDataForRange = async (basePrice: number, range: string, ticker: string): Promise<{ line: number[], candles: CandleData[] }> => {

  if (USE_REAL_DATA) {
    // Mapping range to FMP endpoints logic
    let endpoint = 'historical-chart/5min'; // Default 1G/5G

    if (range === '1M') { endpoint = 'historical-price-full'; } // Daily logic needed

    const url = `${BASE_URL}/${endpoint}/${ticker}?apikey=${API_KEY}`;
    // Nota: Endpoint 'historical-price-full' è diverso da 'historical-chart'. 
    // Per semplicità demo, usiamo 15min per grafici intraday estesi se disponibile nel free tier
    const data = await fetchWithCache(url);

    if (data && Array.isArray(data)) {
      const candles: CandleData[] = data.slice(0, 100).reverse().map((d: any) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));
      return { line: candles.map(c => c.close), candles };
    } else if (data && data.historical) {
      // Handling 'historical-price-full' format
      const candles: CandleData[] = data.historical.slice(0, 100).reverse().map((d: any) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));
      return { line: candles.map(c => c.close), candles };
    }
  }

  // Mock Generation
  let points = 80;
  switch (range) {
    case '1G': points = 80; break;
    case '5G': points = 100; break;
    case '1M': points = 60; break;
    case '6M': points = 120; break;
    default: points = 80;
  }
  const candles = generateMockCandles(basePrice, points);
  return { line: candles.map(c => c.close), candles };
};

// Sync wrapper for compatibility
export const getChartDataForRangeSync = (basePrice: number, range: string) => {
  const candles = generateMockCandles(basePrice, 80);
  return { line: candles.map(c => c.close), candles };
}

export const fetchMarketData = async (ticker: string): Promise<MarketData> => {
  const upperTicker = ticker.toUpperCase();

  // --- REAL DATA BRANCH ---
  if (USE_REAL_DATA) {
    try {
      // 1. Quote
      const quoteUrl = `${BASE_URL}/quote/${upperTicker}?apikey=${API_KEY}`;
      const quoteData = await fetchWithCache(quoteUrl);

      // 2. News
      const newsUrl = `${BASE_URL}/stock_news?tickers=${upperTicker}&limit=5&apikey=${API_KEY}`;
      const newsData = await fetchWithCache(newsUrl);

      // 3. Chart (Intraday)
      const chartUrl = `${BASE_URL}/historical-chart/5min/${upperTicker}?apikey=${API_KEY}`;
      const chartDataRaw = await fetchWithCache(chartUrl);

      if (quoteData && quoteData.length > 0) {
        const q = quoteData[0];

        // Parse News
        const news: NewsItem[] = Array.isArray(newsData) ? newsData.map((n: any, i: number) => ({
          id: `news-${i}`,
          title: n.title,
          source: n.site,
          timeAgo: n.publishedDate.split(' ')[1], // Simple time extraction
          imageUrl: n.image,
          sentimentScore: 0, // FMP free tier doesn't give sentiment score easily in this endpoint
          sentimentLabel: 'Neutral',
          associatedChartIndex: undefined
        })) : [];

        // Parse Chart
        const candles: CandleData[] = Array.isArray(chartDataRaw) ? chartDataRaw.slice(0, 80).reverse().map((c: any) => ({
          time: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        })) : generateMockCandles(q.price, 80); // Fallback if chart fails

        const lineData = candles.map(c => c.close);

        return {
          price: q.price,
          changePercent: q.changesPercentage,
          changeAmount: q.change,
          volume: (q.volume / 1000000).toFixed(2) + 'M',
          marketCap: (q.marketCap / 1000000000).toFixed(2) + 'B',
          peRatio: q.pe ? q.pe.toFixed(2) : '--',
          dividendYield: '--', // Needed from another endpoint usually
          rsi: 50, // Calculation needed or separate endpoint
          news: news,
          chartData: lineData,
          candles: candles
        };
      }
    } catch (e) {
      console.warn("Real Data Fetch Failed, reverting to Mock", e);
    }
  }

  // --- MOCK DATA BRANCH (Original Logic) ---
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Random Walk Logic
  const basePrice = 100 + (upperTicker.charCodeAt(0) % 10) * 10;
  const chartRes = getChartDataForRangeSync(basePrice, '1G');
  const currentPrice = chartRes.candles[chartRes.candles.length - 1].close;

  const newsSources = ['Yahoo Finance', 'Seeking Alpha', 'Bloomberg', 'MarketWatch'];
  const news: NewsItem[] = Array.from({ length: 4 }).map((_, i) => ({
    id: `${Date.now()}-${i}`,
    title: `Breaking News for ${upperTicker}`,
    source: newsSources[Math.floor(Math.random() * newsSources.length)],
    timeAgo: `${i + 1}h ago`,
    imageUrl: `https://ui-avatars.com/api/?name=${upperTicker}&background=random&color=fff&size=128`,
    sentimentScore: 0,
    sentimentLabel: 'Neutral',
    associatedChartIndex: Math.floor(Math.random() * 50)
  }));

  return {
    price: parseFloat(currentPrice.toFixed(2)),
    changePercent: parseFloat(((Math.random() * 4) - 2).toFixed(2)),
    changeAmount: parseFloat(((Math.random() * 4) - 2).toFixed(2)),
    volume: '15.4M',
    marketCap: '2.1T',
    peRatio: '32.5',
    dividendYield: '0.5%',
    rsi: Math.floor(Math.random() * 40 + 30),
    news: news,
    chartData: chartRes.line,
    candles: chartRes.candles
  };
};
