"use strict";

(function createTechnicalAnalysisProvider(global) {
  const scores = global.StockTechnicalScores;
  const tradeLevels = global.StockTechnicalTradeLevels;
  const timeframes = typeof module === "object" && module.exports
    ? require("./technical-timeframes.js")
    : global.StockTechnicalTimeframes;

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

  function buildOverview(code, snapshot, candles, profile) {
    const history = snapshot.history;
    const last = candles.at(-1);
    const previous = candles.at(-2);
    const quote = snapshot.quote;
    const historyChange = previous?.close ? last.close - previous.close : last.change;
    const historyChangePct = previous?.close ? historyChange / previous.close * 100 : last.changePct;
    return {
      code,
      name: quote?.name || history.name || code,
      price: Number.isFinite(Number(quote?.price)) ? Number(quote.price) : last.close,
      change: Number.isFinite(Number(quote?.change)) ? Number(quote.change) : historyChange,
      changePct: Number.isFinite(Number(quote?.changePct)) ? Number(quote.changePct) : historyChangePct,
      periodChange: historyChange,
      periodChangePct: historyChangePct,
      updatedAt: quote?.updatedAt || history.updatedAt,
      tradingStatus: shanghaiTradingStatus(),
      scoreDate: last.date,
      period: profile.id,
      periodLabel: profile.lineLabel,
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
      boll: {
        upper: set.boll.upper.slice(-18),
        middle: set.boll.middle.slice(-18),
        lower: set.boll.lower.slice(-18)
      },
      dates: set.candles.slice(-18).map(candle => candle.date),
      latest: {
        rsi: set.rsi[index],
        atr: set.atr[index],
        macdHistogram: set.macd.histogram[index]
      }
    };
  }

  function dateMonthsAgo(dateString, months) {
    const [year, month, day] = String(dateString || "").split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return "";
    const targetMonth = new Date(Date.UTC(year, month - 1 - months, 1));
    const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    targetMonth.setUTCDate(Math.min(day, lastDay));
    return targetMonth.toISOString().slice(0, 10);
  }

  function buildScorePerformance(candles, profile) {
    const endDate = candles.at(-1)?.date || "";
    const startDate = dateMonthsAgo(endDate, profile.validationMonths);
    const firstPeriodIndex = Math.max(0, candles.findIndex(candle => candle.date >= startDate));
    const historyStartIndex = Math.max(0, firstPeriodIndex - 1);
    const performanceHistory = scores.calculateScoreHistory(
      candles,
      candles.length - historyStartIndex,
      profile.historyMinimum,
      { profile }
    );
    return {
      ...scores.calculateScorePerformance(performanceHistory, { fromDate: startDate }),
      period: { months: profile.validationMonths, startDate, endDate, label: profile.validationLabel }
    };
  }

  function analyzeSnapshot(code, snapshot, query = {}) {
    const profile = timeframes.getProfile(query.period);
    const sourceCandles = snapshot.history?.candles || [];
    const candles = timeframes.aggregateCandles(sourceCandles, profile.id);
    if (candles.length < profile.minimumBars) {
      throw new Error(`${profile.lineLabel}仅有 ${candles.length} 个有效周期，少于正式评分所需的 ${profile.minimumBars} 个周期`);
    }
    const scoreResult = scores.calculateTechnicalScore(candles, { profile });
    const levels = tradeLevels.calculateTradeLevels(scoreResult);
    const scoreHistory = scores.calculateScoreHistory(candles, profile.historyCount, profile.historyMinimum, { profile });
    const scorePerformance = buildScorePerformance(candles, profile);
    return {
      overview: buildOverview(code, snapshot, candles, profile),
      candles,
      scores: scoreResult,
      tradeLevels: levels,
      scoreHistory,
      scorePerformance,
      sparklines: buildSparklines(scoreResult),
      dataMeta: {
        source: snapshot.history.source,
        adjustment: snapshot.history.adjustment,
        period: profile.id,
        periodLabel: profile.lineLabel,
        barLabel: profile.barLabel,
        sourcePeriod: snapshot.history.period,
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
      this.includeDailySeries = Boolean(options.includeDailySeries);
      this.dailySeriesLimit = Math.max(260, Math.min(500, Number(options.dailySeriesLimit) || 500));
    }

    async getTechnicalAnalysis(stockCode, query, options = {}) {
      const code = String(stockCode || "").padStart(6, "0");
      if (!/^\d{6}$/.test(code)) throw new Error("股票代码必须为6位数字");
      const profile = timeframes.getProfile(query?.period);
      const cacheKey = `${code}:${profile.id}`;
      const cached = this.cache.get(cacheKey);
      if (!options.forceRefresh && cached && Date.now() - cached.createdAt < this.cacheTtl) return cached.value;
      const primaryLimit = this.includeDailySeries && profile.sourcePeriod === "day"
        ? Math.max(profile.sourceLimit, this.dailySeriesLimit)
        : profile.sourceLimit;
      const snapshot = await this.liveProvider.getTechnicalSnapshot(code, {
        force: Boolean(options.forceRefresh),
        period: profile.sourcePeriod,
        limit: primaryLimit
      });
      const value = analyzeSnapshot(code, snapshot, { ...query, period: profile.id });
      value.query = { ...query, period: profile.id, adjustment: "forward" };
      if (this.includeDailySeries) {
        const dailySnapshot = profile.sourcePeriod === "day"
          ? snapshot
          : await this.liveProvider.getTechnicalSnapshot(code, {
              force: Boolean(options.forceRefresh),
              period: "day",
              limit: this.dailySeriesLimit
            });
        value.dailyCandles = (dailySnapshot.history?.candles || []).slice(-this.dailySeriesLimit);
        value.dataMeta.dailySeriesSource = dailySnapshot.history?.source || "";
        value.dataMeta.dailySeriesCompletedThrough = dailySnapshot.history?.lastCompletedDate || "";
      }
      this.cache.set(cacheKey, { createdAt: Date.now(), value });
      return value;
    }

    async getTechnicalSummary(stocks, query, options = {}) {
      const stockList = [...new Map((Array.isArray(stocks) ? stocks : [])
        .map(stock => {
          const code = String(stock?.code || stock || "").padStart(6, "0");
          return /^\d{6}$/.test(code) ? [code, { code, name: stock?.name || "" }] : null;
        })
        .filter(Boolean)).values()];
      if (!stockList.length) return { items: [], errors: [], checkedAt: new Date().toISOString() };

      const items = new Array(stockList.length);
      const errors = [];
      let nextIndex = 0;
      const workerCount = Math.min(4, stockList.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < stockList.length) {
          const index = nextIndex;
          nextIndex += 1;
          const stock = stockList[index];
          try {
            const result = await this.getTechnicalAnalysis(stock.code, query, options);
            items[index] = {
              code: stock.code,
              name: stock.name || result.overview.name,
              score: result.scores.total,
              label: result.scores.label,
              scoreDate: result.overview.scoreDate,
              price: result.overview.price,
              changePct: result.overview.periodChangePct,
              buyZone: result.tradeLevels.buyZone ? {
                lower: result.tradeLevels.buyZone.lower,
                upper: result.tradeLevels.buyZone.upper
              } : null,
              stop: result.tradeLevels.stop,
              updatedAt: result.overview.updatedAt
            };
          } catch (error) {
            errors.push({ code: stock.code, name: stock.name || stock.code, message: error?.message || "评分失败" });
          }
        }
      });
      await Promise.all(workers);
      return {
        items: items.filter(Boolean),
        errors,
        checkedAt: new Date().toISOString()
      };
    }

    async getTechnicalTimeframeMatrix(stockCode, options = {}) {
      const profiles = Object.values(timeframes.PROFILES);
      const settled = await Promise.allSettled(profiles.map(profile => this.getTechnicalAnalysis(
        stockCode,
        { period: profile.id, adjustment: "forward" },
        options
      )));
      return {
        rows: settled.map((entry, index) => {
          const profile = profiles[index];
          if (entry.status !== "fulfilled") {
            return { period: profile.id, label: profile.label, error: entry.reason?.message || "评分失败" };
          }
          const result = entry.value;
          return {
            period: profile.id,
            label: profile.label,
            scoreDate: result.overview.scoreDate,
            total: result.scores.total,
            trend: result.scores.dimensions.trend?.score,
            volumePrice: result.scores.dimensions.volumePrice?.score,
            momentum: result.scores.dimensions.momentum?.score,
            structure: result.scores.dimensions.structure?.score,
            volatility: result.scores.dimensions.volatility?.score
          };
        }),
        checkedAt: new Date().toISOString()
      };
    }
  }

  global.StockTechnicalAnalysis = {
    EastmoneyTechnicalAnalysisProvider,
    analyzeSnapshot
  };
})(window);
