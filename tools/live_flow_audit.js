const { chromium, request } = require("playwright");

const BASE_URL = process.env.BASE_URL || "https://EMİNEVİMmenkuldeger2.onrender.com";
const ADMIN_TC = process.env.ADMIN_TC;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_USER_TC = process.env.TEST_USER_TC;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

const checks = [];

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required`);
}

function pass(name, details = {}) {
  checks.push({ ok: true, name, ...details });
}

async function responseJson(response, name, expectedStatus = 200) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  if (response.status() !== expectedStatus) {
    throw new Error(`${name}: expected ${expectedStatus}, got ${response.status()} ${JSON.stringify(data).slice(0, 500)}`);
  }
  pass(name, { status: response.status() });
  return data;
}

async function responseOk(response, name) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  if (!response.ok()) {
    throw new Error(`${name}: expected ok, got ${response.status()} ${JSON.stringify(data).slice(0, 500)}`);
  }
  pass(name, { status: response.status() });
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loginContext(tc, password, label) {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  await responseOk(await ctx.post("/api/login", { data: { tc, password } }), `${label} login`);
  const me = await responseOk(await ctx.get("/api/me"), `${label} me`);
  return { ctx, me };
}

function uniqueTc() {
  const digits = [Math.floor(Math.random() * 9) + 1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))];
  const odd = digits.filter((_, index) => index % 2 === 0).reduce((sum, value) => sum + value, 0);
  const even = digits.filter((_, index) => index % 2 === 1).reduce((sum, value) => sum + value, 0);
  digits.push((((odd * 7) - even) % 10 + 10) % 10);
  digits.push(digits.reduce((sum, value) => sum + value, 0) % 10);
  return digits.join("");
}

async function runApiAudit() {
  requireEnv("ADMIN_TC", ADMIN_TC);
  requireEnv("ADMIN_PASSWORD", ADMIN_PASSWORD);
  requireEnv("TEST_USER_TC", TEST_USER_TC);
  requireEnv("TEST_USER_PASSWORD", TEST_USER_PASSWORD);

  const publicCtx = await request.newContext({ baseURL: BASE_URL });
  const health = await responseOk(await publicCtx.get("/healthz"), "health");
  assert(health.ok === true, "health response is not ok");
  const market = await responseOk(await publicCtx.get("/api/market"), "market");
  const quotes = market.quotes || market.market || [];
  assert(quotes.length >= 8, `market has too few symbols: ${quotes.length}`);
  const stock = quotes.find((q) => (q.asset_class || "stock") === "stock" && Number(q.price) > 0 && Number(q.price) < 1000) || quotes.find((q) => Number(q.price) > 0);
  assert(stock?.symbol, "no tradable quote found");
  pass("market quote selected", { symbol: stock.symbol, price: stock.price, count: quotes.length, live: Boolean(market.meta?.ok) });

  const stamp = String(Date.now());
  const tc = uniqueTc();
  const password = `Audit!${stamp}`;
  const email = `live.audit.${stamp}@example.com`;
  const regCtx = await request.newContext({ baseURL: BASE_URL });
  await responseJson(
    await regCtx.post("/api/register", {
      multipart: {
        full_name: `Canli Audit ${stamp}`,
        tc,
        phone: "05550000000",
        email,
        city: "Istanbul",
        district: "Test",
        birth_date: "1990-01-01",
        address: "Canli audit test adresi",
        password,
        risk_experience: "2",
        risk_horizon: "2",
        risk_loss: "1",
        risk_income: "2",
        trade_frequency: "2",
        knowledge_level: "2",
        education: "Lisans",
        occupation: "Kalite uzmanı",
        traded_products: "Hisse senedi / Fon",
        investment_goal: "Uzun vadeli büyüme",
        accept_kvkk: "1",
        accept_distance_contract: "1",
        accept_risk_disclosure: "1",
      },
    }),
    "register pending user",
    201,
  );

  const pending = await loginContext(tc, password, "pending user");
  assert(pending.me.user.status === "pending", `pending user status mismatch: ${pending.me.user.status}`);
  await responseJson(
    await pending.ctx.post("/api/money-requests", { data: { request_type: "deposit", amount: 100 } }),
    "pending money blocked",
    403,
  );
  await responseJson(
    await pending.ctx.post("/api/orders", { data: { symbol: stock.symbol, side: "buy", order_type: "market", quantity: 1 } }),
    "pending order blocked",
    403,
  );
  const docs = await responseJson(
    await pending.ctx.post("/api/profile/documents", {
      multipart: {
        identity_front: { name: "front.png", mimeType: "image/png", buffer: png },
        identity_back: { name: "back.png", mimeType: "image/png", buffer: png },
        selfie: { name: "selfie.png", mimeType: "image/png", buffer: png },
      },
    }),
    "upload identity documents",
    201,
  );
  assert((docs.documents || []).length >= 3, "identity documents were not saved");

  const admin = await loginContext(ADMIN_TC, ADMIN_PASSWORD, "admin");
  await responseOk(await admin.ctx.post("/api/admin/step-up", { data: { password: ADMIN_PASSWORD } }), "admin step-up");
  const adminEndpoints = [
    "/api/admin/summary",
    "/api/admin/users",
    "/api/admin/orders",
    "/api/admin/money",
    "/api/admin/reports",
    "/api/admin/bank-accounts",
    "/api/admin/t2-settlements",
    "/api/admin/transactions",
    "/api/admin/positions",
    "/api/admin/user-balances",
    "/api/admin/documents",
    "/api/admin/system-settings",
    "/api/admin/stock-descriptions",
  ];
  for (const endpoint of adminEndpoints) {
    await responseOk(await admin.ctx.get(endpoint), `admin endpoint ${endpoint}`);
  }
  let users = await responseOk(await admin.ctx.get("/api/admin/users"), "admin users after register");
  const auditUser = (users.users || []).find((u) => u.email === email);
  assert(auditUser?.id, "registered user not visible in admin users");
  assert(auditUser.document_count >= 3, "uploaded documents not counted in admin users");

  const allDocs = await responseOk(await admin.ctx.get("/api/admin/documents"), "admin documents");
  const userDocs = (allDocs.documents || []).filter((d) => d.user_id === auditUser.id);
  assert(userDocs.length >= 3, "admin documents did not include user docs");
  for (const doc of userDocs) {
    await responseOk(await admin.ctx.post(`/api/admin/documents/${doc.id}/approve`, { data: { note: "Canli audit belge onayi" } }), `approve document ${doc.doc_type}`);
  }
  users = await responseOk(await admin.ctx.get("/api/admin/users"), "admin users after document approvals");
  const approvedAuditUser = (users.users || []).find((u) => u.email === email);
  assert(approvedAuditUser.status === "approved", `document approval did not approve user: ${approvedAuditUser.status}`);

  const approvedMe = await responseOk(await pending.ctx.get("/api/me"), "approved user me");
  assert(approvedMe.user.status === "approved", "approved user session did not refresh to approved");

  const bankAccounts = await responseOk(await pending.ctx.get("/api/system-bank-accounts"), "system bank accounts");
  const bank = (bankAccounts.bank_accounts || bankAccounts.system_bank_accounts || [])[0];
  assert(bank?.iban, "no active system bank account");
  const transferCode = `AUDIT-${stamp}`;
  await responseJson(
    await pending.ctx.post("/api/money-requests", {
      multipart: {
        request_type: "deposit",
        amount: "5000",
        account_ref: bank.iban,
        transfer_code: transferCode,
        note: "Canli audit para yatirma",
        receipt: { name: "receipt.png", mimeType: "image/png", buffer: png },
      },
    }),
    "create deposit request",
    201,
  );
  let adminMoney = await responseOk(await admin.ctx.get("/api/admin/money"), "admin money after deposit");
  const deposit = (adminMoney.money_requests || []).find((m) => m.transfer_code === transferCode);
  assert(deposit?.id, "deposit not visible in admin money");
  await responseOk(await admin.ctx.post(`/api/admin/money/${deposit.id}/approve`, { data: { reason: "Dekont ve banka hareketi doğrulandı" } }), "approve deposit");

  await responseJson(
    await pending.ctx.post("/api/money-requests", {
      data: {
        request_type: "withdraw",
        amount: 500,
        bank_name: "Audit Bank",
        account_holder: `Canli Audit ${stamp}`,
        iban: "TR330006100519786457841326",
        note: "Canli audit para cekme",
      },
    }),
    "create withdraw request",
    201,
  );
  adminMoney = await responseOk(await admin.ctx.get("/api/admin/money"), "admin money after withdraw");
  const withdraw = (adminMoney.money_requests || []).find((m) => m.note === "Canli audit para cekme" && m.status === "pending");
  assert(withdraw?.id, "withdraw not visible in admin money");
  await responseOk(await admin.ctx.post(`/api/admin/money/${withdraw.id}/approve`, { data: { reason: "Hesap sahibi ve bakiye doğrulandı" } }), "approve withdraw");

  await responseJson(
    await pending.ctx.post("/api/money-requests", {
      data: {
        request_type: "withdraw",
        amount: 500,
        bank_name: "Audit Bank",
        account_holder: `Canli Audit ${stamp}`,
        iban: "TR330006100519786457841326",
        note: "Canli audit iptal cekme",
      },
    }),
    "create cancellable withdraw",
    201,
  );
  const userMoney = await responseOk(await pending.ctx.get("/api/money-requests"), "user money list");
  const cancelWithdraw = (userMoney.money_requests || []).find((m) => m.note === "Canli audit iptal cekme" && m.status === "pending");
  assert(cancelWithdraw?.id, "cancellable withdraw not visible to user");
  await responseOk(await pending.ctx.post(`/api/money-requests/${cancelWithdraw.id}/cancel`, { data: {} }), "cancel withdraw");

  await responseJson(
    await pending.ctx.post("/api/orders", {
      data: { symbol: stock.symbol, side: "buy", order_type: "market", quantity: 1, note: "Canli audit piyasa alis" },
    }),
    "market buy order",
    201,
  );
  await responseJson(
    await pending.ctx.post("/api/orders", {
      data: { symbol: stock.symbol, side: "buy", order_type: "market", amount_mode: "cash", cash_amount: Math.ceil(Number(stock.price) + 1), note: "Canli audit TL ile alis" },
    }),
    "cash amount buy order",
    201,
  );
  await responseJson(
    await pending.ctx.post("/api/orders", {
      data: { symbol: stock.symbol, side: "sell", order_type: "market", quantity: 1, note: "Canli audit piyasa satis" },
    }),
    "market sell order",
    201,
  );
  await responseJson(
    await pending.ctx.post("/api/orders", {
      data: { symbol: stock.symbol, side: "buy", order_type: "limit", quantity: 1, limit_price: Math.max(0.01, Number(stock.price) * 0.5).toFixed(2), note: "Canli audit limit alis" },
    }),
    "limit buy order",
    201,
  );
  const adminOrders = await responseOk(await admin.ctx.get("/api/admin/orders"), "admin orders after trades");
  const limitOrder = (adminOrders.orders || []).find((o) => o.note === "Canli audit limit alis" && o.status === "pending");
  assert(limitOrder?.id, "limit order not visible in admin orders");
  await responseOk(await admin.ctx.post(`/api/admin/orders/${limitOrder.id}/reject`, { data: { reason: "Canlı audit limit emir ret kontrolü" } }), "reject limit order");

  const t2 = await responseOk(await admin.ctx.get("/api/admin/t2-settlements"), "admin t2 after sell");
  const settlement = (t2.t2_settlements || []).find((item) => item.code === stock.symbol && item.status === "pending");
  if (settlement?.id) {
    await responseOk(await admin.ctx.post(`/api/admin/t2-settlements/${settlement.id}`, { data: {} }), "settle t2");
  } else {
    pass("settle t2 skipped", { reason: "no pending settlement for selected symbol" });
  }

  const balanceBefore = await responseOk(await admin.ctx.get("/api/admin/user-balances"), "admin balances before adjust");
  const balanceRow = (balanceBefore.balances || []).find((b) => b.full_name === `Canli Audit ${stamp}`);
  const balanceUserId = balanceRow?.user_id || balanceRow?.id;
  assert(balanceUserId, "audit user balance row missing");
  await responseOk(
    await admin.ctx.post("/api/admin/balances", { data: { user_id: balanceUserId, action: "add", amount: 123, note: "Canli audit bakiye" } }),
    "admin balance add",
  );
  await responseOk(
    await admin.ctx.post("/api/admin/positions", { data: { user_id: balanceUserId, action: "add", symbol: stock.symbol, quantity: 1, price: Number(stock.price), note: "Canlı audit pozisyon ekleme" } }),
    "admin position add",
  );
  const settings = await responseOk(await admin.ctx.get("/api/admin/system-settings"), "admin settings read");
  await responseOk(await admin.ctx.post("/api/admin/system-settings", { data: settings.settings || {} }), "admin settings save same values");
  await responseOk(
    await admin.ctx.post("/api/admin/stock-descriptions", {
      data: { symbol: stock.symbol, description: "Canli audit aciklama kontrolu", risk_note: "Canli audit risk notu" },
    }),
    "admin stock description save",
  );
  const bankName = `Audit Bank ${stamp}`;
  const bankSave = await responseOk(
    await admin.ctx.post("/api/admin/bank-accounts", {
      data: {
        bank_name: bankName,
        account_holder: "Eminevim Menkul Degerler A.S.",
        iban: "TR330006100519786457841326",
        branch_name: "Audit",
        description: "Canli audit gecici hesap",
        is_active: "1",
        sort_order: 99,
      },
    }),
    "admin bank account create",
  );
  const createdBank = (bankSave.bank_accounts || []).find((b) => b.bank_name === bankName);
  assert(createdBank?.id, "created test bank account missing");
  await responseOk(await admin.ctx.post(`/api/admin/bank-accounts/${createdBank.id}`, { data: { action: "delete" } }), "admin bank account delete");

  const finalPortfolio = await responseOk(await pending.ctx.get("/api/portfolio"), "final portfolio");
  assert((finalPortfolio.transactions || []).length > 0, "final portfolio has no transactions");
  await publicCtx.dispose();
  await regCtx.dispose();
  await pending.ctx.dispose();
  await admin.ctx.dispose();
}

async function loginPage(page, tc, password) {
  await page.goto(`${BASE_URL}/esube/giris`, { waitUntil: "networkidle" });
  await page.fill("input[name='tc']", tc);
  await page.fill("input[name='password']", password);
  await page.click("button[type='submit']");
  await page.waitForFunction(() => location.pathname !== "/esube/giris", null, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function runUiAudit() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Eminevim Yatırım", { timeout: 20000 });
  pass("ui public opens");

  await loginPage(page, TEST_USER_TC, TEST_USER_PASSWORD);
  await page.goto(`${BASE_URL}/esube`, { waitUntil: "networkidle" });
  assert((await page.locator(".bottom-nav").textContent()).includes("Geçmiş"), "bottom nav does not contain Gecmis");
  assert(!(await page.locator(".bottom-nav").textContent()).includes("Para"), "bottom nav still contains Para");
  assert((await page.locator(".app-topbar [data-action='logout']").count()) === 0, "user topbar logout is still visible");
  pass("ui mobile nav matches request");

  await page.goto(`${BASE_URL}/esube/stocks`, { waitUntil: "networkidle" });
  await page.fill("[data-search='stocks']", "AK");
  await page.waitForTimeout(500);
  assert(page.url().includes("/esube/stocks"), "stock search changed route");
  assert((await page.inputValue("[data-search='stocks']")).includes("AK"), "stock search input lost value");
  const firstBuy = page.locator("[data-stock][data-side='buy']").first();
  await firstBuy.click();
  await page.waitForSelector(".trade-modal", { timeout: 10000 });
  await page.fill("#quick-order-form input[name='quantity']", "2");
  assert((await page.inputValue("#quick-order-form input[name='quantity']")) === "2", "quantity input lost value");
  assert((await page.locator(".trade-modal").count()) === 1, "trade modal closed after quantity input");
  pass("ui stock search and quantity modal stable");

  await page.goto(`${BASE_URL}/esube/profile`, { waitUntil: "networkidle" });
  assert((await page.locator(".profile-logout-card [data-action='logout']").count()) === 1, "profile logout missing");
  pass("ui profile logout visible");
  await context.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  adminPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`admin console: ${msg.text()}`);
  });
  adminPage.on("pageerror", (err) => errors.push(`admin pageerror: ${err.message}`));
  await loginPage(adminPage, ADMIN_TC, ADMIN_PASSWORD);
  for (const path of ["/esube/admin", "/esube/admin/users", "/esube/admin/orders", "/esube/admin/deposit-requests", "/esube/admin/transactions", "/esube/admin/settings"]) {
    await adminPage.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    await adminPage.waitForSelector(".app-main", { timeout: 15000 });
    assert(!(await adminPage.locator("text=Bir hata oluştu").count()), `admin page error: ${path}`);
  }
  pass("ui admin pages open");
  await adminContext.close();
  await browser.close();
  if (errors.length) throw new Error(errors.join("; "));
}

(async () => {
  try {
    await runApiAudit();
    await runUiAudit();
    console.log(JSON.stringify({ ok: true, baseUrl: BASE_URL, checks }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, baseUrl: BASE_URL, error: error.message, checks }, null, 2));
    process.exit(1);
  }
})();

