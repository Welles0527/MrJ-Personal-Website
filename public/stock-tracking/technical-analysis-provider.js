"use strict";

(function createTechnicalAnalysisProvider(global) {
  const scores = global.StockTechnicalScores;
  const tradeLevels = global.StockTechnicalTradeLevels;

  function shanghaiTradingStatus() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const minute = Number(values.hour) * 60 + Number(values.minute);
    const weekday = values.weekday;
    const weekdayOpen = !["Sat", "Sun"].includes(weekday);
    const inSession = weekdayOpen && ((minute >= 9 * 60 + 30 && minute < 11 * 60 + 30) || (minute >= 13 * 60 && minute < 15 * 60));
    return inSession ? "交易中" : "已收盘";
  }

  function buildOverview(code, snapshot) {
    const history = snapshot.history;
    const last = history.candles.at(-1);
    const previous = history.candles.at(-2);
    const quote = snapshot.quote;
    const historyChange = previous?.close ? last.close - previous.close : last.change;
    const historyChangePct = previous?.close ? historyChange / previous.close * 100 : last.changePct;
    return {
      code,
      name: quote?.name || history.name || code,
      price: Number.isFinite(Number(quote?.price)) ? Number(quote.price) : last.close,
      change: Number.isFinite(Number(quote?.change)) ? Number(quote.change) : historyChange,
      changePct: Number.isFinite(Number(quote?.changePct)) ? Number(quote.changePct) : historyChangePct,
      updatedAt: quote?.updatedAt || history.updatedAt,
      tradingStatus: shanghaiTradingStatus(),
      scoreDate: history.lastCompletedDate,
      quoteSource: quote?.source || history.source,
      historySource: history.source
    };
  }

  function buildSparklines(result) {
    const set = result.indicators;
    const index = set.candles.length - 1;
    return {
      trend: set.close.slice(-18),
      structure: set.close.slice(-18),
      momentum: set.macd.histogram.slice(-18),
      volumePrice: set.volume.slice(-18),
      volatility: set.boll.bandwidth.slice(-18),
      dates: set.candles.slice(-18).map(candle => candle.date),
      latest: {
        rsi: set.rsi[index],
        atr: set.atr[index],
        macdHistogram: set.macd.histogram[index]
      }
    };
  }

  function analyzeSnapshot(code, snapshot) {
    const candles = snapshot.history?.candles || [];
    if (candles.length < 250) throw new Error(`前复权日线仅有 ${candles.length} 个交易日，少于正式评分所需的 250 日`);
    const scoreResult = scores.calculateTechnicalScore(candles);
    const levels = tradeLevels.calculateTradeLevels(scoreResult);
    const scoreHistory = scores.calculateScoreHistory(candles, 30, 120);
    return {
      overview: buildOverview(code, snapshot),
      candles,
      scores: scoreResult,
      tradeLevels: levels,
      scoreHistory,
      sparklines: buildSparklines(scoreResult),
      dataMeta: {
        source: snapshot.history.source,
        adjustment: snapshot.history.adjustment,
        period: snapshot.history.period,
        rawCount: candles.length,
        completedThrough: snapshot.history.lastCompletedDate,
        checkedAt: snapshot.checkedAt,
        quoteError: snapshot.errors?.quote || ""
      }
    };
  }

  class EastmoneyTechnicalAnalysisProvider {
    constructor(options = {}) {
      const liveOptions = { ...options };
      if (["127.0.0.1", "localhost"].includes(global.location.hostname) && !liveOptions.proxyEndpoint) {
        liveOptions.proxyEndpoint = "/api/stock-tracking-live";
      }
      this.liveProvider = options.liveProvider || new global.StockTrackingLiveData.EastmoneyStockLiveDataProvider(liveOptions);
      this.cache = new Map();
      this.cacheTtl = Number(options.cacheTtl) || 10 * 60 * 1000;
    }

    async getTechnicalAnalysis(stockCode, query, options = {}) {
      const code = String(stockCode || "").padStart(6, "0");
      if (!/^\d{6}$/.test(code)) throw new Error("股票代码必须为6位数字");
      const cached = this.cache.get(code);
      if (!options.forceRefresh && cached && Date.now() - cached.createdAt < this.cacheTtl) return cached.value;
      const snapshot = await this.liveProvider.getTechnicalSnapshot(code, { force: Boolean(options.forceRefresh) });
      const value = analyzeSnapshot(code, snapshot);
      value.query = { ...query, period: "day", adjustment: "forward" };
      this.cache.set(code, { createdAt: Date.now(), value });
      return value;
    }
  }

  global.StockTechnicalAnalysis = {
    EastmoneyTechnicalAnalysisProvider,
    analyzeSnapshot
  };
})(window);
