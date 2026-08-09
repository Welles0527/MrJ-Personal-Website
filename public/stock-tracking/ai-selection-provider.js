(function () {
  "use strict";

  var FUNCTION_NAME = "ai-stock-selection-control";
  var FALLBACK_URL = "./ai-selection-latest.json";

  function bridge() {
    var value = window.StockTrackingSharedAuth;
    if (!value || typeof value.callCloudFunction !== "function") {
      throw new Error("云端筛选服务尚未就绪，请刷新页面后重试。");
    }
    return value;
  }

  function unwrap(value) {
    var result = value && Object.prototype.hasOwnProperty.call(value, "result")
      ? value.result
      : value;
    if (typeof result === "string") {
      try {
        return JSON.parse(result);
      } catch (error) {
        throw new Error("云端筛选服务返回了无法识别的数据。");
      }
    }
    return result || {};
  }

  async function call(action, payload) {
    var auth = bridge();
    var response = await auth.callCloudFunction(FUNCTION_NAME, Object.assign({ action: action }, payload || {}));
    var result = unwrap(response);
    if (result && result.ok === false) {
      var detail = result.error && (result.error.message || result.error);
      throw new Error(detail || result.message || "云端筛选服务执行失败。");
    }
    return result && result.data ? result.data : result;
  }

  async function staticFallback() {
    var response = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (!response.ok) return null;
    var result = await response.json();
    return result && result.status ? result : null;
  }

  async function getSnapshot() {
    try {
      var result = await call("snapshot");
      if (result && Object.prototype.hasOwnProperty.call(result, "snapshot")) {
        if (result.snapshot) return result.snapshot;
        throw new Error("云端尚无成功快照，正在显示最近一次本地成功结果。");
      }
      return result;
    } catch (cloudError) {
      try {
        var fallback = await staticFallback();
        if (fallback) {
          fallback.stale = true;
          fallback.error = cloudError.message;
          return fallback;
        }
      } catch (fallbackError) {
        // The page will show the original cloud error below.
      }
      throw cloudError;
    }
  }

  async function startRefresh() {
    var auth = bridge();
    if (typeof auth.getCloudSession === "function") {
      var session = await auth.getCloudSession();
      if (!session) throw new Error("请先登录，再启动全市场机构筛选。");
    }
    var result = await call("start");
    return {
      taskId: result.taskId || result.jobId || (result.job && (result.job.taskId || result.job.id)),
      status: result.status || (result.job && result.job.status) || "queued",
      reused: Boolean(result.reused)
    };
  }

  async function getStatus(taskId) {
    if (!taskId) throw new Error("缺少筛选任务编号。");
    var result = await call("status", { taskId: taskId, jobId: taskId });
    return result.task || result.job || result;
  }

  window.AIStockSelectionProvider = Object.freeze({
    getSnapshot: getSnapshot,
    startRefresh: startRefresh,
    getStatus: getStatus
  });
})();
