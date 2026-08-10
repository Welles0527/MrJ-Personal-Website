type TechnicalDimensionId = "trend" | "structure" | "momentum" | "volumePrice" | "volatility";

interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  turnoverRate: number | null;
}

interface ScoreDetail {
  id: string;
  label: string;
  points: number | null;
  max: number;
  evidence: string;
}

interface DimensionScore {
  score: number | null;
  details: ScoreDetail[];
  values?: Record<string, number | null>;
}

interface TechnicalScoresResult {
  total: number | null;
  label: string;
  dimensions: Record<TechnicalDimensionId, DimensionScore>;
  chips: Array<{ id: string; label: string; tone: string }>;
}

interface TechnicalTradeLevels {
  buyZone: { lower: number; upper: number; sources: string[]; label: string } | null;
  breakout: { price: number; triggered: boolean; label: string; condition: string } | null;
  stop: number | null;
  targets: number[];
  reduceSignal: { active: boolean; label: string; evidence: string[] } | null;
  atr: number | null;
}

interface TechnicalAnalysisResult {
  overview: {
    code: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    updatedAt: string;
    tradingStatus: string;
    scoreDate: string;
  };
  candles: DailyCandle[];
  scores: TechnicalScoresResult;
  tradeLevels: TechnicalTradeLevels;
  scoreHistory: Array<{ date: string; score: number | null; changePct: number | null }>;
  scorePerformance: {
    comparisons: Array<{ date: string; score: number | null; changePct: number | null; priorScore: number | null; signal: "bullish" | "bearish" | "neutral"; signalLabel: string; direction: "up" | "down" | "flat"; hit: boolean | null }>;
    hitCount: number;
    evaluatedCount: number;
    ignoredCount: number;
    hitRate: number | null;
    methodology: string;
  };
  dataMeta: {
    source: string;
    adjustment: "forward";
    period: "day";
    rawCount: number;
    completedThrough: string;
    checkedAt: string;
  };
}
