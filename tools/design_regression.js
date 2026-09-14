const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "audit-final");
const BASE = process.env.AUDIT_BASE || "http://localhost:4173";
const USER_TC = process.env.SMOKE_TC || "22222222220";
const USER_PASSWORD = process.env.SMOKE_PASSWORD || "User-Test-999";
const ADMIN_TC = process.env.ADMIN_TC || "11111111110";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin-Test-999";

async function login(page, tc, password) {
  await page.goto(`${BASE}/esube/giris`, { waitUntil: "networkidle" });
  await page.fill("input[name='tc']", tc);
  await page.fill("input[name='password']", password);
  await page.click("button[type='submit']");
  await page.waitForFunction(() => location.pathname !== "/esube/giris", null, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

async function capture(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

function watchErrors(page, scope, errors) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${scope} console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${scope} pageerror: ${error.message}`));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const checks = {};

  const publicPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watchErrors(publicPage, "public", errors);
  await publicPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await capture(publicPage, "01-public-desktop.png");
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await capture(publicPage, "02-public-mobile.png");
  checks.publicLogoReadable = await publicPage.locator(".site-header .brand-wordmark strong").isVisible();
  await publicPage.click("[data-public-menu]");
  checks.mobileMenuOpens = await publicPage.locator(".site-header.open .public-nav-panel").isVisible();
  await publicPage.close();

  const authPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watchErrors(authPage, "auth", errors);
  await authPage.goto(`${BASE}/esube/giris`, { waitUntil: "networkidle" });
  await capture(authPage, "03-auth-dark.png");
  await authPage.click("[data-theme-toggle]");
  await capture(authPage, "04-auth-light.png");
  await authPage.close();

  const userPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watchErrors(userPage, "user", errors);
  await login(userPage, USER_TC, USER_PASSWORD);
  await userPage.goto(`${BASE}/esube`, { waitUntil: "networkidle" });
  checks.userDarkTheme = await userPage.locator(".workspace.theme-dark").count() === 1;
  await capture(userPage, "05-user-dashboard-dark.png");

  await userPage.goto(`${BASE}/esube/stocks`, { waitUntil: "networkidle" });
  const stockSearch = userPage.locator("[data-search='stocks']");
  await stockSearch.fill("THYAO");
  await userPage.waitForTimeout(350);
  checks.stockSearchStable = new URL(userPage.url()).pathname === "/esube/stocks";
  checks.stockSearchResult = await userPage.locator("[data-stock='THYAO'][data-side='buy']").count() > 0;
  await userPage.locator("[data-stock='THYAO'][data-side='buy']").first().click();
  await userPage.waitForSelector(".trade-modal");
  await userPage.click("[data-order-amount-mode='cash']");
  await userPage.fill("input[name='cash_amount']", "1000");
  await capture(userPage, "06-cash-buy-modal.png");
  await userPage.click("#quick-order-form button[type='submit']");
  await userPage.waitForFunction(() => location.pathname === "/esube/portfolio", null, { timeout: 15000 });
  checks.cashBuyCompleted = true;

  await userPage.goto(`${BASE}/esube/profile`, { waitUntil: "networkidle" });
  await capture(userPage, "07-user-profile-dark.png");
  await userPage.goto(`${BASE}/esube/money`, { waitUntil: "networkidle" });
  await capture(userPage, "07b-user-money-dark.png");
  checks.moneyCardsUseTheme = await userPage.locator(".transfer-instructions, .bank-card").first().evaluate((element) => {
    const color = getComputedStyle(element).backgroundColor;
    return color !== "rgb(255, 255, 255)" && color !== "rgba(0, 0, 0, 0)";
  });
  await userPage.click("[data-theme-toggle]");
  await userPage.setViewportSize({ width: 390, height: 844 });
  await userPage.goto(`${BASE}/esube`, { waitUntil: "networkidle" });
  checks.userLightTheme = await userPage.locator(".workspace.theme-light").count() === 1;
  await capture(userPage, "08-user-dashboard-light-mobile.png");
  await userPage.close();

  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watchErrors(adminPage, "admin", errors);
  await login(adminPage, ADMIN_TC, ADMIN_PASSWORD);
  await adminPage.goto(`${BASE}/esube/admin/users`, { waitUntil: "networkidle" });
  await capture(adminPage, "09-admin-users-dark.png");
  await adminPage.goto(`${BASE}/esube/admin/settings`, { waitUntil: "networkidle" });
  await capture(adminPage, "10-admin-settings-dark.png");
  checks.adminCardsUseTheme = await adminPage.locator(".checkbox-field").first().evaluate((element) => {
    const color = getComputedStyle(element).backgroundColor;
    return color !== "rgb(255, 255, 255)" && color !== "rgba(0, 0, 0, 0)";
  });
  await adminPage.close();

  await browser.close();
  const passed = errors.length === 0 && Object.values(checks).every(Boolean);
  const result = { passed, checks, errors };
  fs.writeFileSync(path.join(OUT, "design-regression.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  if (!passed) process.exitCode = 1;
})();
