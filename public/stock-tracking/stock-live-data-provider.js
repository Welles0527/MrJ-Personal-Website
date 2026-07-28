"use strict";

(function createStockLiveDataProvider(global) {
  const DAILY_KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
  const ANNOUNCEMENT_ENDPOINT = "https://np-anotice-stock.eastmoney.com/api/security/ann";

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

  function plainText(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
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
  }

  global.StockTrackingLiveData = {
    EastmoneyStockLiveDataProvider
  };
})(window);
