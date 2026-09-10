const COLLECTION = "stockMonitorReports";

function dataRow(result) {
  if (result?.code) throw new Error("Report database request failed");
  const data = result?.data;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const { _id, _openid, ...report } = row;
  return report;
}

export function createOAuthRepository(db) {
  const collection = "stockMonitorOAuth";
  const access = store => ({
    get: async id => dataRow(await store.collection(collection).doc(id).get()),
    set: (id, value) => store.collection(collection).doc(id).set(value)
  });
  return { ...access(db), transaction: callback => db.runTransaction(tx => callback(access(tx))) };
}

export function createCloudBaseRepository(db) {
  const read = async (store, id) => dataRow(await store.collection(COLLECTION).doc(id).get());
  return {
    latest: code => read(db, "latest_" + code),
    transaction: callback => db.runTransaction(transaction => callback({
      latest: code => read(transaction, "latest_" + code),
      async insert(key, report) {
        const id = "history_" + key.replace(":", "_");
        if (await read(transaction, id)) throw Object.assign(new Error("Report already exists"), { status: 409 });
        await transaction.collection(COLLECTION).doc(id).set(report);
      },
      setLatest: (code, report) => transaction.collection(COLLECTION).doc("latest_" + code).set(report)
    }))
  };
}
