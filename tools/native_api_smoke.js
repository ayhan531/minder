const fs = require("node:fs");
const vm = require("node:vm");

const memory = new Map();
global.window = { Capacitor: { isNativePlatform: () => true } };
global.location = { hostname: "localhost", search: "" };
global.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, String(value)),
};

vm.runInThisContext(fs.readFileSync("dist/native-api.js", "utf8"), { filename: "native-api.js" });
const api = window.__paribuNativeApi;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  expect(typeof api === "function", "Native API açılmadı");
  const login = await api("/api/login", { method: "POST", body: JSON.stringify({ tc: "20000000000", password: "TestPass!2026" }) });
  expect(login.user.role === "user", "Native kullanıcı girişi başarısız");
  const market = await api("/api/market");
  expect(market.quotes.some((quote) => quote.symbol === "THYAO"), "Native piyasa verisi eksik");
  const before = await api("/api/portfolio");
  const beforeQty = before.positions.find((item) => item.symbol === "THYAO").quantity;
  const buy = await api("/api/orders", { method: "POST", body: JSON.stringify({ symbol: "THYAO", side: "buy", order_type: "market", quantity: 2 }) });
  expect(buy.order.status === "approved", "Native alış emri başarısız");
  const sell = await api("/api/orders", { method: "POST", body: JSON.stringify({ symbol: "THYAO", side: "sell", order_type: "market", quantity: 1 }) });
  expect(sell.order.status === "approved", "Native satış emri başarısız");
  const after = await api("/api/portfolio");
  expect(after.positions.find((item) => item.symbol === "THYAO").quantity === beforeQty + 1, "Native portföy miktarı güncellenmedi");
  expect(after.t2_settlements.length === 1, "Native T+2 kaydı oluşmadı");
  const money = await api("/api/money-requests", { method: "POST", body: JSON.stringify({ request_type: "withdraw", amount: 500, account_holder: "Mert Yılmaz", bank_name: "Test", iban: "TR330006100519786457841326" }) });
  expect(money.request.status === "pending", "Native para talebi oluşmadı");
  await api(`/api/money-requests/${money.request.id}/cancel`, { method: "POST", body: "{}" });
  await api("/api/logout", { method: "POST", body: "{}" });
  const admin = await api("/api/login", { method: "POST", body: JSON.stringify({ tc: "10000000000", password: "AdminPass!2026" }) });
  expect(admin.user.role === "admin", "Native admin girişi başarısız");
  expect((await api("/api/admin/summary")).summary.users === 1, "Native admin özeti başarısız");
  const pub1 = await api("/api/public/config");
  expect(Boolean(pub1.branding && pub1.branding.name), "Native branding boş döndü");
  await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify({ brand_name: "ZENITH", ui_primary_color: "#0f52ba" }) });
  const pub2 = await api("/api/public/config");
  expect(pub2.branding.name === "ZENITH" && pub2.branding.primary === "#0f52ba", "Native studio marka güncellemesi saklanmadı");
  console.log("PASS native: login, market, buy, sell, portfolio, T+2, money, admin, studio_branding");
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
