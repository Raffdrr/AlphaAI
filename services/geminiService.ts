
import { GoogleGenAI, Type } from "@google/genai";
import { MarketData, SmartAlert, PortfolioItem, WatchlistItem } from "../types";

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const modelName = "gemini-2.5-flash";

export const setGeminiApiKey = (key: string) => {
  if (key && key.length > 10) {
    ai = new GoogleGenAI({ apiKey: key });
  } else {
    ai = null;
  }
};

const getModel = () => {
  if (!ai) throw new Error("Gemini API Key non configurata.");
  return ai;
};

export const chatWithAlphaVision = async (
  ticker: string,
  history: { role: 'user' | 'ai', text: string }[],
  marketData: MarketData
): Promise<string> => {
  try {
    if (!ai) return "Per favore configura la Gemini API Key nelle impostazioni.";

    // Format recent candle data for context if available
    const candleContext = marketData.candles && marketData.candles.length > 0
      ? marketData.candles.slice(-10).map(c =>
        `[O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}]`
      ).join(', ')
      : "Dati candele non disponibili.";

    const systemPrompt = `
      Sei Alpha-Vision, un assistente finanziario esperto in analisi tecnica e fondamentale. 
      Stai discutendo del titolo ${ticker}.
      
      DATI REAL-TIME:
      Prezzo Attuale: ${marketData.price}
      RSI: ${marketData.rsi}
      News recenti: ${marketData.news.map(n => n.title).join('; ')}.
      
      DATI TECNICI (ULTIME 10 CANDELE):
      ${candleContext}

      ISTRUZIONI:
      - Se l'utente chiede del grafico o delle candele, analizza i pattern OHLC (es. Doji, Hammer, trend rialzista/ribassista).
      - Spiega cosa significano le candele recenti per il trend a breve termine.
      - Sii conciso, professionale e usa termini corretti (supporto, resistenza, volatilità).
      - Usa markdown per formattare la risposta.
    `;

    const contents = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const response = await getModel().models.generateContent({
      model: modelName,
      contents: contents,
      config: { systemInstruction: systemPrompt }
    });

    return response.text || "Non ho capito, puoi riformulare?";
  } catch (error) {
    console.error("Chat Error", error);
    return "Errore di connessione al cervello AI. Controlla la tua API Key.";
  }
};

// -- NEW: Global Portfolio Chat --
export const chatWithPortfolio = async (
  history: { role: 'user' | 'ai', text: string }[],
  portfolio: PortfolioItem[],
  watchlist: WatchlistItem[],
  marketData: Record<string, MarketData>
): Promise<string> => {
  try {
    if (!ai) return "Per favore configura la Gemini API Key nelle impostazioni.";

    // 1. Build Context String
    let context = "DATI PORTFOLIO UTENTE:\n";

    if (portfolio.length === 0) context += "Il portfolio è vuoto.\n";
    portfolio.forEach(p => {
      const data = marketData[p.ticker];
      if (data) {
        const val = data.price * (p.quantity || 0);
        const cost = (p.avgCost || 0) * (p.quantity || 0);
        const pnl = val - cost;
        context += `- ${p.ticker}: Qty ${p.quantity}, Prezzo $${data.price}, P&L Totale $${pnl.toFixed(2)}. News: ${data.news[0]?.title || 'Nessuna'}\n`;
      }
    });

    context += "\nDATI WATCHLIST:\n";
    if (watchlist.length === 0) context += "La watchlist è vuota.\n";
    watchlist.forEach(w => {
      const data = marketData[w.ticker];
      if (data) {
        context += `- ${w.ticker}: Prezzo $${data.price}, Var ${data.changePercent}%. News: ${data.news[0]?.title || 'Nessuna'}\n`;
      }
    });

    const systemPrompt = `
      Sei Alpha-Vision Global Assistant. Hai una visione completa del portafoglio e della watchlist dell'utente.
      
      CONTESTO DATI ATTUALI:
      ${context}

      OBIETTIVO:
      Rispondi alle domande dell'utente analizzando i dati forniti.
      - Se chiedono "Come va il portfolio?", fai una somma mentale dei P&L e dai un giudizio generale basato anche sulle notizie.
      - Se chiedono di un settore, raggruppa i titoli (es. AAPL, MSFT -> Tech).
      - Sii proattivo: se vedi un titolo in forte perdita o con brutte notizie, segnalalo.
      - Usa formattazione Markdown (grassetto per i ticker, liste puntate).
    `;

    const contents = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const response = await getModel().models.generateContent({
      model: modelName,
      contents: contents,
      config: { systemInstruction: systemPrompt }
    });

    return response.text || "Non riesco ad analizzare il portfolio al momento.";

  } catch (error) {
    console.error("Global Chat Error", error);
    return "Si è verificato un errore nella connessione con Alpha-Vision Global. Controlla la tua API Key.";
  }
};

export const checkSmartAlerts = async (alerts: SmartAlert[], ticker: string, data: MarketData): Promise<SmartAlert[]> => {
  if (alerts.length === 0) return alerts;
  const activeAlerts = alerts.filter(a => a.ticker === ticker && a.isActive);
  if (activeAlerts.length === 0) return alerts;
  if (!ai) return alerts; // No AI, no smart alerts

  const prompt = `
    Dati ${ticker}: Prezzo ${data.price}, Var% ${data.changePercent}, News: ${data.news.map(n => n.title).join(' | ')}.
    Regole: ${activeAlerts.map(a => `ID:${a.id} "${a.condition}"`).join('\n')}
    Output JSON Array: [{id, triggered, reason}]
  `;

  try {
    const response = await getModel().models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              triggered: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["id", "triggered", "reason"]
          }
        }
      }
    });
    const results = JSON.parse(response.text || '[]');
    const updatedAlerts = [...alerts];
    results.forEach((res: any) => {
      const idx = updatedAlerts.findIndex(a => a.id === res.id);
      if (idx !== -1 && res.triggered) {
        updatedAlerts[idx].status = 'triggered';
        updatedAlerts[idx].triggerReason = res.reason;
        updatedAlerts[idx].isActive = false;
      }
    });
    return updatedAlerts;
  } catch (e) { return alerts; }
};
