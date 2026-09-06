import { Router, type IRouter } from "express";
import {
  CreatePaperOrderBody,
  CreatePaperOrderResponse,
  GetBulkPresetsResponse,
  GetDashboardResponse,
  GetPaperOrdersResponse,
  GetScannerSignalsQueryParams,
  GetScannerSignalsResponse,
  GetSymbolAnalysisQueryParams,
  GetSymbolAnalysisResponse,
  PreviewBulkTradeBody,
  PreviewBulkTradeResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { paperOrdersTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

const marketCatalog = [
  {
    symbol: "R_100",
    name: "Volatility 100 Index",
    price: 6432.18,
    change: 1.82,
    score: 91,
    direction: "CALL" as const,
    reasons: ["EMA20 above EMA50", "RSI holding 58", "Breakout retest confirmed"],
    bias: "bullish" as const,
  },
  {
    symbol: "R_75",
    name: "Volatility 75 Index",
    price: 2310.64,
    change: -1.14,
    score: 86,
    direction: "PUT" as const,
    reasons: ["MACD crossed down", "Lower high on 15m", "Momentum fading at resistance"],
    bias: "bearish" as const,
  },
  {
    symbol: "R_50",
    name: "Volatility 50 Index",
    price: 1187.42,
    change: 0.64,
    score: 78,
    direction: "CALL" as const,
    reasons: ["Higher lows forming", "Price above pivot", "Volatility compressed"],
    bias: "bullish" as const,
  },
  {
    symbol: "1HZ100V",
    name: "Volatility 100 (1s)",
    price: 512.86,
    change: -0.42,
    score: 73,
    direction: "PUT" as const,
    reasons: ["RSI divergence", "Price rejected VWAP", "Selling pressure increasing"],
    bias: "bearish" as const,
  },
  {
    symbol: "R_25",
    name: "Volatility 25 Index",
    price: 892.33,
    change: 0.21,
    score: 66,
    direction: "CALL" as const,
    reasons: ["Trend intact", "Support held twice", "Low volatility regime"],
    bias: "bullish" as const,
  },
  {
    symbol: "R_10",
    name: "Volatility 10 Index",
    price: 346.77,
    change: -0.08,
    score: 54,
    direction: "PUT" as const,
    reasons: ["Mixed trend signals", "RSI near midpoint", "Awaiting confirmation"],
    bias: "neutral" as const,
  },
];

const now = () => new Date().toISOString();

function getMarket(symbol: string) {
  return (
    marketCatalog.find((market) => market.symbol === symbol) ?? marketCatalog[0]
  );
}

function scannerSignals(timeframe: string, limit: number) {
  return marketCatalog.slice(0, limit).map((market) => ({
    symbol: market.symbol,
    name: market.name,
    direction: market.direction,
    confidence: Math.min(97, market.score + 2),
    score: market.score,
    price: market.price,
    change: market.change,
    timeframe,
    reasons: market.reasons,
    status: market.score >= 80 ? ("ready" as const) : market.score >= 65 ? ("watch" as const) : ("caution" as const),
  }));
}

function makeAnalysis(symbol: string, timeframe: string) {
  const market = getMarket(symbol);
  const candles = Array.from({ length: 28 }, (_, index) => {
    const drift = market.change / 100 * (index + 1);
    const wave = Math.sin(index / 2.2) * market.price * 0.0025;
    const close = Number((market.price * (0.985 + index * 0.00055) + wave + drift * market.price).toFixed(2));
    const open = Number((close - Math.cos(index) * market.price * 0.0018).toFixed(2));
    const high = Number((Math.max(open, close) + market.price * (0.0014 + (index % 3) * 0.0004)).toFixed(2));
    const low = Number((Math.min(open, close) - market.price * (0.0011 + (index % 2) * 0.0003)).toFixed(2));
    const timeValue = new Date(Date.now() - (27 - index) * 15 * 60_000).toISOString();
    return { time: timeValue, open, high, low, close };
  });

  const spread = market.price * 0.012;
  return {
    symbol: market.symbol,
    name: market.name,
    timeframe,
    price: market.price,
    change: market.change,
    candles,
    indicators: {
      rsi: market.bias === "bullish" ? 58.4 : market.bias === "bearish" ? 42.7 : 50.8,
      macd: Number((market.change * 0.082).toFixed(3)),
      ema20: Number((market.price * (market.bias === "bullish" ? 0.996 : 1.004)).toFixed(2)),
      ema50: Number((market.price * (market.bias === "bullish" ? 0.989 : 1.011)).toFixed(2)),
      volatility: Number((Math.abs(market.change) * 1.74 + 0.82).toFixed(2)),
    },
    levels: [
      { label: "Resistance", price: Number((market.price + spread).toFixed(2)), type: "resistance" as const },
      { label: "Pivot", price: Number(market.price.toFixed(2)), type: "pivot" as const },
      { label: "Support", price: Number((market.price - spread).toFixed(2)), type: "support" as const },
    ],
    bias: market.bias,
    updatedAt: now(),
  };
}

const presets = [
  {
    id: "momentum-leaders",
    name: "Momentum leaders",
    description: "Queue the highest-confidence directional signals.",
    symbols: ["R_100", "R_75", "R_50"],
    risk: "Moderate",
    direction: "AUTO" as const,
  },
  {
    id: "volatility-core",
    name: "Volatility core",
    description: "Spread a small stake across the core synthetic indices.",
    symbols: ["R_100", "R_75", "R_50", "R_25"],
    risk: "Conservative",
    direction: "AUTO" as const,
  },
  {
    id: "bearish-watch",
    name: "Bearish watchlist",
    description: "Focus on symbols where momentum is rolling over.",
    symbols: ["R_75", "1HZ100V", "R_10"],
    risk: "Focused",
    direction: "PUT" as const,
  },
];

function formatOrder(order: typeof paperOrdersTable.$inferSelect) {
  return {
    id: order.id,
    symbol: order.symbol,
    direction: order.direction as "CALL" | "PUT",
    stake: order.stake,
    duration: order.duration,
    status: order.status as "queued" | "simulated" | "settled",
    result: order.result,
    createdAt: order.createdAt.toISOString(),
  };
}

router.get("/dashboard", async (_req, res) => {
  const orders = await db.select().from(paperOrdersTable);
  const totalStake = orders.reduce((sum, order) => sum + order.stake, 0);
  const data = GetDashboardResponse.parse({
    balance: Number((1000 - totalStake).toFixed(2)),
    dailyPnl: Number((orders.reduce((sum, order) => sum + (order.result ?? 0), -38.4)).toFixed(2)),
    openPositions: orders.filter((order) => order.status === "queued").length,
    winRate: 61.5,
    activeSignals: 4,
    feedStatus: "SIMULATED",
    updatedAt: now(),
  });
  res.json(data);
});

router.get("/scanner/signals", (req, res) => {
  const parsed = GetScannerSignalsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid scanner filters" });
    return;
  }
  const data = GetScannerSignalsResponse.parse(
    scannerSignals(parsed.data.timeframe, parsed.data.limit),
  );
  res.json(data);
});

router.get("/analysis", (req, res) => {
  const parsed = GetSymbolAnalysisQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid symbol is required" });
    return;
  }
  res.json(GetSymbolAnalysisResponse.parse(makeAnalysis(parsed.data.symbol, parsed.data.timeframe)));
});

router.get("/bulk/presets", (_req, res) => {
  res.json(GetBulkPresetsResponse.parse(presets));
});

router.post("/bulk/preview", (req, res) => {
  const parsed = PreviewBulkTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid bulk trade settings" });
    return;
  }
  const { symbols, direction, stake, duration, maxLoss } = parsed.data;
  const orders = symbols.map((symbol, index) => {
    const market = getMarket(symbol);
    return {
      id: `preview-${Date.now()}-${index}`,
      symbol: market.symbol,
      direction: direction === "AUTO" ? market.direction : direction,
      stake,
      duration,
      status: "queued" as const,
      result: null,
      createdAt: now(),
    };
  });
  const totalStake = Number((orders.length * stake).toFixed(2));
  res.json(
    PreviewBulkTradeResponse.parse({
      orders,
      totalStake,
      worstCaseLoss: totalStake,
      withinRiskLimit: totalStake <= maxLoss,
      mode: "PAPER",
    }),
  );
});

router.get("/paper/orders", async (_req, res) => {
  const rows = await db
    .select()
    .from(paperOrdersTable)
    .orderBy(desc(paperOrdersTable.createdAt))
    .limit(20);
  res.json(GetPaperOrdersResponse.parse(rows.map(formatOrder)));
});

router.post("/paper/orders", async (req, res) => {
  const parsed = CreatePaperOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid paper order" });
    return;
  }
  const input = parsed.data;
  const order = {
    id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: getMarket(input.symbol).symbol,
    direction: input.direction,
    stake: input.stake,
    duration: input.duration,
    status: "simulated",
    result: 0,
  };
  const [created] = await db.insert(paperOrdersTable).values(order).returning();
  res.status(201).json(CreatePaperOrderResponse.parse(formatOrder(created)));
});

export default router;