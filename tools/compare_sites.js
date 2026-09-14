const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "artifacts", "design-qa");
const BASE = "http://localhost:4173";

function getAdminCreds() {
  const adminFile = path.join(ROOT, "data", "bootstrap_admin.txt");
  if (fs.existsSync(adminFile)) {
    const text = fs.readFileSync(adminFile, "utf8");
    const tcMatch = text.match(/^TC=(.+)$/m);
    const passMatch = text.match(/^PASSWORD=(.+)$/m);
    if (tcMatch && passMatch) {
      return { tc: tcMatch[1].trim(), password: passMatch[1].trim() };
    }
  }
  return { tc: "10000000000", password: "AdminPass!2026" };
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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const creds = getAdminCreds();
  console.log("[*] Using Admin TC:", creds.tc);

  console.log("[*] Starting visual and UI/UX comparison audit...");

  // Audit 1: Desktop Admin View (1440x900)
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopContext.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // Login as admin
  await login(page, creds.tc, creds.password);

  // 1. Capture Admin Summary Dashboard
  await page.goto(`${BASE}/esube/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "admin-summary-desktop.png"), fullPage: true });
  console.log("[✔] Captured admin-summary-desktop.png");

  // 2. Capture Uygulama Stüdyosu (White-Label Studio) with Presets
  await page.goto(`${BASE}/esube/admin/studio`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "admin-studio-desktop.png"), fullPage: true });
  console.log("[✔] Captured admin-studio-desktop.png");

  // 3. Test Zenith Preset Activation on page
  const zenithPresetBtn = page.locator("[data-brand-preset='zenith']");
  if (await zenithPresetBtn.count() > 0) {
    await zenithPresetBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, "admin-studio-zenith-active.png"), fullPage: true });
    console.log("[✔] Captured admin-studio-zenith-active.png");
  }

  // 4. Audit Mobile Viewport (393x852)
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, creds.tc, creds.password);

  // Mobile Admin Summary
  await mobilePage.goto(`${BASE}/esube/admin`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(800);

  // Check overflow
  const hasOverflow = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log(`[*] Mobile Admin Horizontal Overflow: ${hasOverflow ? "YES (BUG!)" : "NO (PERFECT)"}`);

  await mobilePage.screenshot({ path: path.join(OUT, "admin-summary-mobile.png") });
  console.log("[✔] Captured admin-summary-mobile.png");

  // Mobile Studio
  await mobilePage.goto(`${BASE}/esube/admin/studio`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(OUT, "admin-studio-mobile.png") });
  console.log("[✔] Captured admin-studio-mobile.png");

  // Mobile User Dashboard
  await mobilePage.goto(`${BASE}/esube`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(OUT, "user-home-mobile.png") });
  console.log("[✔] Captured user-home-mobile.png");

  // Mobile Markets
  await mobilePage.goto(`${BASE}/esube/stocks`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(OUT, "user-markets-mobile.png") });
  console.log("[✔] Captured user-markets-mobile.png");

  console.log("\n[*] Console errors count:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log("Console errors:", consoleErrors);
  }

  await browser.close();
  console.log("[✔] Comparison and visual QA completed successfully!");
})();
