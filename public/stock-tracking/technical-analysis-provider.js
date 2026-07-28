"use strict";

(function createTechnicalAnalysisProvider(global) {
  const mockStore = global.STOCK_TECHNICAL_ANALYSIS_MOCK_DATA;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class MockTechnicalAnalysisProvider {
    constructor(options = {}) {
      this.latency = Number(options.latency) || 280;
      this.refreshLatency = Number(options.refreshLatency) || 560;
    }

    /**
     * @param {string} stockCode
     * @param {TechnicalAnalysisQuery} query
     * @param {{ forceRefresh?: boolean }} [options]
     * @returns {Promise<TechnicalAnalysisResult | null>}
     */
    async getTechnicalAnalysis(stockCode, query, options = {}) {
      const wait = options.forceRefresh ? this.refreshLatency : this.latency;
      await new Promise(resolve => global.setTimeout(resolve, wait));

      const record = mockStore?.[stockCode];
      if (!record) return null;

      const result = clone(record);
      result.query = { ...query };
      if (options.forceRefresh) {
        result.overview.updatedAt = new Date().toISOString();
        result.summary.updatedAt = result.overview.updatedAt;
      }
      return result;
    }
  }

  global.StockTechnicalAnalysis = {
    MockTechnicalAnalysisProvider
  };
})(window);
