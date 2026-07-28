"use strict";

(function createTechnicalAnalysisMockData(global) {
  const DATA_END = new Date("2026-07-28T15:00:00+08:00");
  const TRADING_DAYS = 780;

  function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function createRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tradingDates(count) {
    const dates = [];
    const cursor = new Date(DATA_END);
    while (dates.length < count) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) dates.unshift(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() - 1);
    }
    return dates;
  }

  function buildCandles(config) {
    const random = createRandom(config.seed);
    const dates = tradingDates(TRADING_DAYS);
    const candles = [];
    let previousClose = config.startPrice;

    dates.forEach((time, index) => {
      const cycle = Math.sin(index / config.waveLength) * config.waveAmplitude;
      const slowerCycle = Math.sin(index / (config.waveLength * 3.7)) * config.waveAmplitude * 0.45;
      const noise = (random() - 0.5) * config.volatility;
      const returnRate = config.drift + cycle + slowerCycle + noise;
      const open = previousClose * (1 + (random() - 0.5) * config.volatility * 0.35);
      const close = previousClose * (1 + returnRate);
      const bodyHigh = Math.max(open, close);
      const bodyLow = Math.min(open, close);
      const high = bodyHigh * (1 + 0.002 + random() * config.volatility * 0.45);
      const low = bodyLow * (1 - 0.002 - random() * config.volatility * 0.45);
      const activity = 0.72 + random() * 0.55 + Math.min(0.4, Math.abs(returnRate) * 18);
      const volume = Math.round(config.baseVolume * activity);
      candles.push({ time, open, close, low, high, volume });
      previousClose = close;
    });

    const scale = config.targetClose / candles[candles.length - 1].close;
    return candles.map(candle => ({
      ...candle,
      open: round(candle.open * scale),
      close: round(candle.close * scale),
      low: round(candle.low * scale),
      high: round(candle.high * scale)
    }));
  }

  function ema(values, period) {
    const multiplier = 2 / (period + 1);
    const result = [];
    let previous = values[0];
    values.forEach((value, index) => {
      previous = index === 0 ? value : value * multiplier + previous * (1 - multiplier);
      result.push(round(previous, 4));
    });
    return result;
  }

  function buildMacd(closes) {
    const fast = ema(closes, 12);
    const slow = ema(closes, 26);
    const diff = fast.map((value, index) => round(value - slow[index], 4));
    const dea = ema(diff, 9);
    const histogram = diff.map((value, index) => round((value - dea[index]) * 2, 4));
    return { diff, dea, histogram };
  }

  function buildRsi(closes, period = 14) {
    const values = new Array(closes.length).fill(50);
    let averageGain = 0;
    let averageLoss = 0;
    for (let index = 1; index < closes.length; index += 1) {
      const change = closes[index] - closes[index - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);
      if (index <= period) {
        averageGain += gain / period;
        averageLoss += loss / period;
      } else {
        averageGain = (averageGain * (period - 1) + gain) / period;
        averageLoss = (averageLoss * (period - 1) + loss) / period;
      }
      if (index >= period) {
        const strength = averageLoss === 0 ? 100 : averageGain / averageLoss;
        values[index] = round(100 - 100 / (1 + strength), 2);
      }
    }
    return values;
  }

  function buildAtr(candles, period = 14) {
    const trueRanges = candles.map((candle, index) => {
      if (index === 0) return candle.high - candle.low;
      const previousClose = candles[index - 1].close;
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      );
    });
    const values = [];
    let current = trueRanges[0];
    trueRanges.forEach((value, index) => {
      current = index === 0 ? value : (current * (period - 1) + value) / period;
      values.push(round((current / candles[index].close) * 100, 2));
    });
    return values;
  }

  function buildRelativeStrength(candles, bias) {
    const base = candles[0].close;
    return candles.map((candle, index) => {
      const relativeReturn = (candle.close / base - 1) * 100;
      const marketProxy = Math.sin(index / 31) * 2.8 + index * 0.006;
      return round(relativeReturn - marketProxy + bias, 2);
    });
  }

  function buildRecord(config) {
    const candles = buildCandles(config.series);
    const timestamps = candles.map(item => item.time);
    const closes = candles.map(item => item.close);
    const macd = buildMacd(closes);
    const rsi = buildRsi(closes);
    const atr = buildAtr(candles);
    const relativeStrength = buildRelativeStrength(candles, config.relativeBias);

    return {
      overview: {
        ...config.overview,
        updatedAt: "2026-07-28T15:00:00+08:00",
        inWatchlist: true
      },
      candles,
      indicators: {
        volume: {
          id: "volume",
          name: "成交量",
          unit: "股",
          timestamps,
          values: candles.map(item => item.volume)
        },
        macd: {
          id: "macd",
          name: "MACD",
          timestamps,
          values: macd.histogram,
          secondaryValues: macd.diff,
          tertiaryValues: macd.dea
        },
        rsi: {
          id: "rsi",
          name: "RSI(14)",
          timestamps,
          values: rsi
        },
        atr: {
          id: "atr",
          name: "ATR%",
          unit: "%",
          timestamps,
          values: atr
        },
        relativeStrength: {
          id: "relativeStrength",
          name: "相对沪深300",
          unit: "%",
          timestamps,
          values: relativeStrength
        }
      },
      zones: config.zones,
      diagnoses: config.diagnoses,
      summary: config.summary,
      signals: config.signals
    };
  }

  const commonUpdatedAt = "2026-07-28T15:00:00+08:00";

  global.STOCK_TECHNICAL_ANALYSIS_MOCK_DATA = {
    "301026": buildRecord({
      overview: {
        id: "301026",
        name: "浩通科技",
        code: "301026",
        price: 28.56,
        change: 0.61,
        changePct: 2.18,
        turnoverRate: 4.86,
        turnoverAmount: 389000000,
        industry: "贵金属回收",
        marketCap: 4130000000
      },
      series: {
        seed: 301026,
        startPrice: 17.8,
        targetClose: 28.56,
        baseVolume: 5400000,
        drift: 0.00045,
        volatility: 0.022,
        waveLength: 14,
        waveAmplitude: 0.0021
      },
      relativeBias: 8.4,
      zones: [
        { id: "ht-support", type: "support", lower: 26.8, upper: 27.3, label: "近期支撑", strength: 82 },
        { id: "ht-resistance", type: "resistance", lower: 29.4, upper: 30.1, label: "前高压力", strength: 76 }
      ],
      diagnoses: [
        {
          id: "trend",
          title: "趋势状态",
          status: "震荡偏强",
          tone: "positive",
          conclusion: "中期上升结构仍在，短线进入高位整理。",
          evidence: ["收盘价位于MA20与MA60上方", "MA20连续12个交易日向上", "MA60斜率保持正值"],
          updatedAt: commonUpdatedAt,
          strength: 82,
          indicator: "volume"
        },
        {
          id: "structure",
          title: "价格结构",
          status: "突破后回踩",
          tone: "positive",
          conclusion: "前期平台已突破，当前回踩尚未破坏结构。",
          evidence: ["27.30元上方完成平台突破", "回踩低点仍高于前低", "29.40元附近存在前高压力"],
          updatedAt: commonUpdatedAt,
          strength: 76,
          indicator: "volume"
        },
        {
          id: "momentum",
          title: "动能状态",
          status: "动能降温",
          tone: "warning",
          conclusion: "方向仍偏多，但短线加速度正在减弱。",
          evidence: ["MACD仍位于零轴上方", "红柱连续3日缩短", "RSI从72回落至64附近"],
          updatedAt: commonUpdatedAt,
          strength: 68,
          indicator: "macd"
        },
        {
          id: "volume",
          title: "量价关系",
          status: "温和配合",
          tone: "positive",
          conclusion: "上涨阶段量能改善，回调暂未出现异常放量。",
          evidence: ["近5日均量高于20日均量", "突破日成交量放大1.6倍", "回踩量能逐步收敛"],
          updatedAt: commonUpdatedAt,
          strength: 74,
          indicator: "volume"
        },
        {
          id: "relative",
          title: "相对强弱",
          status: "相对强势",
          tone: "positive",
          conclusion: "近60日持续跑赢沪深300与所属行业。",
          evidence: ["相对沪深300收益+11.8%", "行业内强度分位约78%", "回撤阶段相对收益未破位"],
          updatedAt: commonUpdatedAt,
          strength: 79,
          indicator: "relativeStrength"
        },
        {
          id: "volatility",
          title: "波动风险",
          status: "偏高",
          tone: "warning",
          conclusion: "近期振幅有所放大，需要控制触发条件的容错。",
          evidence: ["ATR%升至近半年72%分位", "布林带宽度连续两周扩大", "近5日出现2次长上影"],
          updatedAt: commonUpdatedAt,
          strength: 71,
          indicator: "atr"
        },
        {
          id: "position",
          title: "当前位阶",
          status: "中高位",
          tone: "neutral",
          conclusion: "价格接近一年区间上沿，但尚未进入极端延伸。",
          evidence: ["250日价格分位82%", "距离MA20约6.3%", "距离年内高点约4.7%"],
          updatedAt: commonUpdatedAt,
          strength: 77,
          indicator: "rsi"
        },
        {
          id: "multiTimeframe",
          title: "多周期共振",
          status: "日强周稳",
          tone: "positive",
          conclusion: "日线偏强，周线仍处在温和上升结构。",
          evidence: ["日线MA20向上", "周线收盘位于MA20上方", "周线MACD未出现死叉"],
          updatedAt: commonUpdatedAt,
          strength: 73,
          indicator: "macd"
        }
      ],
      summary: {
        status: "震荡偏强",
        score: 42,
        confidence: 78,
        conclusion: "中期结构仍偏强，短线处于突破后的整理阶段。新的机会更依赖量能确认，不宜仅因价格接近压力区而追涨。",
        supportEvidence: [
          "收盘价稳定运行在MA20和MA60上方，均线斜率保持向上。",
          "突破日量能有效放大，回踩阶段成交量逐步收敛。",
          "过去60日相对沪深300表现较强。"
        ],
        conflicts: [
          "MACD红柱连续缩短，短线动能有所下降。",
          "价格接近29.40—30.10元前高压力区，波动率处于偏高水平。"
        ],
        supportZone: "26.80—27.30元",
        resistanceZone: "29.40—30.10元",
        invalidation: "日线放量跌破26.80元，并且MA20转为向下。",
        watchConditions: [
          "放量站稳30.10元后，观察突破是否获得连续两个交易日确认。",
          "回踩27.30元附近缩量企稳时，观察是否形成更高低点。"
        ],
        updatedAt: commonUpdatedAt
      },
      signals: [
        {
          id: "ht-signal-01",
          date: "2026-07-24",
          name: "平台突破",
          type: "structure",
          conclusion: "突破有效性仍在观察期",
          evidence: "收盘价突破过去40日平台上沿27.30元，成交量为20日均量的1.62倍。",
          detail: "突破后连续两个交易日收盘未回到平台内部，但尚未站稳前高压力区，定义为有效但未完成确认。",
          strength: 84,
          active: true,
          indicators: ["价格结构", "成交量", "MA20"]
        },
        {
          id: "ht-signal-02",
          date: "2026-07-28",
          name: "动能降温",
          type: "momentum",
          conclusion: "短线追涨条件变弱",
          evidence: "MACD红柱连续3日缩短，RSI从72回落至64。",
          detail: "动能仍在零轴上方，暂不等同于趋势反转；若后续价格创新高而MACD未创新高，需继续观察背离风险。",
          strength: 69,
          active: true,
          indicators: ["MACD", "RSI"]
        },
        {
          id: "ht-signal-03",
          date: "2026-07-21",
          name: "相对强度上行",
          type: "relative",
          conclusion: "相对市场表现偏强",
          evidence: "60日相对沪深300收益差扩大至11.8%。",
          detail: "相对强度曲线仍在20日均线上方，行业调整阶段的相对回撤有限。",
          strength: 77,
          active: true,
          indicators: ["相对沪深300", "行业强度"]
        },
        {
          id: "ht-signal-04",
          date: "2026-07-16",
          name: "波动率抬升",
          type: "risk",
          conclusion: "需要扩大触发条件容错",
          evidence: "ATR%进入近半年72%分位，日内振幅显著高于20日均值。",
          detail: "波动率抬升与突破同步出现，暂未构成负面信号，但止损或失效条件不宜设置在普通日内噪声范围内。",
          strength: 71,
          active: true,
          indicators: ["ATR", "布林带宽度"]
        },
        {
          id: "ht-signal-05",
          date: "2026-06-30",
          name: "MA20上穿MA60",
          type: "trend",
          conclusion: "中期方向由中性转为偏强",
          evidence: "MA20自下向上穿越MA60，两条均线斜率随后同时转正。",
          detail: "交叉后价格未重新跌破MA60，趋势信号目前保持有效。",
          strength: 80,
          active: true,
          indicators: ["MA20", "MA60"]
        }
      ]
    }),
    "300750": buildRecord({
      overview: {
        id: "300750",
        name: "宁德时代",
        code: "300750",
        price: 286.40,
        change: 4.60,
        changePct: 1.63,
        turnoverRate: 1.28,
        turnoverAmount: 7860000000,
        industry: "动力电池",
        marketCap: 1268000000000
      },
      series: {
        seed: 300750,
        startPrice: 171,
        targetClose: 286.4,
        baseVolume: 17600000,
        drift: 0.00034,
        volatility: 0.015,
        waveLength: 18,
        waveAmplitude: 0.0015
      },
      relativeBias: 5.2,
      zones: [
        { id: "catl-support", type: "support", lower: 274, upper: 279, label: "均线支撑", strength: 85 },
        { id: "catl-resistance", type: "resistance", lower: 296, upper: 302, label: "阶段压力", strength: 72 }
      ],
      diagnoses: [
        { id: "trend", title: "趋势状态", status: "稳步上行", tone: "positive", conclusion: "中期均线保持多头排列，趋势稳定性较好。", evidence: ["MA20高于MA60", "MA60连续8周向上", "回撤未破MA20"], updatedAt: commonUpdatedAt, strength: 86, indicator: "volume" },
        { id: "structure", title: "价格结构", status: "上升通道", tone: "positive", conclusion: "高点与低点同步抬升，结构尚未出现破坏。", evidence: ["连续形成更高低点", "274—279元构成密集支撑", "296元上方抛压增加"], updatedAt: commonUpdatedAt, strength: 81, indicator: "volume" },
        { id: "momentum", title: "动能状态", status: "温和增强", tone: "positive", conclusion: "动能恢复但尚未进入过热区。", evidence: ["MACD柱体重新放大", "RSI位于58附近", "价格与动能暂未背离"], updatedAt: commonUpdatedAt, strength: 75, indicator: "macd" },
        { id: "volume", title: "量价关系", status: "健康", tone: "positive", conclusion: "上涨放量、回撤缩量的特征仍然存在。", evidence: ["近5日量能温和抬升", "回撤日量能低于20日均量", "大额成交未异常集中"], updatedAt: commonUpdatedAt, strength: 79, indicator: "volume" },
        { id: "relative", title: "相对强弱", status: "持续跑赢", tone: "positive", conclusion: "相对市场和新能源指数均保持强势。", evidence: ["60日跑赢沪深300约8.4%", "相对行业指数收益为正", "强度曲线保持上行"], updatedAt: commonUpdatedAt, strength: 84, indicator: "relativeStrength" },
        { id: "volatility", title: "波动风险", status: "正常", tone: "neutral", conclusion: "波动率位于历史中位，暂未出现异常扩张。", evidence: ["ATR%处于近一年48%分位", "跳空缺口较少", "布林带宽度稳定"], updatedAt: commonUpdatedAt, strength: 83, indicator: "atr" },
        { id: "position", title: "当前位阶", status: "中高位", tone: "neutral", conclusion: "趋势位置偏高，但距离极端延伸仍有空间。", evidence: ["250日价格分位76%", "距离MA20约3.1%", "距离年内高点约5.4%"], updatedAt: commonUpdatedAt, strength: 80, indicator: "rsi" },
        { id: "multiTimeframe", title: "多周期共振", status: "日周同向", tone: "positive", conclusion: "日线和周线方向一致，趋势可信度较高。", evidence: ["日线均线多头排列", "周线MA20向上", "周线MACD位于零轴上方"], updatedAt: commonUpdatedAt, strength: 88, indicator: "macd" }
      ],
      summary: {
        status: "趋势偏强",
        score: 58,
        confidence: 84,
        conclusion: "日线与周线保持同向上行，量价结构相对健康。新的机会优先等待回踩支撑区企稳，或放量突破阶段压力后再确认。",
        supportEvidence: ["MA20、MA60保持多头排列。", "上涨放量而回撤缩量，结构较为健康。", "相对沪深300与行业指数表现持续偏强。"],
        conflicts: ["价格处于一年中高位，向上空间需要量能继续确认。", "296—302元为前期成交密集区。"],
        supportZone: "274—279元",
        resistanceZone: "296—302元",
        invalidation: "日线有效跌破274元且MA20斜率转负。",
        watchConditions: ["回踩279元附近缩量止跌。", "成交量高于20日均量1.4倍并站稳302元。"],
        updatedAt: commonUpdatedAt
      },
      signals: [
        { id: "catl-01", date: "2026-07-25", name: "趋势延续", type: "trend", conclusion: "多头排列保持有效", evidence: "MA20、MA60与MA120依次排列向上。", detail: "三条主要均线斜率同步为正，价格回撤未破MA20。", strength: 88, active: true, indicators: ["MA20", "MA60", "MA120"] },
        { id: "catl-02", date: "2026-07-22", name: "回撤缩量", type: "volume", conclusion: "筹码抛压暂时可控", evidence: "连续3个回撤日成交量低于20日均量。", detail: "缩量回撤发生在上升通道内部，尚未出现趋势破坏。", strength: 79, active: true, indicators: ["成交量", "价格结构"] },
        { id: "catl-03", date: "2026-07-18", name: "相对强度新高", type: "relative", conclusion: "继续跑赢宽基指数", evidence: "相对沪深300强度线创60日新高。", detail: "相对强度上涨未伴随波动率异常扩张，信号质量较高。", strength: 84, active: true, indicators: ["相对沪深300"] },
        { id: "catl-04", date: "2026-07-11", name: "压力区临近", type: "risk", conclusion: "突破需要量能确认", evidence: "价格距离296元阶段压力不足4%。", detail: "若触及压力区但成交量未放大，需防范再次回到通道中部。", strength: 72, active: true, indicators: ["压力区域", "成交量"] }
      ]
    }),
    "300308": buildRecord({
      overview: {
        id: "300308",
        name: "中际旭创",
        code: "300308",
        price: 62.40,
        change: -0.54,
        changePct: -0.86,
        turnoverRate: 3.72,
        turnoverAmount: 4280000000,
        industry: "光通信设备",
        marketCap: 69900000000
      },
      series: {
        seed: 300308,
        startPrice: 44,
        targetClose: 62.4,
        baseVolume: 23800000,
        drift: 0.0002,
        volatility: 0.026,
        waveLength: 11,
        waveAmplitude: 0.0028
      },
      relativeBias: 1.8,
      zones: [
        { id: "zx-support", type: "support", lower: 59.2, upper: 60.4, label: "结构支撑", strength: 74 },
        { id: "zx-resistance", type: "resistance", lower: 66.8, upper: 68.5, label: "套牢压力", strength: 83 }
      ],
      diagnoses: [
        { id: "trend", title: "趋势状态", status: "震荡", tone: "neutral", conclusion: "中期方向尚未走坏，但短线缺乏连续性。", evidence: ["价格围绕MA20反复", "MA60保持缓慢向上", "MA20斜率接近走平"], updatedAt: commonUpdatedAt, strength: 64, indicator: "volume" },
        { id: "structure", title: "价格结构", status: "箱体整理", tone: "neutral", conclusion: "价格仍在59.20—68.50元区间内部运行。", evidence: ["高点暂未突破68.50元", "59.20元附近两次获得支撑", "箱体内部波动频繁"], updatedAt: commonUpdatedAt, strength: 73, indicator: "volume" },
        { id: "momentum", title: "动能状态", status: "偏弱", tone: "negative", conclusion: "短线动能回落，尚未出现明确修复信号。", evidence: ["MACD回到零轴附近", "RSI跌至46", "反弹高点逐步下降"], updatedAt: commonUpdatedAt, strength: 67, indicator: "macd" },
        { id: "volume", title: "量价关系", status: "分歧", tone: "warning", conclusion: "成交保持活跃，但上涨阶段量能跟随不足。", evidence: ["换手率高于60日均值", "反弹量能未超过前高", "下跌日出现一次放量"], updatedAt: commonUpdatedAt, strength: 61, indicator: "volume" },
        { id: "relative", title: "相对强弱", status: "中性", tone: "neutral", conclusion: "相对市场优势收窄，暂未转为持续弱势。", evidence: ["20日相对收益接近0", "60日仍小幅跑赢", "强度曲线跌破短期均线"], updatedAt: commonUpdatedAt, strength: 62, indicator: "relativeStrength" },
        { id: "volatility", title: "波动风险", status: "较高", tone: "warning", conclusion: "箱体内部波动较大，假突破风险需要关注。", evidence: ["ATR%位于近一年81%分位", "长上下影K线增加", "布林带宽度快速变化"], updatedAt: commonUpdatedAt, strength: 78, indicator: "atr" },
        { id: "position", title: "当前位阶", status: "中位", tone: "neutral", conclusion: "位于一年区间中部，方向性优势不明显。", evidence: ["250日价格分位56%", "距离MA60约1.8%", "距离箱体上下沿相近"], updatedAt: commonUpdatedAt, strength: 70, indicator: "rsi" },
        { id: "multiTimeframe", title: "多周期共振", status: "周期分歧", tone: "warning", conclusion: "周线仍偏多，日线处于整理，方向尚未共振。", evidence: ["周线MA20向上", "日线MA20走平", "日线MACD偏弱"], updatedAt: commonUpdatedAt, strength: 66, indicator: "macd" }
      ],
      summary: {
        status: "区间震荡",
        score: 6,
        confidence: 69,
        conclusion: "价格处于箱体中部，当前缺少方向优势。新的买卖时点更适合等待接近边界后的确认，而不是在区间中央追逐短期波动。",
        supportEvidence: ["59.20—60.40元区域已两次形成支撑。", "周线MA20仍保持向上。", "60日相对沪深300收益仍略为正值。"],
        conflicts: ["日线MACD偏弱，反弹量能不足。", "ATR处于高位，箱体内部假突破概率较高。"],
        supportZone: "59.20—60.40元",
        resistanceZone: "66.80—68.50元",
        invalidation: "放量跌破59.20元并连续两个交易日未收回。",
        watchConditions: ["支撑区缩量止跌并重新站上MA20。", "放量突破68.50元且相对强度同步转强。"],
        updatedAt: commonUpdatedAt
      },
      signals: [
        { id: "zx-01", date: "2026-07-27", name: "动能转弱", type: "momentum", conclusion: "等待修复确认", evidence: "MACD回落至零轴附近，RSI跌至46。", detail: "动能弱化发生在箱体内部，当前更接近中性偏弱，而非趋势反转。", strength: 67, active: true, indicators: ["MACD", "RSI"] },
        { id: "zx-02", date: "2026-07-23", name: "箱体确认", type: "structure", conclusion: "区间边界暂时有效", evidence: "59.20元与68.50元分别形成两次支撑和压力。", detail: "在任一边界被有效突破前，区间内部信号权重应降低。", strength: 76, active: true, indicators: ["价格结构", "支撑压力"] },
        { id: "zx-03", date: "2026-07-19", name: "波动率升高", type: "risk", conclusion: "假突破风险上升", evidence: "ATR%进入近一年81%分位。", detail: "高波动状态下需使用收盘确认与成交量条件，避免只依赖盘中价格穿越。", strength: 78, active: true, indicators: ["ATR", "布林带宽度"] },
        { id: "zx-04", date: "2026-07-14", name: "相对强度回落", type: "relative", conclusion: "市场优势正在收窄", evidence: "20日相对沪深300收益回到0附近。", detail: "60日相对收益仍为正，信号为优势收窄而非持续弱势。", strength: 63, active: true, indicators: ["相对沪深300"] }
      ]
    })
  };
})(window);
