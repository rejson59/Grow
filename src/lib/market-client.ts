"use client";

import { ASSETS, type AssetDefinition } from "@/lib/content";

export type Range = "1D" | "1W" | "1M" | "3M";
export type MarketQuote = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  updatedAt: string | null;
  source: string;
  sparkline: number[];
  sparklineApproximate?: boolean;
};
export type ChartPoint = { time: number; price: number };
export type MarketChart = { symbol: string; range: Range; points: ChartPoint[]; source: string; note: string };
export type MarketData = { assets: MarketQuote[]; chart: MarketChart; fetchedAt: string };

type YahooResult = {
  meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketTime?: number; previousClose?: number; chartPreviousClose?: number };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
};
type CoinGeckoMarket = {
  id: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  last_updated: string;
  sparkline_in_7d?: { price?: number[] };
};

const cryptoAssets = ASSETS.filter((asset) => asset.category === "crypto");
const stockAssets = ASSETS.filter((asset) => asset.category === "stock");

// Base mock prices for offline/demo when Yahoo fails due to CORS
const STOCK_BASE_PRICES: Record<string, number> = {
  PKN: 64.8,
  PKO: 56.2,
  CDR: 118.5,
  KGH: 129.7,
  PZU: 45.3,
  ALE: 32.1,
};

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emptyQuote(symbol: string): MarketQuote {
  return { symbol, price: null, changePercent: null, updatedAt: null, source: "Niedostępne", sparkline: [] };
}

function randomWalk(base: number, length: number, volatility = 0.015): number[] {
  const points: number[] = [];
  let current = base;
  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.5) * volatility * 2;
    current = Math.max(base * 0.7, current * (1 + change));
    points.push(Number(current.toFixed(4)));
  }
  return points;
}

function generateMockStockQuote(asset: AssetDefinition): MarketQuote {
  const base = STOCK_BASE_PRICES[asset.symbol] ?? 50;
  // small daily variation
  const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
  const price = base * (1 + changePercent / 100);
  const sparkline = randomWalk(base, 22, 0.008);
  // ensure last sparkline close to price
  sparkline[sparkline.length - 1] = price;
  return {
    symbol: asset.symbol,
    price: Number(price.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    updatedAt: new Date().toISOString(),
    source: "Dane demonstracyjne · GPW (offline)",
    sparkline,
    sparklineApproximate: true,
  };
}

function generateMockChart(asset: AssetDefinition, range: Range, price: number): MarketChart {
  const now = Date.now();
  const settings: Record<Range, { points: number; step: number }> = {
    "1D": { points: 24, step: 60 * 60 * 1000 },
    "1W": { points: 42, step: 4 * 60 * 60 * 1000 },
    "1M": { points: 30, step: 24 * 60 * 60 * 1000 },
    "3M": { points: 90, step: 24 * 60 * 60 * 1000 },
  };
  const { points: count, step } = settings[range];
  const walk = randomWalk(price, count, range === "1D" ? 0.006 : 0.012);
  const points = walk.map((p, i) => ({
    time: now - (count - 1 - i) * step,
    price: p,
  }));
  return {
    symbol: asset.symbol,
    range,
    points,
    source: asset.category === "stock" ? "Dane demonstracyjne · GPW" : "Dane demonstracyjne · Krypto",
    note: asset.category === "stock"
      ? "Wersja offline: wykres jest symulowany, ponieważ Yahoo Finance blokuje zapytania z przeglądarki (CORS). Ceny GPW są demonstracyjne."
      : "Wersja offline: wykres jest symulowany. Połącz się z internetem, aby pobrać dane z CoinGecko.",
  };
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Market source returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseYahoo(data: unknown): YahooResult | null {
  const chart = (data as { chart?: { result?: YahooResult[] } })?.chart;
  return chart?.result?.[0] ?? null;
}

async function getStockQuote(asset: AssetDefinition): Promise<MarketQuote> {
  try {
    const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${asset.marketSymbol}?range=1mo&interval=1d`, 8000);
    const result = parseYahoo(data);
    if (!result) throw new Error("Brak danych giełdowych");
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
    const price = positive(result.meta?.regularMarketPrice) ?? closes.at(-1) ?? null;
    const prev = positive(result.meta?.previousClose) ?? positive(result.meta?.chartPreviousClose);
    const percent = typeof result.meta?.regularMarketChangePercent === "number"
      ? result.meta.regularMarketChangePercent
      : price && prev ? ((price / prev) - 1) * 100 : null;
    return {
      symbol: asset.symbol,
      price,
      changePercent: percent,
      updatedAt: result.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      source: "Yahoo Finance · GPW (możliwe opóźnienie)",
      sparkline: closes.slice(-22),
    };
  } catch (error) {
    console.warn(`Yahoo quote failed for ${asset.symbol}, using mock`, error);
    return generateMockStockQuote(asset);
  }
}

type FxPoint = { time: number; rate: number };

async function getUsdPln(): Promise<number> {
  // Try NBP first (CORS friendly), then Yahoo
  try {
    const data = await fetchJson("https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json", 6000);
    const rate = positive((data as { rates?: { mid?: number }[] })?.rates?.[0]?.mid);
    if (rate) return rate;
  } catch {
    // ignore
  }
  try {
    const data = await fetchJson("https://query1.finance.yahoo.com/v8/finance/chart/PLN=X?range=1d&interval=1d", 6000);
    const rate = positive(parseYahoo(data)?.meta?.regularMarketPrice);
    if (rate) return rate;
  } catch {
    // ignore
  }
  return 4.0; // fallback
}

type BinanceTicker = { symbol: string; lastPrice: string; priceChangePercent: string; closeTime: number };

async function getBinanceQuotes(): Promise<MarketQuote[]> {
  const symbols = cryptoAssets.map((a) => a.marketSymbol);
  const [data, fx] = await Promise.all([
    fetchJson(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`, 8000),
    getUsdPln(),
  ]);
  if (!Array.isArray(data)) throw new Error("Brak danych Binance");
  return cryptoAssets.map((asset) => {
    const ticker = (data as BinanceTicker[]).find((item) => item.symbol === asset.marketSymbol);
    const usdPrice = positive(ticker?.lastPrice);
    return {
      symbol: asset.symbol,
      price: usdPrice ? Number((usdPrice * fx).toFixed(4)) : null,
      changePercent: ticker && Number.isFinite(Number(ticker.priceChangePercent)) ? Number(ticker.priceChangePercent) : null,
      updatedAt: ticker?.closeTime ? new Date(ticker.closeTime).toISOString() : new Date().toISOString(),
      source: "Binance (USDT) × USD/PLN · wycena przybliżona",
      sparkline: [],
    };
  });
}

async function getCoinGeckoQuotes(): Promise<MarketQuote[]> {
  const ids = cryptoAssets.map((a) => a.coinId).join(",");
  const data = await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=pln&ids=${ids}&sparkline=true&price_change_percentage=24h`, 8000);
  if (!Array.isArray(data)) throw new Error("Brak danych CoinGecko");
  const coins = data as CoinGeckoMarket[];
  return cryptoAssets.map((asset) => {
    const coin = coins.find((item) => item.id === asset.coinId);
    if (!coin || !positive(coin.current_price) || !coin.last_updated) return emptyQuote(asset.symbol);
    const end = new Date(coin.last_updated).getTime();
    if (!Number.isFinite(end) || Date.now() - end > 30 * 60 * 1000) {
      // allow up to 30 min stale for client
      // still return but mark as possibly stale
    }
    const raw = (coin.sparkline_in_7d?.price ?? []).filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0).slice(-168);
    return {
      symbol: asset.symbol,
      price: coin.current_price,
      changePercent: typeof coin.price_change_percentage_24h === "number" ? coin.price_change_percentage_24h : null,
      updatedAt: coin.last_updated,
      source: "CoinGecko · PLN",
      sparkline: raw,
    };
  });
}

async function getCryptoQuotes(): Promise<MarketQuote[]> {
  let primary: MarketQuote[] | null = null;
  try {
    primary = await getCoinGeckoQuotes();
    if (primary.every((quote) => quote.price !== null)) return primary;
  } catch (error) {
    console.warn("CoinGecko unavailable; using live fallback", error);
  }
  try {
    const fallback = await getBinanceQuotes();
    if (primary) {
      return cryptoAssets.map((asset, index) => primary?.[index]?.price != null ? primary[index] : fallback[index] ?? emptyQuote(asset.symbol));
    }
    return fallback;
  } catch (error) {
    console.warn("Crypto fallback unavailable", error);
    return primary ?? cryptoAssets.map((a) => emptyQuote(a.symbol));
  }
}

async function getStockChart(asset: AssetDefinition, range: Range, fallbackPrice: number): Promise<MarketChart> {
  const settings: Record<Range, { period: string; interval: string }> = {
    "1D": { period: "1d", interval: "5m" },
    "1W": { period: "5d", interval: "30m" },
    "1M": { period: "1mo", interval: "1d" },
    "3M": { period: "3mo", interval: "1d" },
  };
  const { period, interval } = settings[range];
  try {
    const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${asset.marketSymbol}?range=${period}&interval=${interval}`, 8000);
    const result = parseYahoo(data);
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = (result?.timestamp ?? []).map((time, index) => ({ time: time * 1000, price: closes[index] }))
      .filter((point): point is ChartPoint => typeof point.price === "number" && Number.isFinite(point.price) && point.price > 0);
    if (points.length > 1) {
      return { symbol: asset.symbol, range, points, source: "Yahoo Finance · GPW", note: "Notowania GPW mogą być opóźnione. Po zamknięciu sesji widoczny jest ostatni dostępny kurs." };
    }
    throw new Error("Empty Yahoo chart");
  } catch (error) {
    console.warn(`Chart unavailable: ${asset.symbol}`, error);
    return generateMockChart(asset, range, fallbackPrice);
  }
}

async function getCoinGeckoChart(asset: AssetDefinition, range: Range): Promise<MarketChart> {
  const days: Record<Range, number> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90 };
  const data = await fetchJson(`https://api.coingecko.com/api/v3/coins/${asset.coinId}/market_chart?vs_currency=pln&days=${days[range]}`, 8000);
  const raw = (data as { prices?: [number, number][] })?.prices;
  if (!Array.isArray(raw)) throw new Error("Brak historii CoinGecko");
  const points = raw.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && positive(p[1]))
    .map(([time, price]) => ({ time, price }));
  if (points.length < 2) throw new Error("Empty chart");
  return { symbol: asset.symbol, range, points, source: "CoinGecko · PLN", note: "Historyczne ceny w PLN z CoinGecko." };
}

async function getBinanceChart(asset: AssetDefinition, range: Range, quote: MarketQuote): Promise<MarketChart> {
  const settings: Record<Range, { interval: string; limit: number }> = {
    "1D": { interval: "1h", limit: 25 },
    "1W": { interval: "4h", limit: 43 },
    "1M": { interval: "1d", limit: 31 },
    "3M": { interval: "1d", limit: 91 },
  };
  const { interval, limit } = settings[range];
  const data = await fetchJson(`https://data-api.binance.vision/api/v3/klines?symbol=${asset.marketSymbol}&interval=${interval}&limit=${limit}`, 8000);
  if (!Array.isArray(data)) throw new Error("Brak historii Binance");
  const candles = (data as (string | number)[][]).map((row) => ({ time: Number(row[0]), usd: Number(row[4]) }))
    .filter((row) => Number.isFinite(row.time) && row.usd > 0);
  const last = candles.at(-1)?.usd;
  if (!last || !quote.price) throw new Error("Brak kursu przeliczeniowego");
  const factor = quote.price / last;
  return {
    symbol: asset.symbol, range,
    points: candles.map((row) => ({ time: row.time, price: Number((row.usd * factor).toFixed(4)) })),
    source: "Binance · wykres orientacyjny w PLN",
    note: "Historia z rynku USDT przeliczona bieżącą relacją do PLN.",
  };
}

async function getCryptoChart(asset: AssetDefinition, range: Range, quote: MarketQuote): Promise<MarketChart> {
  try { return await getCoinGeckoChart(asset, range); }
  catch { /* fallback */ }
  if ((range === "1D" || range === "1W") && quote.sparkline.length > 5 && quote.updatedAt) {
    const values = range === "1D" ? quote.sparkline.slice(-25) : quote.sparkline;
    const end = new Date(quote.updatedAt).getTime();
    return {
      symbol: asset.symbol, range,
      points: values.map((price, index) => ({ time: end - (values.length - 1 - index) * 60 * 60 * 1000, price })),
      source: quote.source,
      note: "Ceny historyczne w PLN. Godziny punktów na wykresie są przybliżone.",
    };
  }
  try {
    return await getBinanceChart(asset, range, quote);
  } catch (error) {
    console.warn(`Crypto chart fallback failed for ${asset.symbol}`, error);
    return generateMockChart(asset, range, quote.price ?? 100);
  }
}

export async function getMarketData(symbol: string, range: Range): Promise<MarketData> {
  const selected = ASSETS.find((a) => a.symbol === symbol) ?? ASSETS[0];
  const [crypto, ...stocks] = await Promise.all([
    getCryptoQuotes(),
    ...stockAssets.map(async (asset) => {
      try { return await getStockQuote(asset); }
      catch (error) { console.warn(`Quote unavailable: ${asset.symbol}`, error); return emptyQuote(asset.symbol); }
    }),
  ]);
  const quotes = [...crypto, ...stocks];
  const assets = ASSETS.map((asset) => quotes.find((quote) => quote.symbol === asset.symbol) ?? emptyQuote(asset.symbol));
  const quote = assets.find((item) => item.symbol === selected.symbol)!;
  let chart: MarketChart = { symbol: selected.symbol, range, points: [], source: "Niedostępne", note: "Nie udało się pobrać wykresu. Spróbuj odświeżyć dane." };
  try {
    chart = selected.category === "stock"
      ? await getStockChart(selected, range, quote.price ?? STOCK_BASE_PRICES[selected.symbol] ?? 50)
      : await getCryptoChart(selected, range, quote);
    if (!chart.points.length) {
      chart = generateMockChart(selected, range, quote.price ?? STOCK_BASE_PRICES[selected.symbol] ?? 100);
    }
  } catch (error) {
    console.warn(`Chart unavailable: ${selected.symbol}`, error);
    chart = generateMockChart(selected, range, quote.price ?? STOCK_BASE_PRICES[selected.symbol] ?? 100);
  }
  return { assets, chart, fetchedAt: new Date().toISOString() };
}

export async function getFreshQuote(symbol: string): Promise<MarketQuote> {
  const asset = ASSETS.find((item) => item.symbol === symbol);
  if (!asset) throw new Error("Nieznany instrument.");
  let quote: MarketQuote;
  if (asset.category === "stock") {
    quote = await getStockQuote(asset);
  } else {
    try {
      const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.coinId}&vs_currencies=pln&include_last_updated_at=true`, 6000);
      const info = (data as Record<string, { pln?: number; last_updated_at?: number }>)?.[asset.coinId!];
      const price = positive(info?.pln);
      if (!price || !info?.last_updated_at) throw new Error("Nieaktualny kurs CoinGecko");
      // allow up to 15 min stale
      if (Date.now() - info.last_updated_at * 1000 > 15 * 60 * 1000) {
        console.warn("CoinGecko price slightly stale, using anyway for demo");
      }
      quote = { symbol, price, changePercent: null, updatedAt: new Date(info.last_updated_at * 1000).toISOString(), source: "CoinGecko · PLN", sparkline: [] };
    } catch {
      try {
        const fallback = await getBinanceQuotes();
        quote = fallback.find((item) => item.symbol === symbol) ?? emptyQuote(symbol);
      } catch {
        return generateMockStockQuote(asset);
      }
    }
  }
  if (!quote.price || !quote.updatedAt) {
    // if still no price, use mock for demo continuity
    if (asset.category === "stock") {
      return generateMockStockQuote(asset);
    }
    throw new Error("Aktualny kurs jest chwilowo niedostępny. Spróbuj ponownie później.");
  }
  return quote;
}
