function getAppSafe() {
  try {
    return getApp();
  } catch (e) {
    return { globalData: { apiBase: "http://127.0.0.1:8787", userId: "demo" } };
  }
}

function request({ path, method, data }) {
  const app = getAppSafe();
  const base = String(app.globalData.apiBase || "").replace(/\/$/, "");
  return new Promise(function (resolve, reject) {
    wx.request({
      url: base + path,
      method: method || "GET",
      data: data,
      header: {
        "Content-Type": "application/json",
        "X-User-Id": app.globalData.userId || "demo",
      },
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error("HTTP " + res.statusCode));
      },
      fail: reject,
    });
  });
}

function assetUrl(path) {
  const app = getAppSafe();
  const base = String(app.globalData.apiBase || "").replace(/\/$/, "");
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return base + (path.charAt(0) === "/" ? path : "/" + path);
}

module.exports = {
  request: request,
  fetchPassage: function () {
    return request({ path: "/api/passage" });
  },
  fetchPet: function () {
    return request({ path: "/api/pet" });
  },
  submitExercise: function (payload) {
    return request({ path: "/api/exercise/submit", method: "POST", data: payload });
  },
  checkIn: function () {
    return request({ path: "/api/checkin", method: "POST", data: {} });
  },
  assetUrl: assetUrl,
};
