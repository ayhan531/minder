const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "audit-current");
const BASE = "http://localhost:4173";

function bootstrapAdmin() {
  if (process.env.ADMIN_TC && process.env.ADMIN_PASSWORD) {
    return {
      tc: process.env.ADMIN_TC,
      password: process.env.ADMIN_PASSWORD,
    };
  }
  const text = fs.readFileSync(path.join(ROOT, "data", "bootstrap_admin.txt"), "utf8");
  return {
    tc: text.match(/^TC=(.+)$/m)[1].trim(),
    password: text.match(/^PASSWORD=(.+)$/m)[1].trim(),
  };
}

function latestUser() {
  if (process.env.SMOKE_TC) {
    return { tc: process.env.SMOKE_TC, full_name: "Smoke User" };
  }
  const script = [
    "import json, sqlite3",
    "from pathlib import Path",
    "root=Path.cwd()",
    "conn=sqlite3.connect(root/'data'/'guney.db')",
    "conn.row_factory=sqlite3.Row",
    "row=conn.execute(\"SELECT tc, full_name FROM users WHERE role='user' AND status='approved' ORDER BY created_at DESC LIMIT 1\").fetchone()",
    "print(json.dumps(dict(row)))",
  ].join("; ");
  return JSON.parse(cp.execFileSync("python", ["-c", script], { cwd: ROOT, encoding: "utf8" }));
}

async function login(page, tc, password) {
  await page.goto(`${BASE}/esube/giris`, { waitUntil: "networkidle" });
  await page.fill("input[name='tc']", tc);
  await page.fill("input[name='password']", password);
  const remember = page.locator("input[name='remember']");
  if (await remember.count()) await remember.check();
  await page.click("button[type='submit']");
  await page.waitForSelector(".workspace, .app-shell, .admin-layout", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

async function capture(page, name, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const admin = bootstrapAdmin();
  const user = latestUser();
  const userPassword = process.env.SMOKE_PASSWORD || "NewPass!2026";
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const publicPage = await publicContext.newPage();
  publicPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`public console: ${msg.text()}`);
  });
  publicPage.on("pageerror", (err) => errors.push(`public pageerror: ${err.message}`));
  await capture(publicPage, "22-final-public-home-expanded.png", "/");
  await publicContext.close();

  const publicMobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const publicMobilePage = await publicMobileContext.newPage();
  await capture(publicMobilePage, "23-final-mobile-public-home-expanded.png", "/");
  await publicMobileContext.close();

  const userContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const userPage = await userContext.newPage();
  userPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`user console: ${msg.text()}`);
  });
  userPage.on("pageerror", (err) => errors.push(`user pageerror: ${err.message}`));
  await login(userPage, user.tc, userPassword);
  await capture(userPage, "09-final-user-dashboard.png", "/esube");
  await capture(userPage, "10-final-transactions.png", "/esube/transactions");
  await capture(userPage, "11-final-profile.png", "/esube/profile");
  await capture(userPage, "12-final-stocks.png", "/esube/stocks");
  await userPage.click("[data-stock][data-side='buy']");
  await userPage.waitForSelector(".trade-modal");
  await userPage.screenshot({ path: path.join(OUT, "13-final-quick-trade.png"), fullPage: true });
  await userContext.close();

  const mobileUserContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobileUserPage = await mobileUserContext.newPage();
  mobileUserPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`mobile user console: ${msg.text()}`);
  });
  mobileUserPage.on("pageerror", (err) => errors.push(`mobile user pageerror: ${err.message}`));
  await login(mobileUserPage, user.tc, userPassword);
  await capture(mobileUserPage, "17-final-mobile-dashboard.png", "/esube");
  await capture(mobileUserPage, "18-final-mobile-money.png", "/esube/money");
  await capture(mobileUserPage, "19-final-mobile-stocks.png", "/esube/stocks");
  await mobileUserContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  adminPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`admin console: ${msg.text()}`);
  });
  adminPage.on("pageerror", (err) => errors.push(`admin pageerror: ${err.message}`));
  await login(adminPage, admin.tc, admin.password);
  await capture(adminPage, "14-final-admin-users.png", "/esube/admin/users");
  await capture(adminPage, "15-final-admin-settings.png", "/esube/admin/settings");
  await capture(adminPage, "16-final-admin-deposits.png", "/esube/admin/deposit-requests");
  await capture(adminPage, "24-final-admin-transactions.png", "/esube/admin/transactions");
  await adminContext.close();

  const mobileAdminContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobileAdminPage = await mobileAdminContext.newPage();
  mobileAdminPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`mobile admin console: ${msg.text()}`);
  });
  mobileAdminPage.on("pageerror", (err) => errors.push(`mobile admin pageerror: ${err.message}`));
  await login(mobileAdminPage, admin.tc, admin.password);
  await capture(mobileAdminPage, "20-final-mobile-admin-users.png", "/esube/admin/users");
  await mobileAdminContext.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, "final-visual-check.json"), JSON.stringify({ errors }, null, 2), "utf8");
  console.log(JSON.stringify({ screenshots: 15, errors }, null, 2));
})();

