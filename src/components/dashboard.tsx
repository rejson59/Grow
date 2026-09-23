"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity, ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight,
  Bell, BookOpen, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign,
  Clock3, Compass, GraduationCap, History, Info, Layers3, LayoutDashboard, Lightbulb, Menu,
  Plus, RefreshCw, RotateCcw, Search, ShieldCheck, Sparkles, Target, TrendingUp, Trophy,
  Wallet, X, Zap, type LucideIcon,
} from "lucide-react";
import { ASSETS, getAsset, LESSONS, TIPS, type AssetDefinition } from "@/lib/content";
import type { GameResponse, GameState, GameTransaction } from "@/lib/game-types";
import type { MarketChart, MarketData, MarketQuote, Range } from "@/lib/market-client";
import { getMarketData } from "@/lib/market-client";
import { getGameState, handleDeposit, handleWithdraw, handleTrade, handleLesson, handleReset, ActionError } from "@/lib/game-local";

type View = "dashboard" | "market" | "portfolio" | "academy" | "history";
type Toast = { text: string; type: "success" | "error" };

const fmtPLN = (value: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(value);
const fmtNumber = (value: number, digits = 8) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: digits }).format(value);
const fmtPercent = (value: number) => `${value > 0 ? "+" : ""}${new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
const fmtDate = (iso: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(iso));
const fmtChartDate = (time: number, range: Range) => range === "1D"
  ? new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(time))
  : new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "Europe/Warsaw" }).format(new Date(time));
const getQuote = (market: MarketData | null, symbol: string): MarketQuote | undefined => market?.assets.find((quote) => quote.symbol === symbol);

function AssetIcon({ asset, size = "normal" }: { asset: AssetDefinition; size?: "normal" | "large" | "small" }) {
  return <span className={`asset-icon asset-icon-${size}`} style={{ background: asset.background, color: asset.color }} aria-hidden="true">{asset.mark}</span>;
}

function ChangeBadge({ value, subtle = false }: { value: number | null | undefined; subtle?: boolean }) {
  if (value === null || value === undefined) return <span className="change-badge change-neutral">—</span>;
  return <span className={`change-badge ${value >= 0 ? "change-up" : "change-down"} ${subtle ? "change-subtle" : ""}`}>
    {value >= 0 ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}{fmtPercent(value)}
  </span>;
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <span className="sparkline-empty">—</span>;
  const points = values.filter((n) => Number.isFinite(n));
  if (points.length < 2) return <span className="sparkline-empty">—</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coordinates = points.map((n, index) => `${(index / (points.length - 1)) * 106},${29 - ((n - min) / span) * 24}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 106 34" preserveAspectRatio="none" aria-label={positive ? "Trend wzrostowy" : "Trend spadkowy"} role="img">
    <polyline points={coordinates} fill="none" stroke={positive ? "#20a477" : "#e46e6c"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={25} strokeWidth={1.8} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function TipCard({ index, onNext }: { index: number; onNext: () => void }) {
  const tip = TIPS[index % TIPS.length];
  return <section className="tip-card">
    <div className="tip-top"><span className="tip-bulb"><Lightbulb size={23} strokeWidth={1.9} /></span><span className="tip-index">TIP {String(index + 1).padStart(2, "0")} / {String(TIPS.length).padStart(2, "0")}</span></div>
    <div className="tip-content"><span className="tiny-label">{tip.label} · TWÓJ KOMPAS</span><h3>{tip.title}</h3><p>{tip.body}</p></div>
    <div className="tip-bottom"><div className="tip-dots">{TIPS.map((_, i) => <span key={i} className={i === index ? "tip-dot active" : "tip-dot"} />)}</div><button className="tip-next" onClick={onNext} aria-label="Następna wskazówka"><ArrowRight size={19} /></button></div>
    <div className="tip-footnote"><Info size={13} /> Wskazówka edukacyjna, nie porada inwestycyjna.</div>
  </section>;
}

function ChartCard({ market, symbol, range, loading, onRange, onOpen }: {
  market: MarketData | null; symbol: string; range: Range; loading: boolean;
  onRange: (range: Range) => void; onOpen: () => void;
}) {
  const asset = getAsset(symbol) ?? ASSETS[0];
  const quote = getQuote(market, symbol);
  const chart: MarketChart | null = market?.chart.symbol === symbol && market?.chart.range === range ? market.chart : null;
  const points = chart?.points ?? [];
  const isUp = points.length > 1 ? points.at(-1)!.price >= points[0].price : (quote?.changePercent ?? 0) >= 0;
  const color = isUp ? "#25aa80" : "#e66c6d";
  const gradientId = `chartFill-${symbol}`;

  return <section className="chart-card">
    <div className="chart-card-header">
      <div className="chart-asset"><AssetIcon asset={asset} /><div><h3>{asset.name}</h3><span>{asset.ticker} <span className="middle-dot">·</span> {asset.category === "crypto" ? "Kryptowaluta" : "GPW / Akcje"}</span></div></div>
      <div className="range-tabs" role="group" aria-label="Zakres wykresu">{(["1D", "1W", "1M", "3M"] as Range[]).map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => onRange(item)}>{item}</button>)}</div>
    </div>
    <div className="chart-price"><span>{quote?.price != null ? fmtPLN(quote.price) : "Kurs niedostępny"}</span><ChangeBadge value={quote?.changePercent} /><small>{asset.category === "crypto" ? "ostatnie 24h" : "ostatnia sesja"}</small></div>
    <div className="chart-plot">
      {points.length > 1 ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 2, left: -12, bottom: 0 }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.20} /><stop offset="95%" stopColor={color} stopOpacity={0.005} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#edf1ee" strokeDasharray="4 5" />
          <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(n: number) => fmtChartDate(n, range)} tickLine={false} axisLine={false} tick={{ fill: "#a1aaa7", fontSize: 11 }} minTickGap={34} dy={11} />
          <YAxis orientation="right" domain={["auto", "auto"]} tickFormatter={(n: number) => new Intl.NumberFormat("pl-PL", { notation: n > 9999 ? "compact" : "standard", maximumFractionDigits: n < 10 ? 2 : 0 }).format(n)} tickLine={false} axisLine={false} tick={{ fill: "#a1aaa7", fontSize: 11 }} width={62} dx={6} />
          <Tooltip cursor={{ stroke: "#b7c8c0", strokeDasharray: "4 4" }} contentStyle={{ borderRadius: 13, border: "1px solid #e8eeeb", boxShadow: "0 12px 35px rgba(18,42,34,.12)", fontSize: 12 }} labelFormatter={(label) => fmtChartDate(Number(label), range)} formatter={(value) => [fmtPLN(Number(value)), "Cena"]} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.8} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 5, fill: color, stroke: "white", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer> : <div className="chart-unavailable"><Activity size={26} /><span>{loading ? "Wczytywanie wykresu..." : "Wykres jest chwilowo niedostępny"}</span></div>}
    </div>
    <div className="chart-footer"><span className="source-label"><span className="source-dot" />{chart?.source ?? quote?.source ?? "Oczekiwanie na dane"}{quote?.updatedAt ? ` · ${fmtDate(quote.updatedAt)}` : ""}</span><button className="text-link" onClick={onOpen}>Przejdź do rynku <ArrowUpRight size={16} /></button></div>
    {chart?.note && <p className="chart-note">{chart.note}</p>}
  </section>;
}

function MarketTable({ assets, market, onSelect, onTrade, compact = false }: {
  assets: AssetDefinition[]; market: MarketData | null; onSelect: (symbol: string) => void; onTrade: (symbol: string) => void; compact?: boolean;
}) {
  if (!assets.length) return <EmptyState icon={Search} title="Brak wyników" text="Spróbuj wpisać inną nazwę lub zmienić filtr." />;
  return <div className={`market-table-wrap ${compact ? "market-table-compact" : ""}`}>
    <div className="market-table-desktop"><div className="market-table-head"><span>AKTYWO</span><span>CENA</span><span>ZMIANA</span><span>WYKRES</span><span>RYNEK</span><span></span></div>
      {assets.map((asset) => {
        const quote = getQuote(market, asset.symbol);
        return <div className="market-row" key={asset.symbol} role="button" tabIndex={0} onClick={() => onSelect(asset.symbol)} onKeyDown={(e) => { if (e.key === "Enter") onSelect(asset.symbol); }}>
          <div className="table-asset"><AssetIcon asset={asset} size="small" /><span><strong>{asset.name}</strong><small>{asset.ticker}</small></span></div>
          <strong className="table-price">{quote?.price != null ? fmtPLN(quote.price) : "—"}</strong>
          <ChangeBadge value={quote?.changePercent} subtle />
          <Sparkline values={quote?.sparkline ?? []} positive={(quote?.changePercent ?? 0) >= 0} />
          <span className={`category-tag ${asset.category === "crypto" ? "tag-crypto" : "tag-stock"}`}>{asset.category === "crypto" ? "Krypto" : "GPW"}</span>
          <button className="row-action" onClick={(e) => { e.stopPropagation(); onTrade(asset.symbol); }} aria-label={`Handluj ${asset.name}`}><ArrowUpRight size={17} /></button>
        </div>;
      })}
    </div>
    <div className="market-table-mobile">{assets.map((asset) => {
      const quote = getQuote(market, asset.symbol);
      return <button className="mobile-market-row" key={asset.symbol} onClick={() => onSelect(asset.symbol)}>
        <AssetIcon asset={asset} size="small" /><span className="mobile-market-name"><strong>{asset.name}</strong><small>{asset.ticker} · {asset.category === "crypto" ? "Krypto" : "GPW"}</small></span><span className="mobile-market-values"><strong>{quote?.price != null ? fmtPLN(quote.price) : "—"}</strong><ChangeBadge value={quote?.changePercent} subtle /></span><ChevronRight size={16} className="mobile-market-chevron" />
      </button>;
    })}</div>
  </div>;
}

function TradePanel({ asset, quote, cash, held, side, setSide, quantity, setQuantity, busy, onSubmit }: {
  asset: AssetDefinition; quote?: MarketQuote; cash: number; held: number; side: "buy" | "sell";
  setSide: (value: "buy" | "sell") => void; quantity: string; setQuantity: (value: string) => void;
  busy: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const price = quote?.price ?? 0;
  const estimate = Number(quantity.replace(",", ".")) * price;
  const valid = price > 0 && Number(quantity.replace(",", ".")) > 0 && Number.isFinite(estimate);
  const shortcuts = asset.category === "stock" ? [1, 5, 10] : [100, 500, 1000];
  return <section className="trade-panel">
    <div className="trade-title-row"><div><span className="tiny-label">SYMULATOR TRANSAKCJI</span><h3>Twój ruch</h3></div><span className="trade-panel-icon"><Zap size={19} /></span></div>
    <div className="trade-asset-strip"><AssetIcon asset={asset} size="small" /><span><strong>{asset.name}</strong><small>{asset.ticker} · {asset.category === "crypto" ? "Krypto" : "GPW"}</small></span><strong className="trade-current-price">{price ? fmtPLN(price) : "—"}</strong></div>
    <div className="trade-toggle" role="group" aria-label="Rodzaj transakcji"><button type="button" className={side === "buy" ? "active-buy" : ""} onClick={() => { setSide("buy"); setQuantity(""); }}>Kup</button><button type="button" className={side === "sell" ? "active-sell" : ""} onClick={() => { setSide("sell"); setQuantity(""); }}>Sprzedaj</button></div>
    <form onSubmit={onSubmit}>
      <div className="trade-label-row"><label htmlFor="trade-quantity">Ilość {asset.ticker}</label><span>{side === "buy" ? `Dostępne: ${fmtPLN(cash)}` : `Posiadasz: ${fmtNumber(held)} ${asset.ticker}`}</span></div>
      <div className="quantity-input-wrap"><input id="trade-quantity" type="number" inputMode="decimal" min={asset.category === "stock" ? "1" : "0.00000001"} step={asset.category === "stock" ? "1" : "0.00000001"} placeholder={asset.category === "stock" ? "np. 5" : "np. 0,01"} value={quantity} onChange={(e) => setQuantity(e.target.value)} required /><span>{asset.ticker}</span></div>
      <div className="trade-shortcuts">{shortcuts.map((amount) => <button type="button" key={amount} onClick={() => {
        if (side === "sell") setQuantity(asset.category === "stock" ? String(Math.min(amount, held)) : String(Math.min(held, Number((amount / (price || 1)).toFixed(8)))));
        else setQuantity(asset.category === "stock" ? String(amount) : price ? (amount / price).toFixed(8) : "");
      }}>{asset.category === "stock" ? `${amount} szt.` : `${amount} zł`}</button>)}{side === "sell" && held > 0 && <button type="button" onClick={() => setQuantity(String(held))}>Całość</button>}</div>
      <div className="trade-summary"><span>Szacowana wartość</span><strong>{valid ? fmtPLN(estimate) : "—"}</strong></div>
      <button type="submit" className={`trade-submit ${side === "sell" ? "trade-submit-sell" : ""}`} disabled={!valid || busy || (side === "sell" && held <= 0)}>{busy ? <><RefreshCw size={17} className="spin" /> Przetwarzanie...</> : <>{side === "buy" ? "Kup wirtualnie" : "Sprzedaj wirtualnie"}<ArrowRight size={18} /></>}</button>
    </form>
    <p className="trade-disclaimer"><ShieldCheck size={14} /> Transakcja jest tylko symulacją. Kurs wykonania zostanie pobrany ponownie przy potwierdzeniu.</p>
    {quote?.updatedAt && <p className="trade-source">{quote.source} · {fmtDate(quote.updatedAt)}</p>}
  </section>;
}

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Panel główny", icon: LayoutDashboard },
  { id: "market", label: "Odkrywaj rynek", icon: TrendingUp },
  { id: "portfolio", label: "Mój portfel", icon: Wallet },
  { id: "academy", label: "Akademia", icon: GraduationCap },
  { id: "history", label: "Historia", icon: History },
];

const lessonIcons: Record<string, LucideIcon> = { sparkles: Sparkles, building: Building2, bitcoin: CircleDollarSign, shield: ShieldCheck, layers: Layers3, target: Target };
const watchlistSymbols = ["BTC", "ETH", "SOL", "PKN", "PKO", "CDR"];

export default function Dashboard({ initialMarket }: { initialMarket: MarketData | null }) {
  const [view, setView] = useState<View>("dashboard");
  const [market, setMarket] = useState<MarketData | null>(initialMarket);
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [range, setRange] = useState<Range>("1D");
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "crypto" | "stock">("all");
  const [search, setSearch] = useState("");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [tradeModal, setTradeModal] = useState(false);
  const [fundsModal, setFundsModal] = useState<"deposit" | "withdraw" | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");
  const [resetModal, setResetModal] = useState(false);
  const [activeLesson, setActiveLesson] = useState("start");
  const [answer, setAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "trades" | "funds">("all");
  const marketRequestId = useRef(0);

  const loadGame = useCallback(() => {
    try {
      const data = getGameState();
      setGame(data);
      setGameError(null);
    } catch (error) { setGameError(error instanceof Error ? error.message : "Nie udało się wczytać portfela."); }
  }, []);

  const loadMarket = useCallback(async (symbol: string, period: Range, quiet = false) => {
    const requestId = ++marketRequestId.current;
    if (!quiet) setMarketLoading(true);
    try {
      const data = await getMarketData(symbol, period);
      if (requestId === marketRequestId.current) { setMarket(data); setMarketError(null); }
    } catch (error) {
      if (requestId === marketRequestId.current) setMarketError(error instanceof Error ? error.message : "Błąd notowań.");
    } finally { if (requestId === marketRequestId.current) setMarketLoading(false); }
  }, []);

  useEffect(() => { loadGame(); }, [loadGame]);
  useEffect(() => {
    void loadMarket(selectedSymbol, range);
  }, [selectedSymbol, range, loadMarket]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) void loadMarket(selectedSymbol, range, true); }, 45_000);
    return () => window.clearInterval(timer);
  }, [selectedSymbol, range, loadMarket]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 4800); return () => window.clearTimeout(timer); }, [toast]);

  const quote = getQuote(market, selectedSymbol);
  const selectedAsset = getAsset(selectedSymbol) ?? ASSETS[0];
  const cash = game?.cash ?? 0;
  const held = game?.positions.find((p) => p.symbol === selectedSymbol)?.quantity ?? 0;
  const positionValues = (game?.positions ?? []).map((position) => {
    const asset = getAsset(position.symbol);
    const currentQuote = getQuote(market, position.symbol);
    return { ...position, asset, quote: currentQuote, value: currentQuote?.price != null ? position.quantity * currentQuote.price : position.costBasis, missing: currentQuote?.price == null };
  });
  const invested = positionValues.reduce((sum, p) => sum + p.value, 0);
  const totalValue = cash + invested;
  const profitLoss = totalValue - (game?.totalDeposited ?? 0);
  const missingQuotes = positionValues.some((p) => p.missing);
  const completed = game?.completedLessons ?? [];
  const xp = game?.xp ?? 0;
  const level = Math.floor(xp / 150) + 1;
  const levelProgress = ((xp % 150) / 150) * 100;
  const levelName = ["Odkrywca", "Poszukiwacz", "Strateg", "Analityk", "Mistrz rynku"][Math.min(level - 1, 4)];
  const firstBuy = (game?.transactions ?? []).some((t) => t.kind === "buy");
  const firstStock = (game?.transactions ?? []).some((t) => t.kind === "buy" && getAsset(t.symbol ?? "")?.category === "stock");
  const missions = [
    { label: "Ukończ pierwszą lekcję", done: completed.includes("start") },
    { label: "Zrób pierwszą transakcję", done: firstBuy },
    { label: "Poznaj polską giełdę", done: completed.includes("gpw") },
    { label: "Kup pierwszą akcję GPW", done: firstStock },
  ];
  const missionsDone = missions.filter((m) => m.done).length;
  const nextMission = missions.find((m) => !m.done);
  const filteredAssets = ASSETS.filter((asset) => (filter === "all" || asset.category === filter)
    && `${asset.name} ${asset.ticker}`.toLocaleLowerCase("pl-PL").includes(search.toLocaleLowerCase("pl-PL")));
  const allocation = useMemo(() => [
    { name: "Gotówka", value: Math.max(cash, 0), color: "#c9ded2" },
    { name: "Krypto", value: positionValues.filter((p) => p.asset?.category === "crypto").reduce((s, p) => s + p.value, 0), color: "#26a47a" },
    { name: "Akcje GPW", value: positionValues.filter((p) => p.asset?.category === "stock").reduce((s, p) => s + p.value, 0), color: "#7287d9" },
  ].filter((item) => item.value > 0), [cash, positionValues]);
  const activeLessonData = LESSONS.find((lesson) => lesson.id === activeLesson) ?? LESSONS[0];

  async function handleAction(actionFn: () => Promise<GameResponse>, successMessage: string): Promise<GameResponse | null> {
    if (busy) return null;
    setBusy(true);
    try {
      const data = await actionFn();
      setGame(data);
      setToast({ text: successMessage, type: "success" });
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Operacja się nie powiodła.";
      setToast({ text: msg, type: "error" });
      return null;
    } finally { setBusy(false); }
  }

  function changeView(next: View) { setView(next); setMobileMenu(false); setNotificationOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function selectAsset(symbol: string) { setSelectedSymbol(symbol); setQuantity(""); changeView("market"); }
  function openTrade(symbol: string) { setSelectedSymbol(symbol); setTradeSide("buy"); setQuantity(""); setTradeModal(true); }
  function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      const qty = Number(quantity.replace(",", "."));
      const result = await handleAction(() => handleTrade(selectedSymbol, tradeSide, qty), `${tradeSide === "buy" ? "Kupiono" : "Sprzedano"} ${fmtNumber(qty)} ${selectedSymbol} za wirtualne środki.`);
      if (result) { setQuantity(""); setTradeModal(false); void loadMarket(selectedSymbol, range, true); }
    })();
  }
  function submitFunds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fundsModal) return;
    void (async () => {
      const amt = Number(fundsAmount.replace(",", "."));
      const fn = fundsModal === "deposit" ? () => handleDeposit(amt) : () => handleWithdraw(amt);
      const result = await handleAction(fn, fundsModal === "deposit" ? "Wirtualne środki dodane do portfela." : "Wirtualne środki wypłacone z portfela.");
      if (result) { setFundsModal(null); setFundsAmount(""); }
    })();
  }
  function submitQuiz() {
    if (answer === null) { setQuizFeedback("Wybierz jedną odpowiedź, aby sprawdzić swoją wiedzę."); return; }
    if (answer !== activeLessonData.correct) { setQuizFeedback("Jeszcze nie tym razem. Przeczytaj wskazówkę i spróbuj ponownie!"); return; }
    void (async () => {
      const result = await handleAction(() => handleLesson(activeLessonData.id, answer), `Brawo! Lekcja ukończona. +${activeLessonData.xp} XP`);
      if (result) setQuizFeedback(activeLessonData.explanation);
    })();
  }
  function startLesson(id: string) { setActiveLesson(id); setAnswer(null); setQuizFeedback(null); changeView("academy"); window.setTimeout(() => document.getElementById("lesson-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }
  function openFunds(mode: "deposit" | "withdraw") { setFundsAmount(""); setFundsModal(mode); }

  return <div className="app-shell">
    {mobileMenu && <button className="sidebar-scrim" onClick={() => setMobileMenu(false)} aria-label="Zamknij menu" />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="sidebar-top"><button className="brand" onClick={() => changeView("dashboard")} aria-label="Grow - panel główny"><span className="brand-symbol"><span className="brand-bar bar-one" /><span className="brand-bar bar-two" /><span className="brand-bar bar-three" /></span><span className="brand-word">grow<span>.</span></span></button><button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Zamknij menu"><X size={20} /></button><p className="brand-subline">TWÓJ SYMULATOR INWESTOWANIA</p></div>
      <div className="sidebar-divider" />
      <nav className="sidebar-nav" aria-label="Nawigacja główna"><span className="nav-caption">TWOJA PRZESTRZEŃ</span>{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => changeView(id)} className={`nav-item ${view === id ? "nav-active" : ""}`}><Icon size={19} strokeWidth={view === id ? 2.2 : 1.9} /><span>{label}</span>{id === "academy" && completed.length > 0 && <span className="nav-count">{completed.length}</span>}</button>)}</nav>
      <div className="sidebar-lower"><div className="level-card"><div className="level-card-top"><span className="level-badge"><Trophy size={18} /></span><span>POZIOM {String(level).padStart(2, "0")}</span></div><strong>{levelName}</strong><p>Jeszcze {150 - (xp % 150)} XP do kolejnego poziomu</p><div className="level-track"><span style={{ width: `${levelProgress}%` }} /></div><div className="level-card-foot"><span>{xp} XP</span><span>{level * 150} XP</span></div></div><div className="sidebar-note"><ShieldCheck size={16} /><span>Bez ryzyka. Tylko wiedza.</span></div></div>
    </aside>

    <div className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Otwórz menu"><Menu size={22} /></button><div className="breadcrumbs"><span>Twoja przestrzeń</span><ChevronRight size={14} /><strong>{navItems.find((n) => n.id === view)?.label}</strong></div></div><div className="topbar-right"><span className={`live-indicator ${marketError ? "live-error" : ""}`}><span className="live-dot" />{marketError ? "BŁĄD NOTOWAŃ" : "DANE AKTUALIZOWANE"}</span><button className="top-icon-button" onClick={() => { void loadMarket(selectedSymbol, range); loadGame(); }} aria-label="Odśwież dane" title="Odśwież notowania i portfel"><RefreshCw size={18} className={marketLoading ? "spin" : ""} /></button><div className="notification-wrap"><button className={`top-icon-button ${notificationOpen ? "top-icon-active" : ""}`} onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Powiadomienia"><Bell size={18} /><span className="notification-dot" /></button>{notificationOpen && <div className="notification-popover"><span className="tiny-label">TWOJE CENTRUM</span><h4>Witaj w grow! <Sparkles size={16} /></h4><p>Masz {fmtPLN(game?.cash ?? 25000)} wirtualnych środków. Poznaj podstawy i zrób swój pierwszy ruch.</p><button onClick={() => changeView("academy")}>Otwórz akademię <ArrowRight size={15} /></button></div>}</div><div className="avatar" title="Twój profil gracza">GR</div></div></header>
      <main className="content">
        {marketError && <div className="alert-banner"><Info size={17} /><span>{marketError} Ostatnio pobrane dane mogą być nieaktualne. Transakcje są wyceniane lokalnie.</span><button onClick={() => void loadMarket(selectedSymbol, range)}>Spróbuj ponownie</button></div>}
        {gameError && <div className="alert-banner"><Info size={17} /><span>{gameError}</span><button onClick={() => loadGame()}>Spróbuj ponownie</button></div>}

        {view === "dashboard" && <>
          <div className="page-heading"><div><span className="heading-eyebrow"><Sparkles size={14} /> TWOJA PRZYGODA Z INWESTOWANIEM</span><h1>Twój kapitał. <span>Twoje decyzje.</span></h1><p>Ucz się, testuj strategie i obserwuj prawdziwy rynek — bez prawdziwego ryzyka. Wszystko lokalnie w przeglądarce.</p></div><button className="button-primary heading-button" onClick={() => openFunds("deposit")}><Plus size={18} /> Dodaj środki</button></div>
          <div className="feature-grid">
            <section className="balance-hero"><div className="hero-glow" /><div className="hero-content"><div className="hero-topline"><span><span className="hero-top-icon"><Wallet size={16} /></span> WARTOŚĆ TWOJEGO PORTFELA</span><span className="hero-mode"><span /> TRYB LOKALNY</span></div><div className="hero-main"><div><div className="hero-amount">{game ? fmtPLN(totalValue) : <span className="skeleton skeleton-dark skeleton-amount" />}</div><div className={`hero-result ${profitLoss < 0 ? "hero-negative" : ""}`}>{game ? <><span>{profitLoss >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{profitLoss >= 0 ? "+" : ""}{fmtPLN(profitLoss)}</span> względem wpłat</> : "Wczytywanie portfela..."}</div></div><div className="hero-mini-chart"><span>PULS RYNKU · {selectedAsset.ticker}</span><div>{market?.chart.points && market.chart.points.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={market.chart.points} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}><defs><linearGradient id="heroLineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#61e9a6" stopOpacity={0.36} /><stop offset="100%" stopColor="#61e9a6" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="price" stroke="#62e8aa" strokeWidth={2.6} fill="url(#heroLineFill)" dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <Activity size={52} strokeWidth={1} />}</div></div></div><div className="hero-bottom"><div><span>DOSTĘPNE ŚRODKI</span><strong>{game ? fmtPLN(cash) : "—"}</strong></div><div><span>ZAINWESTOWANE</span><strong>{game ? fmtPLN(invested) : "—"}</strong></div><button onClick={() => changeView("portfolio")} aria-label="Zobacz portfel"><ArrowUpRight size={19} /></button></div></div></section>
            <section className="quest-card"><div className="quest-decor quest-decor-one" /><div className="quest-decor quest-decor-two" /><div className="quest-top"><span className="quest-icon"><Target size={21} /></span><span className="tiny-label">TWOJA NASTĘPNA MISJA</span></div><h2>{nextMission ? nextMission.label : "Wszystkie misje zaliczone!"}</h2><p>{nextMission ? "Każda dobra decyzja zaczyna się od ciekawości. Zrób kolejny krok w swojej grze." : "Świetna robota! Odkrywaj kolejne lekcje i buduj własną strategię."}</p><div className="quest-progress-top"><span>POSTĘP W MISJACH</span><strong>{missionsDone} / {missions.length}</strong></div><div className="quest-progress"><span style={{ width: `${missionsDone / missions.length * 100}%` }} /></div><button className="quest-link" onClick={() => changeView(nextMission?.label.includes("akcję") || nextMission?.label.includes("transakcję") ? "market" : "academy")}>Odkryj kolejny krok <ArrowRight size={17} /></button></section>
          </div>
          <div className="stats-grid"><div className="stat-card"><span className="stat-icon stat-icon-green"><TrendingUp size={21} /></span><div><span>Twój wynik</span><strong className={profitLoss < 0 ? "text-red" : ""}>{game ? `${profitLoss > 0 ? "+" : ""}${fmtPLN(profitLoss)}` : "—"}</strong><small>Względem wpłat netto</small></div></div><div className="stat-card"><span className="stat-icon stat-icon-purple"><Layers3 size={21} /></span><div><span>Aktywne pozycje</span><strong>{game ? String(game.positions.length).padStart(2, "0") : "—"}</strong><small>W twoim portfelu</small></div></div><div className="stat-card"><span className="stat-icon stat-icon-orange"><Trophy size={21} /></span><div><span>Twoje doświadczenie</span><strong>{game ? `${xp} XP` : "—"}</strong><small>{completed.length} z {LESSONS.length} lekcji ukończonych</small></div></div></div>
          {missingQuotes && <p className="valuation-warning"><Info size={15} /> Część kursów jest niedostępna. Przy ich wycenie tymczasowo użyto kosztu zakupu.</p>}
          <div className="section-heading section-heading-market"><div><span className="section-eyebrow">PRAWDZIWE DANE · WIRTUALNE DECYZJE</span><h2>Odkrywaj rynek <span className="heading-spark">✳</span></h2><p>Obserwuj ceny, sprawdzaj trendy i ucz się czytać wykresy.</p></div><button className="section-link" onClick={() => changeView("market")}>Zobacz cały rynek <ArrowRight size={17} /></button></div>
          <div className="analysis-grid"><ChartCard market={market} symbol={selectedSymbol} range={range} loading={marketLoading} onRange={setRange} onOpen={() => changeView("market")} /><TipCard index={tipIndex} onNext={() => setTipIndex((tipIndex + 1) % TIPS.length)} /></div>
          <div className="section-heading table-section-heading"><div><span className="section-eyebrow">WARTO MIEĆ NA OKU</span><h2>Na twoim radarze</h2></div><button className="section-link" onClick={() => changeView("market")}>Wszystkie aktywa <ArrowRight size={17} /></button></div>
          <MarketTable assets={watchlistSymbols.map((s) => getAsset(s)!).filter(Boolean)} market={market} onSelect={selectAsset} onTrade={openTrade} compact />
          <div className="academy-teaser"><div className="academy-teaser-icon"><BookOpen size={25} /></div><div><span className="tiny-label">WIEDZA TO TWOJA PRZEWAGA</span><h3>Zanim zainwestujesz, naucz się grać.</h3><p>6 krótkich lekcji, praktyczne przykłady i quizy z XP do zdobycia.</p></div><button className="button-dark" onClick={() => changeView("academy")}>Wejdź do akademii <ArrowRight size={17} /></button></div>
        </>}

        {view === "market" && <>
          <div className="page-heading"><div><span className="heading-eyebrow"><Activity size={14} /> RYNEK W TWOICH RĘKACH</span><h1>Odkrywaj <span>rynek.</span></h1><p>Rzeczywiste notowania krypto + demonstracyjne GPW. Wirtualny portfel w localStorage.</p></div><span className="refresh-caption"><RefreshCw size={15} /> Automatyczne odświeżanie co 45 s</span></div>
          <div className="market-info-strip"><span className="info-strip-icon"><Info size={17} /></span><p>Krypto: ceny w PLN z CoinGecko (działa w przeglądarce). GPW: Yahoo Finance blokuje CORS, więc w wersji GitHub Pages używamy danych demonstracyjnych z realistycznymi wahaniami. Handel jest wyłącznie symulowany i lokalny.</p></div>
          <div className="market-detail-grid"><ChartCard market={market} symbol={selectedSymbol} range={range} loading={marketLoading} onRange={setRange} onOpen={() => openTrade(selectedSymbol)} /><TradePanel asset={selectedAsset} quote={quote} cash={cash} held={held} side={tradeSide} setSide={setTradeSide} quantity={quantity} setQuantity={setQuantity} busy={busy || !game} onSubmit={submitTrade} /></div>
          <div className="section-heading table-section-heading"><div><span className="section-eyebrow">TWOJA LISTA OBSERWACYJNA</span><h2>Aktywa na żywo</h2><p>Wybierz instrument, aby zobaczyć wykres i wykonać symulowaną transakcję.</p></div></div>
          <div className="market-toolbar"><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Wszystkie <span>{ASSETS.length}</span></button><button className={filter === "crypto" ? "active" : ""} onClick={() => setFilter("crypto")}>Krypto</button><button className={filter === "stock" ? "active" : ""} onClick={() => setFilter("stock")}>Akcje GPW</button></div><div className="search-box"><Search size={18} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj aktywa..." aria-label="Szukaj aktywa" /></div></div>
          <MarketTable assets={filteredAssets} market={market} onSelect={(symbol) => { setSelectedSymbol(symbol); setQuantity(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} onTrade={openTrade} />
          <div className="market-source-foot"><Info size={15} /> Zmiana krypto obejmuje ostatnie 24 godziny, zmiana akcji — ostatnią sesję (lub demo). Dane służą nauce, nie do składania rzeczywistych zleceń.</div>
        </>}

        {view === "portfolio" && <>
          <div className="page-heading"><div><span className="heading-eyebrow"><Wallet size={14} /> TWÓJ WIRTUALNY KAPITAŁ</span><h1>Portfel pod <span>kontrolą.</span></h1><p>Obserwuj swoje pozycje, zarządzaj saldem i analizuj wyniki. Wszystko w localStorage.</p></div><button className="button-primary heading-button" onClick={() => openFunds("deposit")}><Plus size={18} /> Dodaj środki</button></div>
          <div className="portfolio-summary-grid"><div className="portfolio-value-card"><div className="portfolio-value-top"><span><Wallet size={17} /> WARTOŚĆ CAŁEGO PORTFELA</span><span className="hero-mode"><span /> WIRTUALNE ŚRODKI</span></div><strong>{game ? fmtPLN(totalValue) : "—"}</strong><p className={profitLoss >= 0 ? "portfolio-profit-positive" : "portfolio-profit-negative"}>{game ? <>{profitLoss >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}{profitLoss > 0 ? "+" : ""}{fmtPLN(profitLoss)} względem wpłat netto</> : "Wczytywanie..."}</p><div className="portfolio-value-split"><div><span>Dostępne środki</span><b>{fmtPLN(cash)}</b></div><div><span>W aktywach</span><b>{fmtPLN(invested)}</b></div></div></div><div className="funds-card"><span className="tiny-label">ZARZĄDZAJ SALDEM</span><h3>Twój portfel, twoje zasady.</h3><p>Dodawaj lub wypłacaj wirtualne środki, kiedy chcesz. To tylko symulacja w przeglądarce — nie używamy prawdziwych pieniędzy ani bazy danych.</p><div className="fund-buttons"><button className="button-primary" onClick={() => openFunds("deposit")}><Plus size={17} /> Dodaj środki</button><button className="button-outline" onClick={() => openFunds("withdraw")}><ArrowDownLeft size={17} /> Wypłać</button></div></div></div>
          {missingQuotes && <p className="valuation-warning"><Info size={15} /> Niektóre kursy są niedostępne — ich wartość w podsumowaniu oparto tymczasowo na koszcie zakupu.</p>}
          <div className="portfolio-middle-grid"><section className="allocation-card"><div className="card-title"><div><span className="tiny-label">JAK WYGLĄDA TWÓJ PORTFEL</span><h3>Podział kapitału</h3></div><span className="card-title-icon"><Layers3 size={18} /></span></div><div className="allocation-body"><div className="allocation-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocation.length ? allocation : [{ name: "Gotówka", value: 1, color: "#c9ded2" }]} dataKey="value" innerRadius={65} outerRadius={88} paddingAngle={allocation.length > 1 ? 3 : 0} stroke="none" isAnimationActive={false}>{(allocation.length ? allocation : [{ name: "Gotówka", value: 1, color: "#c9ded2" }]).map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="allocation-center"><small>ŁĄCZNIE</small><strong>{game ? fmtPLN(totalValue) : "—"}</strong></div></div><div className="allocation-legend">{[{ name: "Gotówka", value: cash, color: "#c9ded2" }, { name: "Krypto", value: positionValues.filter((p) => p.asset?.category === "crypto").reduce((s, p) => s + p.value, 0), color: "#26a47a" }, { name: "Akcje GPW", value: positionValues.filter((p) => p.asset?.category === "stock").reduce((s, p) => s + p.value, 0), color: "#7287d9" }].map((item) => <div key={item.name}><span className="legend-name"><i style={{ background: item.color }} />{item.name}</span><strong>{fmtPLN(item.value)}</strong></div>)}</div></div></section>
            <section className="missions-card"><div className="card-title"><div><span className="tiny-label">MAŁE KROKI, DUŻE EFEKTY</span><h3>Twoje misje</h3></div><span className="card-title-icon card-title-icon-yellow"><Target size={18} /></span></div><p>Zbieraj doświadczenie, ucząc się i podejmując własne decyzje.</p><div className="missions-list">{missions.map((mission, index) => <div key={mission.label} className={mission.done ? "mission-done" : ""}><span className="mission-check">{mission.done ? <Check size={14} /> : String(index + 1)}</span><span>{mission.label}</span>{mission.done && <CheckCircle2 size={16} className="mission-complete-icon" />}</div>)}</div><div className="missions-footer"><span>{missionsDone} z {missions.length} ukończonych</span><button onClick={() => changeView("academy")}>Idź do akademii <ArrowRight size={15} /></button></div></section></div>
          <div className="section-heading table-section-heading"><div><span className="section-eyebrow">TWOJE INWESTYCJE</span><h2>Otwarte pozycje</h2></div><button className="section-link" onClick={() => changeView("market")}>Odkrywaj aktywa <ArrowRight size={17} /></button></div>
          {positionValues.length ? <div className="holdings-card"><div className="holdings-head"><span>AKTYWO</span><span>ILOŚĆ</span><span>ŚREDNI KOSZT</span><span>WARTOŚĆ TERAZ</span><span>WYNIK</span><span></span></div>{positionValues.map((p) => { const currentResult = p.value - p.costBasis; return <div className="holding-row" key={p.symbol}><div className="table-asset">{p.asset && <AssetIcon asset={p.asset} size="small" />}<span><strong>{p.asset?.name ?? p.symbol}</strong><small>{p.symbol}</small></span></div><span className="holding-quantity">{fmtNumber(p.quantity)} {p.symbol}</span><span className="holding-cost">{fmtPLN(p.costBasis)}</span><strong className="holding-value">{fmtPLN(p.value)}{p.missing && <small>koszt zakupu</small>}</strong><span className={`holding-result ${currentResult >= 0 ? "text-green" : "text-red"}`}>{currentResult >= 0 ? "+" : ""}{fmtPLN(currentResult)}</span><button className="row-action" onClick={() => { setSelectedSymbol(p.symbol); setTradeSide("sell"); setQuantity(""); setTradeModal(true); }} aria-label={`Sprzedaj ${p.symbol}`}><ArrowUpRight size={17} /></button></div>; })}</div> : <EmptyState icon={Wallet} title="Twój portfel czeka na pierwszy ruch" text="Wybierz aktywo na rynku i wykonaj pierwszą wirtualną transakcję. Tutaj zobaczysz swoje pozycje." action={<button className="button-primary" onClick={() => changeView("market")}>Przejdź na rynek <ArrowRight size={16} /></button>} />}
          <div className="reset-row"><div><RotateCcw size={19} /><span><strong>Chcesz zacząć od nowa?</strong><small>Reset usunie transakcje, pozycje i postępy oraz przywróci 25 000 zł.</small></span></div><button onClick={() => setResetModal(true)}>Zresetuj symulację</button></div>
        </>}

        {view === "academy" && <>
          <div className="page-heading"><div><span className="heading-eyebrow"><GraduationCap size={14} /> UCZ SIĘ WE WŁASNYM TEMPIE</span><h1>Wiedza to twój <span>najlepszy ruch.</span></h1><p>Krótkie lekcje, quizy i wskazówki, które pomagają podejmować mądrzejsze decyzje.</p></div></div>
          <section className="academy-banner"><div className="academy-banner-content"><span className="academy-banner-pill"><Sparkles size={14} /> AKADEMIA GROW</span><h2>Od ciekawości do pewności siebie.</h2><p>Nie musisz wiedzieć wszystkiego na start. Wystarczy, że zrobisz pierwszy krok.</p><div className="academy-banner-progress"><div><strong>{completed.length} / {LESSONS.length}</strong><span>ukończonych lekcji</span></div><div><strong>{xp} XP</strong><span>zdobytego doświadczenia</span></div></div></div><div className="academy-banner-art"><div className="academy-art-circle circle-back" /><div className="academy-art-circle circle-front"><BookOpen size={62} strokeWidth={1.45} /></div><span className="academy-art-star star-one">✦</span><span className="academy-art-star star-two">✳</span></div></section>
          <div className="section-heading table-section-heading"><div><span className="section-eyebrow">TWOJA ŚCIEŻKA</span><h2>Wybierz lekcję</h2><p>Każda ukończona lekcja to nowa umiejętność i punkty XP.</p></div><span className="lessons-count">{completed.length} / {LESSONS.length} UKOŃCZONYCH</span></div>
          <div className="lessons-grid">{LESSONS.map((lesson) => { const Icon = lessonIcons[lesson.icon] ?? BookOpen; const isDone = completed.includes(lesson.id); return <button key={lesson.id} className={`lesson-card lesson-${lesson.accent} ${activeLesson === lesson.id ? "lesson-selected" : ""}`} onClick={() => startLesson(lesson.id)}><div className="lesson-card-top"><span className={`lesson-icon lesson-icon-${lesson.accent}`}><Icon size={22} strokeWidth={1.8} /></span><span className="lesson-state">{isDone ? <><CheckCircle2 size={15} /> UKOŃCZONO</> : `LEKCJA ${lesson.number}`}</span></div><span className="lesson-category">{lesson.category}</span><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-card-bottom"><span><Clock3 size={14} /> {lesson.minutes} min <span className="middle-dot">·</span> +{lesson.xp} XP</span><span className="lesson-arrow"><ArrowUpRight size={17} /></span></div></button>; })}</div>
          <section className="lesson-detail" id="lesson-detail"><div className="lesson-detail-head"><div><span className="section-eyebrow">LEKCJA {activeLessonData.number} · {activeLessonData.category}</span><h2>{activeLessonData.title}</h2><p>{activeLessonData.description}</p></div><span className={`lesson-icon lesson-icon-${activeLessonData.accent}`}><BookOpen size={27} /></span></div><div className="lesson-body">{activeLessonData.sections.map((section, index) => <div className="lesson-paragraph" key={section.heading}><span>0{index + 1}</span><div><h3>{section.heading}</h3><p>{section.body}</p></div></div>)}</div><div className="takeaway-box"><Lightbulb size={20} /><div><strong>Zapamiętaj</strong><p>{activeLessonData.takeaway}</p></div></div><div className="quiz-box"><div className="quiz-head"><span className="quiz-icon"><Target size={20} /></span><div><span className="tiny-label">SPRAWDŹ, CO ZAPAMIĘTAŁEŚ</span><h3>Krótki quiz</h3></div><span className="quiz-xp">+{activeLessonData.xp} XP</span></div><h4>{activeLessonData.question}</h4><div className="answer-options">{activeLessonData.answers.map((option, index) => <button key={option} className={`${answer === index ? "answer-selected" : ""} ${completed.includes(activeLessonData.id) && index === activeLessonData.correct ? "answer-correct" : ""}`} onClick={() => { setAnswer(index); setQuizFeedback(null); }} disabled={completed.includes(activeLessonData.id)}><span>{String.fromCharCode(65 + index)}</span>{option}{completed.includes(activeLessonData.id) && index === activeLessonData.correct && <Check size={18} />}</button>)}</div>{quizFeedback && <p className={`quiz-feedback ${answer === activeLessonData.correct ? "feedback-correct" : ""}`}>{quizFeedback}</p>}{completed.includes(activeLessonData.id) ? <div className="quiz-completed"><CheckCircle2 size={19} /> Lekcja ukończona! Możesz przejść do kolejnej.</div> : <button className="button-primary quiz-submit" onClick={submitQuiz} disabled={busy}>Sprawdź odpowiedź <ArrowRight size={17} /></button>}</div></section>
        </>}

        {view === "history" && <>
          <div className="page-heading"><div><span className="heading-eyebrow"><History size={14} /> TWOJA DROGA INWESTORA</span><h1>Każdy ruch <span>ma historię.</span></h1><p>Wszystkie decyzje i zmiany wirtualnego salda w jednym miejscu.</p></div></div>
          <div className="history-summary"><div className="history-summary-icon"><History size={22} /></div><div><span>WYKONANE OPERACJE</span><strong>{game?.transactions.length ?? 0}</strong></div><div className="history-summary-divider" /><div><span>PIERWSZY DZIEŃ W GRZE</span><strong>{game ? new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(game.createdAt)) : "—"}</strong></div><div className="history-summary-decoration"><TrendingUp size={48} /></div></div>
          <div className="section-heading table-section-heading"><div><span className="section-eyebrow">DZIENNIK DECYZJI</span><h2>Historia operacji</h2></div></div>
          <div className="history-filter"><button className={historyFilter === "all" ? "active" : ""} onClick={() => setHistoryFilter("all")}>Wszystkie</button><button className={historyFilter === "trades" ? "active" : ""} onClick={() => setHistoryFilter("trades")}>Transakcje</button><button className={historyFilter === "funds" ? "active" : ""} onClick={() => setHistoryFilter("funds")}>Środki</button></div>
          {(() => { const items = (game?.transactions ?? []).filter((t) => historyFilter === "all" || (historyFilter === "trades" ? ["buy", "sell"].includes(t.kind) : ["deposit", "withdraw"].includes(t.kind))); return items.length ? <div className="history-list">{items.map((item: GameTransaction) => { const asset = getAsset(item.symbol ?? ""); const isPositive = item.kind === "deposit" || item.kind === "sell"; const labels = { buy: "Kupno", sell: "Sprzedaż", deposit: "Dodanie środków", withdraw: "Wypłata środków" }; return <div className="history-row" key={item.id}><span className={`history-type-icon ${isPositive ? "history-positive" : "history-negative"}`}>{item.kind === "buy" ? <ArrowDownRight size={20} /> : item.kind === "sell" ? <ArrowUpRight size={20} /> : item.kind === "deposit" ? <Plus size={20} /> : <ArrowDown size={20} />}</span><div className="history-row-main"><strong>{labels[item.kind]} {asset?.name ?? ""}</strong><span>{fmtDate(item.createdAt)}{item.quantity && item.symbol ? ` · ${fmtNumber(item.quantity)} ${item.symbol}` : ""}</span></div><div className="history-row-amount"><strong className={isPositive ? "text-green" : ""}>{isPositive ? "+" : "−"}{fmtPLN(item.amount)}</strong>{item.price && <small>kurs {fmtPLN(item.price)}</small>}</div></div>; })}</div> : <EmptyState icon={History} title="Tu zacznie się twoja historia" text={historyFilter === "all" ? "Pierwsza wpłata lub transakcja pojawi się tutaj. Każda decyzja to okazja do nauki." : "Nie ma jeszcze operacji w tej kategorii."} action={<button className="button-primary" onClick={() => changeView("market")}>Zobacz rynek <ArrowRight size={16} /></button>} />; })()}
        </>}
        <footer className="app-footer"><span>© {new Date().getFullYear()} grow. · Symulacja edukacyjna · 100% lokalnie</span><span>To nie jest porada inwestycyjna. Inwestowanie wiąże się z ryzykiem.</span><span>Dane: CoinGecko, Binance, NBP (CORS friendly) + demo GPW.</span></footer>
      </main>
    </div>

    <nav className="mobile-dock" aria-label="Szybka nawigacja">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "mobile-dock-active" : ""} onClick={() => changeView(id)}><Icon size={19} strokeWidth={view === id ? 2.4 : 1.8} /><span>{id === "dashboard" ? "Pulpit" : id === "market" ? "Rynek" : id === "portfolio" ? "Portfel" : id === "academy" ? "Nauka" : "Historia"}</span></button>)}</nav>

    {tradeModal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setTradeModal(false); }}><div className="modal-panel trade-modal-panel" role="dialog" aria-modal="true" aria-label="Symulowana transakcja"><button className="modal-close" onClick={() => setTradeModal(false)} aria-label="Zamknij"><X size={20} /></button><TradePanel asset={selectedAsset} quote={quote} cash={cash} held={held} side={tradeSide} setSide={setTradeSide} quantity={quantity} setQuantity={setQuantity} busy={busy || !game} onSubmit={submitTrade} /></div></div>}
    {fundsModal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setFundsModal(null); }}><div className="modal-panel funds-modal" role="dialog" aria-modal="true" aria-label={fundsModal === "deposit" ? "Dodaj środki" : "Wypłać środki"}><button className="modal-close" onClick={() => setFundsModal(null)} aria-label="Zamknij"><X size={20} /></button><span className="funds-modal-icon">{fundsModal === "deposit" ? <Plus size={24} /> : <ArrowDownLeft size={24} />}</span><span className="tiny-label">WIRTUALNY PORTFEL</span><h2>{fundsModal === "deposit" ? "Dodaj środki do gry" : "Wypłać wirtualne środki"}</h2><p>{fundsModal === "deposit" ? "Wybierz kwotę, z którą chcesz ćwiczyć. Możesz ją zmienić w każdej chwili." : `Dostępne do wypłaty: ${fmtPLN(cash)}. To tylko operacja w symulatorze.`}</p><form onSubmit={submitFunds}><label htmlFor="funds-amount">Kwota w PLN</label><div className="funds-input-wrap"><input id="funds-amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" placeholder="np. 5 000" value={fundsAmount} onChange={(e) => setFundsAmount(e.target.value)} required /><span>PLN</span></div><div className="funds-presets">{[1000, 5000, 10000].map((amount) => <button type="button" key={amount} onClick={() => setFundsAmount(String(amount))}>{fmtNumber(amount, 0)} zł</button>)}</div><button className="button-primary funds-submit" disabled={busy}>{busy ? "Przetwarzanie..." : fundsModal === "deposit" ? "Dodaj wirtualne środki" : "Wypłać wirtualne środki"}<ArrowRight size={17} /></button></form><div className="funds-note"><ShieldCheck size={16} /> Żadne prawdziwe pieniądze nie są tu wpłacane ani wypłacane. Wszystko w localStorage.</div></div></div>}
    {resetModal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setResetModal(false); }}><div className="modal-panel reset-modal" role="dialog" aria-modal="true" aria-label="Zresetuj symulację"><button className="modal-close" onClick={() => setResetModal(false)} aria-label="Zamknij"><X size={20} /></button><span className="reset-modal-icon"><RotateCcw size={25} /></span><h2>Zacząć od początku?</h2><p>Twoje pozycje, historia transakcji i ukończone lekcje zostaną usunięte. Wrócisz do początkowych 25 000 zł wirtualnych środków. Tej operacji nie można cofnąć.</p><div className="reset-actions"><button className="button-outline" onClick={() => setResetModal(false)}>Anuluj</button><button className="button-danger" disabled={busy} onClick={() => { void (async () => { const result = await handleAction(() => handleReset(), "Symulacja została zresetowana. Czas na nowy start!"); if (result) { setResetModal(false); setAnswer(null); setQuizFeedback(null); } })(); }}>Tak, zacznij od nowa</button></div></div></div>}
    {toast && <div className={`toast ${toast.type === "error" ? "toast-error" : ""}`} role="status">{toast.type === "success" ? <CheckCircle2 size={20} /> : <Info size={20} />}<span>{toast.text}</span><button onClick={() => setToast(null)} aria-label="Zamknij powiadomienie"><X size={16} /></button></div>}
  </div>;
}
