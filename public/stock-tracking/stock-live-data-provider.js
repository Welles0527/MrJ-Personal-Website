"use strict";

(function createStockLiveDataProvider(global) {
  const REALTIME_QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/get";
  const DAILY_KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
  const ANNOUNCEMENT_ENDPOINT = "https://np-anotice-stock.eastmoney.com/api/security/ann";
  const NEWS_ENDPOINT = "https://search-api-web.eastmoney.com/search/jsonp";
  const DEFAULT_PROXY_ENDPOINT = ["127.0.0.1", "localhost"].includes(global.location.hostname)
    ? "https://www.magicj.cn/api/stock-tracking-live"
    : "/api/stock-tracking-live";

  function marketIdFor(code) {
    return /^[569]/.test(String(code)) ? "1" : "0";
  }

  function scaled(value, divisor = 1) {
    const number = Number(value);
    return Number.isFinite(number) ? number / divisor : null;
  }

  function shanghaiClock() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minuteOfDay: Number(values.hour) * 60 + Number(values.minute)
    };
  }

  function normalizeAnnouncementDate(value) {
    const text = String(value || "").slice(0, 19);
    return text ? `${text.replace(" ", "T")}+08:00` : new Date().toISOString();
  }

  function shanghaiIsoFromUnix(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date().toISOString();
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(new Date(timestamp * 1000));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+08:00`;
  }

  function plainText(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactText(value, limit = 180) {
    const text = plainText(value);
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  function directNewsSentiment(title) {
    if (/(增长|中标|签订|回购|增持|扭亏|突破|上涨|提价|扩产|净流入)/.test(title)) return "利好";
    if (/(下降|亏损|处罚|诉讼|减持|质押|跌破|风险|终止|下跌|死叉|净流出)/.test(title)) return "利空";
    return "中性";
  }

  function directNewsImportance(title) {
    if (/(重大|处罚|诉讼|立案|退市|停牌|复牌|减持|质押|回购|业绩预告|控制权|风险警示)/.test(title)) return "高";
    if (/(公告|订单|合同|项目|融资|解禁|大宗交易|机构|业绩|财报)/.test(title)) return "中";
    return "低";
  }

  function directNewsCategory(title, content) {
    return /(行业|板块|黄金|白银|贵金属|铂|钯|原材料|政策|供需|概念股)/.test(`${title} ${content}`)
      ? "industry"
      : "company";
  }

  function directNewsId(sourceUrl) {
    const articleCode = String(sourceUrl || "").match(/\d{12,}/)?.[0];
    if (articleCode) return articleCode;
    let hash = 0;
    for (const character of String(sourceUrl || "")) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return Math.abs(hash).toString(36);
  }

  function isRelevantNewsItem(item, stockName) {
    if (!stockName) return true;
    const title = plainText(item?.title);
    const content = plainText(item?.content || item?.summary || item?.detail);
    if (title.includes(stockName)) return true;
    if (!content.includes(stockName)) return false;

    const aggregateTitle = /短线防风险|均线.{0,8}(死叉|金叉)|\d+\s*(只|个)\s*(A股|股票|个股)|(A股|个股).{0,12}(大宗交易|龙虎榜|融资|主力|异动|榜单|名单|汇总)|(融资|资金流向|大宗交易).{0,10}(排名|榜|一览)/;
    if (aggregateTitle.test(title)) return false;
    return content.slice(0, 220).includes(stockName);
  }

  function normalizeSentiment(sentiment) {
    return sentiment === "利多" ? "利好" : sentiment;
  }

  function sentimentFromTitle(title) {
    if (/(减持|处罚|立案|诉讼|预亏|亏损|终止|风险提示|冻结|下修|退市)/.test(title)) return "利空";
    if (/(增持|回购|中标|预增|扭亏|分红|权益分派|签订.{0,8}合同)/.test(title)) return "利好";
    return "中性";
  }

  function importanceFromTitle(title) {
    if (/(重大|处罚|立案|诉讼|减持|质押|业绩预告|预亏|预增|中标|合同|回购|问询函)/.test(title)) return "高";
    if (/(董事会|股东会|权益分派|股份变动|投资者关系)/.test(title)) return "中";
    return "低";
  }

  class EastmoneyStockLiveDataProvider {
    constructor(options = {}) {
      this.timeout = Number(options.timeout) || 12000;
      this.proxyEndpoint = options.proxyEndpoint || DEFAULT_PROXY_ENDPOINT;
    }

    async request(url) {
      const controller = new AbortController();
      const timer = global.setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await global.fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json,text/plain,*/*" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      } finally {
        global.clearTimeout(timer);
      }
    }

    async requestJson(url) {
      return (await this.request(url)).json();
    }

    async jsonpRequest(url) {
      const callbackName = `stockTrackingJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      url.searchParams.set("cb", callbackName);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timer = global.setTimeout(() => finish(new Error("新闻数据请求超时")), this.timeout);
        const finish = (error, payload) => {
          global.clearTimeout(timer);
          script.remove();
          try { delete global[callbackName]; } catch { global[callbackName] = undefined; }
          if (error) reject(error);
          else resolve(payload);
        };
        global[callbackName] = payload => finish(null, payload);
        script.onerror = () => finish(new Error("新闻数据源暂不可用"));
        script.src = url.toString();
        document.head.appendChild(script);
      });
    }

    proxyUrl(stockCode, sections, options = {}) {
      const endpoint = new URL(this.proxyEndpoint, global.location.origin);
      endpoint.searchParams.set("code", String(stockCode).padStart(6, "0"));
      endpoint.searchParams.set("include", sections.join(","));
      if (options.force) endpoint.searchParams.set("force", "1");
      endpoint.searchParams.set("_", Date.now());
      return endpoint;
    }

    async getRealtimeQuote(stockCode, options = {}) {
      const code = String(stockCode).padStart(6, "0");
      try {
        const payload = await this.requestJson(this.proxyUrl(code, ["quote"], options));
        if (!payload?.quote || String(payload.quote.code) !== code) throw new Error("实时行情返回异常");
        return payload.quote;
      } catch (proxyError) {
        const quote = await this.getDirectRealtimeQuote(code);
        quote.fallbackReason = proxyError?.message || "实时行情中转暂不可用";
        return quote;
      }
    }

    async getDirectRealtimeQuote(stockCode) {
      const code = String(stockCode).padStart(6, "0");
      const url = new URL(REALTIME_QUOTE_ENDPOINT);
      url.searchParams.set("secid", `${marketIdFor(code)}.${code}`);
      url.searchParams.set("fields", "f43,f44,f45,f46,f47,f48,f57,f58,f60,f86,f116,f117,f168,f169,f170,f171");
      url.searchParams.set("_", Date.now());
      const payload = await this.requestJson(url);
      const item = payload?.data;
      if (!item || String(item.f57) !== code || !Number.isFinite(Number(item.f43))) {
        throw new Error("实时行情暂不可用");
      }
      return {
        code,
        name: plainText(item.f58),
        price: scaled(item.f43, 100),
        previousClose: scaled(item.f60, 100),
        change: scaled(item.f169, 100),
        changePct: scaled(item.f170, 100),
        open: scaled(item.f46, 100),
        high: scaled(item.f44, 100),
        low: scaled(item.f45, 100),
        volume: scaled(item.f47),
        amount: scaled(item.f48),
        turnoverRate: scaled(item.f168, 100),
        amplitude: scaled(item.f171, 100),
        totalMarketValue: scaled(item.f116),
        circulatingMarketValue: scaled(item.f117),
        updatedAt: shanghaiIsoFromUnix(item.f86),
        quoteKind: "realtime",
        source: "东方财富公开实时行情"
      };
    }

    async getClosingQuote(stockCode) {
      const code = String(stockCode).padStart(6, "0");
      const url = new URL(DAILY_KLINE_ENDPOINT);
      url.searchParams.set("secid", `${marketIdFor(code)}.${code}`);
      url.searchParams.set("klt", "101");
      url.searchParams.set("fqt", "1");
      url.searchParams.set("lmt", "3");
      url.searchParams.set("end", "20500101");
      url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
      url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61");
      url.searchParams.set("_", Date.now());

      const payload = await (await this.request(url)).json();
      const item = payload?.data;
      const bars = (item?.klines || []).map(line => {
        const [date, open, close, high, low, volume, amount, amplitude, changePct, change, turnoverRate] = String(line).split(",");
        return {
          date,
          open: scaled(open),
          close: scaled(close),
          high: scaled(high),
          low: scaled(low),
          volume: scaled(volume),
          amount: scaled(amount),
          amplitude: scaled(amplitude),
          changePct: scaled(changePct),
          change: scaled(change),
          turnoverRate: scaled(turnoverRate)
        };
      });
      if (!item || String(item.code) !== code || !bars.length) throw new Error("未返回有效收盘行情");

      const clock = shanghaiClock();
      const latest = bars.at(-1);
      const latestIsUnfinished = latest.date === clock.date && clock.minuteOfDay < 15 * 60 + 5;
      const closeBar = latestIsUnfinished && bars.length > 1 ? bars.at(-2) : latest;
      const previousBar = bars[bars.indexOf(closeBar) - 1];
      return {
        code,
        name: plainText(item.name),
        price: closeBar.close,
        previousClose: previousBar?.close ?? null,
        change: closeBar.change,
        changePct: closeBar.changePct,
        open: closeBar.open,
        high: closeBar.high,
        low: closeBar.low,
        volume: closeBar.volume,
        amount: closeBar.amount,
        turnoverRate: closeBar.turnoverRate,
        amplitude: closeBar.amplitude,
        totalMarketValue: null,
        circulatingMarketValue: null,
        updatedAt: `${closeBar.date}T15:00:00+08:00`,
        source: "东方财富公开日线行情"
      };
    }

    async getLatestAnnouncements(stockCode, options = {}) {
      const code = String(stockCode).padStart(6, "0");
      const callbackName = `stockTrackingAnnouncementCallback_${Date.now()}`;
      const url = new URL(ANNOUNCEMENT_ENDPOINT);
      url.searchParams.set("cb", callbackName);
      url.searchParams.set("sr", "-1");
      url.searchParams.set("page_size", String(Number(options.limit) || 12));
      url.searchParams.set("page_index", "1");
      url.searchParams.set("ann_type", "A");
      url.searchParams.set("client_source", "web");
      url.searchParams.set("stock_list", code);
      url.searchParams.set("_", Date.now());

      const text = await (await this.request(url)).text();
      const start = text.indexOf("(");
      const end = text.lastIndexOf(")");
      if (start < 0 || end <= start) throw new Error("公告数据格式异常");
      const payload = JSON.parse(text.slice(start + 1, end));
      const items = Array.isArray(payload?.data?.list) ? payload.data.list : [];

      return items.map(item => {
        const originalTitle = plainText(item.title);
        const title = originalTitle.replace(/^[^:：]{1,24}[:：]\s*/, "") || originalTitle;
        const columns = (item.columns || [])
          .map(column => plainText(column.column_name))
          .filter(Boolean)
          .slice(0, 2);
        const categoryText = columns.length ? columns.join("、") : "公司公告";
        return {
          id: `live-announcement-${item.art_code}`,
          category: "company",
          title,
          publishedAt: normalizeAnnouncementDate(item.display_time || item.notice_date),
          source: "公司公告",
          sourceUrl: `https://data.eastmoney.com/notices/detail/${code}/${item.art_code}.html`,
          summary: `${categoryText}。该信息来自公开披露，点击可查看公告原文。`,
          detail: `公告标题：${originalTitle}。当前页面仅同步公开披露事实，不对公告影响作确定性判断。`,
          evidence: "事实",
          importance: importanceFromTitle(title),
          sentiment: sentimentFromTitle(title),
          unread: true,
          live: true
        };
      });
    }

    async getLatestNews(stockCode, options = {}) {
      const code = String(stockCode).padStart(6, "0");
      const limit = Math.max(1, Number(options.limit) || 16);
      const stockName = plainText(options.name);
      const parameter = {
        uid: "",
        keyword: code,
        type: ["cmsArticleWebOld"],
        client: "web",
        clientType: "web",
        clientVersion: "curr",
        param: {
          cmsArticleWebOld: {
            searchScope: "default",
            sort: "time",
            pageIndex: 1,
            pageSize: Math.max(limit, 12),
            preTag: "",
            postTag: ""
          }
        }
      };
      const url = new URL(NEWS_ENDPOINT);
      url.searchParams.set("param", JSON.stringify(parameter));
      url.searchParams.set("_", Date.now());
      const payload = await this.jsonpRequest(url);
      const items = Array.isArray(payload?.result?.cmsArticleWebOld) ? payload.result.cmsArticleWebOld : [];
      return items
        .filter(item => isRelevantNewsItem(item, stockName))
        .slice(0, limit)
        .map(item => {
        const title = plainText(item.title);
        const content = compactText(item.content || title);
        const sourceUrl = String(item.url || "").replace(/^http:/, "https:");
        return {
          id: `live-news-${directNewsId(sourceUrl)}`,
          category: directNewsCategory(title, content),
          title,
          publishedAt: normalizeAnnouncementDate(item.date),
          source: plainText(item.mediaName) || "东方财富资讯",
          sourceUrl,
          summary: content || "点击查看新闻原文。",
          detail: content || title,
          evidence: "推断",
          importance: directNewsImportance(title),
          sentiment: directNewsSentiment(title),
          unread: true,
          live: true
        };
        });
    }

    async getLatestInformation(stockCode, options = {}) {
      const code = String(stockCode).padStart(6, "0");
      const sections = Array.isArray(options.sections) && options.sections.length
        ? options.sections.filter(section => ["announcements", "news"].includes(section))
        : ["announcements", "news"];
      if (!sections.length) return { announcements: [], news: [], errors: {}, checkedAt: new Date().toISOString() };

      try {
        const payload = await this.requestJson(this.proxyUrl(code, sections, options));
        let news = Array.isArray(payload?.news)
          ? payload.news
            .filter(item => isRelevantNewsItem(item, options.name))
            .map(item => ({ ...item, sentiment: normalizeSentiment(item.sentiment) }))
          : [];
        const errors = { ...(payload?.errors || {}) };
        if (sections.includes("news") && !news.length) {
          try {
            news = await this.getLatestNews(code, { limit: 16, name: options.name });
            if (news.length) delete errors.news;
          } catch (error) {
            errors.news = error?.message || "新闻数据暂不可用";
          }
        }
        return {
          announcements: Array.isArray(payload?.announcements)
            ? payload.announcements.map(item => ({ ...item, sentiment: normalizeSentiment(item.sentiment) }))
            : [],
          news,
          errors,
          checkedAt: payload?.checkedAt || new Date().toISOString()
        };
      } catch (proxyError) {
        if (!sections.includes("announcements")) throw proxyError;
        const announcements = await this.getLatestAnnouncements(code, { limit: 16 });
        return {
          announcements,
          news: [],
          errors: {
            ...(sections.includes("news") ? { news: proxyError?.message || "新闻数据暂不可用" } : {})
          },
          checkedAt: new Date().toISOString()
        };
      }
    }
  }

  global.StockTrackingLiveData = {
    EastmoneyStockLiveDataProvider
  };
})(window);
