export type GamePosition = {
  symbol: string;
  quantity: number;
  costBasis: number;
};

export type GameTransaction = {
  id: number;
  kind: "deposit" | "withdraw" | "buy" | "sell";
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  createdAt: string;
};

export type GameState = {
  cash: number;
  totalDeposited: number;
  xp: number;
  createdAt: string;
  positions: GamePosition[];
  transactions: GameTransaction[];
  completedLessons: string[];
};

export type GameResponse = GameState & {
  execution?: { price: number; amount: number; source: string; side: "buy" | "sell"; symbol: string; quantity: number };
};
