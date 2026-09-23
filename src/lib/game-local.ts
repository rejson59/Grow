"use client";

import { LESSONS, getAsset } from "@/lib/content";
import type { GameState, GameResponse, GameTransaction, GamePosition } from "@/lib/game-types";
import { getFreshQuote } from "@/lib/market-client";

const STORAGE_KEY = "grow_game_state_v1";

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const moneyString = (value: number) => roundMoney(value).toFixed(2);

class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

function defaultState(): GameState {
  return {
    cash: 25000,
    totalDeposited: 25000,
    xp: 0,
    createdAt: new Date().toISOString(),
    positions: [],
    transactions: [],
    completedLessons: [],
  };
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function loadFromStorage(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // basic validation
    if (typeof parsed.cash !== "number" || !Array.isArray(parsed.positions)) return null;
    // ensure fields exist
    return {
      cash: Number(parsed.cash) || 25000,
      totalDeposited: Number(parsed.totalDeposited) || 25000,
      xp: Number(parsed.xp) || 0,
      createdAt: parsed.createdAt || new Date().toISOString(),
      positions: (parsed.positions || []).map((p: GamePosition) => ({
        symbol: String(p.symbol),
        quantity: Number(p.quantity),
        costBasis: Number(p.costBasis),
      })),
      transactions: (parsed.transactions || []).map((t: GameTransaction) => ({
        id: Number(t.id),
        kind: t.kind,
        symbol: t.symbol,
        quantity: t.quantity === null ? null : Number(t.quantity),
        price: t.price === null ? null : Number(t.price),
        amount: Number(t.amount),
        createdAt: t.createdAt,
      })),
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    };
  } catch (e) {
    console.warn("Failed to load game state", e);
    return null;
  }
}

function saveToStorage(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save game state", e);
  }
}

export function getGameState(): GameState {
  const stored = loadFromStorage();
  if (stored) return stored;
  const def = defaultState();
  saveToStorage(def);
  return def;
}

export function saveGameState(state: GameState) {
  saveToStorage(state);
}

export function resetGameState(): GameState {
  const def = defaultState();
  saveToStorage(def);
  return def;
}

function nextTransactionId(transactions: GameTransaction[]): number {
  if (!transactions.length) return 1;
  return Math.max(...transactions.map((t) => t.id)) + 1;
}

export async function handleDeposit(amountRaw: number): Promise<GameResponse> {
  const value = Number(amountRaw);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000 || roundMoney(value) <= 0) {
    throw new ActionError("Podaj kwotę od 0,01 zł do 1 000 000 zł.");
  }
  const amount = roundMoney(value);
  const state = getGameState();
  const newState = cloneState(state);
  newState.cash = roundMoney(newState.cash + amount);
  newState.totalDeposited = roundMoney(newState.totalDeposited + amount);
  const tx: GameTransaction = {
    id: nextTransactionId(newState.transactions),
    kind: "deposit",
    symbol: null,
    quantity: null,
    price: null,
    amount,
    createdAt: new Date().toISOString(),
  };
  newState.transactions.unshift(tx);
  saveToStorage(newState);
  return newState;
}

export async function handleWithdraw(amountRaw: number): Promise<GameResponse> {
  const value = Number(amountRaw);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000 || roundMoney(value) <= 0) {
    throw new ActionError("Podaj kwotę od 0,01 zł do 1 000 000 zł.");
  }
  const amount = roundMoney(value);
  const state = getGameState();
  if (amount > state.cash + 0.001) {
    throw new ActionError("Nie masz tylu wolnych środków do wypłaty.");
  }
  const newState = cloneState(state);
  newState.cash = roundMoney(newState.cash - amount);
  newState.totalDeposited = roundMoney(newState.totalDeposited - amount);
  const tx: GameTransaction = {
    id: nextTransactionId(newState.transactions),
    kind: "withdraw",
    symbol: null,
    quantity: null,
    price: null,
    amount,
    createdAt: new Date().toISOString(),
  };
  newState.transactions.unshift(tx);
  saveToStorage(newState);
  return newState;
}

export async function handleTrade(symbol: string, side: "buy" | "sell", quantityRaw: number): Promise<GameResponse> {
  const asset = getAsset(symbol);
  const requestedQuantity = Number(quantityRaw);
  if (!asset || (side !== "buy" && side !== "sell")) throw new ActionError("Wybierz poprawną transakcję.");
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || requestedQuantity > 1_000_000) {
    throw new ActionError("Podaj poprawną ilość aktywa.");
  }
  if (asset.category === "stock" && !Number.isInteger(requestedQuantity)) {
    throw new ActionError("Akcje kupuje się i sprzedaje w pełnych sztukach.");
  }
  const quantity = Number(requestedQuantity.toFixed(8));
  if (quantity <= 0 || Math.abs(quantity - requestedQuantity) > 0.000000001) {
    throw new ActionError("Dla krypto możesz podać maksymalnie 8 miejsc po przecinku.");
  }

  let quote;
  try {
    quote = await getFreshQuote(symbol);
  } catch (error) {
    throw new ActionError(error instanceof Error ? error.message : "Nie można pobrać kursu.");
  }
  const price = quote.price!;
  const amount = roundMoney(price * quantity);
  if (amount < 0.01) throw new ActionError("Wartość transakcji musi wynosić co najmniej 0,01 zł.");

  const state = getGameState();
  const newState = cloneState(state);
  const currentPos = newState.positions.find((p) => p.symbol === symbol);

  if (side === "buy") {
    if (amount > newState.cash + 0.001) throw new ActionError("Za mało wolnych środków. Dodaj środki lub zmniejsz ilość.");
    newState.cash = roundMoney(newState.cash - amount);
    if (currentPos) {
      currentPos.quantity = Number((currentPos.quantity + quantity).toFixed(8));
      currentPos.costBasis = roundMoney(currentPos.costBasis + amount);
    } else {
      newState.positions.push({ symbol, quantity, costBasis: amount });
    }
    const previousBuys = newState.transactions.filter((t) => t.kind === "buy");
    if (previousBuys.length === 0) {
      newState.xp += 25;
    }
  } else {
    if (!currentPos || currentPos.quantity + 0.000000001 < quantity) throw new ActionError("Nie masz tylu jednostek w portfelu.");
    const remaining = Number((currentPos.quantity - quantity).toFixed(8));
    newState.cash = roundMoney(newState.cash + amount);
    if (remaining <= 0) {
      newState.positions = newState.positions.filter((p) => p.symbol !== symbol);
    } else {
      currentPos.quantity = remaining;
      currentPos.costBasis = roundMoney((currentPos.costBasis * remaining) / (currentPos.quantity + quantity) * (currentPos.quantity + quantity) / currentPos.quantity);
      // simpler: proportionally reduce cost basis
      // actually recalc: costBasis * remaining / original
      // we need original quantity before subtraction
      // Let's fix using saved original
      const originalQty = currentPos.quantity + quantity;
      const originalCost = newState.positions.find((p) => p.symbol === symbol)?.costBasis ?? currentPos.costBasis;
      // But we already mutated, so use formula from server:
      // costBasis = costBasis * remaining / originalQuantity
      // We'll compute from before mutation - we need to store before
    }
  }

  // Fix sell costBasis logic properly
  if (side === "sell") {
    // Recompute from original state for accuracy
    const origState = state;
    const origPos = origState.positions.find((p) => p.symbol === symbol);
    if (origPos) {
      const remaining = Number((origPos.quantity - quantity).toFixed(8));
      const newPositions = newState.positions;
      const posInNew = newPositions.find((p) => p.symbol === symbol);
      if (remaining <= 0) {
        // already removed
      } else if (posInNew) {
        posInNew.costBasis = roundMoney((origPos.costBasis * remaining) / origPos.quantity);
      }
    }
  }

  const tx: GameTransaction = {
    id: nextTransactionId(newState.transactions),
    kind: side,
    symbol,
    quantity,
    price: Number(price.toFixed(4)),
    amount,
    createdAt: new Date().toISOString(),
  };
  newState.transactions.unshift(tx);
  saveToStorage(newState);

  return {
    ...newState,
    execution: { price, amount, source: quote.source, side, symbol, quantity },
  };
}

export async function handleLesson(lessonId: string, answer: number): Promise<GameResponse> {
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (!lesson) throw new ActionError("Nie znaleziono tej lekcji.");
  const state = getGameState();
  if (state.completedLessons.includes(lesson.id)) {
    return state;
  }
  if (answer !== lesson.correct) throw new ActionError("To nie jest poprawna odpowiedź. Spróbuj ponownie.");
  const newState = cloneState(state);
  newState.completedLessons.push(lesson.id);
  newState.xp += lesson.xp;
  saveToStorage(newState);
  return newState;
}

export async function handleReset(): Promise<GameResponse> {
  return resetGameState();
}

export { ActionError };
