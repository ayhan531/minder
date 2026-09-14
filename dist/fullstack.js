const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

if (document.fonts?.load) {
  document.fonts.load('18px "tabler-icons"').finally(() => document.documentElement.classList.add("icons-ready"));
} else {
  document.documentElement.classList.add("icons-ready");
}

const state = {
  path: location.pathname,
  authMode: new URLSearchParams(location.search).get("reset") ? "reset" : (new URLSearchParams(location.search).get("mode") === "register" ? "register" : "login"),
  me: null,
  account: null,
  market: [],
  marketMeta: null,
  news: [],
  newsMeta: null,
  publicConfig: null,
  security: null,
  theme: localStorage.getItem("minder-theme") || "light",
  portfolio: null,
  stockQuery: "",
  stockSort: "az",
  marketTab: "bist",
  marketExpanded: false,
  stockPage: 1,
  stockPageSize: 40,
  newsFilter: "all",
  newsQuery: "",
  transactionQuery: "",
  transactionFrom: "",
  transactionTo: "",
  orderSide: "buy",
  moneyType: "deposit",
  ordersTab: "open",
  notificationsTab: "all",
  transactionFilter: "all",
  selectedSymbol: "THYAO",
  orderAmountMode: "cash",
  tradeOpen: false,
  companyOpen: false,
  companyLoading: false,
  companyData: null,
  companyTab: "summary",
  showPassword: false,
  adminStepUpUntil: 0,
  docPreview: null,
  searchOpen: false,
  searchQuery: "",
  publicMenuOpen: false,
  adminMenuOpen: false,
  adminQuery: "",
  editBankId: null,
  admin: {
    summary: null,
    users: [],
    orders: [],
    money: [],
    reports: null,
    bank: null,
    t2: [],
    transactions: [],
    positions: [],
    balances: [],
    documents: [],
    settings: {},
    stockDescriptions: [],
    contactMessages: [],
  },
};

const icons = {
  home: "home",
  chart: "chart-line",
  wallet: "wallet",
  user: "user",
  shield: "shield-check",
  check: "check",
  clock: "clock",
  bank: "building-bank",
  upload: "upload",
  download: "download",
  file: "file-text",
  settings: "settings",
  arrow: "arrow-right",
  search: "search",
  copy: "copy",
  calendar: "calendar",
  eye: "eye",
  eyeOff: "eye-off",
  close: "x",
  lock: "lock",
  menu: "menu-2",
  sun: "sun",
  moon: "moon",
  activity: "activity-heartbeat",
  news: "news",
  external: "external-link",
  building: "building-bank",
  pie: "chart-pie",
  chevron: "chevron-up",
  help: "help-circle",
  fingerprint: "fingerprint",
  device: "device-mobile",
  location: "map-pin",
  bell: "bell",
  star: "star",
  message: "message-circle",
  id: "id",
  report: "report",
  list: "list-details",
};

const STOCK_LOGOS = new Set(["AKBNK", "ALARK", "ASELS", "ASTOR", "FROTO", "MGROS", "TCELL", "THYAO", "TUPRS"]);
let portfolioCharts = [];
let companyChart = null;
let miniCharts = [];
let miniChartTimer = null;
let canvasAnimationFrames = [];

function stopCanvasAnimations() {
  canvasAnimationFrames.forEach((frame) => cancelAnimationFrame(frame));
  canvasAnimationFrames = [];
}

function animateSparklineCanvas(canvas, points, color, duration = 720) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(40, Math.round(rect.width || canvas.parentElement?.clientWidth || 180));
  const height = Math.max(24, Math.round(rect.height || canvas.parentElement?.clientHeight || 70));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const padding = 3;
  const coords = points.map((value, index) => ({
    x: padding + index * ((width - padding * 2) / Math.max(points.length - 1, 1)),
    y: padding + (max - value) * ((height - padding * 2) / range),
  }));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const started = performance.now();
  const draw = (now) => {
    const progress = reduced ? 1 : Math.min(1, (now - started) / duration);
    const visibleSegments = Math.max(1, Math.ceil((coords.length - 1) * progress));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.beginPath();
    ctx.lineWidth = width > 260 ? 2.1 : 1.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    coords.slice(0, visibleSegments + 1).forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    if (progress < 1) canvasAnimationFrames.push(requestAnimationFrame(draw));
  };
  canvasAnimationFrames.push(requestAnimationFrame(draw));
}

function drawDonutCanvas(canvas, values, colors) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(120, Math.round(rect.width || 220));
  const height = Math.max(120, Math.round(rect.height || 220));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const total = Math.max(values.reduce((sum, value) => sum + Number(value || 0), 0), 1);
  const radius = Math.min(width, height) * .36;
  const lineWidth = Math.max(15, radius * .28);
  const started = performance.now();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = (now) => {
    const progress = reduced ? 1 : Math.min(1, (now - started) / 760);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    let angle = -Math.PI / 2;
    values.forEach((value, index) => {
      const arc = (Number(value || 0) / total) * Math.PI * 2 * progress;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, angle, angle + arc);
      ctx.strokeStyle = colors[index % colors.length];
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "butt";
      ctx.stroke();
      angle += arc;
    });
    if (progress < 1) canvasAnimationFrames.push(requestAnimationFrame(draw));
  };
  canvasAnimationFrames.push(requestAnimationFrame(draw));
}

function icon(name, size = 20) {
  return `<i class="ti ti-${icons[name] || icons.check} ui-icon" style="--icon-size:${size}px" aria-hidden="true"></i>`;
}

function brandLockup(compact = false) {
  const brand = state.publicConfig?.branding || {};
  const mark = brand.logo_url ? `<img class="brand-custom-logo" src="${esc(brand.logo_url)}" alt="" />` : esc((brand.symbol || "P").slice(0, 3));
  return `<span class="brand-lockup ${compact ? "compact" : ""}"><span class="brand-symbol" aria-hidden="true">${mark}</span><span class="brand-wordmark"><strong>${esc(brand.name || "MINDER")}</strong><small>${esc(brand.descriptor || "OTTOMAN")}</small></span></span>`;
}

function applyBranding() {
  const brand = state.publicConfig?.branding || {};
  const root = document.documentElement;
  root.style.setProperty("--studio-primary", brand.primary || "#0067e8");
  root.style.setProperty("--studio-accent", brand.accent || "#00a96b");
  root.style.setProperty("--studio-danger", brand.danger || "#ef3340");
  root.style.setProperty("--studio-radius", `${Math.max(4, Math.min(36, Number(brand.radius || 18)))}px`);
  root.style.setProperty("--studio-font", ['Inter', 'Arial', 'Roboto', 'Manrope', 'system-ui'].includes(brand.font) ? brand.font : 'Inter');
}

function stockLogo(symbol, name = "") {
  const code = String(symbol || "").toUpperCase();
  const source = STOCK_LOGOS.has(code) ? `/assets/company-logos/${esc(code)}.svg` : "";
  if (!source) return `<span class="stock-logo fallback" aria-hidden="true">${icon("building", 18)}</span>`;
  return `<span class="stock-logo sourced">${icon("building", 18)}<img src="${esc(source)}" alt="${esc(name || code)} logosu" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.classList.add('fallback')" /></span>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function money(value) {
  return `₺${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function signedMoney(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}${money(Math.abs(amount))}`;
}

function number(value) {
  return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function compactNumber(value) {
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

function dateLabel(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? String(value || "Güncel") : parsed.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function sectorLabel(value) {
  const labels = { Finance: "Finans", Utilities: "Enerji ve Altyapı", Technology: "Teknoloji", "Consumer Services": "Tüketici Hizmetleri", "Consumer Durables": "Dayanıklı Tüketim", "Consumer Non-Durables": "Tüketim Ürünleri", "Health Technology": "Sağlık Teknolojileri", Transportation: "Ulaştırma", "Process Industries": "İşlenmiş Ürünler", "Producer Manufacturing": "Üretim", "Non-Energy Minerals": "Madencilik ve Malzeme", Communications: "İletişim", Retail: "Perakende", "Retail Trade": "Perakende", Distribution: "Dağıtım" };
  return labels[value] || value || "Belirtilmemiş";
}

function industryLabel(value) {
  const labels = {
    "Engineering & Construction": "Mühendislik ve İnşaat",
    "Major Banks": "Bankacılık",
    "Regional Banks": "Bankacılık",
    "Aerospace & Defense": "Havacılık ve Savunma",
    "Motor Vehicles": "Otomotiv",
    "Electric Utilities": "Elektrik Enerjisi",
    "Alternative Power Generation": "Yenilenebilir Enerji",
    "Wireless Telecommunications": "Mobil İletişim",
    "Airlines": "Hava Taşımacılığı",
    "Steel": "Demir ve Çelik",
    "Oil Refining/Marketing": "Petrol Rafinerisi ve Dağıtım",
    "Food Retail": "Gıda Perakendesi",
    "Real Estate Development": "Gayrimenkul Geliştirme",
    "Apparel/Footwear": "Tekstil ve Hazır Giyim",
    "Industrial Machinery": "Endüstriyel Makine",
    "Electronic Equipment/Instruments": "Elektronik Ekipman",
    "Chemicals: Specialty": "Özel Kimyasallar"
  };
  return labels[value] || value || "Belirtilmemiş";
}

function portfolioAllocation() {
  const account = state.portfolio?.account || state.account || {};
  const positions = (state.portfolio?.positions || [])
    .map((p) => ({ label: p.symbol, value: Number(p.market_value || 0), symbol: p.symbol }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const cash = Number(account.cash_balance || 0);
  const pending = Number(account.pending_balance || 0);
  if (cash > 0) positions.push({ label: "Çekilebilir", value: cash, symbol: "CASH" });
  if (pending > 0) positions.push({ label: "T+2", value: pending, symbol: "T2" });
  return positions;
}

function portfolioTotalValue() {
  return portfolioAllocation().reduce((sum, item) => sum + item.value, 0);
}

function renderPortfolioChart() {
  portfolioCharts.forEach((chart) => chart.destroy());
  portfolioCharts = [];
  const canvases = document.querySelectorAll("[data-portfolio-chart]");
  const allocation = portfolioAllocation();
  const data = allocation.length ? allocation : [{ label: "Portföy", value: 1 }];
  const palette = ["#67a716", "#257957", "#4b8f8b", "#7f9d78", "#a7b8ae", "#d0a145", "#cf5f55", "#6c84a3"];
  if (!window.Chart) {
    canvases.forEach((canvas) => drawDonutCanvas(canvas, data.map((item) => item.value), palette));
    return;
  }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  canvases.forEach((canvas) => {
    const workspace = canvas.closest(".workspace");
    const styles = getComputedStyle(workspace || document.documentElement);
    portfolioCharts.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: data.map((item) => item.label),
        datasets: [{
          data: data.map((item) => item.value),
          backgroundColor: allocation.length ? data.map((_, index) => palette[index % palette.length]) : [styles.getPropertyValue("--ui-border-strong") || "#becfc6"],
          borderColor: styles.getPropertyValue("--ui-surface") || "#fff",
          borderWidth: 3,
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        animation: { duration: reducedMotion ? 0 : 750, easing: "easeOutQuart" },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } },
      },
    }));
  });
}

function renderCompanyChart() {
  companyChart?.destroy();
  companyChart = null;
  const canvas = document.querySelector("[data-company-chart]");
  const history = state.companyData?.history || [];
  if (!canvas || !window.Chart || history.length < 2) return;
  const workspace = canvas.closest(".workspace");
  const styles = getComputedStyle(workspace || document.documentElement);
  companyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map((item) => item.recorded_at_label),
      datasets: [{ data: history.map((item) => item.price), borderColor: styles.getPropertyValue("--ui-accent") || "#19c37d", backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.24 }],
    },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 720, easing: "easeOutQuart" }, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { color: styles.getPropertyValue("--ui-muted") }, grid: { color: styles.getPropertyValue("--ui-border") } } } },
  });
}

function renderMiniCharts() {
  clearInterval(miniChartTimer);
  miniChartTimer = null;
  stopCanvasAnimations();
  miniCharts.forEach((chart) => chart.destroy());
  miniCharts = [];
  const canvases = [...document.querySelectorAll("canvas[data-mini-chart]")];
  const series = canvases.map((canvas, index) => {
    const positive = canvas.dataset.direction !== "down";
    const seed = Number(canvas.dataset.seed || index + 1);
    const points = Array.from({ length: 22 }, (_, i) => 42 + i * (positive ? 1.35 : -.9) + Math.sin((i + seed) * .72) * 4.2 + Math.cos((i + seed) * .31) * 1.8);
    return { canvas, positive, points };
  });
  if (!window.Chart) {
    series.forEach(({ canvas, positive, points }) => animateSparklineCanvas(canvas, points, positive ? "#12aa4d" : "#e52d3d"));
    if (series.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      miniChartTimer = setInterval(() => series.forEach(({ canvas, positive, points }, index) => {
        points.shift();
        points.push(Number(points.at(-1) || 42) + (positive ? 1 : -1) * .65 + Math.sin(Date.now() / 1100 + index) * 1.1);
        animateSparklineCanvas(canvas, points, positive ? "#12aa4d" : "#e52d3d", 520);
      }), 2200);
    }
    return;
  }
  series.forEach(({ canvas, positive, points }) => {
    miniCharts.push(new Chart(canvas, {
      type: "line",
      data: { labels: points.map((_, i) => i), datasets: [{ data: points, borderColor: positive ? "#12aa4d" : "#e52d3d", borderWidth: 2, pointRadius: 0, tension: .34, fill: false }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 650, easing: "easeOutQuart" }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, interaction: { intersect: false } }
    }));
  });
  if (miniCharts.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    miniChartTimer = setInterval(() => {
      miniCharts.forEach((chart, chartIndex) => {
        const values = chart.data.datasets[0].data;
        if (!values?.length) return;
        values.shift();
        const last = Number(values.at(-1) || 42);
        const direction = chart.canvas.dataset.direction === "down" ? -1 : 1;
        values.push(last + direction * 1.15 + Math.sin(Date.now() / 850 + chartIndex) * 2.4);
        chart.update("active");
      });
    }, 2200);
  }
}

function statusClass(status) {
  if (status === "approved" || status === "test_account") return "ok";
  if (status === "rejected" || status === "cancelled") return "bad";
  return "warn";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

async function api(path, options = {}) {
  if (window.__paribuNativeApi) return window.__paribuNativeApi(path, options);
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: options.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || "İşlem tamamlanamadı");
  return data;
}

async function ensureAdminStepUp() {
  if (state.adminStepUpUntil > Date.now()) return true;
  const password = prompt("Finansal işlem için admin şifrenizi doğrulayın");
  if (!password) return false;
  const result = await api("/api/admin/step-up", { method: "POST", body: JSON.stringify({ password }) });
  state.adminStepUpUntil = Date.now() + Math.max(30, Number(result.valid_for_seconds || 600) - 15) * 1000;
  return true;
}

async function loadMe() {
  const data = await api("/api/me");
  state.me = data.user;
  state.account = data.account;
}

async function loadMarket() {
  const data = await api("/api/market");
  state.market = data.quotes || [];
  state.marketMeta = data.meta || null;
}

async function loadPublicConfig() {
  state.publicConfig = await api("/api/public/config");
  applyBranding();
}

async function loadSecurity() {
  state.security = await api("/api/profile/security");
}

async function loadPortfolio() {
  state.portfolio = await api("/api/portfolio");
}

async function loadNews() {
  try {
    const data = await api("/api/news");
    state.news = data.items || [];
    state.newsMeta = data.meta || null;
  } catch (_) {
    state.newsMeta = { ok: false, degraded: true, errors: ["Haber kaynakları"] };
  }
}

async function openCompanyDetail(symbol) {
  state.companyOpen = true;
  state.companyLoading = true;
  state.companyData = null;
  state.companyTab = "summary";
  state.selectedSymbol = symbol;
  render({ motion: false, preserveScroll: true });
  try {
    state.companyData = await api(`/api/company/${encodeURIComponent(symbol)}`);
  } catch (error) {
    state.companyOpen = false;
    showToast(error.message);
  } finally {
    state.companyLoading = false;
    render({ motion: false, preserveScroll: true });
  }
}

async function loadAdmin() {
  const [summary, users, orders, moneyReqs, reports, bank, t2, transactions, positions, balances, docs, settings, stockDescriptions, contactMessages] = await Promise.all([
    api("/api/admin/summary"),
    api("/api/admin/users"),
    api("/api/admin/orders"),
    api("/api/admin/money"),
    api("/api/admin/reports"),
    api("/api/admin/bank-accounts"),
    api("/api/admin/t2-settlements"),
    api("/api/admin/transactions"),
    api("/api/admin/positions"),
    api("/api/admin/user-balances"),
    api("/api/admin/documents"),
    api("/api/admin/system-settings"),
    api("/api/admin/stock-descriptions"),
    api("/api/admin/contact-messages"),
  ]);
  state.admin.summary = summary.summary;
  state.admin.users = users.users || [];
  state.admin.orders = orders.orders || [];
  state.admin.money = moneyReqs.money_requests || [];
  state.admin.reports = reports;
  state.admin.bank = bank;
  state.admin.t2 = t2.t2_settlements || [];
  state.admin.transactions = transactions.transactions || [];
  state.admin.positions = positions.positions || [];
  state.admin.balances = balances.balances || [];
  state.admin.documents = docs.documents || [];
  state.admin.settings = settings.settings || {};
  state.admin.stockDescriptions = stockDescriptions.descriptions || [];
  state.admin.contactMessages = contactMessages.messages || [];
}

async function route() {
  state.path = location.pathname.replace(/\/$/, "") || "/";
  if (state.path === "/esube/trade") {
    const requestedSide = new URLSearchParams(location.search).get("side");
    if (["buy", "sell"].includes(requestedSide)) state.orderSide = requestedSide;
  }
  const keepsWorkspaceVisible = Boolean(state.me && state.path.startsWith("/esube") && app.querySelector(".workspace"));
  if (!keepsWorkspaceVisible) renderShellLoading();
  try {
    await Promise.all([loadMe(), state.publicConfig ? Promise.resolve() : loadPublicConfig()]);
    if (state.path.startsWith("/esube") && state.path !== "/esube/giris" && !state.me) {
      history.replaceState({}, "", "/esube/giris");
      state.path = "/esube/giris";
    }
    if (state.me && state.path.startsWith("/esube/admin")) {
      if (state.me.role !== "admin") throw new Error("Yönetim paneli için yetki gerekli");
      await loadAdmin();
    } else if (state.me && state.path.startsWith("/esube") && state.path !== "/esube/giris") {
      if (state.me.role !== "admin" && state.me.status !== "approved" && state.path !== "/esube/profile") {
        history.replaceState({}, "", "/esube/profile");
        state.path = "/esube/profile";
        showToast("Hesabınız onay bekliyor. Kimlik belgelerinizi profilinizden yükleyin.");
      }
      await loadPortfolio();
      if (state.path.startsWith("/esube/profile")) await loadSecurity();
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    render();
    const renderedPath = state.path;
    loadMarket()
      .catch((error) => {
        state.marketMeta = { ok: false, degraded: true, error: error.message };
      })
      .then(() => {
        const marketScreen = !renderedPath.startsWith("/esube") || ["/esube", "/esube/stocks", "/esube/trade", "/esube/favorites", "/esube/admin", "/esube/admin/settings"].includes(renderedPath);
        if (state.path === renderedPath && marketScreen) render({ motion: false, preserveScroll: true });
      });
    if (!state.newsMeta) {
      loadNews().then(() => {
        if (["/esube", "/esube/news"].includes(state.path)) render({ motion: false, preserveScroll: true });
      });
    }
  }
}

function navigate(path) {
  history.pushState({}, "", path);
  state.publicMenuOpen = false;
  route();
  window.scrollTo(0, 0);
}

async function refreshCurrent({ preserveScroll = true } = {}) {
  const x = window.scrollX;
  const y = window.scrollY;
  await route();
  if (preserveScroll) requestAnimationFrame(() => window.scrollTo(x, y));
}

function active(path) {
  return state.path === path || (path !== "/esube" && state.path.startsWith(`${path}/`)) ? "active" : "";
}

function marketRail() {
  const quotes = [...state.market.slice(0, 16), ...state.market.slice(0, 16)];
  return `<div class="market-rail"><div class="market-track">${quotes.map((q) => `<span class="ticker-item"><strong>${esc(q.symbol)}</strong><span>${money(q.price)}</span><span class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</span></span>`).join("")}</div></div>`;
}

function renderShellLoading() {
  app.innerHTML = `<main class="auth-shell theme-${state.theme}"><section class="auth-card"><div class="auth-brand">${brandLockup()}</div><div class="empty-state">Yükleniyor...</div></section></main>`;
}

function render({ motion = true, preserveScroll = false } = {}) {
  const scrollPosition = preserveScroll ? { x: window.scrollX, y: window.scrollY } : null;
  document.title = `${state.publicConfig?.branding?.name || "Minder"} ${state.publicConfig?.branding?.descriptor || "Ottoman"}`;
  if (state.path === "/esube/giris") {
    renderAuthV2();
  } else if (state.path.startsWith("/esube/admin")) {
    renderAdmin();
  } else if (state.path.startsWith("/esube")) {
    renderUser();
  } else {
    renderPublic();
  }
  renameLegacyBrand();
  if (!motion) app.firstElementChild?.classList.add("skip-enter-motion");
  requestAnimationFrame(() => {
    if (motion) initPageMotion();
    renderPortfolioChart();
    renderCompanyChart();
    renderMiniCharts();
    if (scrollPosition) window.scrollTo(scrollPosition.x, scrollPosition.y);
  });
}

function renameLegacyBrand() {
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue?.includes("Güney")) node.nodeValue = node.nodeValue.replaceAll("Güney", "Paribu");
  }
  app.querySelectorAll("input[value*='Güney'], textarea").forEach((field) => {
    if (field.value?.includes("Güney")) field.value = field.value.replaceAll("Güney", "Paribu");
  });
}

let motionObserver;

function initPageMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const targets = app.querySelectorAll(".hero-inner > div, .hero-card, .section-head, .service-card, .metric, .number-stat, .numbers-title, .feature-list li, .operations-card, .testimonial, .logo-chip, .regulator-chip, .discover-card, .cta-band .container, .footer-grid > div");
  if (!motionObserver) {
    motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          motionObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.14 });
  }
  targets.forEach((el, index) => {
    el.classList.add("motion-item");
    el.style.setProperty("--motion-index", String(index % 8));
    motionObserver.observe(el);
  });
}

function publicHeader() {
  const nav = [
    ["Ana Sayfa", "/"],
    ["Hakkımızda", "/hakkimizda"],
    ["Hizmetlerimiz", "/hizmetlerimiz"],
    ["Komisyon Ücretler", "/komisyon-ucretler"],
    ["Blog", "/blog"],
    ["SSS", "/sss"],
    ["İletişim", "/iletisim"],
  ];
  return `${marketRail()}<header class="site-header ${state.publicMenuOpen ? "open" : ""}"><div class="container site-header-inner">
    <a href="/" data-link class="brand" aria-label="Paribu Menkul Değerler ana sayfa">${brandLockup()}</a>
    <div class="public-nav-panel"><nav class="site-nav">${nav.map(([label, href]) => `<a href="${href}" data-link class="${state.path === href ? "active" : ""}">${label}</a>`).join("")}</nav>
    <div class="header-actions"><a href="/esube/giris" data-link class="ghost-button">Giriş Yap</a><a href="/esube/giris?mode=register" data-link class="primary-button">Kayıt Ol</a></div></div>
    <button class="icon-button mobile-menu" type="button" data-public-menu aria-label="Menüyü aç veya kapat">${icon("menu", 18)}</button>
  </div></header>`;
}

function renderPublic() {
  const pages = {
    "/": publicHome,
    "/hakkimizda": publicAboutPage,
    "/hizmetlerimiz": () => publicInfoPage("Hizmetlerimiz", "Hisse senedi izleme, portföy yönetimi, para transfer talepleri ve kredili yatırım başvuruları.", ["Canlı piyasa ekranları", "Onaylı para akışı", "Satış bakiyesi takibi"]),
    "/komisyon-ucretler": publicFeesPage,
    "/blog": publicBlogPage,
    "/sss": publicFaqPage,
    "/iletisim": publicContactPage,
    "/kvkk": () => legalPage("KVKK Aydınlatma Metni", "Kişisel veriler; hesap açılışı, kimlik doğrulama, işlem güvenliği ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir. Veri sorumlusunun resmi bilgileri ve başvuru kanalları kurum ayarlarında yayımlandığında bu metinde gösterilir."),
    "/mesafeli-sozlesme": () => legalPage("Mesafeli Hizmet Sözleşmesi", "Elektronik ortamda sunulan hesap ve işlem hizmetlerinin kapsamı, tarafların hak ve yükümlülükleri, ücretler, cayma koşulları ve uyuşmazlık başvuru yolları bu sözleşmenin konusudur."),
    "/risk-bildirimi": () => legalPage("Yatırım Hizmetleri Risk Bildirimi", "Sermaye piyasası araçlarının değeri düşebilir; yatırılan anaparanın tamamı kaybedilebilir. Geçmiş performans gelecek getiri için gösterge değildir. Emir vermeden önce ürün, ücret ve riskleri değerlendirin."),
  };
  app.innerHTML = publicHeader() + (pages[state.path] || publicHome)() + publicFooter();
}

function renderZenithHome() {
  const brand = state.publicConfig?.branding || {};
  const company = state.publicConfig?.company || {};
  const heroQuotes = state.market.filter((item) => (item.asset_class || "stock") === "stock").slice(0, 8);
  const funds = [
    { code: "ZHF", name: "Zenith BIST 30 Hisse Senedi Yoğun Fon", yield: "%92.4", risk: "Yüksek Getiri", desc: "BIST 30 lokomotif şirketlerine odaklı kurumsal hisse sepeti." },
    { code: "ZAF", name: "Zenith Serbest Kurumsal Arbitraj Fonu", yield: "%58.1", risk: "Düşük Risk", desc: "Spot ve vadeli piyasa fiyat farklarından piyasa nötr istikrarlı getiri." },
    { code: "ZGF", name: "Zenith Kıymetli Madenler & Altın Sepeti", yield: "%74.8", risk: "Enflasyon Korumalı", desc: "Fiziki saklama güvenceli altın, gümüş ve kıymetli maden fonu." },
    { code: "ZDF", name: "Zenith Serbest Döviz & Eurobond Fonu", yield: "%11.8 $", risk: "Döviz Getirili", desc: "T.C. Hazine Müsteşarlığı ve birinci sınıf kurumsal Eurobond varlıkları." }
  ];
  return `<main class="public-main theme-zenith-view">
    <section class="zenith-hero">
      <div class="container zenith-hero-inner">
        <div class="zenith-hero-badge"><span class="live-dot"></span> TİER-1 GENİŞ YETKİLİ ARACI KURUM · SPK LİSANS NO: Z-088</div>
        <h1 class="zenith-title">ZENITH PORTFÖY &amp; MENKUL DEĞERLER</h1>
        <p class="zenith-lead">Kurumsal Varlık Yönetimi, Borsa İstanbul ve Küresel Sermaye Piyasalarında Ayrıcalıklı Yatırım Masası</p>
        <div class="zenith-actions">
          <a href="/esube/giris?mode=register" data-link class="zenith-btn-primary">Kurumsal Hesap Aç ${icon("arrow", 18)}</a>
          <a href="/esube/giris" data-link class="zenith-btn-outline">Portföy Masası Girişi</a>
        </div>
        <div class="zenith-kpi-strip">
          <div class="zenith-kpi"><strong>₺84.2 Milyar</strong><span>Yönetilen Kurumsal Varlık (AUM)</span></div>
          <div class="zenith-kpi"><strong>%142.6</strong><span>3 Yıllık Portföy Bileşik Getirisi</span></div>
          <div class="zenith-kpi"><strong>18 Yıl</strong><span>Sermaye Piyasası Kurumsal Deneyimi</span></div>
          <div class="zenith-kpi"><strong>T+0 / T+2</strong><span>BIST Doğrudan Takas Masası</span></div>
        </div>
      </div>
    </section>

    <!-- Zenith Live BIST Ticker -->
    <section class="zenith-ticker-strip">
      <div class="container zenith-ticker-inner">
        <span class="zenith-ticker-label">${icon("chart", 16)} BIST 100 CANLI</span>
        <div class="zenith-ticker-items">
          ${heroQuotes.slice(0, 6).map((q) => `
            <div class="zenith-ticker-card">
              <span class="symbol">${esc(q.symbol)}</span>
              <strong class="price">${money(q.price)}</strong>
              <span class="pct ${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>

    <!-- Zenith Institutional Funds -->
    <section class="section zenith-funds-section">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="section-kicker">Varlık Stratejileri</span>
            <h2 class="section-title">Kurumsal Portföy ve Fon Seçenekleri</h2>
            <p class="section-copy">Risk toleransınıza ve getiri hedeflerinize göre yapılandırılmış lisanslı fonlarımız.</p>
          </div>
          <a href="/esube/giris?mode=register" data-link class="zenith-text-link">Tüm Fonları İncele ${icon("arrow", 16)}</a>
        </div>
        <div class="grid grid-4 zenith-funds-grid">
          ${funds.map((f) => `
            <div class="zenith-fund-card">
              <div class="fund-head">
                <span class="fund-code">${f.code}</span>
                <span class="fund-badge">${f.risk}</span>
              </div>
              <h3>${f.name}</h3>
              <p>${f.desc}</p>
              <div class="fund-yield">
                <small>Yıllık Net Getiri</small>
                <strong>${f.yield}</strong>
              </div>
              <a href="/esube/giris?mode=register" data-link class="fund-cta">Fona Katıl ${icon("arrow", 15)}</a>
            </div>
          `).join("")}
        </div>
      </div>
    </section>

    <!-- Zenith Institutional Solutions -->
    <section class="section zenith-solutions-section">
      <div class="container">
        <div class="zenith-solution-box">
          <div class="solution-copy">
            <span class="section-kicker">Kurumsal Çözümler</span>
            <h2>Bireysel Portföy Masası &amp; Arbitraj</h2>
            <p>Büyük hacimli işlemleriniz için ayrılmış özel portföy yöneticisi, blok emir eşleşmesi ve T+2 takas avantajlarıyla piyasada daima bir adım önde olun.</p>
            <ul class="zenith-feature-list">
              <li>${icon("check", 16)} 7/24 Size Özel Portföy Yöneticisi</li>
              <li>${icon("check", 16)} Kurumsal BIST Blok Emir Masası</li>
              <li>${icon("check", 16)} Düşük Maliyetli Algoritmik Arbitraj Stratejileri</li>
              <li>${icon("check", 16)} SPK ve Takasbank Güvenceli Saklama</li>
            </ul>
          </div>
          <div class="solution-card">
            <h3>Hemen Kurumsal Portföy Masasına Bağlanın</h3>
            <p>Ön başvuru formu ile kurumsal yatırımcı statünüzü oluşturun.</p>
            <a href="/esube/giris?mode=register" data-link class="zenith-btn-primary full-width">Başvuruyu Başlat</a>
          </div>
        </div>
      </div>
    </section>
  </main>`;
}

function renderParibuHome() {
  const brand = state.publicConfig?.branding || {};
  const heroQuotes = state.market.filter((item) => (item.asset_class || "stock") === "stock").slice(0, 8);
  const q0 = heroQuotes[0] || { symbol: "THYAO", name: "Türk Hava Yolları", price: 312.50, change_pct: 2.45 };
  return `<main class="public-main theme-paribu-view">
    <section class="paribu-hero">
      <div class="container paribu-hero-inner">
        <div class="paribu-hero-left">
          <span class="paribu-glow-pill">⚡ YENİ NESİL DİJİTAL BORSA &amp; YATIRIM</span>
          <h1 class="paribu-hero-title">Borsaya Hızlı, Güçlü ve Kesintisiz Bağlan</h1>
          <p class="paribu-hero-subtitle">Borsa İstanbul hisselerinde sıfır gecikmeli kotasyon, akıllı al/sat emirleri ve anında takas ile yatırımın tadını çıkarın.</p>
          <div class="paribu-hero-buttons">
            <a href="/esube/giris?mode=register" data-link class="paribu-btn-blue">Hesap Oluştur ${icon("arrow", 18)}</a>
            <a href="/esube/giris" data-link class="paribu-btn-ghost">E-Şubeye Giriş</a>
          </div>
          <div class="paribu-stats-row">
            <div><strong>0 Gecikme</strong><span>Canlı BIST Kotasyonu</span></div>
            <div><strong>Binde 1</strong><span>Düşük Komisyon</span></div>
            <div><strong>Anında</strong><span>Nakit Yükleme &amp; Çekim</span></div>
          </div>
        </div>
        <div class="paribu-hero-right">
          <div class="paribu-trade-card">
            <div class="card-top">
              <span class="badge-live"><span class="blink-dot"></span> BIST CANLI PİYASA</span>
              <span class="brand-code">${brand.name || "PARİBU"}</span>
            </div>
            <div class="selected-stock-row">
              <div class="stock-id">
                <span class="stock-sym">${esc(q0.symbol)}</span>
                <span class="stock-nm">${esc(q0.name)}</span>
              </div>
              <div class="stock-val">
                <strong>${money(q0.price)}</strong>
                <span class="stock-chg ${q0.change_pct >= 0 ? "up" : "down"}">${q0.change_pct >= 0 ? "+" : ""}${number(q0.change_pct)}%</span>
              </div>
            </div>
            <div class="trade-tabs-pill">
              <button class="active">Hızlı Alış</button>
              <button>Hızlı Satış</button>
            </div>
            <div class="quick-input-group">
              <label>İşlem Tutarı (TL)</label>
              <div class="input-wrap">
                <input type="text" value="10.000 TL" readonly />
                <span class="approx">≈ ${Math.floor(10000 / (q0.price || 100))} Adet</span>
              </div>
            </div>
            <a href="/esube/giris" data-link class="paribu-btn-trade-now">Tek Tıkla Hisse Al ${icon("arrow", 16)}</a>
            <div class="secure-label">${icon("shield", 14)} SPK ve Takasbank Güvencesiyle</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Paribu Trending Stocks Strip -->
    <section class="paribu-trending-strip">
      <div class="container">
        <div class="trending-head">
          <span class="kicker">Piyasa Nabzı</span>
          <h2>En Çok İşlem Gören Hisseler</h2>
        </div>
        <div class="paribu-stocks-grid">
          ${heroQuotes.slice(0, 6).map((q) => `
            <a href="/esube/giris" data-link class="paribu-stock-item">
              <div class="stock-main">
                <strong>${esc(q.symbol)}</strong>
                <small>${esc(q.name)}</small>
              </div>
              <div class="stock-numbers">
                <b>${money(q.price)}</b>
                <span class="badge-tag ${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</span>
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    </section>

    <!-- Paribu 4 FinTech Advantages -->
    <section class="section paribu-advantages-section">
      <div class="container">
        <div class="grid grid-3">
          <div class="paribu-card-feature">
            <div class="feature-icon">${icon("activity", 28)}</div>
            <h3>Yüksek Hızlı Emir Motoru</h3>
            <p>Milisaniyeler içinde Borsa İstanbul işlem sistemine iletilen piyasa ve limit emirleri.</p>
          </div>
          <div class="paribu-card-feature">
            <div class="feature-icon">${icon("bank", 28)}</div>
            <h3>7/24 Kesintisiz Para Transferi</h3>
            <p>Anlaşmalı bankalardan saniyeler içinde hesabınıza yansıyan FAST/Havale altyapısı.</p>
          </div>
          <div class="paribu-card-feature">
            <div class="feature-icon">${icon("lock", 28)}</div>
            <h3>Kurumsal Güvenlik ve İki Aşamalı Doğrulama</h3>
            <p>Biyometrik oturum ve SMS/Authenticator şifrelemesiyle hesabınız tam koruma altında.</p>
          </div>
        </div>
      </div>
    </section>
  </main>`;
}

function renderAuraHome() {
  const brand = state.publicConfig?.branding || {};
  const heroQuotes = state.market.filter((item) => (item.asset_class || "stock") === "stock").slice(0, 6);
  return `<main class="public-main theme-aura-view">
    <section class="aura-hero">
      <div class="container aura-hero-inner">
        <div class="aura-crest">
          <img src="/assets/aura-logo.svg" alt="Aura Crest" class="aura-hero-logo" />
        </div>
        <span class="aura-eyebrow">ÖZEL VARLIK YÖNETİMİ &amp; AİLE OFİSİ</span>
        <h1 class="aura-title">AURA ÖZEL PORTFÖY &amp; YATIRIM</h1>
        <p class="aura-subtitle">Özel Bankacılık Standartlarında Ayrıcalıklı Varlık Tahsisi, Nesiller Arası Servet Koruma ve Bağımsız Yatırım Danışmanlığı.</p>
        <div class="aura-cta-row">
          <a href="/esube/giris?mode=register" data-link class="aura-btn-gold">Özel Varlık Danışmanı Talep Edin</a>
          <a href="/esube/giris" data-link class="aura-btn-subtle">VIP Portföy Masası Girişi</a>
        </div>
      </div>
    </section>

    <!-- Aura Wealth Allocation Matrix -->
    <section class="section aura-matrix-section">
      <div class="container">
        <div class="aura-section-head">
          <span class="gold-kicker">Stratejik Dağılım</span>
          <h2>Aura Özel Varlık Tahsis Modeli</h2>
          <p>Yüksek net değerli yatırımcılar için riskten arındırılmış, çoklu varlık sınıfı stratejisi.</p>
        </div>
        <div class="grid grid-4 aura-matrix-grid">
          <div class="aura-matrix-card">
            <div class="matrix-percent">%45</div>
            <h3>BIST VIP Hisse Sepeti</h3>
            <p>Temettü verimi yüksek, ihracat odaklı kurumsal şirketler.</p>
          </div>
          <div class="aura-matrix-card">
            <div class="matrix-percent">%25</div>
            <h3>Gayrimenkul Yatırım Fonları</h3>
            <p>Prime lokasyonlarda kira gelirli ticari varlık portföyleri.</p>
          </div>
          <div class="aura-matrix-card">
            <div class="matrix-percent">%20</div>
            <h3>Kıymetli Madenler &amp; Altın</h3>
            <p>Fiziki saklamalı enflasyon ve döviz dalgalanma kalkanı.</p>
          </div>
          <div class="aura-matrix-card">
            <div class="matrix-percent">%10</div>
            <h3>Likit Arbitraj &amp; Döviz</h3>
            <p>Piyasa dalgalanmalarından bağımsız risksiz likidite getirisi.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Aura Private Tiers -->
    <section class="section aura-tiers-section">
      <div class="container">
        <div class="aura-section-head">
          <span class="gold-kicker">Ayrıcalık Katmanları</span>
          <h2>Kişiye Özel Portföy Segmentleri</h2>
        </div>
        <div class="grid grid-3 aura-tiers-grid">
          <div class="aura-tier-card">
            <div class="tier-badge">BESPOKE PORTFOLIO</div>
            <h3>₺5.000.000+</h3>
            <p class="tier-copy">Bireysel portföy yöneticisi ataması, haftalık detaylı makroekonomik analiz ve özel BIST stratejileri.</p>
            <ul class="tier-features">
              <li>Özel Portföy Yöneticisi</li>
              <li>Haftalık VIP Piyasa Değerlendirmesi</li>
              <li>Komisyon İadesi Avantajı</li>
            </ul>
          </div>
          <div class="aura-tier-card featured">
            <div class="tier-badge-gold">FAMILY OFFICE</div>
            <h3>₺25.000.000+</h3>
            <p class="tier-copy">Aile serveti ve şirketler grubu varlıklarının tek çatı altında konsolidasyonu, vergi ve miras planlaması.</p>
            <ul class="tier-features">
              <li>Kıdemli Fon Yöneticisi &amp; Hukuk Müşaviri</li>
              <li>Özel Girişim Sermayesi Erişimi</li>
              <li>7/24 Konsiyerj Hizmeti</li>
            </ul>
          </div>
          <div class="aura-tier-card">
            <div class="tier-badge">INSTITUTIONAL PRIME</div>
            <h3>₺100.000.000+</h3>
            <p class="tier-copy">Doğrudan BIST eşleşme motoru, blok emir aracılığı ve özel yapılandırılmış türev ürünler.</p>
            <ul class="tier-features">
              <li>Özel Likidite &amp; Blok İşlem Masası</li>
              <li>Sıfır Gecikmeli Doğrudan API</li>
              <li>VIP Kurumsal T+0 Takas Ayrıcalığı</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Aura Concierge Contact -->
    <section class="section aura-concierge-section">
      <div class="container">
        <div class="aura-concierge-card">
          <div class="concierge-text">
            <h2>Özel Varlık Danışmanınız Sizi Bekliyor</h2>
            <p>Zorlu Center Beşiktaş ofisimizde veya dilediğiniz lokasyonda birebir randevu planlayın.</p>
          </div>
          <a href="/iletisim" data-link class="aura-btn-gold">Randevu Oluştur ${icon("arrow", 16)}</a>
        </div>
      </div>
    </section>
  </main>`;
}

function publicHome() {
  const brandName = String(state.publicConfig?.branding?.name || "").toUpperCase();
  if (brandName.includes("ZENITH")) return renderZenithHome();
  if (brandName.includes("AURA")) return renderAuraHome();
  return renderParibuHome();
}

function publicFooter() {
  const brand = state.publicConfig?.branding || {};
  const company = state.publicConfig?.company || {};
  const brandName = esc(brand.name || "Menkul Değerler");
  const brandDesc = esc(brand.descriptor || "Yatırım Platformu");
  const fullUnvan = esc(company.name || `${brand.name || "Menkul"} Değerler A.Ş.`);
  return `<footer class="footer"><div class="container footer-grid"><div class="footer-brand"><a href="/" data-link>${brandLockup()}</a><p>Canlı piyasa, hesap doğrulama, para transferi, emir, portföy ve rapor yönetimi için kurumsal yatırım platformu.</p></div><div><h4>Kurumsal</h4><ul><li><a href="/hakkimizda" data-link>Hakkımızda</a></li><li><a href="/hizmetlerimiz" data-link>Hizmetlerimiz</a></li><li><a href="/iletisim" data-link>İletişim</a></li></ul></div><div><h4>Yatırımcı</h4><ul><li><a href="/komisyon-ucretler" data-link>Komisyonlar</a></li><li><a href="/blog" data-link>Blog & Analiz</a></li><li><a href="/sss" data-link>Sık Sorulan Sorular</a></li></ul></div><div><h4>E-Şube</h4><ul><li><a href="/esube/giris" data-link>Giriş Yap</a></li><li><a href="/esube/giris?mode=register" data-link>Hesap Oluştur</a></li><li><a href="/esube/stocks" data-link>Piyasalar</a></li></ul></div></div><div class="container footer-bottom"><span>© 2026 ${fullUnvan}</span><span>Yatırım işlemleri risk içerir. Kararlarınızı kendi değerlendirmelerinizle verin.</span></div></footer>`;
}

function publicInfoPage(title, copy, items) {
  const brand = state.publicConfig?.branding || {};
  return `<main><section class="page-hero"><div class="container"><span class="eyebrow">${esc(brand.name || "Kurumsal")} ${esc(brand.descriptor || "Menkul Değerler")}</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></div></section><section class="section"><div class="container grid grid-3">${items.map((item) => `<article class="service-card">${icon("check")}<h3>${esc(item)}</h3><p>Yatırım ve para işlemleri güvenli onay adımlarıyla takip edilir.</p></article>`).join("")}</div></section></main>`;
}

function publicAboutPage() {
  const company = state.publicConfig?.company || {};
  const brand = state.publicConfig?.branding || {};
  const facts = [["Ticaret Unvanı", company.name || `${brand.name || "Menkul"} Değerler A.Ş.`], ["Ticaret Sicil No", company.registry_number], ["MERSİS No", company.mersis_number], ["Faaliyet Yetkisi", company.license_text], ["Merkez Adresi", company.address], ["Telefon", company.phone], ["E-posta", company.email]];
  const complete = state.publicConfig?.company_information_complete;
  return `<main><section class="page-hero compact-public-hero"><div class="container"><span class="eyebrow">${esc(brand.name || "Kurumsal")}</span><h1>Hakkımızda</h1><p>${esc(company.name || brand.name || "Kurum")} resmi şirket ve faaliyet bilgileri.</p></div></section><section class="section"><div class="container"><div class="content-card corporate-facts"><div class="toolbar"><div><h2>Şirket Bilgileri</h2><p class="muted">Resmi kayıtlara esas bilgiler</p></div><span class="status ${complete ? "ok" : "warn"}">${complete ? "Yayımlandı" : "Bilgi bekleniyor"}</span></div><dl>${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value || "Henüz yayımlanmadı")}</dd></div>`).join("")}</dl>${complete ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Eksik kurumsal alanlar yönetim panelinden doğrulanmış bilgilerle tamamlanmalıdır.</span></div>`}</div></div></section></main>`;
}

function legalPage(title, copy) {
  const company = state.publicConfig?.company || {};
  const controller = company.name || "Resmi ticaret unvanı henüz yayımlanmadı";
  const contact = company.email || "Kurumsal e-posta henüz yayımlanmadı";
  const legalSections = title.startsWith("KVKK") ? [
    ["Veri Sorumlusu", `${controller}, hesap açılışı ve e-şube işlemleri kapsamında veri sorumlusu olarak hareket eder. İletişim kanalı: ${contact}.`],
    ["İşlenen Veri Kategorileri", "Kimlik, iletişim, müşteri işlem, finans, hesap güvenliği, oturum ve kimlik doğrulama belgeleri; yalnızca ilgili işlem için gerekli kapsamda işlenir."],
    ["İşleme Amaçları", "Hesap başvurusunun değerlendirilmesi, kimlik ve işlem güvenliğinin sağlanması, emir ve para taleplerinin kaydı, destek taleplerinin yanıtlanması ve yasal saklama yükümlülüklerinin yerine getirilmesi."],
    ["Toplama Yöntemi ve Hukuki Sebep", "Veriler elektronik formlar, belge yüklemeleri, oturum kayıtları ve hesap hareketleri üzerinden toplanır. İşleme; sözleşmenin kurulması veya ifası, hukuki yükümlülük, hakkın tesisi ve meşru menfaat şartlarına; gerektiği durumlarda ayrıca alınan açık rızaya dayanır."],
    ["Aktarım", "Veriler yalnızca işlem için gerekli olduğunda yetkili kamu kurumları, saklama ve denetim kuruluşları, bankalar ve sözleşmeli teknik hizmet sağlayıcılarla mevzuata uygun biçimde paylaşılabilir."],
    ["Haklarınız", "6698 sayılı Kanun'un 11. maddesindeki bilgi alma, düzeltme, silme veya yok etme, aktarılan üçüncü kişilere bildirim, itiraz ve zararın giderilmesini talep etme haklarınızı kurumsal iletişim kanalından kullanabilirsiniz."],
  ] : title.startsWith("Mesafeli") ? [
    ["Taraflar ve Hizmet", `${controller} tarafından sunulan dijital hesap, piyasa görüntüleme, talep, emir, portföy ve raporlama hizmetlerinin kapsamı; onaylı faaliyet yetkisi ve yayımlanan ücret tarifesiyle sınırlıdır.`],
    ["Elektronik Kayıtlar", "Başvuru, sözleşme sürümü, zaman, oturum, talep, emir ve onay kayıtları uyuşmazlık ve denetim süreçleri için saklanır. Kullanıcı işlem özetini onaylamadan emir gönderilmez."],
    ["Ücretler", "Komisyon ve masraflar işlem onayından önce gösterilir. Yayımlanmamış veya doğrulanmamış bir ücret tarifesiyle işlem açılmamalıdır."],
    ["Talep ve İptal", "Bekleyen limit emirleri ile uygun durumdaki para çekme talepleri e-şubeden iptal edilebilir. Gerçekleşmiş piyasa işlemleri ve tamamlanmış finansal kayıtlar geriye dönük silinmez."],
    ["Güvenlik ve Sorumluluk", "Kullanıcı giriş bilgilerini korumak, şüpheli oturumu bildirmek ve iletişim bilgilerini güncel tutmakla yükümlüdür. Kurum, kritik yönetim işlemlerini yeniden doğrulama ve denetim kaydıyla yürütür."],
  ] : [
    ["Piyasa Riski", "Sermaye piyasası araçlarının fiyatı yükselebilir veya düşebilir; anaparanın tamamı kaybedilebilir. Geçmiş performans gelecek sonuçların göstergesi değildir."],
    ["Emir Riski", "Piyasa emri sunucu tarafından doğrulanan güncel fiyatla değerlendirilir. Limit emir kısmen gerçekleşebilir, hiç gerçekleşmeyebilir veya iptal edilebilir. Veri kaynağı doğrulanamadığında yeni işlem kapatılır."],
    ["Likidite ve Takas", "Düşük likidite, fiyat farkı ve işlem kesintileri emrin beklenen fiyattan gerçekleşmesini engelleyebilir. Satış tutarının çekilebilir bakiyeye geçişi yürürlükteki takas sürecine tabidir."],
    ["Ücret ve Vergi", "Komisyon, banka masrafı ve yasal kesintiler net getiriyi azaltabilir. Emir ekranındaki tahmini ücret ile sunucu tarafından kaydedilen kesin işlem özeti birlikte incelenmelidir."],
    ["Uygunluk", "Bilgi, deneyim, işlem sıklığı, yatırım amacı, vade, gelir istikrarı ve kayıp toleransı yanıtları risk profilinin oluşturulmasında kullanılır. Profil bir getiri taahhüdü veya yatırım tavsiyesi değildir."],
  ];
  const sourceUrl = title.startsWith("KVKK") ? "https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-" : title.startsWith("Yatırım") ? "https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar/uygunluk-ve-yerindelik-testleri" : "https://spk.gov.tr/yatirimcilar";
  return `<main><section class="page-hero compact-public-hero"><div class="container"><span class="eyebrow">Yasal Metin</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></div></section><section class="section"><article class="container legal-document">${legalSections.map(([heading, text]) => `<section><h2>${esc(heading)}</h2><p>${esc(text)}</p></section>`).join("")}<h2>Okuma, Onay ve Kayıt</h2><p>KVKK metni için okundu ve bilgilendirildi kaydı; sözleşme ve risk bildirimi için onay kaydı metin sürümü, tarih ve bağlantı bilgisiyle saklanır. Açık rıza gereken işlemler bu aydınlatmadan ayrı alınır.</p><h2>Başvuru ve Resmi Kaynak</h2><p>Veri ve sözleşme taleplerinizi İletişim sayfasından iletebilirsiniz. <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">İlgili resmi bilgilendirmeyi açın ${icon("external", 15)}</a></p></article></section></main>`;
}

function publicFeesPage() {
  const fees = state.publicConfig?.fees || {};
  const rows = [["Hisse alış/satış komisyonu", fees.configured ? `%${number(fees.stock_commission_rate_percent)}` : "Henüz yayımlanmadı"], ["Asgari komisyon", fees.configured ? money(fees.minimum_commission) : "Henüz yayımlanmadı"], ["Para yatırma", "Kurum ücreti: 0 TL"], ["Para çekme", "Banka masrafı uygulanabilir"]];
  return `<main><section class="page-hero compact-public-hero"><div class="container"><h1>Komisyon ve Ücretler</h1><p>Emir onayından önce gösterilen güncel ücret tarifesi.</p></div></section><section class="section"><div class="container"><div class="content-card fee-table"><div class="table-wrap"><table><thead><tr><th>Hizmet</th><th>Uygulanan Ücret</th></tr></thead><tbody>${rows.map(([a,b]) => `<tr><td>${a}</td><td><strong>${b}</strong></td></tr>`).join("")}</tbody></table></div>${fees.configured ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Hisse işlemleri, doğrulanmış komisyon tarifesi yayımlanana kadar açılmamalıdır.</span></div>`}</div></div></section></main>`;
}

function publicBlogPage() {
  const articles = [["T+2 Takas Süreci", "Satış tutarının işlem ve çekim bakiyesine geçişini anlayın.", "https://www.borsaistanbul.com/tr/sayfa/227/takas-ve-saklama"], ["Emir Türleri", "Piyasa ve limit emrin fiyat davranışını karşılaştırın.", "https://www.borsaistanbul.com/tr/sayfa/141/pay-piyasasi"], ["Yatırımcı Bilgi Merkezi", "SPK düzenlemeleri ve yatırımcı duyurularını izleyin.", "https://spk.gov.tr/yatirimcilar"]];
  return `<main><section class="page-hero compact-public-hero"><div class="container"><h1>Yatırımcı Bilgi Merkezi</h1><p>Resmi kaynaklarla temel piyasa ve işlem bilgileri.</p></div></section><section class="section"><div class="container grid grid-3">${articles.map(([title, copy, href]) => `<a class="service-card article-link" href="${href}" target="_blank" rel="noopener noreferrer"><span class="service-icon">${icon("file")}</span><h3>${title}</h3><p>${copy}</p><span class="text-link">Resmi kaynağı aç ${icon("external", 15)}</span></a>`).join("")}</div></section></main>`;
}

function publicFaqPage() {
  const items = ["Kayıt ne zaman onaylanır?", "Para yatırma talebi nasıl işlenir?", "Satış tutarı ne zaman bakiyeme geçer?", "Onay olmadan işlem yapılabilir mi?"];
  return `<main><section class="page-hero"><div class="container"><h1>SSS</h1><p>En sık sorulan işlem, onay ve transfer soruları.</p></div></section><section class="section"><div class="container list">${items.map((x) => `<article class="request-row"><div><strong>${x}</strong><p class="muted">E-şube içindeki işlemler onay süreciyle ilerler.</p></div>${icon("arrow")}</article>`).join("")}</div></section></main>`;
}

function publicContactPage() {
  const company = state.publicConfig?.company || {};
  return `<main><section class="page-hero compact-public-hero"><div class="container"><h1>İletişim</h1><p>Talebinizi referans numarasıyla kayıt altına alın.</p></div></section><section class="section"><div class="container grid grid-2"><form class="content-card" id="contact-form"><div class="field-grid"><label class="field"><span>Ad Soyad</span><input name="full_name" autocomplete="name" required /></label><label class="field"><span>E-posta</span><input name="email" type="email" autocomplete="email" required /></label><label class="field"><span>Telefon</span><input name="phone" autocomplete="tel" /></label><label class="field"><span>Konu</span><select name="subject"><option>Hesap Açılışı</option><option>Para Transferi</option><option>Emir ve Portföy</option><option>Diğer</option></select></label><label class="field full"><span>Mesaj</span><textarea name="message" minlength="10" required></textarea></label></div><button type="submit" class="primary-button" style="margin-top:16px;">${icon("check")} Talep Oluştur</button></form><div class="content-card contact-details"><h2>Kurumsal İletişim</h2><p><strong>Adres</strong><span>${esc(company.address || "Henüz yayımlanmadı")}</span></p><p><strong>Telefon</strong><span>${esc(company.phone || "Henüz yayımlanmadı")}</span></p><p><strong>E-posta</strong><span>${esc(company.email || "Henüz yayımlanmadı")}</span></p></div></div></section></main>`;
}

function marketCard() {
  const first = state.market[0] || { symbol: "AKBNK", price: 0, change_pct: 0 };
  const highlights = state.market.slice(0, 5);
  return `<div class="hero-card market-card"><div class="market-card-glow" aria-hidden="true"></div><h3>Canlı Piyasa</h3><strong>${esc(first.symbol)}</strong><div class="hero-price">${money(first.price)}</div><span class="${first.change_pct >= 0 ? "up" : "down"}">${first.change_pct >= 0 ? "+" : ""}${number(first.change_pct)}%</span><div class="price-sparkline" aria-hidden="true"><i></i><i></i><i></i></div><div class="mini-market-list">${highlights.map((q) => `<span><b>${esc(q.symbol)}</b><em class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</em></span>`).join("")}</div></div>`;
}

function renderAuth() {
  const form = state.authMode === "register" ? registerForm() : state.authMode === "forgot" ? forgotPasswordForm() : state.authMode === "reset" ? resetPasswordForm() : loginForm();
  app.innerHTML = `<main class="auth-shell theme-${state.theme}"><div class="auth-ticker">${marketRail()}</div><button class="theme-floating-button" type="button" data-theme-toggle>${icon(state.theme === "dark" ? "sun" : "moon", 17)} ${state.theme === "dark" ? "Açık Mod" : "Koyu Mod"}</button><section class="auth-card enhanced-auth"><div class="auth-brand">${brandLockup()}</div><div class="auth-intro"><span>E-ŞUBE</span><h1>Yatırım hesabınıza giriş yapın</h1><p>Portföyünüzü, emirlerinizi ve hesap hareketlerinizi güvenli oturum üzerinden yönetin.</p></div><div class="auth-panel"><div class="segmented"><button class="${state.authMode === "login" ? "active" : ""}" data-auth-mode="login">${icon("user", 16)} Giriş Yap</button><button class="${state.authMode === "register" ? "active" : ""}" data-auth-mode="register">${icon("file", 16)} Hesap Oluştur</button></div>${form}</div></section></main>`;
}

function renderAuthV2() {
  if (state.authMode !== "login") {
    renderAuth();
    return;
  }
  app.innerHTML = `<main class="auth-shell auth-shell-v2 paribu-auth theme-${state.theme}"><section class="paribu-login-frame"><div class="paribu-security-note">${icon("shield", 15)} Güvenli E-Şube</div><header class="mobile-login-brand"><img class="auth-brand-logo" src="/assets/paribu-logo.svg" alt="Minder Ottoman" /><div><strong>MINDER</strong><span>OTTOMAN</span></div><p>Yatırım hesabınıza hoş geldiniz</p></header><form id="login-form" class="mobile-login-form"><label class="auth-input"><span>T.C. Kimlik / Müşteri No</span><input name="tc" inputmode="numeric" maxlength="11" autocomplete="username" placeholder="11 haneli numaranız" required /></label><label class="auth-input"><span>Şifre</span><span class="password-wrap"><input name="password" type="${state.showPassword ? "text" : "password"}" autocomplete="current-password" placeholder="Şifreniz" required /><button type="button" class="icon-button" data-toggle-password aria-pressed="${state.showPassword}" aria-label="${state.showPassword ? "Şifreyi gizle" : "Şifreyi göster"}">${icon(state.showPassword ? "eyeOff" : "eye", 18)}</button></span></label><div class="mobile-login-options"><label><input name="remember" type="checkbox" /> Beni hatırla</label><button type="button" class="text-link" data-auth-mode="forgot">Şifremi unuttum</button></div><button class="primary-button login-submit" type="submit">Giriş Yap ${icon("arrow", 17)}</button></form><footer class="mobile-login-footer"><button type="button" data-auth-mode="register">Yeni hesap aç</button><span></span><a href="/" data-link>Kurumsal site</a><div><button type="button">${icon("user", 14)} 0850 303 60 00</button></div></footer></section></main>`;
}

function loginForm() {
  return `<form id="login-form" class="grid"><label class="field"><span>TC Kimlik No</span><input name="tc" inputmode="numeric" maxlength="11" autocomplete="username" required /></label><label class="field password-field"><span>Şifre</span><div class="password-wrap"><input name="password" type="${state.showPassword ? "text" : "password"}" autocomplete="current-password" required /><button type="button" class="icon-button" data-toggle-password aria-pressed="${state.showPassword}" aria-label="${state.showPassword ? "Şifreyi gizle" : "Şifreyi göster"}">${icon(state.showPassword ? "eyeOff" : "eye", 18)}</button></div></label><div class="login-options"><label class="remember-row"><input name="remember" type="checkbox" /> <span>Beni Hatırla</span></label><button type="button" class="text-link" data-auth-mode="forgot">Şifremi Unuttum</button></div><button class="primary-button" type="submit">${icon("shield")} Giriş Yap</button></form>`;
}

function forgotPasswordForm() {
  return `<form id="forgot-password-form" class="grid auth-secondary-form"><div><h2>Şifrenizi yenileyin</h2><p class="muted">Hesabınızdaki TC kimlik numarası ve e-posta adresini girin.</p></div><label class="field"><span>TC Kimlik No</span><input name="tc" inputmode="numeric" maxlength="11" required /></label><label class="field"><span>E-posta</span><input name="email" type="email" autocomplete="email" required /></label><button class="primary-button" type="submit">${icon("file")} Yenileme Bağlantısı Gönder</button><button class="text-link" type="button" data-auth-mode="login">Girişe Dön</button></form>`;
}

function resetPasswordForm() {
  return `<form id="reset-password-form" class="grid auth-secondary-form"><div><h2>Yeni şifre belirleyin</h2><p class="muted">En az 10 karakter, büyük/küçük harf ve rakam kullanın.</p></div><label class="field"><span>Yeni Şifre</span><input name="new_password" type="password" minlength="10" autocomplete="new-password" required /></label><button class="primary-button" type="submit">${icon("lock")} Şifreyi Yenile</button></form>`;
}

function registerForm() {
  const riskOption = `<option value="0">Düşük</option><option value="1">Sınırlı</option><option value="2">Orta</option><option value="3">Yüksek</option>`;
  const identityFields = `<div class="field-grid"><label class="field"><span>Ad Soyad</span><input name="full_name" autocomplete="name" required /></label><label class="field"><span>TC Kimlik No</span><input name="tc" inputmode="numeric" pattern="[1-9][0-9]{10}" minlength="11" maxlength="11" required /></label><label class="field"><span>Telefon</span><input name="phone" autocomplete="tel" required /></label><label class="field"><span>E-posta <small>isteğe bağlı</small></span><input name="email" type="email" autocomplete="email" /></label><label class="field"><span>Şehir</span><input name="city" required /></label><label class="field"><span>İlçe</span><input name="district" required /></label><label class="field"><span>Doğum Tarihi</span><input name="birth_date" type="date" required /></label><label class="field"><span>Şifre</span><input name="password" type="password" minlength="10" autocomplete="new-password" aria-describedby="password-policy" required /><small id="password-policy">En az 10 karakter, büyük/küçük harf ve rakam.</small></label><label class="field full"><span>Adres</span><textarea name="address" required></textarea></label></div>`;
  const suitabilityFields = `<fieldset class="suitability-fieldset"><legend>Yatırım Uygunluk Değerlendirmesi</legend><div class="field-grid"><label class="field"><span>Eğitim durumu</span><select name="education" required><option value="">Seçin</option><option>İlköğretim</option><option>Lise</option><option>Ön lisans / Lisans</option><option>Lisansüstü</option></select></label><label class="field"><span>Meslek</span><input name="occupation" maxlength="80" required /></label><label class="field"><span>Daha önce işlem yaptığınız ürünler</span><select name="traded_products" required><option value="">Seçin</option><option>İşlem deneyimim yok</option><option>Hisse senedi / Fon</option><option>Türev ürünler</option><option>Birden fazla ürün grubu</option></select></label><label class="field"><span>Yatırım amacı</span><select name="investment_goal" required><option value="">Seçin</option><option>Sermayeyi koruma</option><option>Düzenli gelir</option><option>Uzun vadeli büyüme</option><option>Kısa vadeli getiri</option></select></label><label class="field"><span>Piyasa deneyiminiz</span><select name="risk_experience" required>${riskOption}</select></label><label class="field"><span>İşlem sıklığınız</span><select name="trade_frequency" required>${riskOption}</select></label><label class="field"><span>Ürün bilginiz</span><select name="knowledge_level" required>${riskOption}</select></label><label class="field"><span>Yatırım vadeniz</span><select name="risk_horizon" required>${riskOption}</select></label><label class="field"><span>Kayıp toleransınız</span><select name="risk_loss" required>${riskOption}</select></label><label class="field"><span>Gelir istikrarınız</span><select name="risk_income" required>${riskOption}</select></label></div></fieldset>`;
  const agreementFields = `<div class="agreement-list"><label><input type="checkbox" name="accept_kvkk" value="1" required /><span><a href="/kvkk" data-link>KVKK Aydınlatma Metni</a>'ni okudum ve bilgilendirildim.</span></label><label><input type="checkbox" name="accept_distance_contract" value="1" required /><span><a href="/mesafeli-sozlesme" data-link>Mesafeli Sözleşme</a>'yi kabul ediyorum.</span></label><label><input type="checkbox" name="accept_risk_disclosure" value="1" required /><span><a href="/risk-bildirimi" data-link>Risk Bildirim Formu</a>'nu okudum.</span></label></div>`;
  return `<form id="register-form" class="grid register-wizard"><div class="kyc-steps" aria-label="Hesap açılış adımları"><button type="button" class="active" data-register-step="1" aria-current="step">${icon("user", 15)} Bilgiler</button><button type="button" data-register-step="2" disabled>${icon("shield", 15)} Uygunluk</button><button type="button" data-register-step="3" disabled>${icon("file", 15)} Sözleşmeler</button></div><section class="register-panel" data-register-panel="1">${identityFields}<div class="register-actions"><button class="primary-button" type="button" data-register-next="2">Devam Et ${icon("arrow", 17)}</button></div></section><section class="register-panel" data-register-panel="2" hidden>${suitabilityFields}<div class="register-actions"><button class="ghost-button" type="button" data-register-back="1">Geri</button><button class="primary-button" type="button" data-register-next="3">Devam Et ${icon("arrow", 17)}</button></div></section><section class="register-panel" data-register-panel="3" hidden>${agreementFields}<div class="register-actions"><button class="ghost-button" type="button" data-register-back="2">Geri</button><button class="primary-button" type="submit">${icon("clock")} Başvuruyu Oluştur</button></div></section></form>`;
}

function mobileHeaderBar() {
  const meta = {
    "/esube": ["Paribu Yatırım", "home"],
    "/esube/stocks": ["Piyasalar", "chart"],
    "/esube/trade": [state.orderSide === "buy" ? "Alış Emri" : "Satış Emri", "activity"],
    "/esube/portfolio": ["Portföy", "wallet"],
    "/esube/news": ["Bildirimler", "news"],
    "/esube/transactions": ["Geçmiş İşlemler", "file"],
    "/esube/money": ["Para İşlemleri", "bank"],
    "/esube/profile": ["Hesap", "user"],
    "/esube/orders": ["Emirlerim", "file"],
    "/esube/notifications": ["Bildirimler", "bell"],
    "/esube/favorites": ["Takip Listem", "star"],
    "/esube/support": ["Referans", "message"],
    "/esube/profile/overview": ["Hesap", "user"],
    "/esube/profile/security": ["Güvenlik", "shield"],
    "/esube/profile/identity": ["Kimlik Bilgilerim", "id"],
    "/esube/profile/documents": ["Belgelerim", "file"],
    "/esube/portfolio/holdings": ["Elde Olanlar", "wallet"],
    "/esube/portfolio/sold": ["Satılanlar", "download"],
    "/esube/portfolio/history": ["Geçmiş İşlemler", "clock"],
  }[state.path] || ["Paribu Yatırım", "home"];
  const isHome = state.path === "/esube";
  const quietHeader = !isHome;
  const actions = state.path === "/esube/trade"
    ? `<button type="button" class="icon-button" aria-label="Yardım">${icon("help", 24)}</button><a href="/esube/news" data-link class="icon-button" aria-label="Bildirimler">${icon("news", 24)}<span class="notice-dot"></span></a>`
    : state.path === "/esube/profile"
      ? `<button type="button" class="icon-button" data-search-open aria-label="Ara">${icon("search", 24)}</button><button type="button" class="icon-button" aria-label="Yardım">${icon("help", 24)}</button>`
      : quietHeader ? "" : `<button type="button" class="icon-button" data-search-open aria-label="Ara">${icon("search", 24)}</button><a href="/esube/news" data-link class="icon-button" aria-label="Bildirimler">${icon("news", 24)}<span class="notice-dot"></span></a>${state.path === "/esube/portfolio" ? `<button type="button" class="icon-button" aria-label="Filtre">${icon("settings", 23)}</button>` : ""}`;
  return `<header class="mobile-app-header ${quietHeader ? "quiet" : ""}"><div class="mobile-brand-title">${isHome ? "" : `<button type="button" class="mobile-back" data-mobile-back aria-label="Geri">${icon("arrow", 22)}</button>`}<div>${isHome ? `<small>09:41</small>` : ""}<h1>${esc(meta[0])}</h1></div></div><div class="mobile-header-actions">${actions}</div></header>`;
}

function appLayout(content, admin = false) {
  const logoutButton = admin ? `<button class="ghost-button" type="button" data-action="logout">${icon("arrow", 17)} <span>Çıkış</span></button>` : "";
  const themeButton = `<button class="ghost-button theme-toggle" type="button" data-theme-toggle>${icon(state.theme === "dark" ? "sun" : "moon", 17)} <span>${state.theme === "dark" ? "Açık" : "Koyu"}</span></button>`;
  const accountChip = `<span class="account-chip">${icon("user", 17)}<span><strong>${esc(state.me?.full_name || "Hesabım")}</strong><small>${esc(state.account?.account_no || state.me?.account_no || "")}</small></span></span>`;
  if (!admin) content = mobileHeaderBar() + content;
  return `<main class="workspace green-workspace theme-${state.theme}"><header class="app-topbar"><div class="app-topbar-inner"><a href="${admin ? "/esube/admin" : "/esube"}" data-link class="app-brand">${brandLockup(true)}</a><div class="app-topbar-actions"><button class="ghost-button" type="button" data-search-open aria-label="Hisse ara">${icon("search", 18)} <span>Ara</span></button>${themeButton}<span class="status ok">${icon("check", 14)} ${esc(state.me?.status_label || "Onaylı")}</span>${accountChip}${logoutButton}</div></div></header><div class="${admin ? "admin-layout" : "app-shell"}"><aside class="sidebar"><a href="${admin ? "/esube/admin" : "/esube"}" data-link class="sidebar-brand">${brandLockup()}</a>${renderSidebarNav(admin)}${admin ? riskMini() : `<div class="approval-mini">${icon("activity")}<strong>Piyasa ve portföy</strong><span>Hızlı işlemler tek çalışma alanında.</span></div>`}</aside><section class="app-main">${content}</section></div>${bottomNav(admin)}${admin ? adminMobileMenu() : ""}${searchOverlay()}${companyDetailModal()}${quickTradeModal()}${documentPreviewModal()}</main>`;
}

function navLink([label, href, ico]) {
  return `<a href="${href}" data-link class="${active(href)}">${icon(ico, 18)}<span>${label}</span></a>`;
}

function userNav() {
  return [["Ana Sayfa", "/esube", "home"], ["Piyasalar", "/esube/stocks", "chart"], ["Al / Sat", "/esube/trade", "activity"], ["Portföyüm", "/esube/portfolio", "wallet"], ["Emirlerim", "/esube/orders", "file"], ["Para İşlemleri", "/esube/money", "bank"], ["Bildirimler", "/esube/notifications", "bell"], ["Takip Listem", "/esube/favorites", "star"], ["Referans", "/esube/support", "message"], ["Hesabım", "/esube/profile", "user"]];
}

function adminNavGroups() {
  return [
    {
      title: "Genel Merkez",
      items: [
        ["Özet Masası", "/esube/admin", "home"],
        ["Görsel Tasarımcı (Elementor)", "/esube/admin/builder", "layout"],
        ["Uygulama Stüdyosu", "/esube/admin/studio", "settings"],
        ["Raporlar & Mutabakat", "/esube/admin/reports", "file"]
      ]
    },
    {
      title: "Müşteri & Portföy",
      items: [
        ["Müşteri Listesi", "/esube/admin/users", "user"],
        ["Onay Bekleyenler", "/esube/admin/verifications", "clock"],
        ["Portföy Pozisyonları", "/esube/admin/portfolios", "wallet"],
        ["Bakiye & Limitler", "/esube/admin/user-balances", "bank"]
      ]
    },
    {
      title: "Operasyon & Borsa",
      items: [
        ["Emir Defteri", "/esube/admin/orders", "chart"],
        ["İşlem Günlüğü", "/esube/admin/transactions", "file"],
        ["Satış Bakiyesi (T+2)", "/esube/admin/t2-settlements", "calendar"],
        ["Hisse Bülteni", "/esube/admin/stock-descriptions", "file"]
      ]
    },
    {
      title: "Finans & Banka",
      items: [
        ["Para Yatırma Talepleri", "/esube/admin/deposit-requests", "upload"],
        ["Bakiye Yükleme", "/esube/admin/deposits", "download"],
        ["Para Çekme (EFT)", "/esube/admin/withdrawals", "download"],
        ["Banka Hesapları", "/esube/admin/bank-accounts", "bank"],
        ["Kredi Başvuruları", "/esube/admin/credit-applications", "shield"]
      ]
    },
    {
      title: "Sistem & Güvenlik",
      items: [
        ["Sistem Ayarları", "/esube/admin/settings", "settings"],
        ["Kredi & Faiz Ayarları", "/esube/admin/credit-settings", "settings"]
      ]
    }
  ];
}

function adminNav() {
  return adminNavGroups().flatMap((g) => g.items);
}

function renderSidebarNav(admin) {
  if (!admin) return `<nav class="side-nav">${userNav().map(navLink).join("")}</nav>`;
  return `<nav class="side-nav admin-side-nav">${adminNavGroups().map((group) => `<div class="nav-group-section"><span class="nav-group-title">${esc(group.title)}</span><div class="nav-group-items">${group.items.map(navLink).join("")}</div></div>`).join("")}</nav>`;
}

function bottomNav(admin) {
  if (admin) {
    const nav = [["Özet", "/esube/admin", "home"], ["Kullanıcı", "/esube/admin/users", "user"], ["Emir", "/esube/admin/orders", "chart"], ["Para", "/esube/admin/money", "bank"]];
    return `<nav class="bottom-nav admin-bottom-nav" aria-label="Yönetim hızlı menüsü">${nav.map(navLink).join("")}<button type="button" data-admin-menu aria-expanded="${state.adminMenuOpen}" aria-label="Tüm yönetim modüllerini aç">${icon("menu", 18)}<span>Tümü</span></button></nav>`;
  }
  const nav = [["Ana Sayfa", "/esube", "home"], ["Piyasalar", "/esube/stocks", "chart"], ["Portföy", "/esube/portfolio", "wallet"], ["Emir", "/esube/trade", "file"], ["Hesap", "/esube/profile", "user"]];
  return `<nav class="bottom-nav">${nav.map(navLink).join("")}</nav>`;
}

function adminMobileMenu() {
  if (!state.adminMenuOpen) return "";
  return `<div class="admin-menu-backdrop" data-admin-menu-close><section class="admin-mobile-menu" role="dialog" aria-modal="true" aria-labelledby="admin-mobile-menu-title" data-modal-stop><div class="toolbar compact"><div><small>KURUMSAL YÖNETİM MERKEZİ</small><h2 id="admin-mobile-menu-title">Tüm Modüller</h2></div><button type="button" class="icon-button" data-admin-menu-close aria-label="Yönetim menüsünü kapat">${icon("close", 20)}</button></div><div class="admin-mobile-nav-groups">${adminNavGroups().map((group) => `<div class="mobile-nav-group"><span class="mobile-nav-group-title">${esc(group.title)}</span><div class="mobile-nav-group-items">${group.items.map(navLink).join("")}</div></div>`).join("")}</div></section></div>`;
}

function globalSearchResultsHtml() {
  const q = state.searchQuery.toLocaleLowerCase("tr-TR");
  const results = state.market.filter((x) => (x.asset_class || "stock") === "stock" && `${x.symbol} ${x.name}`.toLocaleLowerCase("tr-TR").includes(q)).slice(0, 12);
  return results.map((x) => `<button type="button" class="request-row search-result" data-search-stock="${esc(x.symbol)}"><div class="market-identity">${stockLogo(x.symbol, x.name)}<span><strong>${esc(x.symbol)}</strong><p class="muted">${esc(x.name)}</p></span></div><div><strong>${money(x.price)}</strong><span class="${x.change_pct >= 0 ? "up" : "down"}">${x.change_pct >= 0 ? "+" : ""}${number(x.change_pct)}%</span></div></button>`).join("") || `<div class="empty-state">Hisse bulunamadı.</div>`;
}

function searchOverlay() {
  if (!state.searchOpen) return "";
  return `<div class="modal-backdrop open" data-search-close><div class="modal search-modal" data-modal-stop><div class="toolbar"><h2>Hisse Ara</h2><button type="button" class="small-button" data-search-close>Kapat</button></div><input class="search-box wide" data-global-search value="${esc(state.searchQuery)}" placeholder="Hisse kodu veya adı..." autofocus /><div class="list" data-global-search-results style="margin-top:14px;">${globalSearchResultsHtml()}</div></div></div>`;
}

function orderEntryFields(quote, availableQty, account, includeSymbolSelect = false) {
  const isBuy = state.orderSide === "buy";
  const cashMode = isBuy && state.orderAmountMode === "cash";
  const symbolField = includeSymbolSelect ? `<label class="field"><span>Hisse</span><select name="symbol" data-order-symbol>${state.market.filter((q) => (q.asset_class || "stock") === "stock").map((q) => `<option value="${esc(q.symbol)}" ${q.symbol === quote.symbol ? "selected" : ""}>${esc(q.symbol)} - ${esc(q.name).slice(0, 42)}</option>`).join("")}</select></label>` : "";
  const modeButtons = isBuy ? `<div class="segmented compact-segmented order-mode"><button type="button" class="${cashMode ? "active" : ""}" data-order-amount-mode="cash">TL ile Al</button><button type="button" class="${!cashMode ? "active" : ""}" data-order-amount-mode="quantity">Adet ile Al</button></div>` : "";
  const quantityLimits = isBuy ? `value="100"` : `value="1" max="${Math.max(1, Number(availableQty || 0))}"`;
  const amountField = cashMode ? `<label class="field"><span>Alınacak Tutar</span><input name="cash_amount" type="number" step="0.01" min="1" placeholder="Örn. 10.000 TL" required /></label>` : `<label class="field"><span>Adet</span><input name="quantity" type="number" min="1" ${quantityLimits} required /></label>`;
  const tradingBalance = Number(account.cash_balance || 0) + Number(account.pending_balance || 0);
  return `${modeButtons}<input type="hidden" name="amount_mode" value="${cashMode ? "cash" : "quantity"}" /><div class="field-grid order-field-grid">${symbolField}${amountField}<label class="field"><span>Emir Tipi</span><select name="order_type" data-order-type><option value="market">Piyasa</option><option value="limit">Limit</option></select></label><label class="field"><span data-price-label>Piyasa Fiyatı</span><input name="limit_price" data-order-price type="number" step="0.01" min="0.01" value="${Number(quote.price || 0).toFixed(2)}" readonly aria-readonly="true" required /></label><label class="field checkbox-field full" data-limit-only hidden><input name="cancel_remaining" type="checkbox" /> Gerçekleşmeyen kısmı iptal et</label></div><div class="order-preview"><span>${isBuy ? `İşlem bakiyesi <small>Çekilebilir ${money(account.cash_balance)} · T+2 ${money(account.pending_balance)}</small>` : "Satılabilir adet"}</span><strong>${isBuy ? money(tradingBalance) : number(availableQty)}</strong></div><div class="trade-estimate" data-order-estimate>${orderEstimateHtml({ symbol: quote.symbol, order_type: "market", amount_mode: cashMode ? "cash" : "quantity", quantity: cashMode ? 0 : quantityLimits.match(/value="(\d+)"/)?.[1], cash_amount: 0, limit_price: quote.price })}</div>`;
}

function orderEstimate(form) {
  const quote = state.market.find((item) => item.symbol === form.symbol) || {};
  const price = Number(form.order_type === "market" ? quote.price : form.limit_price || quote.price || 0);
  const requestedCash = Number(form.cash_amount || 0);
  const fees = state.publicConfig?.fees || {};
  const feeFor = (value) => fees.configured && value > 0 ? Math.max(Number(fees.minimum_commission || 0), value * Number(fees.stock_commission_rate_bps || 0) / 10000) : 0;
  let quantity = form.amount_mode === "cash" ? Math.floor(requestedCash / Math.max(price, 0.01)) : Math.floor(Number(form.quantity || 0));
  if (form.amount_mode === "cash") while (quantity > 0 && quantity * price + feeFor(quantity * price) > requestedCash) quantity -= 1;
  const gross = Math.max(0, quantity * price);
  const commission = feeFor(gross);
  const total = state.orderSide === "buy" ? gross + commission : Math.max(0, gross - commission);
  return { price, quantity, gross, commission, total };
}

function orderEstimateHtml(form) {
  const estimate = orderEstimate(form);
  const position = (state.portfolio?.positions || []).find((item) => item.symbol === form.symbol) || {};
  const avg = Number(position.avg_price || estimate.price || 0);
  const pnl = state.orderSide === "sell" ? (estimate.price - avg) * estimate.quantity - estimate.commission : 0;
  const pnlPct = avg > 0 ? ((estimate.price - avg) / avg) * 100 : 0;
  const result = state.orderSide === "sell" ? `<span class="profit-cell"><small>Net kâr / zarar</small><strong class="${pnl >= 0 ? "up" : "down"}">${signedMoney(pnl)}</strong></span><span class="profit-ratio"><small>K/Z Oranı</small><strong class="${pnlPct >= 0 ? "up" : "down"}">${pnlPct >= 0 ? "+" : ""}${number(pnlPct)}%</strong></span>` : `<span><small>Komisyon</small><strong>${money(estimate.commission)}</strong></span><span><small>Toplam ödeme</small><strong>${money(estimate.total)}</strong></span>`;
  return `<span><small>Tahmini adet</small><strong>${number(estimate.quantity)}</strong></span><span><small>İşlem tutarı</small><strong>${money(estimate.gross)}</strong></span>${result}`;
}

function updateOrderEstimate(form) {
  const target = form?.querySelector("[data-order-estimate]");
  if (!target) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const estimate = orderEstimate(values);
  target.innerHTML = orderEstimateHtml(values);
  const total = form.querySelector("[data-trade-total]");
  if (total) total.textContent = money(estimate.gross);
}

function normalizeOrderForm(form) {
  form.side = state.orderSide;
  form.client_order_id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (form.side === "buy" && form.amount_mode === "cash") {
    const cash = Number(form.cash_amount || 0);
    if (!Number.isFinite(cash) || cash <= 0) throw new Error("Geçerli TL tutarı girin.");
    const estimate = orderEstimate(form);
    if (!Number.isFinite(estimate.price) || estimate.price <= 0) throw new Error("Fiyat bilgisi alınamadı.");
    if (estimate.quantity < 1) throw new Error("TL tutarı, ücret dahil en az 1 adet hisse alacak kadar olmalı.");
    form.quantity = String(estimate.quantity);
  }
  return form;
}

function quickTradeModal() {
  if (!state.tradeOpen || !state.me || state.path.startsWith("/esube/admin")) return "";
  const quote = state.market.find((q) => q.symbol === state.selectedSymbol) || state.market[0] || {};
  const account = state.portfolio?.account || state.account || {};
  const availableQty = sellableQuantity(quote.symbol);
  return `<div class="modal-backdrop open" data-trade-close><div class="modal trade-modal" data-modal-stop><div class="toolbar"><div class="market-identity">${stockLogo(quote.symbol, quote.name)}<span><h2>${esc(quote.symbol || "Hisse")} Emri</h2><p class="muted">${esc(quote.name || "")}</p></span></div><button class="small-button" data-trade-close>Kapat</button></div><div class="trade-snapshot"><strong>${money(quote.price)}</strong><span class="${quote.change_pct >= 0 ? "up" : "down"}">${quote.change_pct >= 0 ? "+" : ""}${number(quote.change_pct)}%</span><small>${state.marketMeta?.ok ? "Canlı fiyat" : "Canlı veri bağlantısı yok"}</small></div><form id="quick-order-form" class="grid"><div class="segmented trade-side-tabs"><button type="button" class="buy-tab ${state.orderSide === "buy" ? "active" : ""}" data-order-side="buy">Alış</button><button type="button" class="sell-tab ${state.orderSide === "sell" ? "active" : ""}" data-order-side="sell">Satış</button></div><input type="hidden" name="symbol" value="${esc(quote.symbol || "")}" />${orderEntryFields(quote, availableQty, account)}${state.marketMeta?.ok ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Canlı fiyat doğrulanana kadar emir gönderilemez.</span></div>`}<button class="primary-button trade-submit ${state.orderSide}" type="submit" ${state.marketMeta?.ok ? "" : "disabled"}>${state.orderSide === "buy" ? "Alış Emri Ver" : "Satış Emri Ver"}</button></form></div></div>`;
}

function companyNewsList(items, emptyCopy) {
  return items.map((item) => `<a class="company-news-row" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span><small>${esc(item.source)} · ${esc(dateLabel(item.published_at))}</small><strong>${esc(item.title)}</strong></span>${icon("external", 16)}</a>`).join("") || `<div class="empty-state">${esc(emptyCopy)}</div>`;
}

function companyDetailModal() {
  if (!state.companyOpen || !state.me || state.path.startsWith("/esube/admin")) return "";
  const data = state.companyData || {};
  const quote = data.quote || state.market.find((item) => item.symbol === state.selectedSymbol) || {};
  const profile = data.profile || {};
  const tabs = [["summary", "Özet"], ["news", "Haberler"], ["analysis", "Araştırma"]];
  let body = `<div class="company-loading">${icon("activity", 22)} Şirket bilgileri hazırlanıyor...</div>`;
  if (!state.companyLoading) {
    if (state.companyTab === "news") {
      body = `<section class="company-tab-panel"><div class="company-section-head"><div><h3>Şirket Haberleri</h3><p>Son 14 günde şirket ve sembolle eşleşen güncel yayınlar.</p></div></div><div class="company-news-list">${companyNewsList(data.news || [], "Bu şirket için yeni haber bulunamadı.")}</div></section>`;
    } else if (state.companyTab === "analysis") {
      body = `<section class="company-tab-panel"><div class="company-section-head"><div><h3>Uzman Görüşleri ve Araştırma</h3><p>Yayımlanmış analizler ve doğrulanabilir araştırma kaynakları.</p></div></div><div class="company-analysis-grid"><div class="company-news-list">${companyNewsList(data.analysis || [], "Yeni bir uzman değerlendirmesi bulunamadı.")}</div><div class="research-source-list">${(data.research_sources || []).map((item) => `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span>${icon("file", 17)}<span><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></span></span>${icon("external", 15)}</a>`).join("")}</div></div><p class="company-disclaimer">${esc(data.disclaimer || "Bu içerikler bilgi amaçlıdır; yatırım tavsiyesi değildir.")}</p></section>`;
    } else {
      body = `<div class="company-overview-grid"><section class="company-tab-panel company-profile-panel"><div class="company-section-head"><div><h3>Şirket Hakkında</h3><p>${esc(industryLabel(profile.industry) || "Borsa İstanbul şirketi")}</p></div></div><p class="company-profile-copy">${esc(profile.description || "Şirket profili hazırlanıyor.")}</p>${profile.risk_note ? `<div class="company-risk-note">${icon("shield", 16)}<span><strong>Risk Notu</strong>${esc(profile.risk_note)}</span></div>` : ""}</section><section class="company-tab-panel"><div class="company-section-head"><div><h3>Temel Bilgiler</h3><p>Güncel piyasa sınıflandırması.</p></div></div><dl class="company-facts"><div><dt>Sektör</dt><dd>${esc(sectorLabel(profile.sector || quote.sector))}</dd></div><div><dt>Faaliyet</dt><dd>${esc(industryLabel(profile.industry || quote.industry))}</dd></div><div><dt>Hacim</dt><dd>${compactNumber(quote.volume)}</dd></div><div><dt>Piyasa</dt><dd>Borsa İstanbul</dd></div></dl></section><section class="company-tab-panel company-chart-panel"><div class="company-section-head"><div><h3>Fiyat Geçmişi</h3><p>Platformun kaydettiği gerçek fiyat örnekleri.</p></div></div>${(data.history || []).length > 1 ? `<div class="company-chart-shell"><canvas data-company-chart></canvas></div>` : `<div class="empty-state">Fiyat geçmişi, canlı veriler kaydedildikçe oluşur.</div>`}</section><section class="company-tab-panel company-latest-news"><div class="company-section-head"><div><h3>Son Haberler</h3><p>Şirketle ilgili en yeni yayınlar.</p></div><button class="text-link" type="button" data-company-tab="news">Tümünü Gör</button></div><div class="company-news-list">${companyNewsList((data.news || []).slice(0, 2), "Yeni haber bulunamadı.")}</div></section></div>`;
    }
  }
  return `<div class="modal-backdrop open" data-company-close><div class="modal company-modal" data-modal-stop><header class="company-modal-header"><div class="company-identity">${stockLogo(quote.symbol, quote.name)}<div><span>${esc(quote.symbol || state.selectedSymbol)}</span><h2>${esc(quote.name || "Şirket Detayı")}</h2></div></div><div class="company-quote"><strong>${money(quote.price)}</strong><span class="${quote.change_pct >= 0 ? "up" : "down"}">${quote.change_pct >= 0 ? "+" : ""}${number(quote.change_pct)}%</span></div><button class="icon-button" type="button" data-company-close aria-label="Şirket detayını kapat">${icon("close", 20)}</button></header><div class="company-modal-toolbar"><div class="company-tabs">${tabs.map(([key, label]) => `<button type="button" class="${state.companyTab === key ? "active" : ""}" data-company-tab="${key}">${label}</button>`).join("")}</div><div class="company-trade-actions"><button type="button" class="small-button buy-button" data-company-trade="buy">Alış</button><button type="button" class="small-button sell-button" data-company-trade="sell">Satış</button></div></div><div class="company-modal-body">${body}</div></div></div>`;
}

function documentPreviewModal() {
  if (!state.docPreview) return "";
  const doc = state.docPreview;
  const isPdf = String(doc.url || "").toLowerCase().endsWith(".pdf") || String(doc.content_type || "").includes("pdf");
  return `<div class="modal-backdrop open" data-doc-close><div class="modal document-modal" data-modal-stop><div class="toolbar"><div><h2>${esc(doc.title || "Belge Önizleme")}</h2><p class="muted">${esc(doc.subtitle || "")}</p></div><button class="small-button" data-doc-close>Kapat</button></div>${isPdf ? `<iframe src="${esc(doc.url)}" title="${esc(doc.title || "Belge")}" class="doc-frame"></iframe>` : `<img src="${esc(doc.url)}" alt="${esc(doc.title || "Belge")}" class="doc-image" />`}</div></div>`;
}

function renderUser() {
  const page = { "/esube": userDashboardV2, "/esube/stocks": stocksPage, "/esube/trade": tradePageV2, "/esube/portfolio": portfolioPageV2, "/esube/portfolio/holdings": () => portfolioSubPage("holdings"), "/esube/portfolio/sold": () => portfolioSubPage("sold"), "/esube/portfolio/history": () => portfolioSubPage("history"), "/esube/news": newsPage, "/esube/notifications": notificationsPage, "/esube/transactions": transactionsPage, "/esube/orders": ordersPage, "/esube/favorites": favoritesPage, "/esube/support": supportPage, "/esube/money": moneyPage, "/esube/profile": profilePageV2, "/esube/profile/overview": accountOverviewPage, "/esube/profile/security": accountSecurityPage, "/esube/profile/identity": accountIdentityPage, "/esube/profile/documents": accountDocumentsPage, "/esube/settings": renderSettingsPage }[state.path] || userDashboardV2;
  app.innerHTML = appLayout(page(), false);
}

function marketStats() {
  const hour = new Date().getHours();
  const open = hour >= 10 && hour < 18;
  return { open, index: state.market.find((x) => x.symbol === "XU100") || { symbol: "XU100", price: 0, change_pct: 0 } };
}

function sellableQuantity(symbol) {
  const positions = state.portfolio?.positions || [];
  const orders = state.portfolio?.orders || [];
  const owned = positions.find((p) => p.symbol === symbol)?.quantity || 0;
  const reserved = orders.filter((o) => o.status === "pending" && o.side === "sell" && o.symbol === symbol).reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  return Math.max(0, owned - reserved);
}

function accountCards() {
  const account = state.portfolio?.account || state.account || {};
  const orders = state.portfolio?.orders || [];
  const pendingBuy = orders.filter((o) => o.status === "pending" && o.side === "buy").reduce((sum, o) => sum + Number(o.total || 0), 0);
  const portfolioValue = (state.portfolio?.positions || []).reduce((s, p) => s + Number(p.market_value || 0), 0);
  const pnl = (state.portfolio?.positions || []).reduce((s, p) => s + Number(p.pnl || 0), 0);
  const totalAssets = Number(account.cash_balance || 0) + Number(account.pending_balance || 0) + portfolioValue + pendingBuy;
  const tradingBalance = Number(account.cash_balance || 0) + Number(account.pending_balance || 0);
  return `<div class="dashboard-grid summary-grid">${[["TOPLAM VARLIK", money(totalAssets), "wallet"], ["KAR / ZARAR", money(pnl), pnl >= 0 ? "chart" : "activity"], ["İŞLEM BAKİYESİ", money(tradingBalance), "bank"], ["ÇEKİLEBİLİR", money(account.cash_balance), "shield"]].map(([l, v, ico]) => `<article class="metric-card"><span>${icon(ico, 16)} ${l}</span><strong>${v}</strong></article>`).join("")}</div>`;
}

function liveStatus() {
  const s = marketStats();
  const meta = state.marketMeta || {};
  return `<article class="live-status-card ${meta.ok ? "" : "degraded"}"><span class="pulse-dot ${s.open && meta.ok ? "on" : ""}"></span><div><strong>${s.open ? "BORSA AÇIK" : "BORSA KAPALI"}</strong><small>${meta.ok ? "Emir ekranlarında güncel fiyat kullanılır." : "Veri bağlantısı yenileniyor; son bilinen fiyatlar gösteriliyor."}</small></div></article>`;
}

function allocationMark(item) {
  if (item.symbol === "CASH") return `<span class="stock-logo fallback">${icon("bank", 18)}</span>`;
  if (item.symbol === "T2") return `<span class="stock-logo fallback">${icon("clock", 18)}</span>`;
  return stockLogo(item.symbol, item.label);
}

function portfolioAllocationCard(compact = false) {
  const allocation = portfolioAllocation();
  const total = portfolioTotalValue();
  const visible = allocation.slice(0, compact ? 5 : 8);
  return `<section class="content-card portfolio-allocation-card ${compact ? "compact" : ""}"><div class="toolbar compact"><div><h2>Portföy Dağılımı</h2><p class="muted">Yatırımlarınızın güncel ağırlığı.</p></div><a href="/esube/portfolio" data-link class="small-button">Detay</a></div><div class="portfolio-allocation-body"><div class="portfolio-chart-shell"><canvas data-portfolio-chart role="img" aria-label="Portföy dağılım grafiği"></canvas><div class="portfolio-chart-center"><small>Toplam</small><strong>${money(total)}</strong></div></div><div class="portfolio-legend">${visible.map((item, index) => `<div class="portfolio-legend-row"><span class="legend-swatch" style="--swatch-index:${index}"></span>${allocationMark(item)}<span><strong>${esc(item.label)}</strong><small>${total ? number((item.value / total) * 100) : 0}%</small></span><b>${money(item.value)}</b></div>`).join("") || `<div class="empty-state">Portföyünüz henüz boş.</div>`}</div></div></section>`;
}

function newsRows(limit = 6) {
  return state.news.slice(0, limit).map(newsRow).join("") || `<div class="empty-state">Resmi kaynaklar güncelleniyor.</div>`;
}

function newsRow(item) {
  return `<a class="news-row" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span class="news-source">${esc(item.source)}</span><span class="news-copy"><strong>${esc(item.title)}</strong><small>${esc(item.kind || "Resmi duyuru")} · ${esc(item.published_at || "Güncel")}</small></span>${icon("external", 16)}</a>`;
}

function newsPanel(limit = 5) {
  const meta = state.newsMeta || {};
  return `<section class="content-card news-card"><div class="toolbar compact"><div><h2>Piyasa Haberleri</h2><p class="muted">Borsa İstanbul, TCMB ve SPK resmi duyuruları.</p></div><span class="status ${meta.ok ? "ok" : "warn"}">${icon(meta.ok ? "check" : "clock", 14)} ${meta.ok ? "Güncel" : "Bağlanıyor"}</span></div><div class="news-list">${newsRows(limit)}</div><a href="/esube/news" data-link class="text-link news-more">Tüm haberler ${icon("arrow", 15)}</a></section>`;
}

function newsPage() {
  const meta = state.newsMeta || {};
  const sources = meta.sources || [];
  const q = state.newsQuery.toLocaleLowerCase("tr-TR");
  const filtered = state.news.filter((item) => (state.newsFilter === "all" || item.source === state.newsFilter) && `${item.title} ${item.kind} ${item.source}`.toLocaleLowerCase("tr-TR").includes(q));
  const sourceNames = [...new Set(state.news.map((item) => item.source))];
  return `<div class="toolbar"><div><h1>Piyasa Haberleri</h1><p class="muted">Resmi duyuruları kaynak ve konuya göre süzün.</p></div><span class="status ${meta.ok ? "ok" : "warn"}">${icon(meta.ok ? "check" : "clock", 14)} ${esc(meta.updated_at_label || "Güncelleniyor")}</span></div><div class="official-source-strip">${sources.map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${icon("external", 14)} ${esc(source.name)}</a>`).join("")}</div><div class="filter-toolbar"><input class="search-box wide" data-news-search value="${esc(state.newsQuery)}" placeholder="Haber, şirket veya konu ara" aria-label="Haber ara" /><select class="search-box" data-news-filter aria-label="Haber kaynağı"><option value="all">Tüm Kaynaklar</option>${sourceNames.map((source) => `<option value="${esc(source)}" ${state.newsFilter === source ? "selected" : ""}>${esc(source)}</option>`).join("")}</select></div><section class="content-card news-page-card"><div class="news-list">${filtered.map(newsRow).join("") || `<div class="empty-state">Filtreyle eşleşen haber yok.</div>`}</div></section>`;
}

function userDashboard() {
  const stats = marketStats();
  const stocks = state.market.filter((x) => (x.asset_class || "stock") === "stock");
  const leaders = [...stocks].sort((a, b) => b.change_pct - a.change_pct).slice(0, 5);
  const txs = state.portfolio?.transactions || [];
  const approved = state.me?.status === "approved";
  const actions = [
    ["Hisse Al", "Hisse arayın, adet ya da TL tutarı girin.", "search", "#", "data-search-open"],
    ["Para Yatır", "Transfer açıklama kodunu alın.", "upload", "/esube/money", "data-link"],
    ["Portföyüm", "Elinizdeki hisseleri ve kazancı görün.", "wallet", "/esube/portfolio", "data-link"],
    ["İşlem Geçmişi", "Alış, satış ve para hareketlerini takip edin.", "file", "/esube/transactions", "data-link"],
  ];
  return `<div class="simple-dashboard-hero"><div><span class="status ${stats.open ? "ok" : "warn"}">${stats.open ? "BORSA AÇIK" : "BORSA KAPALI"}</span><h1>${approved ? "Yatırımlarınız tek bakışta" : "Hesabınızı işleme hazırlayın"}</h1><p>${approved ? "Bakiyenizi görün, hisse arayın ve emrinizi birkaç adımda oluşturun." : "Kimlik belgelerinizi profilinizden yükleyin; onay tamamlandığında yatırım işlemleri açılır."}</p></div><button class="primary-button" type="button" data-search-open>${icon("search")} Hisse Ara</button></div>${liveStatus()}${accountCards()}<section class="quick-action-grid">${actions.map(([title, copy, ico, href, attr]) => attr === "data-search-open" ? `<button type="button" class="quick-action-card" data-search-open>${icon(ico)}<strong>${title}</strong><span>${copy}</span></button>` : `<a href="${href}" ${attr} class="quick-action-card">${icon(ico)}<strong>${title}</strong><span>${copy}</span></a>`).join("")}</section><div class="dashboard-focus-grid"><section class="content-card"><div class="toolbar compact"><div><h2>Piyasa Özeti</h2><p class="muted">Bugün en güçlü hareket eden hisseler.</p></div><a href="/esube/stocks" data-link class="small-button">Tümü</a></div><div class="compact-market-list">${leaders.map((q) => `<button type="button" class="compact-market-row" data-company="${esc(q.symbol)}"><span class="market-identity">${stockLogo(q.symbol, q.name)}<b>${esc(q.symbol)}</b></span><strong>${money(q.price)}</strong><em class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</em></button>`).join("") || `<div class="empty-state">Piyasa verisi bekleniyor.</div>`}</div></section>${portfolioAllocationCard(true)}${newsPanel(4)}</div><section class="content-card dashboard-recent-strip"><div class="toolbar compact"><div><h2>Son Hareketler</h2><p class="muted">En yeni hesap hareketleriniz.</p></div><a href="/esube/transactions" data-link class="small-button">Geçmiş</a></div><div class="dashboard-recent-grid">${txs.slice(0, 4).map(txRow).join("") || `<div class="empty-state">Henüz hareket yok.</div>`}</div></section>`;
}

function userDashboardV2() {
  const account = state.portfolio?.account || {};
  const positions = state.portfolio?.positions || [];
  const txs = state.portfolio?.transactions || [];
  const allStocks = state.market.filter((item) => (item.asset_class || "stock") === "stock");
  const stocks = ["THYAO", "ASELS", "GARAN"].map((symbol) => allStocks.find((item) => item.symbol === symbol)).filter(Boolean);
  const positionValue = positions.reduce((sum, item) => sum + Number(item.market_value || 0), 0);
  const pnl = positions.reduce((sum, item) => sum + Number(item.pnl || 0), 0);
  const total = Number(account.cash_balance || 0) + Number(account.pending_balance || 0) + positionValue;
  const changePct = total ? (pnl / Math.max(total - pnl, 1)) * 100 : 0;
  const approved = state.me?.status === "approved";
  const actions = [
    ["Al", "buy", "upload", "/esube/trade"],
    ["Sat", "sell", "download", "/esube/trade"],
    ["Portföy", "portfolio", "pie", "/esube/portfolio"],
    ["Geçmiş", "history", "clock", "/esube/transactions"],
  ];
  return `<div class="dashboard-v2"><div class="mobile-page-title"><div><small>Hoş geldiniz</small><h1>Paribu Yatırım</h1></div><div class="mobile-title-actions"><button type="button" class="icon-button" data-search-open aria-label="Hisse ara">${icon("search", 23)}</button><a href="/esube/news" data-link class="icon-button" aria-label="Bildirimler">${icon("news", 23)}<span class="notice-dot"></span></a></div></div>
  <section class="portfolio-hero-card"><div><span>Toplam Portföy Değeri ${icon("eye", 17)}</span><strong>${money(total)}</strong><b class="${changePct >= 0 ? "up" : "down"}">${changePct >= 0 ? "+" : "-"} %${number(Math.abs(changePct))} (${money(pnl)})</b><small>Bugün</small></div><div class="hero-chart"><canvas data-mini-chart data-direction="${changePct >= 0 ? "up" : "down"}" data-seed="2" aria-label="Günlük portföy grafiği"></canvas></div></section>
  ${approved ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Alım satım işlemlerinin açılması için profilinizdeki kimlik doğrulamasını tamamlayın.</span></div>`}
  <section class="mavi-action-grid">${actions.map(([label, side, ico, href]) => `<a href="${href}" data-link class="mavi-action" ${side === "buy" || side === "sell" ? `data-dashboard-side="${side}"` : ""}><span class="action-icon ${side}">${icon(ico, 24)}</span><strong>${label}</strong></a>`).join("")}</section>
  <section class="content-card watch-card"><div class="toolbar compact"><h2>İzleme Listem</h2><a href="/esube/stocks" data-link class="text-link">Tümünü Gör ${icon("arrow", 15)}</a></div><div class="watch-list">${stocks.map((q, index) => `<button type="button" class="watch-row" data-company="${esc(q.symbol)}"><span class="market-identity">${stockLogo(q.symbol, q.name)}<span><strong>${esc(q.symbol)}</strong><small>${esc(q.name)}</small></span></span><span class="watch-price"><strong>${money(q.price)}</strong><small>${money(q.price)}</small></span><span class="mini-chart"><canvas data-mini-chart data-direction="${q.change_pct >= 0 ? "up" : "down"}" data-seed="${index + 4}" aria-hidden="true"></canvas></span><b class="change-pill ${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : "-"} %${number(Math.abs(q.change_pct))}</b></button>`).join("") || `<div class="empty-state">Piyasa verisi bekleniyor.</div>`}</div></section>
  <section class="content-card recent-card"><div class="toolbar compact"><h2>Son İşlemler</h2><a href="/esube/transactions" data-link class="text-link">Tümünü Gör ${icon("arrow", 15)}</a></div><div class="list">${txs.slice(0, 5).map(txRow).join("") || `<div class="empty-state">Henüz işlem bulunmuyor.</div>`}</div></section></div>`;
}

function riskInsightPanel() {
  const account = state.portfolio?.account || {};
  const pendingOrders = (state.portfolio?.orders || []).filter((x) => x.status === "pending").length;
  const pendingMoney = (state.portfolio?.money_requests || []).filter((x) => x.status === "pending").length;
  const cash = Number(account.cash_balance || 0);
  const portfolioValue = (state.portfolio?.positions || []).reduce((s, p) => s + Number(p.market_value || 0), 0);
  return `<div class="approval-strip">${[["Operasyon Durumu", pendingOrders + pendingMoney ? `${pendingOrders + pendingMoney} bekleyen işlem` : "Temiz", "clock"], ["Risk Sağlığı", cash || portfolioValue ? "Aktif takip" : "Başlangıç hesabı", "shield"], ["Akıllı Uyarı", pendingMoney ? "Para talebi onay bekliyor" : "Yeni uyarı yok", "check"]].map(([a, b, i]) => `<article>${icon(i)}<div><strong>${a}</strong><span>${b}</span></div></article>`).join("")}</div>`;
}

function marketGroup(title, items) {
  return `<div class="content-card market-group"><div class="toolbar compact"><h2>${title}</h2><span>${items.length}</span></div><div class="list">${items.map((x, i) => `<button class="mini-stock" ${(x.asset_class || "stock") === "stock" ? `data-company="${esc(x.symbol)}"` : "disabled"}><span>${i + 1}</span><strong>${esc(x.symbol)}</strong><small>${money(x.price)}</small><em class="${x.change_pct >= 0 ? "up" : "down"}">${x.change_pct >= 0 ? "+" : ""}${number(x.change_pct)}%</em></button>`).join("") || `<div class="empty-state">Veri yok.</div>`}</div></div>`;
}

function stockRow(q) {
  return `<div class="stock-row enhanced-row"><button type="button" class="market-identity stock-detail-trigger" data-company="${esc(q.symbol)}">${stockLogo(q.symbol, q.name)}<span><span class="stock-symbol">${esc(q.symbol)}</span><span class="muted">${esc(q.name)}</span></span></button><div class="stock-actions"><div class="stock-quote"><strong>${money(q.price)}</strong><span class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</span></div><button class="small-button buy-button" data-stock="${esc(q.symbol)}" data-side="buy">Al</button><button class="small-button sell-button" data-stock="${esc(q.symbol)}" data-side="sell">Sat</button></div></div>`;
}

function sortedStocks() {
  const q = state.stockQuery.toLocaleLowerCase("tr-TR");
  let items = state.market.filter((item) => (item.asset_class || "stock") === "stock" && `${item.symbol} ${item.name}`.toLocaleLowerCase("tr-TR").includes(q));
  if (state.stockSort === "gain") items = items.sort((a, b) => b.change_pct - a.change_pct);
  else if (state.stockSort === "loss") items = items.sort((a, b) => a.change_pct - b.change_pct);
  else if (state.stockSort === "volume") items = items.sort((a, b) => b.volume - a.volume);
  else items = items.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return items;
}

function stockListHtml() {
  const items = sortedStocks();
  const totalPages = Math.max(1, Math.ceil(items.length / state.stockPageSize));
  state.stockPage = Math.min(Math.max(1, state.stockPage), totalPages);
  const start = (state.stockPage - 1) * state.stockPageSize;
  const visible = items.slice(start, start + state.stockPageSize);
  if (!visible.length) return `<div class="empty-state">Hisse bulunamadı.</div>`;
  return `${visible.map(stockRow).join("")}<nav class="pagination" aria-label="Hisse sayfaları"><button class="small-button" type="button" data-stock-page="${state.stockPage - 1}" ${state.stockPage === 1 ? "disabled" : ""}>Önceki</button><span>${state.stockPage} / ${totalPages} · ${items.length} hisse</span><button class="small-button" type="button" data-stock-page="${state.stockPage + 1}" ${state.stockPage === totalPages ? "disabled" : ""}>Sonraki</button></nav>`;
}

function stocksPage() {
  const stocks = state.market.filter((item) => (item.asset_class || "stock") === "stock");
  const index = state.market.find((item) => item.symbol === "XU100") || { symbol: "XU100", name: "BIST 100", price: 11048.12, change_pct: .72 };
  const gainers = [...stocks].sort((a, b) => Number(b.change_pct) - Number(a.change_pct)).slice(0, 4);
  const losers = [...stocks].sort((a, b) => Number(a.change_pct) - Number(b.change_pct)).slice(0, 4);
  const quoteList = (items) => items.map((q, i) => `<button class="market-rank-row" type="button" data-company="${esc(q.symbol)}"><span class="market-identity">${stockLogo(q.symbol, q.name)}<span><strong>${esc(q.symbol)}</strong><small>${esc(q.name)}</small></span></span><span class="rank-spark"><canvas data-mini-chart data-direction="${q.change_pct >= 0 ? "up" : "down"}" data-seed="${i + (q.change_pct >= 0 ? 41 : 51)}"></canvas></span><span><strong>${money(q.price)}</strong><b class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</b></span></button>`).join("");
  return `<section class="markets-reference"><div class="market-category-tabs">${[["bist","BIST"],["viop","VİOP"],["fx","Döviz"],["commodity","Emtia"],["fund","Fon"]].map(([key, label]) => `<button type="button" data-market-tab="${key}" class="${state.marketTab === key ? "active" : ""}">${label}</button>`).join("")}</div><section class="market-index-card"><div><small>${state.marketTab === "bist" ? "BIST 100" : "Piyasa Özeti"}</small><strong>${number(index.price)}</strong><b class="${index.change_pct >= 0 ? "up" : "down"}">${index.change_pct >= 0 ? "+" : ""}${number(index.change_pct)}%</b><span>${state.marketMeta?.ok ? "Canlı" : "Son bilinen veri"}</span></div><canvas data-mini-chart data-direction="${index.change_pct >= 0 ? "up" : "down"}" data-seed="40"></canvas></section><label class="market-search">${icon("search", 18)}<input data-search="stocks" value="${esc(state.stockQuery)}" placeholder="Hisse ara" /></label>${state.stockQuery ? `<div class="reference-list-card market-search-results" data-stock-list>${stockListHtml()}</div>` : `<div class="market-leader-grid"><section><div class="market-section-title"><h2>En Çok Yükselenler</h2><button type="button" data-market-show="gain">Tümü</button></div><div class="reference-list-card">${quoteList(gainers)}</div></section><section><div class="market-section-title"><h2>En Çok Düşenler</h2><button type="button" data-market-show="loss">Tümü</button></div><div class="reference-list-card">${quoteList(losers)}</div></section></div>`}</section>`;
}

function tradePageV2() {
  const quote = state.market.find((q) => q.symbol === state.selectedSymbol) || state.market.find((q) => (q.asset_class || "stock") === "stock") || {};
  const account = state.portfolio?.account || {};
  const availableQty = sellableQuantity(quote.symbol);
  const isBuy = state.orderSide === "buy";
  const tradingBalance = Number(account.cash_balance || 0) + Number(account.pending_balance || 0);
  const quantity = isBuy ? 100 : Math.min(100, Math.max(1, availableQty));
  return `<section class="trade-quote-strip"><span class="market-identity">${stockLogo(quote.symbol, quote.name)}<span><strong>${esc(quote.symbol || "Hisse")}</strong><small>${esc(quote.name || "")}</small></span></span><span><strong>${money(quote.price)}</strong><b class="${quote.change_pct >= 0 ? "up" : "down"}">${quote.change_pct >= 0 ? "+" : ""}${number(quote.change_pct)}%</b></span></section><form class="trade-ticket" id="order-form"><div class="trade-ticket-head"><h2>Emir Bilgileri</h2><div class="segmented trade-side-tabs"><button type="button" class="buy-tab ${isBuy ? "active" : ""}" data-order-side="buy">Alış</button><button type="button" class="sell-tab ${!isBuy ? "active" : ""}" data-order-side="sell">Satış</button></div></div><input type="hidden" name="amount_mode" value="quantity" /><label class="ticket-row symbol-row"><span>Hisse</span><select name="symbol" data-order-symbol>${state.market.filter((item) => (item.asset_class || "stock") === "stock").map((item) => `<option value="${esc(item.symbol)}" ${item.symbol === quote.symbol ? "selected" : ""}>${esc(item.symbol)} - ${esc(item.name)}</option>`).join("")}</select></label><div class="ticket-row order-type-row"><span>Emir Tipi</span><div class="ticket-segmented"><select name="order_type" data-order-type aria-label="Emir tipi"><option value="market">Piyasa</option><option value="limit">Limit</option></select><button type="button" class="active" data-order-type-choice="market">Piyasa</button><button type="button" data-order-type-choice="limit">Limit</button></div></div><label class="ticket-row"><span data-price-label>Fiyat</span><span class="ticket-input"><input name="limit_price" data-order-price type="number" step="0.01" min="0.01" value="${Number(quote.price || 0).toFixed(2)}" readonly aria-readonly="true" required /><em>TL</em></span></label><label class="ticket-row"><span>Adet</span><span class="ticket-input"><input name="quantity" type="number" min="1" value="${quantity}" ${isBuy ? "" : `max="${Math.max(1, availableQty)}"`} required /><em>Lot</em></span></label><div class="ticket-row trade-total-row"><span>Tutar</span><span class="ticket-input static"><strong data-trade-total>${money(Number(quote.price || 0) * quantity)}</strong><em>TL</em></span></div><div class="ticket-row validity-row"><span>Geçerlilik</span><div class="ticket-segmented"><select name="validity" aria-label="Geçerlilik"><option value="gtc">GTC</option><option value="day">Günlük</option></select><button type="button" class="active" data-validity-choice="gtc">GTC</button><button type="button" data-validity-choice="day">Günlük</button></div></div><label class="field checkbox-field" data-limit-only hidden><input name="cancel_remaining" type="checkbox" /> Gerçekleşmeyen kısmı iptal et</label><div class="ticket-balance"><span>${isBuy ? "Kullanılabilir Bakiye" : "Satılabilir Lot"}</span><strong>${isBuy ? money(tradingBalance) : `${number(availableQty)} Lot`}</strong></div><section class="ticket-estimate"><div class="toolbar compact"><h3>Tahmini İşlem Özeti</h3><span>Detayları Gizle ${icon("chevron", 14)}</span></div><div class="trade-estimate" data-order-estimate>${orderEstimateHtml({ symbol: quote.symbol, order_type: "market", amount_mode: "quantity", quantity, limit_price: quote.price })}</div></section>${state.marketMeta?.ok ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Canlı fiyat doğrulanana kadar emir gönderilemez.</span></div>`}<button class="primary-button trade-submit ${state.orderSide}" type="submit" ${state.marketMeta?.ok ? "" : "disabled"}>${isBuy ? `${icon("upload", 20)} Alış Emrini Onayla` : `${icon("download", 20)} Satış Emrini Onayla`}</button><p class="trade-risk-note">${icon("shield", 18)} Sermayeniz risk altında olabilir. Emir öncesi işlem özetini kontrol edin.</p></form>`;
}

function tradePage() {
  const quote = state.market.find((q) => q.symbol === state.selectedSymbol) || state.market[0] || {};
  const account = state.portfolio?.account || {};
  const availableQty = sellableQuantity(quote.symbol);
  return `<div class="toolbar"><div><h1>Alış / Satış</h1><p class="muted">Hisseyi seçin, tutarı girin ve ücret özetini onaylayın.</p></div><span class="status ${state.marketMeta?.ok ? "ok" : "bad"}">${icon("activity", 14)} ${state.marketMeta?.ok ? "Canlı fiyat" : "Veri bağlantısı yok"}</span></div><div class="trade-workspace"><form class="content-card trade-order-card" id="order-form"><div class="segmented trade-side-tabs"><button type="button" class="buy-tab ${state.orderSide === "buy" ? "active" : ""}" data-order-side="buy">Alış</button><button type="button" class="sell-tab ${state.orderSide === "sell" ? "active" : ""}" data-order-side="sell">Satış</button></div>${orderEntryFields(quote, availableQty, account, true)}${state.marketMeta?.ok ? "" : `<div class="approval-alert">${icon("clock", 18)} <span>Canlı fiyat doğrulanana kadar emir gönderilemez.</span></div>`}<button class="primary-button trade-submit ${state.orderSide}" type="submit" ${state.marketMeta?.ok ? "" : "disabled"}>${state.orderSide === "buy" ? "Alış Emri Ver" : "Satış Emri Ver"}</button></form><aside class="content-card quote-card"><div class="market-identity quote-identity">${stockLogo(quote.symbol, quote.name)}<span><h2>${esc(quote.symbol || "Hisse")}</h2><p class="muted">${esc(quote.name || "")}</p></span></div><strong class="quote-price">${money(quote.price)}</strong><span class="${quote.change_pct >= 0 ? "up" : "down"}">${quote.change_pct >= 0 ? "+" : ""}${number(quote.change_pct)}%</span><div class="quote-facts"><span>Fiyat türü <b>${state.marketMeta?.ok ? "Canlı" : "Kullanılamıyor"}</b></span><span>Satılabilir <b>${number(availableQty)} adet</b></span></div></aside></div>`;
}

function portfolioPageV2() {
  const positions = state.portfolio?.positions || [];
  const orders = state.portfolio?.orders || [];
  const account = state.portfolio?.account || {};
  const t2 = state.portfolio?.t2_settlements || [];
  const positionValue = positions.reduce((sum, item) => sum + Number(item.market_value || 0), 0);
  const pnl = positions.reduce((sum, item) => sum + Number(item.pnl || 0), 0);
  const total = Number(account.cash_balance || 0) + Number(account.pending_balance || 0) + positionValue;
  const pct = total ? pnl / Math.max(total - pnl, 1) * 100 : 0;
  return `<section class="portfolio-summary-large"><div><span>Toplam Portföy Değeri ${icon("eye", 17)}</span><strong>${money(total)}</strong><b class="${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : "-"} %${number(Math.abs(pct))} (${money(pnl)})</b></div><div class="hero-chart"><canvas data-mini-chart data-direction="${pnl >= 0 ? "up" : "down"}" data-seed="9" aria-label="Portföy performansı"></canvas></div></section><section class="portfolio-cash-strip"><span class="cash-icon">${icon("wallet", 24)}</span><div><small>Nakit Bakiyem</small><strong>${money(account.cash_balance)}</strong></div><a href="/esube/money" data-link class="primary-button">Para Aktar</a></section><section class="portfolio-tabs"><button class="active">Elde Olanlar</button><button>Satılanlar</button><a href="/esube/transactions" data-link>Geçmiş İşlemler</a></section><section class="portfolio-holdings">${positions.map((p, index) => `<article class="holding-row"><span class="market-identity">${stockLogo(p.symbol, p.name)}<span><strong>${esc(p.symbol)}</strong><small>${esc(p.name || "")}<br>${number(p.quantity)} Lot</small></span></span><span class="holding-cost"><strong>${money(p.avg_price)}</strong><small>${money(p.current_price)}</small></span><span class="mini-chart"><canvas data-mini-chart data-direction="${p.pnl >= 0 ? "up" : "down"}" data-seed="${index + 12}" aria-hidden="true"></canvas></span><span class="holding-value"><b class="${p.pnl >= 0 ? "up" : "down"}">${p.pnl >= 0 ? "+" : "-"} %${number(Math.abs(p.pnl / Math.max(Number(p.market_value) - Number(p.pnl), 1) * 100))}</b><strong>${money(p.market_value)}</strong></span><button type="button" class="holding-open" data-company="${esc(p.symbol)}" aria-label="${esc(p.symbol)} detay">${icon("arrow", 18)}</button></article>`).join("") || `<div class="empty-state">Portföyünüzde henüz hisse yok.</div>`}</section><section class="content-card portfolio-performance-card"><div class="toolbar compact"><div><h2>Portföy Performansı</h2><b class="${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : "-"}%${number(Math.abs(pct))}</b></div><select aria-label="Performans aralığı"><option>1 Ay</option><option>3 Ay</option><option>1 Yıl</option></select></div><div class="performance-chart"><canvas data-mini-chart data-direction="${pnl >= 0 ? "up" : "down"}" data-seed="20"></canvas></div></section><div class="portfolio-operations-grid"><section class="content-card"><div class="toolbar compact"><h2>Emirler</h2><a href="/esube/transactions" data-link class="text-link">Tümü</a></div><div class="list">${orders.slice(0, 6).map((order) => orderRow(order)).join("") || `<div class="empty-state">Emir yok.</div>`}</div></section><section class="content-card"><div class="toolbar compact"><h2>Takas Bekleyen</h2></div><div class="list">${t2.filter((item) => item.status === "pending").map(t2Row).join("") || `<div class="empty-state">Takas bekleyen tutar yok.</div>`}</div></section></div>`;
}

function portfolioPage() {
  const positions = state.portfolio?.positions || [];
  const orders = state.portfolio?.orders || [];
  const t2 = state.portfolio?.t2_settlements || [];
  const t2Enabled = state.portfolio?.settlement_settings?.t2_enabled !== false;
  return `<div class="toolbar"><div><h1>Portföyüm</h1><p class="muted">Pozisyonlarınız, dağılımınız ve bekleyen işlemleriniz.</p></div><span class="status ${t2Enabled ? "ok" : "warn"}">${icon("calendar", 14)} T+2 ${t2Enabled ? "Aktif" : "Kapalı"}</span></div>${accountCards()}<div class="portfolio-main-grid">${portfolioAllocationCard(false)}<section class="content-card portfolio-positions-card"><div class="toolbar compact"><div><h2>Pozisyonlar</h2><p class="muted">Maliyet, canlı değer ve toplam kar/zarar.</p></div><span class="status ok">${icon("shield", 14)} Güncel</span></div><div class="table-wrap portfolio-table"><table><thead><tr><th>Hisse</th><th>Adet</th><th>Maliyet</th><th>Canlı Fiyat</th><th>Değer</th><th>K/Z</th><th>İşlem</th></tr></thead><tbody>${positions.map((p) => `<tr><td><span class="market-identity">${stockLogo(p.symbol, p.name)}<span><strong>${esc(p.symbol)}</strong><small>${esc(p.name || "")}</small></span></span></td><td>${number(p.quantity)}</td><td>${money(p.avg_price)}</td><td>${money(p.current_price)}</td><td><strong>${money(p.market_value)}</strong></td><td class="${p.pnl >= 0 ? "up" : "down"}"><strong>${money(p.pnl)}</strong></td><td><div class="button-row"><button class="small-button buy-button" data-stock="${esc(p.symbol)}" data-side="buy">Al</button><button class="small-button sell-button" data-stock="${esc(p.symbol)}" data-side="sell">Sat</button></div></td></tr>`).join("") || `<tr><td colspan="7"><div class="empty-state">Portföyünüzde henüz hisse yok.</div></td></tr>`}</tbody></table></div></section></div><div class="portfolio-operations-grid"><section class="content-card"><div class="toolbar compact"><div><h2>Emirler</h2><p class="muted">Bekleyen ve gerçekleşen emirler.</p></div><a href="/esube/transactions" data-link class="small-button">Tümü</a></div><div class="list">${orders.slice(0, 8).map((o) => orderRow(o)).join("") || `<div class="empty-state">Emir yok.</div>`}</div></section><section class="content-card"><div class="toolbar compact"><div><h2>Takas Bekleyen</h2><p class="muted">Satış tutarı işlemde kullanılabilir; çekim için vade bekler.</p></div></div><div class="list">${t2.filter((item) => item.status === "pending").map(t2Row).join("") || `<div class="empty-state">Takas bekleyen satış tutarı yok.</div>`}</div></section></div>`;
}

function t2Row(s, admin = false) {
  const amount = s.display_amount ?? s.remaining_amount ?? s.amount;
  return `<div class="request-row"><div><strong>${esc(s.code)} satış bakiyesi</strong><p class="muted">${esc(s.full_name || "")} ${s.quantity ? `${s.quantity} adet · ` : ""}${money(amount)} · Çekilebilir: ${esc(s.settlement_date_label)}</p></div><div class="button-row"><span class="status ${statusClass(s.status)}">${esc(s.status_label)}</span>${admin && s.status === "pending" ? `<button class="small-button" data-t2-settle="${s.id}">${icon("check", 14)} Nakde Aktar</button>` : ""}</div></div>`;
}

function orderRow(o, admin = false) {
  const userActions = !admin && o.status === "pending" ? `<button class="small-button" data-order-edit="${o.id}" data-price="${o.limit_price}" data-qty="${o.quantity}">Düzenle</button><button class="small-button" data-order-cancel="${o.id}">İptal Et</button>` : "";
  const adminActions = admin && o.status === "pending" ? `<button class="small-button" data-admin-approve="orders" data-id="${o.id}">${icon("check", 14)} Onayla</button><button class="small-button" data-admin-reject="orders" data-id="${o.id}">Reddet</button>` : "";
  return `<div class="request-row"><div><strong>${esc(o.symbol)} ${esc(o.side_label)} · ${esc(o.order_type_label || "")}</strong><p class="muted">${esc(o.execution_reference || "")} · ${esc(o.full_name || "")} ${o.quantity} adet · Brüt ${money(o.gross_total || o.total)} · Komisyon ${money(o.commission)} · Net ${money(o.total)} · ${esc(o.created_at_label)}</p></div><div class="button-row"><span class="status ${statusClass(o.status)}">${esc(o.status_label)}</span>${userActions}${adminActions}</div></div>`;
}

function transactionsPage() {
  const orders = state.portfolio?.orders || [];
  const moneyReqs = state.portfolio?.money_requests || [];
  const txs = state.portfolio?.transactions || [];
  const query = state.transactionQuery.toLocaleLowerCase("tr-TR");
  const rows = [
    ...orders.map((o) => ({ type: o.side, html: orderRow(o), date: o.created_at_label })),
    ...moneyReqs.map((m) => ({ type: m.request_type, html: moneyRow(m), date: m.created_at_label })),
    ...txs.map((t) => ({ type: t.transaction_type.includes("buy") ? "buy" : t.transaction_type.includes("sell") ? "sell" : "money", html: txRow(t), date: t.created_at_label })),
  ].filter((x) => state.transactionFilter === "all" || x.type === state.transactionFilter)
    .filter((x) => (!state.transactionFrom || x.date.slice(0, 10) >= state.transactionFrom) && (!state.transactionTo || x.date.slice(0, 10) <= state.transactionTo))
    .filter((x) => !query || x.html.replace(/<[^>]+>/g, " ").toLocaleLowerCase("tr-TR").includes(query));
  const exportQuery = new URLSearchParams({ q: state.transactionQuery, from: state.transactionFrom, to: state.transactionTo, type: state.transactionFilter === "buy" ? "trade_buy" : state.transactionFilter === "sell" ? "trade_sell" : "all" });
  return `<div class="toolbar"><div><h1>Hesap Hareketleri</h1><p class="muted">Tarih, referans ve işlem türüyle kayıtlarınızı bulun.</p></div><a class="ghost-button" href="/api/transactions/export?${exportQuery}">${icon("download", 17)} CSV İndir</a></div><div class="transaction-toolbar"><input class="search-box wide" data-transaction-search value="${esc(state.transactionQuery)}" placeholder="Referans, sembol veya açıklama ara" aria-label="Hareket ara" /><label class="field compact-field"><span>Başlangıç</span><input type="date" data-transaction-from value="${esc(state.transactionFrom)}" /></label><label class="field compact-field"><span>Bitiş</span><input type="date" data-transaction-to value="${esc(state.transactionTo)}" /></label></div><div class="segmented filter-tabs">${[["all", "Tümü"], ["buy", "Alış"], ["sell", "Satış"], ["deposit", "Yatırma"], ["withdraw", "Çekme"]].map(([k, l]) => `<button class="${state.transactionFilter === k ? "active" : ""}" data-transaction-filter="${k}">${l}</button>`).join("")}</div><div class="list" style="margin-top:18px;">${rows.map((x) => x.html).join("") || `<div class="empty-state">Filtreyle eşleşen hareket yok.</div>`}</div>`;
}

function txRow(t) {
  return `<div class="request-row"><div><strong>${esc(reportLabel(t.type_label))}</strong><p class="muted">${esc(t.reference || "")} · ${esc(t.code || "")} ${t.quantity ? `${t.quantity} adet · ` : ""}${esc(t.created_at_label)}</p></div><strong>${money(t.total)}</strong></div>`;
}

function moneyPage() {
  const reqs = state.portfolio?.money_requests || [];
  const txs = state.portfolio?.transactions || [];
  const bankAccounts = state.portfolio?.system_bank_accounts || [];
  const meta = { deposit: ["Para Yatırma", "Banka hesabına transfer sonrası talebiniz onaya gönderilir.", "upload"], withdraw: ["Para Çekme", "Kendi banka hesabınıza çekim talebi minimum 500 TL ile oluşturulur.", "download"], credit: ["Kredili Yatırım", "Limit başvurusu incelemeye gönderilir.", "shield"] };
  const selected = meta[state.moneyType] || meta.deposit;
  const depositUnavailable = state.moneyType === "deposit" && !bankAccounts.length;
  const account = state.portfolio?.account || {};
  const tabs = [["deposit", "Para Yatır"], ["withdraw", "Para Çek"], ["credit", "Kredi"]];
  return `<section class="money-reference"><div class="reference-segments">${tabs.map(([key, label]) => `<button type="button" class="${state.moneyType === key ? "active" : ""}" data-money-type="${key}">${label}</button>`).join("")}</div><div class="money-balance"><span>Kullanılabilir Bakiye</span><strong>${money(account.cash_balance)}</strong></div><form class="reference-list-card money-reference-form" id="money-form"><input type="hidden" name="request_type" value="${esc(state.moneyType)}" /><header><span class="money-mode-icon">${icon(selected[2], 22)}</span><div><h2>${selected[0]}</h2><p>${depositUnavailable ? "Para yatırma hesabı henüz yayımlanmadı." : selected[1]}</p></div></header>${state.moneyType === "deposit" ? `<h3>Transfer Hesabı</h3>${bankAccounts.length ? `<div class="saved-bank-list">${bankAccounts.map((b, index) => `<label><input type="radio" name="account_ref" value="${esc(b.iban)}" ${index ? "" : "checked"} /><span>${icon("bank", 20)}<span><strong>${esc(b.bank_name)}</strong><small>${esc(b.iban)}</small></span></span></label>`).join("")}</div>` : `<div class="empty-state">Aktif kurum hesabı bulunmuyor.</div>`}` : ""}<div class="money-compact-fields">${moneyFormFields(bankAccounts)}</div><button class="primary-button money-continue" type="submit" ${depositUnavailable ? "disabled" : ""}>DEVAM ET ${icon("arrow", 18)}</button></form><details class="money-history"><summary>Son Para Hareketleri ${icon("chevron", 16)}</summary><div class="reference-list-card">${moneyHistoryRows(reqs.slice(0, 4), txs.slice(0, 4))}</div></details></section>`;
}

function depositTransferCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${state.me?.account_no || "GM"}-${date}`;
}

function moneyFormFields(bankAccounts) {
  if (state.moneyType === "withdraw") return `<div class="field-grid"><label class="field"><span>Tutar</span><input name="amount" type="number" min="500" placeholder="En az 500 TL" required /></label><label class="field"><span>Banka Adı</span><input name="bank_name" required /></label><label class="field"><span>Hesap Sahibi</span><input name="account_holder" value="${esc(state.me?.full_name || "")}" readonly required /></label><label class="field"><span>IBAN</span><input name="iban" placeholder="TR ile başlayan 26 karakter" minlength="26" maxlength="34" required /></label><label class="field full"><span>Not</span><textarea name="note" placeholder="Çekim açıklaması"></textarea></label></div>`;
  if (state.moneyType === "credit") return `<div class="field-grid"><label class="field"><span>Talep Edilen Limit</span><input name="amount" type="number" min="1" value="250000" required /></label><label class="field full"><span>Açıklama</span><textarea name="note" placeholder="Kredi limit başvurusu"></textarea></label></div>`;
  const code = depositTransferCode();
  return `<div class="transfer-instructions"><strong>${icon("bank", 18)} Transfer Açıklama Kodu</strong><code>${esc(code)}</code><button type="button" class="small-button" data-copy="${esc(code)}">${icon("copy", 14)} Kopyala</button></div><div class="field-grid"><label class="field"><span>Tutar</span><input name="amount" type="number" min="1" placeholder="Yatırdığınız tutar" required /></label><label class="field"><span>Açıklama Kodu</span><input name="transfer_code" value="${esc(code)}" readonly required /></label><label class="field full receipt-field"><span>Dekont</span><input name="receipt" type="file" accept="image/*,.pdf" required /><small>PDF, JPG, PNG veya WEBP; en fazla 10 MB.</small></label><label class="field full"><span>Açıklama</span><textarea name="note" placeholder="İsteğe bağlı not"></textarea></label></div>`;
}

function systemBankAccountsPanel(accounts, admin = false) {
  if (!accounts.length) return `<div class="empty-state">${admin ? "Doğrulanmış kurum banka hesabı bulunmuyor." : "Para yatırma hesabı şu anda kullanıma kapalı."}</div>`;
  return `<div class="bank-grid">${accounts.map((b) => `<article class="bank-card"><div class="row"><span class="soft-icon">${icon("bank", 18)}</span><strong>${esc(b.bank_name)}</strong></div><p class="muted">${esc(b.account_holder)}</p><code>${esc(b.iban)}</code><div class="button-row"><button class="small-button" data-copy="${esc(b.iban)}">${icon("copy", 14)} Kopyala</button><span class="status ${b.is_active ? "ok" : "bad"}">${esc(b.status_label || "Aktif")}</span>${admin ? `<button class="small-button" data-bank-edit="${b.id}">Düzenle</button><button class="small-button" data-bank-toggle="${b.id}">${b.is_active ? "Pasifleştir" : "Aktif Et"}</button><button class="small-button" data-bank-delete="${b.id}">Sil</button>` : ""}</div></article>`).join("")}</div>`;
}

function moneyHistoryRows(reqs, txs) {
  const rows = [...reqs.map((m) => moneyRow(m)), ...txs.map(txRow)];
  return rows.length ? rows.join("") : `<div class="empty-state">Bakiye geçmişi yok.</div>`;
}

function moneyRow(m, admin = false) {
  const detail = [m.full_name, m.account_holder, m.bank_name, m.iban || m.account_ref, m.transfer_code ? `Kod: ${m.transfer_code}` : "", m.created_at_label].filter(Boolean).join(" · ");
  const cancel = !admin && m.request_type === "withdraw" && m.status === "pending" ? `<button class="small-button" data-money-cancel="${m.id}">İptal Et</button>` : "";
  const adminActions = admin && m.status === "pending" ? `<button class="small-button" data-admin-approve="money" data-id="${m.id}">${icon("check", 14)} Onayla</button><button class="small-button" data-admin-reject="money" data-id="${m.id}">Reddet</button>` : "";
  const receipt = m.receipt_url ? `<button class="small-button" data-doc-preview="${esc(m.receipt_url)}" data-doc-title="Dekont" data-doc-subtitle="${esc(m.receipt_name || m.type_label)}">${icon("file", 14)} Dekont</button>` : "";
  return `<div class="request-row"><div><strong>${esc(m.type_label)}</strong><p class="muted">${esc(detail)}</p></div><div class="button-row"><strong>${money(m.amount)}</strong><span class="status ${statusClass(m.status)}">${esc(m.status_label)}</span>${receipt}${cancel}${adminActions}</div></div>`;
}

function latestIdentityDocs(docs) {
  const map = {};
  docs.forEach((doc) => {
    if (!map[doc.doc_type]) map[doc.doc_type] = doc;
  });
  return map;
}

function identityPanel(docs) {
  const docTypes = [
    ["identity_front", "Kimlik Ön Yüz", "T.C. kimlik kartınızın ön yüzünü yükleyin."],
    ["identity_back", "Kimlik Arka Yüz", "T.C. kimlik kartınızın arka yüzünü yükleyin."],
    ["selfie", "Yüz Doğrulama", "Kimliğinizle eşleşen net bir selfie yükleyin."],
  ];
  const latest = latestIdentityDocs(docs);
  const testAccount = Boolean(state.me.is_test_user);
  const approved = state.me.kyc_status === "approved";
  const submittedAll = docTypes.every(([type]) => latest[type]);
  const timeline = [["awaiting_back", "Belge"], ["under_review", "İnceleme"], ["approved", "Onay"]]
    .map(([step, label]) => `<span class="${state.me.kyc_status === step || state.me.status === "approved" && step === "approved" || submittedAll && step === "under_review" ? "active" : ""}">${label}</span>`)
    .join("");
  const docRows = docTypes.map(([type, label, copy]) => {
    const doc = latest[type];
    return `<div class="document-status-row"><div>${icon(doc ? "file" : "upload", 16)}<div><strong>${label}</strong><p class="muted">${doc ? `${esc(doc.status_label)} · ${esc(doc.created_at_label || "")}` : copy}</p></div></div>${doc ? `<button type="button" class="small-button" data-doc-preview="${esc(doc.url)}" data-doc-title="${label}" data-doc-subtitle="${esc(doc.status_label)}" data-doc-type="${esc(doc.content_type)}">Görüntüle</button>` : `<span class="status warn">Bekleniyor</span>`}</div>`;
  }).join("");
  const uploadForm = testAccount ? `<div class="approval-alert">${icon("shield", 18)} <span>Bu hesap test kullanıcısı olarak işaretlidir; kimlik doğrulama durumu “Test Hesabı” olarak gösterilir.</span></div>` : approved ? `<div class="approval-alert success-alert">${icon("check", 18)} <span>Üç belgeniz ayrı ayrı incelendi ve kimlik doğrulamanız tamamlandı.</span></div>` : `<form id="identity-form" class="identity-upload-form"><div class="upload-grid">${docTypes.map(([type, label, copy]) => `<label class="upload-box">${icon("upload")}<strong>${label}</strong><span>${copy}</span><input name="${type}" type="file" accept="image/jpeg,image/png,image/webp" required /></label>`).join("")}</div><button class="primary-button" type="submit">${icon("shield")} Belgeleri Onaya Gönder</button></form>`;
  return `<div class="content-card identity-card"><div class="toolbar compact"><div><h2>Kimlik Doğrulama</h2><p class="muted">${testAccount ? "Test hesabı durumu açıkça ayrıştırılmıştır." : approved ? "Kimlik doğrulama süreci tamamlandı." : "Belgelerinizi yükleyin ve inceleme adımlarını buradan izleyin."}</p></div><span class="status ${statusClass(state.me.kyc_status)}">${esc(state.me.kyc_status_label || state.me.kyc_status)}</span></div>${testAccount ? "" : `<div class="kyc-timeline">${timeline}</div><div class="document-list">${docRows}</div>`}${state.me.kyc_note ? `<div class="approval-alert" style="margin-top:12px;">${icon("clock", 18)} <span>${esc(state.me.kyc_note)}</span></div>` : ""}${uploadForm}</div>`;
}

function securityPanel() {
  const security = state.security || { sessions: [], two_factor_enabled: Boolean(state.me?.two_factor_enabled) };
  return `<section class="content-card security-card"><div class="toolbar compact"><div><h2>Hesap Güvenliği</h2><p class="muted">İki aşamalı doğrulama ve aktif oturumlar.</p></div><span class="status ${security.two_factor_enabled ? "ok" : "warn"}">2FA ${security.two_factor_enabled ? "Açık" : "Kapalı"}</span></div>${security.two_factor_enabled ? `<form id="two-factor-disable-form" class="inline-security-form"><label class="field"><span>Mevcut şifre</span><input name="current_password" type="password" autocomplete="current-password" required /></label><button class="ghost-button danger-button">2FA'yı Kapat</button></form>` : `<form id="two-factor-setup-form" class="inline-security-form"><label class="field"><span>Mevcut şifre</span><input name="current_password" type="password" autocomplete="current-password" required /></label><button class="ghost-button">${icon("shield", 17)} 2FA Kurulumu Başlat</button></form>`}<div class="session-list">${security.sessions.map((session) => `<article><div><strong>${session.current ? "Bu cihaz" : "Aktif oturum"}</strong><span>${esc(session.device)}</span><small>${esc(session.ip_address || "-")} · ${esc(session.last_seen_at)}</small></div><span class="status ${session.current ? "ok" : "warn"}">${session.current ? "Mevcut" : "Açık"}</span></article>`).join("") || `<div class="empty-state">Aktif oturum bilgisi yükleniyor.</div>`}</div><button class="small-button" type="button" data-revoke-sessions>Diğer Oturumları Kapat</button></section>`;
}

function profilePage() {
  const account = state.portfolio?.account || {};
  const positions = state.portfolio?.positions || [];
  const txs = state.portfolio?.transactions || [];
  const docs = state.portfolio?.documents || [];
  const initials = state.me.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const approved = state.me.status === "approved";
  const actionBlock = approved ? `<div class="button-row" style="margin-top:18px;"><button type="button" class="primary-button" data-money-shortcut="deposit">${icon("upload", 18)} TL Yükle</button><button type="button" class="ghost-button" data-money-shortcut="withdraw">${icon("download", 18)} TL Çek</button><button type="button" class="ghost-button" data-money-shortcut="credit">${icon("shield", 18)} Kredili Yatırım</button>${state.me.role === "admin" ? `<a href="/esube/admin" data-link class="ghost-button">Yönetim Paneli</a>` : ""}</div>` : `<div class="approval-alert" style="margin-top:18px;">${icon("clock", 18)} <span>Kimlik belgeleriniz onaylandıktan sonra yatırım ve para işlemleri açılır.</span></div>`;
  return `<div class="grid grid-2"><article class="content-card profile-hero"><div class="row"><span class="avatar">${esc(initials)}</span><div><h1>${esc(state.me.full_name)}</h1><span class="status ${statusClass(state.me.status)}">${esc(state.me.status_label)}</span></div></div><div class="profile-facts"><span>Hesap No <strong>${esc(state.me.account_no)}</strong></span><span>Kimlik <strong>${esc(state.me.kyc_status_label || state.me.kyc_status)}</strong></span><span>Risk Profili <strong>${esc(state.me.risk_profile || "Değerlendirilmedi")}</strong></span></div>${actionBlock}</article><article class="content-card"><h2>Kişisel Bilgiler</h2><p class="muted">E-posta: ${esc(state.me.email)}</p><p class="muted">Telefon: ${esc(state.me.phone)}</p><p class="muted">Şehir/İlçe: ${esc([state.me.city, state.me.district].filter(Boolean).join(" / "))}</p><p class="muted">Doğum Tarihi: ${esc(state.me.birth_date || "-")}</p><p class="muted">Adres: ${esc(state.me.address || "-")}</p></article></div><div style="margin-top:20px;">${identityPanel(docs)}</div>${approved ? `<div style="margin-top:20px;">${accountCards()}</div>` : ""}<div class="grid grid-2" style="margin-top:20px;"><form class="content-card" id="password-form"><h2>Şifre Değiştir</h2><div class="field-grid"><label class="field full"><span>Mevcut Şifre</span><input name="current_password" type="password" autocomplete="current-password" required /></label><label class="field full"><span>Yeni Şifre</span><input name="new_password" type="password" minlength="10" autocomplete="new-password" required /><small>En az 10 karakter, büyük/küçük harf ve rakam.</small></label></div><button class="primary-button" style="margin-top:14px;">${icon("lock", 18)} Şifreyi Güncelle</button></form>${securityPanel()}</div><div class="content-card" style="margin-top:20px;"><h2>Son Hesap Hareketleri</h2><div class="list">${txs.slice(0, 6).map(txRow).join("") || `<div class="empty-state">Henüz hareket yok.</div>`}</div></div><div class="profile-logout-card"><button type="button" class="ghost-button danger-button" data-action="logout">${icon("arrow", 18)} Çıkış Yap</button></div>`;
}

function profilePageLegacyV2() {
  const account = state.portfolio?.account || {};
  const docs = state.portfolio?.documents || [];
  const txs = state.portfolio?.transactions || [];
  const initials = state.me.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  const menuRow = (ico, label, content, open = false) => `<details class="account-detail" ${open ? "open" : ""}><summary>${icon(ico, 21)}<span>${label}</span>${icon("arrow", 18)}</summary><div class="account-detail-body">${content}</div></details>`;
  const personal = `<dl class="account-facts"><div><dt>Ad Soyad</dt><dd>${esc(state.me.full_name)}</dd></div><div><dt>T.C. Kimlik No</dt><dd>${esc(state.me.tc_masked || "***********")}</dd></div><div><dt>E-posta</dt><dd>${esc(state.me.email)}</dd></div><div><dt>Telefon</dt><dd>${esc(state.me.phone)}</dd></div><div><dt>Şehir / İlçe</dt><dd>${esc([state.me.city, state.me.district].filter(Boolean).join(" / "))}</dd></div><div><dt>Adres</dt><dd>${esc(state.me.address || "-")}</dd></div></dl>`;
  const password = `<form id="password-form" class="account-inline-form"><label class="field"><span>Mevcut Şifre</span><input name="current_password" type="password" autocomplete="current-password" required /></label><label class="field"><span>Yeni Şifre</span><input name="new_password" type="password" minlength="10" autocomplete="new-password" required /></label><button class="primary-button">Şifreyi Güncelle</button></form>`;
  return `<section class="account-profile-card"><span class="account-avatar">${esc(initials)}</span><div><h2>${esc(state.me.full_name)}</h2><p>Müşteri No: ${esc(state.me.account_no)}</p><span class="verified-badge">${icon("check", 14)} ${esc(state.me.status_label)}</span></div>${icon("arrow", 21)}</section><section class="account-money-actions"><button type="button" data-money-shortcut="deposit"><span>${icon("upload", 23)}</span>Para Yatır</button><button type="button" data-money-shortcut="withdraw"><span>${icon("download", 23)}</span>Para Çek</button><a href="/esube/money" data-link><span>${icon("bank", 23)}</span>Banka Hesaplarım</a></section><h3 class="account-section-title">Güvenlik</h3><section class="account-menu-card">${menuRow("lock", "Şifre ve Giriş Güvenliği", password)}${menuRow("shield", "İki Adımlı Doğrulama", securityPanel())}${menuRow("fingerprint", "Biyometrik Giriş", `<div class="toggle-list"><label>Biyometrik girişi kullan <input type="checkbox" /></label></div>`)}${menuRow("device", "Cihaz Yönetimi", securityPanel())}</section><h3 class="account-section-title">Kimlik ve Bilgiler</h3><section class="account-menu-card">${menuRow("file", "Kimlik Bilgilerim", personal)}${menuRow("user", "İletişim Bilgilerim", personal)}${menuRow("location", "Adres Bilgilerim", personal)}${menuRow("file", "Vergi Bilgilerim", personal)}</section><h3 class="account-section-title">Hesap ve İşlemler</h3><section class="account-menu-card">${menuRow("pie", "İşlem Limitleri", `<div class="account-balance-detail"><strong>${money(account.cash_balance)}</strong><span>Kullanılabilir bakiye</span></div>`)}${menuRow("news", "Bildirim Tercihleri", `<div class="toggle-list"><label>Emir bildirimleri <input type="checkbox" checked /></label><label>Piyasa bildirimleri <input type="checkbox" checked /></label></div>`)}${menuRow("file", "Sözleşmeler ve Belgeler", `<div class="account-link-list"><a href="/kvkk" data-link>KVKK Aydınlatma Metni</a><a href="/mesafeli-sozlesme" data-link>Mesafeli Sözleşme</a><a href="/risk-bildirimi" data-link>Risk Bildirim Formu</a></div>`)}${menuRow("help", "Yardım / Destek", `<div class="account-link-list"><a href="/iletisim" data-link>Destek Merkezi</a></div>`)}${menuRow("clock", "Son Hesap Hareketleri", `<div class="list">${txs.slice(0, 6).map(txRow).join("") || `<div class="empty-state">Henüz hareket yok.</div>`}</div>`)}</section><button type="button" class="account-logout" data-action="logout">${icon("arrow", 20)} Çıkış Yap</button>`;
}

function referenceMenuLink(href, ico, label, detail = "") {
  return `<a class="reference-menu-link" href="${href}" data-link>${icon(ico, 21)}<span><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ""}</span>${icon("arrow", 18)}</a>`;
}

function profilePageV2() {
  const initials = state.me.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  const avatar = state.me.avatar_url ? `<img class="account-avatar-img" src="${esc(state.me.avatar_url)}" alt="" />` : `<span class="account-avatar">${esc(initials)}</span>`;
  return `<section class="account-profile-card">${avatar}<div><h2>${esc(state.me.full_name)}</h2><p>Müşteri No: ${esc(state.me.account_no)}</p><span class="verified-badge">${icon("check", 14)} ${esc(state.me.status_label)}</span></div><button type="button" class="small-button" data-demo-action="Profil fotoğrafı seç">${icon("user", 15)} Fotoğraf</button></section><a class="reference-opportunity" href="/esube/support" data-link><strong>Referans Fırsatları</strong><span>Tıklayın, referansınızla iletişime geçin.</span>${icon("arrow", 18)}</a><section class="account-money-actions"><button type="button" data-money-shortcut="deposit"><span>${icon("upload", 23)}</span>Para Yatır</button><button type="button" data-money-shortcut="withdraw"><span>${icon("download", 23)}</span>Para Çek</button><a href="/esube/money" data-link><span>${icon("bank", 23)}</span>Banka Hesaplarım</a></section><h3 class="account-section-title">Güvenlik</h3><section class="account-menu-card">${referenceMenuLink("/esube/profile/security", "lock", "Şifre ve Giriş Güvenliği")}${referenceMenuLink("/esube/profile/security", "device", "Cihaz Yönetimi")}</section><h3 class="account-section-title">Kimlik ve Bilgiler</h3><section class="account-menu-card">${referenceMenuLink("/esube/profile/identity", "id", "Kimlik Bilgilerim")}${referenceMenuLink("/esube/profile/identity", "user", "İletişim Bilgilerim")}${referenceMenuLink("/esube/profile/identity", "location", "Adres Bilgilerim")}${referenceMenuLink("/esube/profile/documents", "file", "Vergi Bilgilerim")}</section><h3 class="account-section-title">Hesap ve İşlemler</h3><section class="account-menu-card">${referenceMenuLink("/esube/profile/overview", "pie", "İşlem Limitleri")}${referenceMenuLink("/esube/notifications", "bell", "Bildirim Tercihleri")}${referenceMenuLink("/esube/profile/documents", "file", "Sözleşmeler ve Belgeler")}</section><button type="button" class="account-logout" data-action="logout">${icon("arrow", 20)} Çıkış Yap</button>`;
}

function subpageFrame(body, footer = "") {
  return `<section class="reference-subpage">${body}</section>${footer}`;
}

function accountOverviewPage() {
  const account = state.portfolio?.account || {};
  const rows = [
    ["Hesap Özeti", "pie", "/esube/portfolio"], ["Varlıklarım", "wallet", "/esube/portfolio/holdings"],
    ["Para Hareketleri", "bank", "/esube/transactions"], ["Emirlerim", "file", "/esube/orders"],
    ["Bildirimler", "bell", "/esube/notifications"], ["Raporlarım", "report", "/esube/profile/documents"],
    ["Belgelerim", "file", "/esube/profile/documents"]
  ];
  return subpageFrame(`<div class="account-overview-balance"><span>Kullanılabilir Bakiye</span><strong>${money(account.cash_balance)}</strong><small>Bekleyen satış: ${money(account.pending_balance)}</small></div><div class="reference-list-card">${rows.map(([label, ico, href]) => referenceMenuLink(href, ico, label)).join("")}</div>`);
}

function accountSecurityPage() {
  const password = `<form id="password-form" class="reference-form"><label>Mevcut Şifre<input name="current_password" type="password" required /></label><label>Yeni Şifre<input name="new_password" type="password" minlength="10" required /></label><button class="primary-button">Şifreyi Güncelle</button></form>`;
  return subpageFrame(`<div class="security-hero-icon">${icon("shield", 34)}</div><div class="reference-list-card security-compact"><details class="reference-detail" open><summary>${icon("lock", 20)}<span>Şifre Değiştir</span>${icon("arrow", 17)}</summary>${password}</details>${referenceMenuLink("/esube/profile/security", "device", "İşlem Onayı")}${referenceMenuLink("/esube/profile/security", "device", "Güvenilir Cihazlar")}${referenceMenuLink("/esube/profile/security", "device", "Aktif Oturumlar")}</div><small class="last-login">Son giriş: 14.09.2026 10:42</small>`);
}

function accountIdentityPage() {
  const emailMissing = !state.me?.email || state.me.email.trim() === "";
  const warningBanner = emailMissing ? `<div class="rf-warning-banner">${icon("alert", 20)} <span>E-postanızı giriniz. Önemli bildirimler ve hesap dökümleri için e-posta gereklidir.</span></div>` : "";
  const facts = [
    ["Ad Soyad", state.me.full_name],
    ["T.C. Kimlik No", state.me.tc_masked || "***********"],
    ["Doğum Tarihi", state.me.birth_date || "15.05.1990"],
    ["E-posta", state.me.email || "Tanımlanmadı (E-postanızı giriniz)"],
    ["Telefon", state.me.phone],
    ["Adres", state.me.address || [state.me.city, state.me.district].filter(Boolean).join(" / ") || "-"],
    ["Tebligat Tercihi", "E-posta"]
  ];
  return subpageFrame(`${warningBanner}<div class="reference-list-card identity-facts">${facts.map(([key, value]) => `<div><span>${key}</span><strong>${esc(value)}</strong>${icon("arrow", 15)}</div>`).join("")}</div>`);
}

function accountDocumentsPage() {
  const docs = state.portfolio?.documents || [];
  const links = [["Sözleşmelerim", "file"], ["Hesap Dökümleri", "report"], ["Vergi Formları", "file"], ["İşlem Dekontları", "file"], ["Diğer Belgeler", "list"]];
  return subpageFrame(`<div class="reference-list-card">${links.map(([label, ico]) => `<button type="button" class="reference-menu-link" data-demo-action="${label}">${icon(ico, 21)}<span><strong>${label}</strong><small>${docs.length ? `${docs.length} belge kayıtlı` : "Görüntüle ve indir"}</small></span>${icon("arrow", 18)}</button>`).join("")}</div>`);
}

function ordersPage() {
  const orders = state.portfolio?.orders || [];
  const open = orders.filter((item) => item.status === "pending");
  const done = orders.filter((item) => item.status !== "pending");
  const visible = state.ordersTab === "open" ? open : done;
  return subpageFrame(`<div class="reference-segments"><button data-orders-tab="open" class="${state.ordersTab === "open" ? "active" : ""}">Açık Emirlerim</button><button data-orders-tab="done" class="${state.ordersTab === "done" ? "active" : ""}">Gerçekleşen Emirlerim</button></div><div class="reference-list-card order-reference-list">${visible.map((item) => orderRow(item)).join("") || `<div class="empty-state">Bu sekmede emir bulunmuyor.</div>`}</div>`);
}

function notificationsPage() {
  const txs = state.portfolio?.transactions || [];
  const notifications = txs.slice(0, 5).map((item, index) => ({ title: item.type_label || "İşlem Gerçekleşti", text: item.note || `${item.code || "Hisse"} işleminiz güncellendi.`, time: item.created_at_label || `${index + 9}:00`, ico: item.type === "sell" ? "download" : "check" }));
  notifications.unshift({ title: "Referans Bildirimi", text: "Referansınızla yapılan işlemler burada görüntülenir.", time: "Bugün", ico: "bell" });
  if (!notifications.length) notifications.push({ title: "Piyasa Açıldı", text: "Günlük piyasa verileri güncellendi.", time: "09:40", ico: "chart" });
  const visible = state.notificationsTab === "unread" ? notifications.slice(0, 2) : notifications;
  return subpageFrame(`<div class="notification-toolbar"><button data-notifications-tab="all" class="${state.notificationsTab === "all" ? "active" : ""}">Tümü</button><button data-notifications-tab="unread" class="${state.notificationsTab === "unread" ? "active" : ""}">Okunmamış</button></div><div class="reference-list-card notification-list">${visible.map((item) => `<article><span>${icon(item.ico, 20)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div><time>${esc(item.time)}</time></article>`).join("")}</div>`);
}

function favoritesPage() {
  const quotes = state.market.filter((item) => (item.asset_class || "stock") === "stock").slice(0, 7);
  return subpageFrame(`<div class="reference-list-card favorite-list">${quotes.map((q) => `<button type="button" data-company="${esc(q.symbol)}">${icon("star", 18)}<span><strong>${esc(q.symbol)}</strong><small>${esc(q.name)}</small></span><b>${money(q.price)}</b><em class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</em></button>`).join("")}</div><button class="primary-button favorite-add" type="button" data-search-open>+ HİSSE EKLE</button>`);
}

function supportPage() {
  return subpageFrame(`<form id="support-form" class="reference-form referral-form"><h2>Referans Fırsatları</h2><p class="muted">Referansınızla iletişime geçmek için bilgilerinizi bırakın.</p><label>Ad Soyad<input name="full_name" value="${esc(state.me?.full_name || "")}" required /></label><label>E-posta<input name="email" type="email" value="${esc(state.me?.email || "")}" placeholder="E-posta adresiniz" /></label><label>Not<textarea name="message" minlength="10" placeholder="Referansınız için kısa not"></textarea></label><button class="primary-button">${icon("check", 18)} Talebi Oluştur</button></form>`);
}

function portfolioSubPage(mode) {
  const positions = state.portfolio?.positions || [];
  const orders = state.portfolio?.orders || [];
  const txs = state.portfolio?.transactions || [];
  const tabs = `<div class="reference-segments three"><a href="/esube/portfolio/holdings" data-link class="${mode === "holdings" ? "active" : ""}">Elde Olanlar</a><a href="/esube/portfolio/sold" data-link class="${mode === "sold" ? "active" : ""}">Satılanlar</a><a href="/esube/portfolio/history" data-link class="${mode === "history" ? "active" : ""}">Geçmiş</a></div>`;
  if (mode === "sold") {
    const sold = orders.filter((item) => item.side === "sell");
    return subpageFrame(`${tabs}<div class="reference-list-card">${sold.map((item) => orderRow(item)).join("") || `<div class="empty-state">Satılan varlık bulunmuyor.</div>`}</div>`);
  }
  if (mode === "history") return subpageFrame(`${tabs}<div class="reference-list-card">${txs.map(txRow).join("") || `<div class="empty-state">Geçmiş işlem bulunmuyor.</div>`}</div>`);
  const total = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0);
  return subpageFrame(`<div class="subpage-total"><span>Toplam Değer</span><strong>${money(total)}</strong></div>${tabs}<div class="reference-list-card compact-holdings">${positions.map((p) => `<button type="button" data-company="${esc(p.symbol)}"><span class="market-identity">${stockLogo(p.symbol, p.name)}<span><strong>${esc(p.symbol)}</strong><small>${esc(p.name)} · ${number(p.quantity)} Adet</small></span></span><span><b>${money(p.current_price)}</b><em class="${p.pnl >= 0 ? "up" : "down"}">${money(p.pnl)}</em></span></button>`).join("")}</div>`);
}

function renderAdmin() {
  if (state.path === "/esube/admin/builder") {
    app.innerHTML = appLayout(adminSiteBuilderPage(), true);
    return;
  }
  if (state.path === "/esube/admin/studio") {
    app.innerHTML = appLayout(adminStudioPage(), true);
    return;
  }
  const page = { 
    "/esube/admin": adminSummaryPage, 
    "/esube/admin/builder": adminSiteBuilderPage,
    "/esube/admin/studio": adminStudioPage,
    "/esube/admin/users": adminUsersPage, 
    "/esube/admin/portfolios": adminPortfoliosPage, 
    "/esube/admin/user-balances": adminBalancesPage, 
    "/esube/admin/credit-applications": () => adminMoneyFilteredPage("Kredi Başvuruları", "credit", "Kredili yatırım limit başvuruları."), 
    "/esube/admin/credit-settings": adminCreditSettingsPage, 
    "/esube/admin/t2-settlements": adminT2Page, 
    "/esube/admin/verifications": adminVerificationsPage, 
    "/esube/admin/bank-accounts": adminBankAccountsPage, 
    "/esube/admin/deposit-requests": () => adminMoneyFilteredPage("Para Yatırma Talepleri", "deposit", "Banka transferi sonrası onay bekleyen yatırımlar."), 
    "/esube/admin/deposits": () => adminMoneyFilteredPage("Para Yükleme", "deposit", "Onaylanan yatırımlar kullanıcı bakiyesine işlenir."), 
    "/esube/admin/withdrawals": () => adminMoneyFilteredPage("Para Çekme", "withdraw", "Kullanıcı IBAN bilgisiyle oluşturulan çekim talepleri."), 
    "/esube/admin/stock-descriptions": adminStockDescriptionsPage, 
    "/esube/admin/settings": adminSettingsPage, 
    "/esube/admin/orders": adminOrdersPage, 
    "/esube/admin/transactions": adminTransactionsPage, 
    "/esube/admin/money": adminMoneyPage, 
    "/esube/admin/reports": adminReportsPage 
  }[state.path] || adminSummaryPage;
  app.innerHTML = appLayout(page(), true);
}

function riskMini() {
  const s = state.admin.summary || {};
  return `<div class="approval-mini">${icon("shield")}<strong>Akıllı Operasyon</strong><span>${Number(s.pending_money || 0) + Number(s.pending_orders || 0) + Number(s.pending_users || 0)} bekleyen kontrol</span></div>`;
}

function adminSearchBox(placeholder = "Ara...") {
  return `<input class="search-box wide" data-admin-search value="${esc(state.adminQuery)}" placeholder="${esc(placeholder)}" />`;
}

function adminSummaryPage() {
  const s = state.admin.summary || {};
  const risk = Number(s.pending_users || 0) + Number(s.pending_orders || 0) + Number(s.pending_money || 0);
  const meta = state.marketMeta || {};
  const flow = [
    ["Borsa & Kotasyon", meta.ok ? "Canlı ve Doğrulandı" : "Son bilinen fiyat", `${state.market.length} BIST hisse kotasyonu`, "chart", "/esube/admin/settings"],
    ["Emir Defteri", `${s.pending_orders || 0} bekleyen`, "Piyasa anlık takas, limit emir kontrolü", "shield", "/esube/admin/orders"],
    ["Nakit & Transfer", `${s.pending_money || 0} onay bekleyen`, "Havale/EFT, IBAN mutabakatı ve dekont", "bank", "/esube/admin/deposit-requests"],
    ["İşlem Günlüğü", `${state.admin.transactions.length} kayıtlı hareket`, "Denetimli müşteri bazlı mali defter", "file", "/esube/admin/transactions"],
    ["T+2 Takas Masası", `${s.pending_t2 || 0} takas kaydı`, "Vadesi dolan satış bakiyeleri", "calendar", "/esube/admin/t2-settlements"],
    ["Marka & Stüdyo", `${state.publicConfig?.branding?.name || "PARİBU"} Aktif`, "Görsel mimari ve APK dışa aktarımı", "settings", "/esube/admin/studio"],
  ];
  return `<div class="toolbar executive-toolbar">
    <div>
      <div class="executive-tagline"><span class="live-indicator-dot"></span> <span>BORSA İSTANBUL &amp; ARACI KURUM GENEL MERKEZ MASASI</span></div>
      <h1>Yönetim ve Operasyon Merkezi</h1>
      <p class="muted">Yatırımcı portföyleri, emir defteri, T+2 takasları, banka mutabakatları ve marka mimarisi denetimi.</p>
    </div>
    <div class="button-row">
      <a class="primary-button pro-action-btn" href="/esube/admin/studio" data-link>${icon("settings", 16)} Uygulama Stüdyosu</a>
      <a class="ghost-button" href="/esube/admin/verifications" data-link>${icon("clock", 16)} Onay Bekleyenler (${s.pending_users || 0})</a>
      <a class="ghost-button" href="/esube/admin/reports" data-link>${icon("file", 16)} Mutabakat Raporu</a>
    </div>
  </div>

  <!-- Sistem Canlı Operasyon Durumu -->
  <div class="system-status-ribbon">
    <div class="status-item"><span class="live-dot ok"></span> <strong>Piyasa Veri Akışı:</strong> <span>${meta.ok ? "Canlı (BIST / FX)" : "Statik Yedek"}</span></div>
    <div class="status-item"><span class="live-dot ok"></span> <strong>T+2 Takas Motoru:</strong> <span>Otomatik Mutabakat Aktif</span></div>
    <div class="status-item"><span class="live-dot ok"></span> <strong>Mali Denetim İzi:</strong> <span>Tam Yetkili ve İmzalı</span></div>
    <div class="status-item"><span class="live-dot ${risk ? "warn" : "ok"}"></span> <strong>Risk Kuyruğu:</strong> <span>${risk ? `${risk} işlem incelemede` : "Risk Kontrolleri Normal"}</span></div>
  </div>

  <div class="dashboard-grid detailed-stats-grid" style="margin-top:16px;">
    ${[
      ["Toplam Yönetilen Nakit", money(s.cash_total), "Müşteri Serbest Nakit", "wallet", "accent-blue"],
      ["T+2 Takas Bekleyen Bakiye", money(s.pending_balance_total), "İşlem Gören Satışlar", "calendar", "accent-emerald"],
      ["Aktif Müşteri / Yatırımcı", s.users ?? 0, "Kayıtlı Portföy Sahibi", "user", "accent-slate"],
      ["Onay Bekleyen Kayıt (KYC)", s.pending_users ?? 0, "Kimlik İnceleme Bekliyor", "clock", s.pending_users ? "accent-amber" : "accent-slate"],
      ["Bekleyen Borsa Emirleri", s.pending_orders ?? 0, "Limit Alış/Satış Kuyruğu", "chart", "accent-slate"],
      ["Para Yatırma Talepleri", s.pending_deposits ?? 0, "Banka Dekont Doğrulama", "upload", s.pending_deposits ? "accent-emerald" : "accent-slate"],
      ["Para Çekme Talepleri (EFT)", s.pending_withdrawals ?? 0, "Kullanıcı IBAN Çıkışları", "download", s.pending_withdrawals ? "accent-red" : "accent-slate"],
      ["Toplam Bekleyen Finansal Talep", s.pending_money ?? 0, "Yatırma + Çekme + Kredi", "bank", "accent-slate"],
    ].map(([label, val, sub, ico, colorClass]) => `
      <article class="metric-card executive-metric ${colorClass}">
        <div class="metric-top">
          <span>${label}</span>
          ${icon(ico, 18)}
        </div>
        <strong class="tabular-nums">${val}</strong>
        <small class="muted">${sub}</small>
      </article>
    `).join("")}
  </div>

  <div class="content-card operations-card" style="margin-top:20px;">
    <div class="toolbar compact">
      <div>
        <h2>Kurumsal Operasyon Departmanları</h2>
        <p class="muted">Departman bazlı hızlı kontrol ve denetim bağlantıları.</p>
      </div>
    </div>
    <div class="grid grid-3" style="margin-top:10px;">
      ${flow.map(([title, value, copy, ico, href]) => `
        <a href="${href}" data-link class="discover-card corporate-card">
          <div class="discover-icon-wrap">${icon(ico, 22)}</div>
          <div class="discover-body">
            <strong>${title}</strong>
            <span class="discover-val">${value}</span>
            <span class="discover-copy">${copy}</span>
          </div>
        </a>
      `).join("")}
    </div>
  </div>

  <div class="grid grid-2" style="margin-top:20px;">
    <div class="content-card">
      <div class="toolbar compact">
        <div>
          <h2>Bekleyen Borsa Emirleri</h2>
          <p class="muted">İşlem onayı bekleyen limit emirler.</p>
        </div>
        <a class="small-button" href="/esube/admin/orders" data-link>Tümü (${state.admin.orders.length})</a>
      </div>
      <div class="list" style="margin-top:12px;">
        ${state.admin.orders.filter((o) => o.status === "pending").slice(0, 5).map((o) => orderRow(o, true)).join("") || `<div class="empty-state">Bekleyen emir bulunmuyor.</div>`}
      </div>
    </div>

    <div class="content-card">
      <div class="toolbar compact">
        <div>
          <h2>Bekleyen Para Talepleri</h2>
          <p class="muted">Banka transferi ve çekim onayları.</p>
        </div>
        <a class="small-button" href="/esube/admin/deposit-requests" data-link>Tümü (${state.admin.money.length})</a>
      </div>
      <div class="list" style="margin-top:12px;">
        ${state.admin.money.filter((m) => m.status === "pending").slice(0, 5).map((m) => moneyRow(m, true)).join("") || `<div class="empty-state">Bekleyen para talebi bulunmuyor.</div>`}
      </div>
    </div>
  </div>
</div>`;
}

function filteredUsers() {
  const q = state.adminQuery.toLocaleLowerCase("tr-TR");
  return state.admin.users.filter((u) => `${u.full_name} ${u.account_no} ${u.email} ${u.tc_masked} ${u.city} ${u.district}`.toLocaleLowerCase("tr-TR").includes(q));
}

function userDocuments(userId) {
  return state.admin.documents.filter((d) => d.user_id === userId);
}

function adminUsersPage() {
  return `<div class="toolbar"><div><h1>Tüm Kullanıcılar</h1><p class="muted">Kayıt durumu, belge kontrolü, iletişim ve kullanıcı düzenleme.</p></div></div>${adminSearchBox("Ad, soyad, hesap no veya TC ile ara...")}<div class="list" style="margin-top:18px;">${filteredUsers().map(userAdminRow).join("") || `<div class="empty-state">Kullanıcı bulunamadı.</div>`}</div>`;
}

function userAdminRow(u) {
  const docs = userDocuments(u.id);
  const quickFacts = [
    ["Hesap", u.account_no],
    ["İl/İlçe", [u.city, u.district].filter(Boolean).join(" / ") || "-"],
    ["Kayıt", u.created_at],
    ["Nakit", money(u.cash_balance)],
    ["Bekleyen Satış", money(u.pending_balance)],
    ["Kredi", money(u.credit_limit)],
  ];
  const canReview = u.role === "user" && ["pending", "under_review", "awaiting_back"].includes(u.status);
  return `<details class="user-admin-card"><summary><div><div class="user-name">${esc(u.full_name)}</div><span class="muted">${esc(u.tc_masked || "")} · ${esc(u.email)} · Belge: ${u.document_count}</span><div class="admin-user-facts">${quickFacts.map(([k, v]) => `<span>${esc(k)} <strong>${esc(v)}</strong></span>`).join("")}</div><span class="status ${statusClass(u.status)}">${esc(u.status_label)}</span> <span class="status ${statusClass(u.kyc_status)}">${esc(u.kyc_status_label || u.kyc_status)}</span></div><div class="button-row">${canReview ? `<button class="small-button" data-admin-approve="users" data-id="${u.id}">${icon("check", 14)} Onayla</button><button class="small-button" data-admin-reject="users" data-id="${u.id}">Reddet</button>` : ""}<span class="small-button">Düzenle</span></div></summary><div class="grid grid-2 user-edit-grid"><form id="admin-user-form" class="content-card"><input type="hidden" name="user_id" value="${u.id}" /><div class="field-grid"><label class="field"><span>Ad Soyad</span><input name="full_name" value="${esc(u.full_name)}" /></label><label class="field"><span>Telefon</span><input name="phone" value="${esc(u.phone || "")}" /></label><label class="field"><span>E-posta</span><input name="email" value="${esc(u.email)}" /></label><label class="field"><span>Şehir</span><input name="city" value="${esc(u.city || "")}" /></label><label class="field"><span>İlçe</span><input name="district" value="${esc(u.district || "")}" /></label><label class="field"><span>Doğum Tarihi</span><input name="birth_date" type="date" value="${esc(u.birth_date || "")}" /></label><label class="field full"><span>Adres</span><textarea name="address">${esc(u.address || "")}</textarea></label><label class="field"><span>Durum</span><select name="status"><option value="pending" ${u.status === "pending" ? "selected" : ""}>Beklemede</option><option value="under_review" ${u.status === "under_review" ? "selected" : ""}>İnceleniyor</option><option value="awaiting_back" ${u.status === "awaiting_back" ? "selected" : ""}>Belge Bekleniyor</option><option value="approved" ${u.status === "approved" ? "selected" : ""}>Onaylandı</option><option value="rejected" ${u.status === "rejected" ? "selected" : ""}>Reddedildi</option></select></label><label class="field full"><span>Kimlik Notu</span><textarea name="kyc_note">${esc(u.kyc_note || "")}</textarea></label></div><button class="primary-button" style="margin-top:14px;">Kaydet</button></form><div class="content-card"><h3>Belgeler</h3><div class="document-list">${docs.map((d) => `<div class="document-review-row"><button class="file-chip" data-doc-preview="${esc(d.url)}" data-doc-title="${esc(d.type_label)}" data-doc-subtitle="${esc(u.full_name)} · ${esc(d.status_label)}" data-doc-type="${esc(d.content_type)}">${icon("file", 14)} ${esc(d.type_label)} <strong>${esc(d.status_label)}</strong></button><div class="button-row"><button class="small-button" data-doc-action="approve" data-doc-id="${d.id}">${icon("check", 14)} Belge Onay</button><button class="small-button" data-doc-action="retry" data-doc-id="${d.id}">Tekrar İste</button><button class="small-button" data-doc-action="reject" data-doc-id="${d.id}">Reddet</button></div>${d.review_note ? `<p class="muted">${esc(d.review_note)}</p>` : ""}</div>`).join("") || `<div class="empty-state">Belge yok.</div>`}</div></div></div></details>`;
}

function adminOrdersPage() {
  const rows = state.admin.orders.filter((o) => `${o.symbol} ${o.full_name}`.toLocaleLowerCase("tr-TR").includes(state.adminQuery.toLocaleLowerCase("tr-TR")));
  return `<div class="toolbar"><div><h1>Yatırım Emirleri</h1><p class="muted">Piyasa emirleri anlık gerçekleşir; limit emirler fiyat ve bakiye kontrolü sonrası beklemeye alınır.</p></div></div>${adminSearchBox("Kullanıcı, referans veya hisse ara...")}<div class="list" style="margin-top:18px;">${rows.map((o) => orderRow(o, true)).join("") || `<div class="empty-state">Emir yok.</div>`}</div>`;
}

function adminMoneyPage() {
  return `<div class="toolbar"><div><h1>Para Talepleri</h1><p class="muted">Yatırma, çekme ve kredi talepleri.</p></div></div><div class="list">${state.admin.money.map((m) => moneyRow(m, true)).join("") || `<div class="empty-state">Talep yok.</div>`}</div>`;
}

function adminTransactionsPage() {
  const q = state.adminQuery.toLocaleLowerCase("tr-TR");
  const rows = state.admin.transactions.filter((t) => `${t.full_name} ${t.code} ${t.name} ${t.type_label} ${t.note}`.toLocaleLowerCase("tr-TR").includes(q));
  return `<div class="toolbar"><div><h1>Tüm İşlem Geçmişi</h1><p class="muted">Müşteri bazlı para, alım/satım, bakiye ve kredi hareketleri.</p></div></div>${adminSearchBox("Müşteri, hisse, işlem tipi veya not ara...")}<div class="table-wrap" style="margin-top:18px;"><table><thead><tr><th>Müşteri</th><th>İşlem</th><th>Kod</th><th>Adet</th><th>Fiyat</th><th>Tutar</th><th>Önce</th><th>Sonra</th><th>Tarih</th></tr></thead><tbody>${rows.map(adminTxTableRow).join("") || `<tr><td colspan="9">İşlem kaydı yok.</td></tr>`}</tbody></table></div>`;
}

function adminTxTableRow(t) {
  return `<tr><td>${esc(t.full_name || "-")}<br><small>${esc(t.reference || "")}</small></td><td><strong>${esc(t.type_label)}</strong><br><span class="muted">${esc(t.note || "")}</span></td><td>${esc(t.code || "-")}</td><td>${t.quantity || "-"}</td><td>${t.price ? money(t.price) : "-"}</td><td><strong>${money(t.total)}</strong></td><td>${money(t.balance_before)}</td><td>${money(t.balance_after)}</td><td>${esc(t.created_at_label)}</td></tr>`;
}

function adminMoneyFilteredPage(title, type, copy) {
  const rows = state.admin.money.filter((m) => m.request_type === type);
  return `<div class="toolbar"><div><h1>${esc(title)}</h1><p class="muted">${esc(copy)}</p></div></div><div class="list">${rows.map((m) => moneyRow(m, true)).join("") || `<div class="empty-state">Kayıt yok.</div>`}</div>`;
}

function adminVerificationsPage() {
  const rows = state.admin.users.filter((u) => u.role === "user" && u.status === "pending");
  return `<div class="toolbar"><div><h1>Onay Bekleyenler</h1><p class="muted">Kimlik görselleri yönetim panelinden görüntülenir ve onaylanır.</p></div></div><div class="list">${rows.map(userAdminRow).join("") || `<div class="empty-state">Onay bekleyen kayıt yok.</div>`}</div>`;
}

function adminBalancesPage() {
  return `<div class="toolbar"><div><h1>Bakiye Detayları</h1><p class="muted">Kullanıcı nakit, satış bakiyesi, kredi ve kontrollü bakiye işlemleri.</p></div></div><form class="content-card" id="admin-balance-form"><div class="field-grid"><label class="field"><span>Kullanıcı</span><select name="user_id">${state.admin.users.filter((u) => u.role === "user").map((u) => `<option value="${u.id}">${esc(u.full_name)}</option>`).join("")}</select></label><label class="field"><span>İşlem</span><select name="action"><option value="set">Direkt Bakiye Belirle (Ana Bakiye)</option><option value="add">TL Yükle</option><option value="subtract">TL Çıkar</option><option value="credit">Kredi Limiti Ekle</option></select></label><label class="field"><span>Tutar</span><input name="amount" type="number" min="1" value="1000" required /></label><label class="field"><span>İşlem Gerekçesi</span><input name="note" minlength="8" maxlength="300" placeholder="Denetim kaydında görünecek açıklama" required /></label></div><button class="primary-button" style="margin-top:14px;">Bakiye İşle</button></form><div class="table-wrap" style="margin-top:20px;"><table><thead><tr><th>Kullanıcı</th><th>Nakit</th><th>Satış Bakiyesi</th><th>Kredi</th><th>Durum</th></tr></thead><tbody>${state.admin.balances.map((b) => `<tr><td>${esc(b.full_name)}</td><td>${money(b.cash_balance)}</td><td>${money(b.pending_balance)}</td><td>${money(b.credit_limit)}</td><td><span class="status ${statusClass(b.status)}">${esc(b.status)}</span></td></tr>`).join("") || `<tr><td colspan="5">Kayıt yok.</td></tr>`}</tbody></table></div>`;
}

function adminPortfoliosPage() {
  return `<div class="toolbar"><div><h1>Portföy Yönetimi</h1><p class="muted">Tüm kullanıcı pozisyonları ve denetlenen portföy düzeltmeleri.</p></div></div><form class="content-card" id="admin-position-form"><div class="field-grid"><label class="field"><span>Kullanıcı</span><select name="user_id">${state.admin.users.filter((u) => u.role === "user").map((u) => `<option value="${u.id}">${esc(u.full_name)}</option>`).join("")}</select></label><label class="field"><span>İşlem</span><select name="action"><option value="set">Pozisyonu Ayarla</option><option value="add">Ekle</option><option value="reduce">Azalt</option></select></label><label class="field"><span>Hisse</span><input name="symbol" value="AKBNK" required /></label><label class="field"><span>Adet</span><input name="quantity" type="number" min="0" value="100" required /></label><label class="field"><span>Fiyat</span><input name="price" type="number" step="0.01" min="0.01" value="1" required /></label><label class="field"><span>İşlem Gerekçesi</span><input name="note" minlength="8" maxlength="300" placeholder="Denetim kaydında görünecek açıklama" required /></label></div><button class="primary-button" style="margin-top:14px;">Portföyü Güncelle</button></form><div class="table-wrap" style="margin-top:20px;"><table><thead><tr><th>Kullanıcı</th><th>Hisse</th><th>Adet</th><th>Maliyet</th><th>Canlı Fiyat</th><th>Değer</th><th>K/Z</th></tr></thead><tbody>${state.admin.positions.map((p) => `<tr><td>${esc(p.full_name)}</td><td>${esc(p.symbol)}</td><td>${p.quantity}</td><td>${money(p.avg_price)}</td><td>${money(p.current_price)}</td><td>${money(p.market_value)}</td><td class="${p.pnl >= 0 ? "up" : "down"}">${money(p.pnl)}</td></tr>`).join("") || `<tr><td colspan="7">Pozisyon yok.</td></tr>`}</tbody></table></div>`;
}

function adminT2Page() {
  const enabled = state.admin.settings?.t2_enabled !== "0";
  return `<div class="toolbar"><div><h1>T+2 Satış Bakiyesi</h1><p class="muted">Satış tutarının işlem ve çekim bakiyesine geçişini yönetin.</p></div><span class="status ${enabled ? "ok" : "warn"}">${icon("calendar", 14)} ${enabled ? "Aktif" : "Kapalı"}</span></div><form class="content-card t2-admin-control" id="admin-t2-settings-form"><div><h2>T+2 takası ${enabled ? "aktif" : "kapalı"}</h2><p class="muted">Aktifken satış tutarı hemen yeni alımda kullanılabilir; çekim için iki iş günü bekler. Bu tutarla yeniden alım yapılırsa ilgili tutarın takas kaydı kapanır ve yeni satışta süre yeniden başlar.</p></div><label class="toggle-control"><input name="t2_enabled" type="checkbox" ${enabled ? "checked" : ""} /><span></span><b>${enabled ? "Açık" : "Kapalı"}</b></label><button class="primary-button" type="submit">Ayarı Kaydet</button></form><div class="list" style="margin-top:18px;">${state.admin.t2.map((s) => t2Row(s, true)).join("") || `<div class="empty-state">Bekleyen satış bakiyesi yok.</div>`}</div>`;
}

function adminBankAccountsPage() {
  const systemAccounts = state.admin.bank?.system_bank_accounts || [];
  const userAccounts = state.admin.bank?.user_bank_accounts || [];
  const edit = systemAccounts.find((b) => b.id === state.editBankId);
  return `<div class="toolbar"><div><h1>Banka Hesapları</h1><p class="muted">Sistem transfer hesapları ve kullanıcı çekim IBAN'ları.</p></div></div><div class="grid grid-2"><form class="content-card" id="system-bank-form"><h2>${edit ? "Sistem Hesabını Düzenle" : "Sistem Hesabı Ekle"}</h2><input type="hidden" name="id" value="${edit?.id || ""}" /><div class="field-grid"><label class="field"><span>Banka Adı</span><input name="bank_name" value="${esc(edit?.bank_name || "")}" required /></label><label class="field"><span>Hesap Sahibi</span><input name="account_holder" value="${esc(edit?.account_holder || "Güney Menkul Değerler A.Ş.")}" required /></label><label class="field full"><span>IBAN</span><input name="iban" value="${esc(edit?.iban || "")}" placeholder="TR..." required /></label><label class="field"><span>Şube</span><input name="branch_name" value="${esc(edit?.branch_name || "")}" /></label><label class="field"><span>Sıra</span><input name="sort_order" type="number" value="${esc(edit?.sort_order || 1)}" /></label><label class="field full checkbox-field"><input name="is_active" type="checkbox" ${!edit || edit.is_active ? "checked" : ""} /> Aktif</label><label class="field full"><span>Açıklama</span><textarea name="description">${esc(edit?.description || "")}</textarea></label></div><button class="primary-button" style="margin-top:18px;" type="submit">${icon("bank")} Hesabı Kaydet</button></form><div class="content-card"><h2>Sistem Hesapları</h2>${systemBankAccountsPanel(systemAccounts, true)}</div></div><div class="content-card" style="margin-top:20px;"><h2>Kullanıcı Çekim Hesapları</h2><div class="list">${userAccounts.map((b) => `<div class="request-row"><div><strong>${esc(b.full_name)} · ${esc(b.bank_name)}</strong><p class="muted">${esc(b.account_holder)} · ${esc(b.iban)}</p></div><span>${esc(b.created_at_label)}</span></div>`).join("") || `<div class="empty-state">Kullanıcı banka hesabı yok.</div>`}</div></div>`;
}

function adminCreditSettingsPage() {
  const s = state.admin.settings || {};
  const creditRows = state.admin.money.filter((m) => m.request_type === "credit");
  return `<div class="toolbar"><div><h1>Kredi Sözleşme Ayarları</h1><p class="muted">Faiz, vade, teminat ve sözleşme maddeleri.</p></div></div><form class="content-card" id="admin-credit-settings-form"><div class="field-grid"><label class="field"><span>Aylık Faiz (%)</span><input name="credit_monthly_interest_rate" type="number" step="0.1" value="${esc(s.credit_monthly_interest_rate || "2.5")}" /></label><label class="field"><span>Vade (Ay)</span><input name="credit_loan_term_months" type="number" value="${esc(s.credit_loan_term_months || "12")}" /></label><label class="field"><span>Gecikme Faizi (%)</span><input name="credit_late_interest_rate" type="number" step="0.1" value="${esc(s.credit_late_interest_rate || "4.5")}" /></label><label class="field"><span>Kredi Çarpanı</span><input name="credit_multiplier" type="number" value="${esc(s.credit_multiplier || "7")}" /></label><label class="field"><span>Teminat Çağrısı (%)</span><input name="credit_margin_call_ratio" type="number" value="${esc(s.credit_margin_call_ratio || "50")}" /></label>${[1,2,3,4,5,6,7].map((i) => `<label class="field full"><span>Sözleşme Madde ${i}</span><textarea name="credit_contract_text_${i}">${esc(s[`credit_contract_text_${i}`] || "")}</textarea></label>`).join("")}</div><button class="primary-button" style="margin-top:14px;">Ayarları Kaydet</button></form><div class="content-card" style="margin-top:20px;"><h2>Başvurular</h2><div class="list">${creditRows.map((m) => moneyRow(m, true)).join("") || `<div class="empty-state">Kredi başvurusu yok.</div>`}</div></div>`;
}

function adminStockDescriptionsPage() {
  const descMap = Object.fromEntries(state.admin.stockDescriptions.map((d) => [d.symbol, d]));
  return `<div class="toolbar"><div><h1>Hisse Açıklamaları</h1><p class="muted">Hisse açıklaması ve risk notu yönetimi.</p></div></div><form class="content-card" id="admin-stock-description-form"><div class="field-grid"><label class="field"><span>Hisse</span><input name="symbol" value="AKBNK" /></label><label class="field full"><span>Açıklama</span><textarea name="description"></textarea></label><label class="field full"><span>Risk Notu</span><textarea name="risk_note"></textarea></label></div><button class="primary-button" style="margin-top:14px;">Açıklama Kaydet</button></form><div class="list" style="margin-top:20px;">${state.market.slice(0, 90).map((q) => `<div class="stock-row"><div><strong>${esc(q.symbol)} · ${esc(q.name)}</strong><p class="muted">${esc(descMap[q.symbol]?.description || "Açıklama girilmemiş")}</p></div><div><strong>${money(q.price)}</strong><br><span class="${q.change_pct >= 0 ? "up" : "down"}">${q.change_pct >= 0 ? "+" : ""}${number(q.change_pct)}%</span></div></div>`).join("")}</div>`;
}

const BRAND_PRESETS = {
  zenith: {
    brand_name: "ZENITH",
    brand_descriptor: "PORTFÖY & MENKUL DEĞERLER",
    brand_symbol: "Z",
    brand_logo_url: "/assets/zenith-logo.svg",
    brand_tagline: "Kurumsal Yatırım ve Varlık Yönetimi",
    ui_primary_color: "#0f52ba",
    ui_accent_color: "#059669",
    ui_danger_color: "#dc2626",
    ui_font_family: "Inter",
    ui_radius: "12",
    content_support_email: "destek@zenithmenkul.com",
    content_support_phone: "0850 440 9000",
    official_company_name: "Zenith Portföy ve Menkul Değerler A.Ş.",
    official_registry_number: "892104",
    official_mersis_number: "099808420100001",
    official_address: "İstanbul Uluslararası Finans Merkezi, Z-Kule No:14 Ataşehir / İstanbul",
    official_phone: "0850 440 9000",
    official_email: "destek@zenithmenkul.com",
    official_license_text: "Sermaye Piyasası Kurulu (SPK) Geniş Yetkili Aracı Kurum ve Portföy Yönetim Lisansı Belge No: Z-088/2026",
  },
  paribu: {
    brand_name: "PARİBU",
    brand_descriptor: "MENKUL DEĞERLER",
    brand_symbol: "P",
    brand_logo_url: "/assets/paribu-logo.svg",
    brand_tagline: "Yatırımın dijital hali",
    ui_primary_color: "#0067e8",
    ui_accent_color: "#00a96b",
    ui_danger_color: "#ef3340",
    ui_font_family: "Inter",
    ui_radius: "18",
    content_support_email: "destek@paribumenkuldeger.com",
    content_support_phone: "0850 303 6000",
    official_company_name: "Paribu Menkul Değerler A.Ş.",
    official_registry_number: "849204",
    official_mersis_number: "072108920400001",
    official_address: "Barbaros Mah. Mor Sümbül Sok. No:1 Ataşehir / İstanbul",
    official_phone: "0850 303 6000",
    official_email: "destek@paribumenkuldeger.com",
    official_license_text: "SPK Geniş Yetkili Aracı Kurum Lisansı No: G-042/2026",
  },
  aura: {
    brand_name: "AURA",
    brand_descriptor: "ÖZEL PORTFÖY & YATIRIM",
    brand_symbol: "A",
    brand_logo_url: "/assets/zenith-logo.svg",
    brand_tagline: "Prestijli Varlık ve Fon Yönetimi",
    ui_primary_color: "#1e293b",
    ui_accent_color: "#d97706",
    ui_danger_color: "#b91c1c",
    ui_font_family: "Manrope",
    ui_radius: "10",
    content_support_email: "private@aurayatirim.com",
    content_support_phone: "0212 990 8000",
    official_company_name: "Aura Portföy Yönetimi ve Menkul Kıymetler A.Ş.",
    official_registry_number: "763291",
    official_mersis_number: "011504938200001",
    official_address: "Büyükdere Cad. No:199 Levent / Beşiktaş / İstanbul",
    official_phone: "0212 990 8000",
    official_email: "private@aurayatirim.com",
    official_license_text: "SPK Portföy Yöneticiliği ve Özel Yatırım Danışmanlığı Lisansı No: A-019/2026",
  }
};

function initBuilderState() {
  if (state.builder) return;
  const brand = state.publicConfig?.branding || {};
  const s = state.admin?.settings || {};
  state.builder = {
    page: "home",
    device: "desktop",
    tab: "styles",
    primary: brand.primary || s.ui_primary_color || "#0067e8",
    accent: brand.accent || s.ui_accent_color || "#00a96b",
    radius: parseInt(brand.radius || s.ui_radius || "14", 10),
    shadow: "elevated",
    border: "subtle",
    font: brand.font || s.ui_font_family || "Inter",
    blocks: [
      { id: "hero", name: "Hero & Karşılama Alanı", visible: true, icon: "home" },
      { id: "ticker", name: "BIST 100 Canlı Piyasa Şeridi", visible: true, icon: "chart" },
      { id: "terminal", name: "Hızlı Al/Sat İşlem Masası", visible: true, icon: "activity" },
      { id: "funds", name: "Kurumsal Fonlar & Stratejiler", visible: true, icon: "wallet" },
      { id: "allocation", name: "Varlık Dağılım Modeli (AUM)", visible: true, icon: "file" },
      { id: "advantages", name: "FinTech & Kurumsal Güvence", visible: true, icon: "shield" },
      { id: "footer", name: "Alt Bilgi & Yasal Künye (Footer)", visible: true, icon: "lock" }
    ],
    heroTitle: brand.name || "PARİBU MENKUL DEĞERLER",
    heroSubtitle: brand.tagline || "Yatırımın En Hızlı, En Akıllı ve Kesintisiz Hali",
    renderDeployLoading: false,
    renderDeployResult: null,
    domainInput: "",
    domainLoading: false,
    domainResult: null
  };
}

function adminSiteBuilderPage() {
  initBuilderState();
  const b = state.builder;
  const brand = state.publicConfig?.branding || {};

  let previewContent = "";
  if (b.page === "home") {
    previewContent = publicHome();
  } else if (b.page === "stocks") {
    previewContent = stocksPage();
  } else {
    previewContent = dashboardPage();
  }

  return `<div class="builder-workspace">
    <!-- Top Control Bar -->
    <header class="builder-topbar">
      <div class="builder-brand-title">
        <span class="builder-badge">ELEMENTOR BUILDER V3</span>
        <h2>Görsel Site Tasarımcısı</h2>
      </div>

      <!-- Page Tabs -->
      <div class="builder-page-tabs">
        <button type="button" class="builder-tab-btn ${b.page === "home" ? "active" : ""}" data-builder-page="home">${icon("home", 15)} Anasayfa</button>
        <button type="button" class="builder-tab-btn ${b.page === "stocks" ? "active" : ""}" data-builder-page="stocks">${icon("chart", 15)} Piyasalar</button>
        <button type="button" class="builder-tab-btn ${b.page === "esube" ? "active" : ""}" data-builder-page="esube">${icon("wallet", 15)} E-Şube</button>
      </div>

      <!-- Device Switcher -->
      <div class="builder-device-tabs">
        <button type="button" class="builder-device-btn ${b.device === "desktop" ? "active" : ""}" data-builder-device="desktop" title="Masaüstü Görünümü">
          ${icon("activity", 16)} <span>Masaüstü</span>
        </button>
        <button type="button" class="builder-device-btn ${b.device === "tablet" ? "active" : ""}" data-builder-device="tablet" title="Tablet Görünümü (768px)">
          ${icon("file", 16)} <span>Tablet</span>
        </button>
        <button type="button" class="builder-device-btn ${b.device === "mobile" ? "active" : ""}" data-builder-device="mobile" title="Mobil Görünümü (393px)">
          ${icon("user", 16)} <span>Mobil</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="builder-topbar-actions">
        <button type="button" class="primary-button builder-save-btn" data-builder-save>
          ${icon("check", 16)} <span>Canlıya Al &amp; Kaydet</span>
        </button>
        <button type="button" class="render-deploy-btn ${b.renderDeployLoading ? "loading" : ""}" data-builder-render-deploy>
          ${icon("arrow", 16)} <span>${b.renderDeployLoading ? "Yayınlanıyor..." : "Render'da Yayınla"}</span>
        </button>
      </div>
    </header>

    <!-- Main Builder Split View -->
    <div class="builder-main-split">
      <!-- Left Sidebar (Elementor Controls) -->
      <aside class="builder-sidebar">
        <!-- Sidebar Tabs -->
        <div class="builder-sidebar-tabs">
          <button type="button" class="b-tab ${b.tab === "styles" ? "active" : ""}" data-builder-tab="styles">Stil &amp; Kutular</button>
          <button type="button" class="b-tab ${b.tab === "blocks" ? "active" : ""}" data-builder-tab="blocks">Blok Sıralama</button>
          <button type="button" class="b-tab ${b.tab === "render" ? "active" : ""}" data-builder-tab="render">Render &amp; Alan Adı</button>
        </div>

        <!-- TAB 1: STYLES & CARDS -->
        <div class="builder-sidebar-content ${b.tab === "styles" ? "active" : ""}">
          <!-- 1-Click Themes -->
          <div class="control-card">
            <span class="control-label">1-Tık Kurumsal Temalar</span>
            <div class="theme-preset-buttons">
              <button type="button" class="theme-chip zenith" data-builder-preset="zenith">
                <strong>Zenith</strong>
                <small>Safir Lacivert / Kurumsal AUM</small>
              </button>
              <button type="button" class="theme-chip paribu" data-builder-preset="paribu">
                <strong>Paribu</strong>
                <small>Elektrik Mavi / Hızlı FinTech</small>
              </button>
              <button type="button" class="theme-chip aura" data-builder-preset="aura">
                <strong>Aura</strong>
                <small>Obsidian Altın / Özel Varlık</small>
              </button>
            </div>
          </div>

          <!-- Radius Slider (Wordpress Elementor Slider) -->
          <div class="control-card">
            <div class="control-head">
              <span class="control-label">Köşe Yuvarlaklığı (Border Radius)</span>
              <strong class="slider-val" data-radius-display>${b.radius}px</strong>
            </div>
            <input type="range" class="builder-range" min="0" max="32" value="${b.radius}" data-builder-radius-slider />
            <div class="radius-quick-chips">
              <button type="button" class="radius-chip ${b.radius === 0 ? "active" : ""}" data-builder-radius="0">0px Keskin</button>
              <button type="button" class="radius-chip ${b.radius === 8 ? "active" : ""}" data-builder-radius="8">8px Yumuşak</button>
              <button type="button" class="radius-chip ${b.radius === 14 ? "active" : ""}" data-builder-radius="14">14px Modern</button>
              <button type="button" class="radius-chip ${b.radius === 22 ? "active" : ""}" data-builder-radius="22">22px Lüks</button>
              <button type="button" class="radius-chip ${b.radius === 32 ? "active" : ""}" data-builder-radius="32">Pill (Tam)</button>
            </div>
          </div>

          <!-- Color Pickers -->
          <div class="control-card">
            <span class="control-label">Renk Paleti &amp; Vurgular</span>
            <div class="color-picker-row">
              <label class="color-field">
                <span>Ana Renk (Primary)</span>
                <div class="color-input-wrap">
                  <input type="color" value="${b.primary}" data-builder-primary-color />
                  <input type="text" value="${b.primary}" readonly />
                </div>
              </label>
              <label class="color-field">
                <span>İkincil / Vurgu (Accent)</span>
                <div class="color-input-wrap">
                  <input type="color" value="${b.accent}" data-builder-accent-color />
                  <input type="text" value="${b.accent}" readonly />
                </div>
              </label>
            </div>
          </div>

          <!-- Card Shadows & Depth -->
          <div class="control-card">
            <span class="control-label">Kutu Gölgeleri &amp; Derinlik</span>
            <div class="chip-grid">
              <button type="button" class="style-toggle-chip ${b.shadow === "none" ? "active" : ""}" data-builder-shadow="none">Düz / Gövdesiz</button>
              <button type="button" class="style-toggle-chip ${b.shadow === "subtle" ? "active" : ""}" data-builder-shadow="subtle">Hafif Kurumsal</button>
              <button type="button" class="style-toggle-chip ${b.shadow === "elevated" ? "active" : ""}" data-builder-shadow="elevated">3D FinTech</button>
              <button type="button" class="style-toggle-chip ${b.shadow === "glow" ? "active" : ""}" data-builder-shadow="glow">Neon/Altın Işıltı</button>
            </div>
          </div>

          <!-- Typography -->
          <div class="control-card">
            <span class="control-label">Tipografi Ailesi</span>
            <select class="builder-select" data-builder-font>
              <option value="Inter" ${b.font === "Inter" ? "selected" : ""}>Inter (Modern &amp; Net)</option>
              <option value="Plus Jakarta Sans" ${b.font === "Plus Jakarta Sans" ? "selected" : ""}>Plus Jakarta Sans (FinTech)</option>
              <option value="Manrope" ${b.font === "Manrope" ? "selected" : ""}>Manrope (Lüks &amp; Ayrıcalıklı)</option>
              <option value="Cinzel" ${b.font === "Cinzel" ? "selected" : ""}>Cinzel / Serif (Kurumsal Zirve)</option>
            </select>
          </div>
        </div>

        <!-- TAB 2: BLOCKS & REORDER -->
        <div class="builder-sidebar-content ${b.tab === "blocks" ? "active" : ""}">
          <div class="control-card">
            <span class="control-label">Blok Sıralaması &amp; Görünürlük (Aç/Kapa)</span>
            <p class="muted" style="margin-bottom:12px;font-size:12px;">Ok butonlarıyla blokların yerini değiştirin, onay simgesiyle sayfada gösterin veya gizleyin.</p>
            <div class="builder-blocks-list">
              ${b.blocks.map((blk, idx) => `
                <div class="builder-block-row ${blk.visible ? "is-visible" : "is-hidden"}">
                  <span class="block-icon">${icon(blk.icon || "file", 16)}</span>
                  <span class="block-title">${esc(blk.name)}</span>
                  <div class="block-actions">
                    <button type="button" class="block-btn ${blk.visible ? "on" : "off"}" data-builder-toggle-block="${blk.id}" title="${blk.visible ? "Gizle" : "Göster"}">
                      ${icon(blk.visible ? "check" : "close", 14)}
                    </button>
                    <button type="button" class="block-btn move-up" data-builder-move-block="${blk.id}" data-dir="up" ${idx === 0 ? "disabled" : ""} title="Yukarı Taşı">
                      ${icon("arrow", 13)}
                    </button>
                    <button type="button" class="block-btn move-down" data-builder-move-block="${blk.id}" data-dir="down" ${idx === b.blocks.length - 1 ? "disabled" : ""} title="Aşağı Taşı">
                      ${icon("arrow", 13)}
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- TAB 3: RENDER & DOMAIN -->
        <div class="builder-sidebar-content ${b.tab === "render" ? "active" : ""}">
          <div class="control-card">
            <span class="control-label">Render 1-Tık Canlı Dağıtım</span>
            <div class="render-info-box">
              <div class="render-info-row">
                <span>Servis Adı:</span>
                <strong>paribumenkuldeger2</strong>
              </div>
              <div class="render-info-row">
                <span>Render Token:</span>
                <span class="token-masked">rnd_dm8o...BZ6Qp (Bağlı)</span>
              </div>
              <div class="render-info-row">
                <span>Canlı URL:</span>
                <a href="https://paribumenkuldeger2.onrender.com" target="_blank" class="live-url">https://paribumenkuldeger2.onrender.com ${icon("external", 14)}</a>
              </div>
            </div>

            <button type="button" class="primary-button full-width render-trigger-btn ${b.renderDeployLoading ? "loading" : ""}" data-builder-render-deploy>
              ${icon("arrow", 18)} <span>${b.renderDeployLoading ? "Render'a Gönderiliyor..." : "Render'da Canlıya Al"}</span>
            </button>

            ${b.renderDeployResult ? `
              <div class="deploy-result-box ${b.renderDeployResult.ok ? "success" : "error"}">
                <strong>${b.renderDeployResult.ok ? "Dağıtım Başlatıldı!" : "Dağıtım Uyarısı"}</strong>
                <p>${esc(b.renderDeployResult.message || b.renderDeployResult.error || "")}</p>
                ${b.renderDeployResult.live_url ? `<a href="${esc(b.renderDeployResult.live_url)}" target="_blank" class="text-link">Canlı Siteyi Aç ${icon("external", 14)}</a>` : ""}
              </div>
            ` : ""}
          </div>

          <!-- Custom Domain Attachment -->
          <div class="control-card">
            <span class="control-label">Özel Alan Adı (Custom Domain) Bağla</span>
            <p class="muted" style="margin-bottom:10px;font-size:12px;">Sitenizi kendi domaininize bağlayın (Örn: borsa.sirketiniz.com).</p>
            <div class="domain-input-group">
              <input type="text" placeholder="ornek.com veya borsa.ornek.com" data-builder-domain-input value="${esc(b.domainInput || "")}" />
              <button type="button" class="primary-button small-button" data-builder-add-domain ${b.domainLoading ? "disabled" : ""}>
                ${b.domainLoading ? "Ekleniyor..." : "Bağla"}
              </button>
            </div>
            ${b.domainResult ? `
              <div class="deploy-result-box ${b.domainResult.ok ? "success" : "error"}" style="margin-top:10px;">
                <p>${esc(b.domainResult.message || b.domainResult.error || "")}</p>
              </div>
            ` : ""}
          </div>
        </div>
      </aside>

      <!-- Right Area: Interactive Live Canvas -->
      <main class="builder-canvas-shell">
        <div class="canvas-viewport-header">
          <div class="browser-address-bar">
            <span class="browser-dot red"></span>
            <span class="browser-dot yellow"></span>
            <span class="browser-dot green"></span>
            <span class="browser-url">https://${brand.name ? brand.name.toLowerCase() : "borsa"}.onrender.com/${b.page === "home" ? "" : b.page}</span>
          </div>
          <div class="viewport-zoom-info">
            <span>Canlı Önizleme Tuvali: <strong>${b.device === "desktop" ? "Masaüstü (100%)" : b.device === "tablet" ? "Tablet (768px)" : "Mobil (393px)"}</strong></span>
          </div>
        </div>

        <div class="builder-viewport-container">
          <div class="builder-viewport device-${b.device}" id="builder-live-viewport" style="--studio-radius: ${b.radius}px; --studio-primary: ${b.primary}; --studio-accent: ${b.accent}; font-family: ${b.font}, sans-serif;">
            ${previewContent}
          </div>
        </div>
      </main>
    </div>
  </div>`;
}

function adminStudioPage() {
  const s = state.admin.settings || {};
  const brand = state.publicConfig?.branding || {};
  const activeBrandName = String(brand.name || s.brand_name || "").toUpperCase();
  const field = (label, name, value, type = "text", extra = "") => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value || "")}" ${extra} /></label>`;
  return `<div class="studio-shell">
    <div class="toolbar studio-toolbar">
      <div>
        <span class="studio-eyebrow">INSTITUTIONAL WHITE-LABEL ARCHITECTURE</span>
        <h1>Uygulama Stüdyosu &amp; Marka Mimarisi</h1>
        <p class="muted">Tüm web ve mobil platformların marka kimliğini, kurumsal renk paletini ve yasal künyesini yönetin.</p>
      </div>
      <div class="studio-export-group">
        <a class="primary-button studio-export" href="/api/admin/project-export">${icon("download", 18)} Render Projesi İndir</a>
        <a class="primary-button studio-export studio-export-apk" href="/api/admin/project-export/apk?brand=paribu" download="Paribu-Menkul-Degerler.apk">${icon("download", 18)} Paribu APK İndir</a>
        <a class="primary-button studio-export studio-export-apk studio-export-zenith" href="/api/admin/project-export/apk?brand=zenith" download="Zenith-Menkul-Degerler.apk">${icon("download", 18)} Zenith APK İndir</a>
      </div>
    </div>

    <!-- Hızlı Kurumsal Marka Şablonları -->
    <div class="content-card studio-presets-card" style="margin-bottom: 22px;">
      <div class="toolbar compact">
        <div>
          <span class="status-pill pro-pill">${icon("shield", 14)} 1-TIK KURUMSAL GEÇİŞ SİSTEMİ</span>
          <h2 style="margin-top:6px;">Hazır Kurumsal Yatırım Şablonları</h2>
          <p class="muted">Tek bir dokunuşla logoyu, kurumsal renk uyumunu, yazı tipini ve yasal bilgileri profesyonel standartlarda güncelleyin.</p>
        </div>
      </div>
      <div class="studio-preset-grid">
        <button type="button" class="preset-card ${activeBrandName.includes("ZENITH") ? "active" : ""}" data-brand-preset="zenith">
          <div class="preset-card-top">
            <span class="preset-tag premium">KURUMSAL ZİRVE • TIER-1</span>
            <span class="preset-dot" style="background:#0f52ba"></span>
          </div>
          <div class="preset-brand-display">
            <img class="preset-logo-img" src="/assets/zenith-logo.svg" alt="Zenith" />
            <div>
              <strong>ZENITH</strong>
              <small>PORTFÖY &amp; MENKUL DEĞERLER</small>
            </div>
          </div>
          <p class="preset-desc">Prestijli Derin Safir Lacivert (#0f52ba), Borsa Zümrütü (#059669) ve Geometrik Z Zirve Vektör Logosu.</p>
          <div class="preset-swatches">
            <span style="background:#0f52ba"></span>
            <span style="background:#059669"></span>
            <span style="background:#d97706"></span>
          </div>
        </button>

        <button type="button" class="preset-card ${activeBrandName.includes("PARİBU") || activeBrandName.includes("PARIBU") ? "active" : ""}" data-brand-preset="paribu">
          <div class="preset-card-top">
            <span class="preset-tag fintech">DİJİTAL FINTECH</span>
            <span class="preset-dot" style="background:#0067e8"></span>
          </div>
          <div class="preset-brand-display">
            <img class="preset-logo-img" src="/assets/paribu-logo.svg" alt="Paribu" />
            <div>
              <strong>PARİBU</strong>
              <small>MENKUL DEĞERLER</small>
            </div>
          </div>
          <p class="preset-desc">Yüksek Teknoloji Dinamik Mavisi (#0067e8), FinTech Yeşili (#00a96b) ve P Logo Monogramı.</p>
          <div class="preset-swatches">
            <span style="background:#0067e8"></span>
            <span style="background:#00a96b"></span>
            <span style="background:#ef3340"></span>
          </div>
        </button>

        <button type="button" class="preset-card ${activeBrandName.includes("AURA") ? "active" : ""}" data-brand-preset="aura">
          <div class="preset-card-top">
            <span class="preset-tag private">ÖZEL VARLIK YÖNETİMİ</span>
            <span class="preset-dot" style="background:#1e293b"></span>
          </div>
          <div class="preset-brand-display">
            <span class="preset-logo-dot"><span class="brand-symbol">A</span></span>
            <div>
              <strong>AURA</strong>
              <small>ÖZEL PORTFÖY &amp; YATIRIM</small>
            </div>
          </div>
          <p class="preset-desc">Minimalist Obsidian Slate (#1e293b), Varlık Altını (#d97706) ve Manrope Tipografisi.</p>
          <div class="preset-swatches">
            <span style="background:#1e293b"></span>
            <span style="background:#d97706"></span>
            <span style="background:#b91c1c"></span>
          </div>
        </button>
      </div>
    </div>

    <div class="studio-layout">
      <form class="content-card studio-controls" id="admin-studio-form">
        <section>
          <h2>Marka &amp; Kurumsal Kimlik</h2>
          <div class="field-grid">
            ${field("Marka Adı", "brand_name", s.brand_name || "PARİBU")}
            ${field("Alt Marka / Tanım", "brand_descriptor", s.brand_descriptor || "MENKUL DEĞERLER")}
            ${field("Logo Harfi", "brand_symbol", s.brand_symbol || "P", "text", "maxlength=3")}
            ${field("Slogan", "brand_tagline", s.brand_tagline || "Yatırımın dijital hali")}
          </div>
          <label class="field full">
            <span>Logo Görseli URL veya Vektör Yolu</span>
            <input name="brand_logo_url" data-brand-logo-url value="${esc(s.brand_logo_url || "")}" placeholder="/assets/zenith-logo.svg" />
            <small>Örnek: <code>/assets/zenith-logo.svg</code> veya <code>/assets/paribu-logo.svg</code> ya da harici URL</small>
          </label>
          <label class="studio-file-drop">
            ${icon("upload", 22)}
            <strong>Özel Logo Dosyası Yükle</strong>
            <small>PNG, JPG, WEBP veya SVG (En fazla 600 KB)</small>
            <input type="file" data-brand-logo-file accept="image/png,image/jpeg,image/webp,image/svg+xml" />
          </label>
        </section>

        <section>
          <h2>Kurumsal Renkler &amp; Tasarım Sistemi</h2>
          <div class="studio-color-grid">
            ${field("Ana Kurumsal Renk", "ui_primary_color", s.ui_primary_color || "#0067e8", "color")}
            ${field("Vurgu & Kazanç Rengi", "ui_accent_color", s.ui_accent_color || "#00a96b", "color")}
            ${field("Düşüş & Uyarı Rengi", "ui_danger_color", s.ui_danger_color || "#ef3340", "color")}
          </div>
          <div class="field-grid">
            <label class="field">
              <span>Yazı Tipi Ailesi</span>
              <select name="ui_font_family">
                ${["Inter", "Arial", "Roboto", "Manrope", "system-ui"].map((font) => `<option ${font === (s.ui_font_family || "Inter") ? "selected" : ""}>${font}</option>`).join("")}
              </select>
            </label>
            ${field("Köşe Yuvarlaklığı (Radius)", "ui_radius", s.ui_radius || "18", "range", "min=4 max=36")}
          </div>
        </section>

        <section>
          <h2>Yasal Künye &amp; Resmi İletişim</h2>
          <div class="field-grid">
            ${field("Destek E-posta", "content_support_email", s.content_support_email || s.official_email, "email")}
            ${field("Destek Telefon / Çağrı Merkezi", "content_support_phone", s.content_support_phone || s.official_phone)}
            ${field("Resmi Ticaret Unvanı", "official_company_name", s.official_company_name)}
            ${field("MERSİS Numarası", "official_mersis_number", s.official_mersis_number)}
          </div>
          <label class="field full">
            <span>Genel Merkez Adresi</span>
            <textarea name="official_address">${esc(s.official_address || "")}</textarea>
          </label>
          <label class="field full">
            <span>SPK Faaliyet Yetkisi &amp; Resmi Lisans Beyanı</span>
            <textarea name="official_license_text">${esc(s.official_license_text || "")}</textarea>
          </label>
        </section>

        <div class="studio-savebar">
          <span>${icon("shield", 17)} Yapılan değişiklikler anında tüm web ve mobil APK ekranlarında yürürlüğe girer.</span>
          <button class="primary-button" type="submit">Önizlemeyi Kaydet ve Canlıya Al</button>
        </div>
      </form>

      <aside class="studio-preview">
        <div class="studio-device">
          <div class="studio-device-top"></div>
          <div class="studio-preview-header">
            <div data-studio-logo>${brandLockup()}</div>
            <small data-studio-tagline>${esc(brand.tagline || "Yatırımın dijital hali")}</small>
          </div>
          <div class="studio-preview-card">
            <span>Toplam Portföy Değeri</span>
            <strong>₺308.741,78</strong>
            <b>+ %30,38</b>
            <canvas data-mini-chart data-direction="up" data-seed="32"></canvas>
          </div>
          <div class="studio-preview-actions">
            <span>${icon("upload", 20)}<b>Al</b></span>
            <span>${icon("download", 20)}<b>Sat</b></span>
            <span>${icon("pie", 20)}<b>Portföy</b></span>
          </div>
          <div class="studio-preview-list">
            <b>Örnek İzleme Listesi</b>
            ${["THYAO", "TUPRS", "ASELS"].map((symbol, index) => `<div><span>${symbol}</span><strong>₺${[300.5, 189.4, 74.2][index].toLocaleString("tr-TR")}</strong></div>`).join("")}
          </div>
        </div>
        <div class="studio-checklist">
          <strong>Bağımsız APK &amp; Dağıtım Paketi</strong>
          <span>${icon("check", 15)} Canlı Tema Reaktif Güncelleme</span>
          <span>${icon("check", 15)} Vektörel Kurumsal SVG Logoları</span>
          <span>${icon("check", 15)} SQLite &amp; Yerel Depolama Koruma</span>
          <span>${icon("check", 15)} Paribu &amp; Zenith Bağımsız APK Desteği</span>
          <span>${icon("check", 15)} BIST Canlı Veri ve T+2 Takas Motoru</span>
        </div>
      </aside>
    </div>
  </div>`;
}

function adminSettingsPage() {
  const s = state.admin.settings || {};
  const checked = (key) => s[key] === "1" ? "checked" : "";
  const meta = state.marketMeta || {};
  return `<div class="toolbar"><div><h1>Sistem Ayarları</h1><p class="muted">İşlem, takas, ücret ve doğrulanmış kurum bilgileri.</p></div></div><form class="content-card" id="admin-settings-form"><div class="grid grid-3"><label class="checkbox-field"><input name="trading_enabled" type="checkbox" ${checked("trading_enabled")} /> İşlemler Aktif</label><label class="checkbox-field"><input name="t2_enabled" type="checkbox" ${checked("t2_enabled")} /> T+2 Aktif</label><label class="checkbox-field"><input name="maintenance_mode" type="checkbox" ${checked("maintenance_mode")} /> Bakım Modu</label></div><h2 class="settings-section-title">Komisyon Tarifesi</h2><div class="field-grid"><label class="field"><span>Hisse Komisyonu (baz puan)</span><input name="commission_rate_bps" type="number" min="0" step="0.01" value="${esc(s.commission_rate_bps || "0")}" /></label><label class="field"><span>Asgari Komisyon</span><input name="minimum_commission" type="number" min="0" step="0.01" value="${esc(s.minimum_commission || "0")}" /></label></div><h2 class="settings-section-title">Resmi Kurum Bilgileri</h2><div class="field-grid"><label class="field"><span>Ticaret Unvanı</span><input name="official_company_name" value="${esc(s.official_company_name || "")}" /></label><label class="field"><span>Ticaret Sicil No</span><input name="official_registry_number" value="${esc(s.official_registry_number || "")}" /></label><label class="field"><span>MERSİS No</span><input name="official_mersis_number" value="${esc(s.official_mersis_number || "")}" /></label><label class="field"><span>Telefon</span><input name="official_phone" value="${esc(s.official_phone || "")}" /></label><label class="field"><span>E-posta</span><input name="official_email" type="email" value="${esc(s.official_email || "")}" /></label><label class="field full"><span>Faaliyet Yetkisi</span><textarea name="official_license_text">${esc(s.official_license_text || "")}</textarea></label><label class="field full"><span>Merkez Adresi</span><textarea name="official_address">${esc(s.official_address || "")}</textarea></label></div><button class="primary-button" style="margin-top:18px;">Ayarları Kaydet</button></form><div class="dashboard-grid" style="margin-top:20px;">${[["Piyasa Kaydı", meta.symbol_count || state.market.length], ["Piyasa Durumu", meta.ok ? "Canlı" : "Bağlantı Hatası"], ["Son Veri", meta.updated_at_label || "-"], ["Aktif Banka Hesabı", (state.admin.bank?.system_bank_accounts || []).filter((item) => item.is_active).length], ["İşlem İzleri", state.admin.reports?.audit?.length || 0], ["T+2", checked("t2_enabled") ? "Aktif" : "Kapalı"]].map(([l, v]) => `<article class="metric-card"><span>${l}</span><strong>${esc(v)}</strong></article>`).join("")}</div><div class="content-card market-diagnostics" style="margin-top:20px;"><h2>Piyasa Veri Durumu</h2><div class="request-row"><div><strong>${meta.ok ? "Canlı bağlantı aktif" : "Canlı veri bağlantısı kesildi"}</strong><p class="muted">${meta.ok ? "Fiyat listesi düzenli güncelleniyor." : esc(meta.error || "Son bilinen fiyatlar yalnızca görüntülenir; yönetici kaynak durumunu kontrol etmelidir.")}</p></div><span class="status ${meta.ok ? "ok" : "bad"}">${meta.symbol_count || state.market.length} kayıt</span></div></div>`;
}

function reportLabel(value) {
  const map = {
    buy: "Alış",
    sell: "Satış",
    deposit: "Para Yatırma",
    withdraw: "Para Çekme",
    withdrawal: "Para Çekme",
    credit: "Kredi",
    pending: "Beklemede",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    cancelled: "İptal",
    market: "Piyasa",
    limit: "Limit",
    under_review: "İnceleniyor",
    awaiting_back: "Belge Bekleniyor",
    seed_cash: "Açılış Bakiyesi",
    seed_position: "Başlangıç Pozisyonu",
  };
  return map[String(value || "")] || String(value || "-").replaceAll("_", " ");
}

function auditActionLabel(value) {
  const map = {
    login: "Giriş",
    logout: "Çıkış",
    register: "Kayıt",
    change_password: "Şifre değiştirme",
    create_order: "Emir oluşturma",
    approve_order: "Emir onayı",
    reject_order: "Emir reddi",
    cancel_order: "Emir iptali",
    edit_order: "Emir düzenleme",
    create_money_request: "Para talebi",
    approve_money_request: "Para talebi onayı",
    reject_money_request: "Para talebi reddi",
    cancel_withdrawal_request: "Çekim talebi iptali",
    update_user: "Kullanıcı güncelleme",
    approve_user: "Kullanıcı onayı",
    reject_user: "Kullanıcı reddi",
    save_system_bank_account: "Banka hesabı güncelleme",
    active_system_bank_account: "Banka hesabı aktifleştirme",
    passive_system_bank_account: "Banka hesabı pasifleştirme",
    delete_system_bank_account: "Banka hesabı silme",
    save_system_settings: "Ayar güncelleme",
    save_stock_description: "Hisse açıklaması güncelleme",
    approve_document: "Belge onayı",
    retry_document: "Belge tekrar isteme",
    reject_document: "Belge reddi",
    upload_identity_documents: "Kimlik belge yükleme",
    adjust_balance: "Bakiye işlemi",
    adjust_position: "Portföy işlemi",
    manual_settle_t2: "Satış bakiyesi aktarımı",
    sync_test_user_seed: "Test kullanıcı güncelleme",
    seed_test_user: "Test kullanıcı oluşturma",
    view_summary: "Özet görüntüleme",
  };
  return map[String(value || "")] || reportLabel(value);
}

function entityLabel(value) {
  const map = {
    user: "Kullanıcı",
    order: "Emir",
    money_request: "Para Talebi",
    account: "Hesap",
    position: "Portföy",
    report: "Rapor",
    document: "Belge",
    session: "Oturum",
    system_settings: "Ayarlar",
    system_bank_account: "Banka Hesabı",
    stock_description: "Hisse Açıklaması",
    t2_settlement: "Satış Bakiyesi",
  };
  return map[String(value || "")] || reportLabel(value);
}

function adminReportsPage() {
  const r = state.admin.reports || { orders: [], money: [], users: [], audit: [] };
  const statCard = (title, rows, labelKey) => `<div class="content-card"><h2>${title}</h2><div class="list">${rows.map((row) => `<div class="request-row"><div><strong>${esc(reportLabel(row[labelKey] || row.status || row.action))}</strong><p class="muted">${esc(reportLabel(row.status || row.entity_type || ""))}</p></div><strong>${row.count ?? ""} ${row.total ? money(row.total) : ""}</strong></div>`).join("") || `<div class="empty-state">Veri yok.</div>`}</div></div>`;
  const reconciliation = r.reconciliation || {};
  return `<div class="admin-report-print"><div class="toolbar"><div><h1>Raporlar ve Mutabakat</h1><p class="muted">Finansal hareketleri referans ve denetim iziyle dışa aktarın.</p></div><div class="button-row"><button class="ghost-button" type="button" data-print-report>${icon("file", 16)} Yazdır / PDF</button><a class="ghost-button" href="/api/admin/reports/export?type=transactions">${icon("download", 16)} Hareket CSV</a><a class="ghost-button" href="/api/admin/reports/export?type=audit">${icon("download", 16)} Denetim CSV</a></div></div><div class="reconciliation-strip">${[["Nakit", reconciliation.cash], ["Bloke", reconciliation.blocked], ["T+2", reconciliation.pending], ["Kredi Limiti", reconciliation.credit]].map(([label, value]) => `<article><span>${label}</span><strong>${money(value)}</strong></article>`).join("")}</div><div class="grid grid-3">${statCard("Emir Raporu", r.orders, "side")}${statCard("Para Raporu", r.money, "request_type")}${statCard("Kullanıcı Raporu", r.users, "status")}</div><div class="grid grid-2" style="margin-top:20px;"><div class="content-card"><h2>İşlem İzleri</h2><div class="list">${r.audit.slice(0, 50).map((a) => `<div class="request-row"><div><strong>${esc(auditActionLabel(a.action))}</strong><p class="muted">${esc(a.reference || "")} · ${esc(a.actor_name || "Sistem")} · ${esc(entityLabel(a.entity_type))}</p></div><span>${esc(a.created_at_label || new Date(a.created_at * 1000).toLocaleString("tr-TR"))}</span></div>`).join("")}</div></div><div class="content-card"><h2>İletişim Talepleri</h2><div class="list">${state.admin.contactMessages.slice(0, 25).map((m) => `<div class="request-row"><div><strong>${esc(m.subject)} · ${esc(m.full_name)}</strong><p class="muted">${esc(m.reference)} · ${esc(m.email)}<br>${esc(m.message)}</p></div><span>${esc(m.created_at_label)}</span></div>`).join("") || `<div class="empty-state">Talep yok.</div>`}</div></div></div></div>`;
}

function modalCloseTarget(event, attr) {
  const target = event.target.closest(`[${attr}]`);
  if (!target) return null;
  const modal = event.target.closest("[data-modal-stop]");
  if (modal && target.classList.contains("modal-backdrop")) return null;
  return target;
}

function syncOrderTypeFields(select) {
  const form = select?.form;
  if (!form) return;
  const market = select.value === "market";
  const price = form.querySelector("[data-order-price]");
  const label = form.querySelector("[data-price-label]");
  const limitOnly = form.querySelector("[data-limit-only]");
  if (price) {
    price.readOnly = market;
    price.setAttribute("aria-readonly", market ? "true" : "false");
  }
  if (label) label.textContent = market ? "Piyasa Fiyatı" : "Limit Fiyatı";
  if (limitOnly) limitOnly.hidden = market;
}

function showRegisterStep(form, target) {
  form.querySelectorAll("[data-register-panel]").forEach((panel) => {
    panel.hidden = Number(panel.dataset.registerPanel) !== target;
  });
  form.querySelectorAll("[data-register-step]").forEach((button) => {
    const step = Number(button.dataset.registerStep);
    button.classList.toggle("active", step === target);
    button.disabled = step > target;
    if (step === target) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  form.querySelector(`[data-register-panel="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", async (event) => {
  const modalStop = event.target.closest("[data-modal-stop]");
  if (modalStop) event.stopPropagation();
  const mobileBack = event.target.closest("[data-mobile-back]");
  if (mobileBack) { history.length > 1 ? history.back() : navigate("/esube"); return; }
  const brandPreset = event.target.closest("[data-brand-preset]");
  if (brandPreset) {
    const presetKey = brandPreset.dataset.brandPreset;
    const p = BRAND_PRESETS[presetKey];
    if (p) {
      const form = document.querySelector("#admin-studio-form");
      if (form) {
        Object.entries(p).forEach(([key, val]) => {
          const input = form.querySelector(`[name='${key}']`);
          if (input) input.value = val;
        });
      }
      state.publicConfig = state.publicConfig || {};
      state.publicConfig.branding = {
        name: p.brand_name,
        descriptor: p.brand_descriptor,
        symbol: p.brand_symbol,
        tagline: p.brand_tagline,
        logo_url: p.brand_logo_url,
        primary: p.ui_primary_color,
        accent: p.ui_accent_color,
        danger: p.ui_danger_color,
        font: p.ui_font_family,
        radius: p.ui_radius
      };
      applyBranding();
      const previewLogo = document.querySelector("[data-studio-logo]");
      if (previewLogo) previewLogo.innerHTML = brandLockup();
      const tagline = document.querySelector("[data-studio-tagline]");
      if (tagline) tagline.textContent = p.brand_tagline;
      document.querySelectorAll("[data-brand-preset]").forEach((btn) => btn.classList.remove("active"));
      brandPreset.classList.add("active");
      showToast(`${p.brand_name} kurumsal şablonu uygulandı. Kaydetmek için 'Önizlemeyi Kaydet ve Canlıya Al'a tıklayın.`);
    }
    return;
  }

  // Elementor Site Builder Handlers
  const bPage = event.target.closest("[data-builder-page]");
  if (bPage) {
    state.builder.page = bPage.dataset.builderPage;
    render();
    return;
  }
  const bDevice = event.target.closest("[data-builder-device]");
  if (bDevice) {
    state.builder.device = bDevice.dataset.builderDevice;
    render();
    return;
  }
  const bTab = event.target.closest("[data-builder-tab]");
  if (bTab) {
    state.builder.tab = bTab.dataset.builderTab;
    render();
    return;
  }
  const bPreset = event.target.closest("[data-builder-preset]");
  if (bPreset) {
    const key = bPreset.dataset.builderPreset;
    const p = BRAND_PRESETS[key];
    if (p) {
      state.builder.primary = p.ui_primary_color;
      state.builder.accent = p.ui_accent_color;
      state.builder.radius = parseInt(p.ui_radius, 10);
      state.builder.font = p.ui_font_family;
      state.builder.heroTitle = p.brand_name;
      state.builder.heroSubtitle = p.brand_tagline;
      state.publicConfig = state.publicConfig || {};
      state.publicConfig.branding = {
        name: p.brand_name,
        descriptor: p.brand_descriptor,
        symbol: p.brand_symbol,
        tagline: p.brand_tagline,
        logo_url: p.brand_logo_url,
        primary: p.ui_primary_color,
        accent: p.ui_accent_color,
        danger: p.ui_danger_color,
        font: p.ui_font_family,
        radius: p.ui_radius
      };
      applyBranding();
      render();
      showToast(`${p.brand_name} kurumsal teması uygulandı!`);
    }
    return;
  }
  const bRadius = event.target.closest("[data-builder-radius]");
  if (bRadius) {
    state.builder.radius = parseInt(bRadius.dataset.builderRadius, 10);
    render();
    return;
  }
  const bShadow = event.target.closest("[data-builder-shadow]");
  if (bShadow) {
    state.builder.shadow = bShadow.dataset.builderShadow;
    render();
    return;
  }
  const bToggleBlock = event.target.closest("[data-builder-toggle-block]");
  if (bToggleBlock) {
    const blkId = bToggleBlock.dataset.builderToggleBlock;
    const item = state.builder.blocks.find((x) => x.id === blkId);
    if (item) {
      item.visible = !item.visible;
      render();
      showToast(`'${item.name}' bloğu ${item.visible ? "görünür yapıldı" : "gizlendi"}.`);
    }
    return;
  }
  const bMoveBlock = event.target.closest("[data-builder-move-block]");
  if (bMoveBlock) {
    const blkId = bMoveBlock.dataset.builderMoveBlock;
    const dir = bMoveBlock.dataset.dir;
    const idx = state.builder.blocks.findIndex((x) => x.id === blkId);
    if (idx !== -1) {
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < state.builder.blocks.length) {
        const temp = state.builder.blocks[idx];
        state.builder.blocks[idx] = state.builder.blocks[targetIdx];
        state.builder.blocks[targetIdx] = temp;
        render();
        showToast("Blok sıralaması güncellendi.");
      }
    }
    return;
  }
  const bSave = event.target.closest("[data-builder-save]");
  if (bSave) {
    bSave.disabled = true;
    bSave.textContent = "Kaydediliyor...";
    try {
      const payload = {
        settings: {
          ui_primary_color: state.builder.primary,
          ui_accent_color: state.builder.accent,
          ui_radius: String(state.builder.radius),
          ui_font_family: state.builder.font,
          brand_name: state.builder.heroTitle,
          brand_tagline: state.builder.heroSubtitle
        }
      };
      await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify(payload) });
      state.publicConfig = state.publicConfig || {};
      state.publicConfig.branding = {
        ...(state.publicConfig.branding || {}),
        primary: state.builder.primary,
        accent: state.builder.accent,
        radius: String(state.builder.radius),
        font: state.builder.font,
        name: state.builder.heroTitle,
        tagline: state.builder.heroSubtitle
      };
      applyBranding();
      render();
      showToast("Tasarım ayarları başarıyla kaydedildi ve tüm ziyaretçiler için canlıya alındı!");
    } catch (err) {
      showToast(err.message || "Kaydedilemedi", "error");
    } finally {
      bSave.disabled = false;
    }
    return;
  }
  const bRenderDeploy = event.target.closest("[data-builder-render-deploy]");
  if (bRenderDeploy) {
    state.builder.renderDeployLoading = true;
    render();
    try {
      const res = await api("/api/admin/render/deploy", { method: "POST", body: "{}" });
      state.builder.renderDeployResult = res;
      showToast("Render dağıtımı tetiklendi! Canlı Adres: https://paribumenkuldeger2.onrender.com");
    } catch (err) {
      state.builder.renderDeployResult = { ok: false, error: err.message || "Dağıtım başlatılamadı" };
      showToast("Render dağıtımı başlatılamadı: " + err.message, "error");
    } finally {
      state.builder.renderDeployLoading = false;
      render();
    }
    return;
  }
  const bAddDomain = event.target.closest("[data-builder-add-domain]");
  if (bAddDomain) {
    const input = document.querySelector("[data-builder-domain-input]");
    const domain = input ? input.value.trim() : "";
    if (!domain) {
      showToast("Lütfen bir domain girin.", "warn");
      return;
    }
    state.builder.domainLoading = true;
    render();
    try {
      const res = await api("/api/admin/render/domain", { method: "POST", body: JSON.stringify({ domain }) });
      state.builder.domainResult = res;
      showToast(res.message || "Alan adı bağlandı!");
    } catch (err) {
      state.builder.domainResult = { ok: false, error: err.message };
      showToast("Domain eklenemedi: " + err.message, "error");
    } finally {
      state.builder.domainLoading = false;
      render();
    }
    return;
  }

  const link = event.target.closest("a[data-link]");
  if (link) {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (link.dataset.dashboardSide) {
      state.orderSide = link.dataset.dashboardSide;
      state.orderAmountMode = state.orderSide === "buy" ? "cash" : "quantity";
    }
    if (href.includes("?mode=register")) state.authMode = "register";
    state.adminMenuOpen = false;
    navigate(href.split("?")[0]);
    return;
  }
  const authMode = event.target.closest("[data-auth-mode]");
  if (authMode) { state.authMode = authMode.dataset.authMode; render(); return; }
  const registerNext = event.target.closest("[data-register-next]");
  if (registerNext) {
    const form = registerNext.closest("#register-form");
    const panel = registerNext.closest("[data-register-panel]");
    const invalid = [...panel.querySelectorAll("input, select, textarea")].find((field) => !field.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    showRegisterStep(form, Number(registerNext.dataset.registerNext));
    return;
  }
  const registerBack = event.target.closest("[data-register-back]");
  if (registerBack) { showRegisterStep(registerBack.closest("#register-form"), Number(registerBack.dataset.registerBack)); return; }
  const registerStep = event.target.closest("[data-register-step]");
  if (registerStep && !registerStep.disabled) { showRegisterStep(registerStep.closest("#register-form"), Number(registerStep.dataset.registerStep)); return; }
  const publicMenu = event.target.closest("[data-public-menu]");
  if (publicMenu) { state.publicMenuOpen = !state.publicMenuOpen; render(); return; }
  const adminMenu = event.target.closest("[data-admin-menu]");
  if (adminMenu) { state.adminMenuOpen = !state.adminMenuOpen; render({ motion: false, preserveScroll: true }); return; }
  const adminMenuClose = modalCloseTarget(event, "data-admin-menu-close");
  if (adminMenuClose) { state.adminMenuOpen = false; render({ motion: false, preserveScroll: true }); return; }
  const printReport = event.target.closest("[data-print-report]");
  if (printReport) { window.print(); return; }
  const themeToggle = event.target.closest("[data-theme-toggle]");
  if (themeToggle) { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("minder-theme", state.theme); render(); return; }
  const balanceToggle = event.target.closest("[data-balance-toggle]");
  if (balanceToggle) { state.hideBalance = !state.hideBalance; render({ motion:false, preserveScroll:true }); return; }
  const togglePassword = event.target.closest("[data-toggle-password]");
  if (togglePassword) {
    const input = togglePassword.closest(".password-wrap")?.querySelector("input");
    if (!input) return;
    state.showPassword = input.type === "password";
    input.type = state.showPassword ? "text" : "password";
    togglePassword.innerHTML = icon(state.showPassword ? "eyeOff" : "eye", 18);
    togglePassword.setAttribute("aria-pressed", String(state.showPassword));
    togglePassword.setAttribute("aria-label", state.showPassword ? "Şifreyi gizle" : "Şifreyi göster");
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    return;
  }
  const searchOpen = event.target.closest("[data-search-open]");
  if (searchOpen) { state.searchOpen = true; render(); requestAnimationFrame(() => document.querySelector("[data-global-search]")?.focus()); return; }
  const searchClose = modalCloseTarget(event, "data-search-close");
  if (searchClose) { state.searchOpen = false; state.searchQuery = ""; render(); return; }
  const searchStock = event.target.closest("[data-search-stock]");
  if (searchStock) { state.searchOpen = false; state.searchQuery = ""; await openCompanyDetail(searchStock.dataset.searchStock); return; }
  const company = event.target.closest("[data-company]");
  if (company) { await openCompanyDetail(company.dataset.company); return; }
  const companyClose = modalCloseTarget(event, "data-company-close");
  if (companyClose) { state.companyOpen = false; state.companyData = null; render({ motion: false, preserveScroll: true }); return; }
  const companyTab = event.target.closest("[data-company-tab]");
  if (companyTab) { state.companyTab = companyTab.dataset.companyTab; render({ motion: false, preserveScroll: true }); return; }
  const companyTrade = event.target.closest("[data-company-trade]");
  if (companyTrade) { state.orderSide = companyTrade.dataset.companyTrade; state.orderAmountMode = state.orderSide === "buy" ? "cash" : "quantity"; state.companyOpen = false; state.tradeOpen = true; render({ motion: false, preserveScroll: true }); return; }
  const stock = event.target.closest("[data-stock]");
  if (stock) { state.selectedSymbol = stock.dataset.stock; state.orderSide = stock.dataset.side || "buy"; state.orderAmountMode = state.orderSide === "buy" ? "cash" : "quantity"; state.tradeOpen = true; render(); return; }
  const tradeClose = modalCloseTarget(event, "data-trade-close");
  if (tradeClose) { state.tradeOpen = false; render(); return; }
  const docPreview = event.target.closest("[data-doc-preview]");
  if (docPreview) { state.docPreview = { url: docPreview.dataset.docPreview, title: docPreview.dataset.docTitle, subtitle: docPreview.dataset.docSubtitle, content_type: docPreview.dataset.docType }; render(); return; }
  const docClose = modalCloseTarget(event, "data-doc-close");
  if (docClose) { state.docPreview = null; render(); return; }
  const side = event.target.closest("[data-order-side]");
  if (side) { state.orderSide = side.dataset.orderSide; state.orderAmountMode = state.orderSide === "buy" ? "cash" : "quantity"; render(); return; }
  const orderTypeChoice = event.target.closest("[data-order-type-choice]");
  if (orderTypeChoice) {
    const form = orderTypeChoice.closest("form");
    const select = form?.querySelector("[data-order-type]");
    if (!select) return;
    select.value = orderTypeChoice.dataset.orderTypeChoice;
    orderTypeChoice.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button === orderTypeChoice));
    syncOrderTypeFields(select);
    updateOrderEstimate(form);
    return;
  }
  const validityChoice = event.target.closest("[data-validity-choice]");
  if (validityChoice) {
    const holder = validityChoice.closest(".ticket-segmented");
    const select = holder?.querySelector("select[name='validity']");
    if (!select) return;
    select.value = validityChoice.dataset.validityChoice;
    holder.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button === validityChoice));
    return;
  }
  const orderAmountMode = event.target.closest("[data-order-amount-mode]");
  if (orderAmountMode) { state.orderAmountMode = orderAmountMode.dataset.orderAmountMode; render(); return; }
  const moneyType = event.target.closest("[data-money-type]");
  if (moneyType) { state.moneyType = moneyType.dataset.moneyType; render(); return; }
  const ordersTab = event.target.closest("[data-orders-tab]");
  if (ordersTab) { state.ordersTab = ordersTab.dataset.ordersTab; render(); return; }
  const notificationsTab = event.target.closest("[data-notifications-tab]");
  if (notificationsTab) { state.notificationsTab = notificationsTab.dataset.notificationsTab; render(); return; }
  const marketTab = event.target.closest("[data-market-tab]");
  if (marketTab) { state.marketTab = marketTab.dataset.marketTab; render(); return; }
  const marketShow = event.target.closest("[data-market-show]");
  if (marketShow) { state.stockSort = marketShow.dataset.marketShow; showToast(marketShow.dataset.marketShow === "gain" ? "Yükselenler sıralandı." : "Düşenler sıralandı."); return; }
  const shortcut = event.target.closest("[data-money-shortcut]");
  if (shortcut) { state.moneyType = shortcut.dataset.moneyShortcut; navigate("/esube/money"); return; }
  const portfolioTab = event.target.closest(".portfolio-tabs button");
  if (portfolioTab) {
    const index = [...portfolioTab.parentElement.children].indexOf(portfolioTab);
    navigate(index === 1 ? "/esube/portfolio/sold" : "/esube/portfolio/holdings");
    return;
  }
  const demoAction = event.target.closest("[data-demo-action]");
  if (demoAction) { showToast(`${demoAction.dataset.demoAction} açıldı.`); return; }
  const txFilter = event.target.closest("[data-transaction-filter]");
  if (txFilter) { state.transactionFilter = txFilter.dataset.transactionFilter; render(); return; }
  const copy = event.target.closest("[data-copy]");
  if (copy) { await navigator.clipboard?.writeText(copy.dataset.copy || ""); showToast("IBAN kopyalandı."); return; }
  const stockPage = event.target.closest("[data-stock-page]");
  if (stockPage && !stockPage.disabled) { state.stockPage = Number(stockPage.dataset.stockPage); document.querySelector("[data-stock-list]").innerHTML = stockListHtml(); return; }
  const revokeSessions = event.target.closest("[data-revoke-sessions]");
  if (revokeSessions) { await api("/api/profile/sessions/revoke", { method: "POST", body: "{}" }); await loadSecurity(); render(); showToast("Diğer oturumlar kapatıldı."); return; }
  const orderCancel = event.target.closest("[data-order-cancel]");
  if (orderCancel) { await api(`/api/orders/${orderCancel.dataset.orderCancel}/cancel`, { method: "POST", body: "{}" }); showToast("Emir iptal edildi."); await refreshCurrent(); return; }
  const orderEdit = event.target.closest("[data-order-edit]");
  if (orderEdit) {
    const quantity = prompt("Yeni adet", orderEdit.dataset.qty);
    const limit_price = prompt("Yeni fiyat", orderEdit.dataset.price);
    if (quantity && limit_price) {
      await api(`/api/orders/${orderEdit.dataset.orderEdit}/edit`, { method: "POST", body: JSON.stringify({ quantity, limit_price }) });
      showToast("Emir güncellendi.");
      await refreshCurrent();
    }
    return;
  }
  const moneyCancel = event.target.closest("[data-money-cancel]");
  if (moneyCancel) { await api(`/api/money-requests/${moneyCancel.dataset.moneyCancel}/cancel`, { method: "POST", body: "{}" }); showToast("Para çekme talebi iptal edildi."); await refreshCurrent(); return; }
  const bankEdit = event.target.closest("[data-bank-edit]");
  if (bankEdit) { state.editBankId = Number(bankEdit.dataset.bankEdit); render(); return; }
  const bankToggle = event.target.closest("[data-bank-toggle]");
  if (bankToggle) { if (!await ensureAdminStepUp()) return; await api(`/api/admin/bank-accounts/${bankToggle.dataset.bankToggle}`, { method: "POST", body: JSON.stringify({ action: "toggle" }) }); showToast("Banka hesabı güncellendi."); await refreshCurrent(); return; }
  const bankDelete = event.target.closest("[data-bank-delete]");
  if (bankDelete && confirm("Banka hesabı silinsin mi?")) { if (!await ensureAdminStepUp()) return; await api(`/api/admin/bank-accounts/${bankDelete.dataset.bankDelete}`, { method: "POST", body: JSON.stringify({ action: "delete" }) }); showToast("Banka hesabı silindi."); await refreshCurrent(); return; }
  const docAction = event.target.closest("[data-doc-action]");
  if (docAction) {
    if (!await ensureAdminStepUp()) return;
    const needsNote = docAction.dataset.docAction === "retry" || docAction.dataset.docAction === "reject";
    const defaultNote = docAction.dataset.docAction === "reject" ? "Belge doğrulama kriterlerini karşılamıyor." : "Belge net değil, tekrar yüklenmeli.";
    const note = needsNote ? (prompt("Kullanıcıya gösterilecek inceleme gerekçesi", defaultNote) || "").trim() : "";
    if (needsNote && note.length < 8) { showToast("Belge işlemi için açıklayıcı bir gerekçe girin.", true); return; }
    await api(`/api/admin/documents/${docAction.dataset.docId}/${docAction.dataset.docAction}`, { method: "POST", body: JSON.stringify({ note }) });
    showToast("Belge durumu güncellendi.");
    await refreshCurrent();
    return;
  }
  const t2Settle = event.target.closest("[data-t2-settle]");
  if (t2Settle) { if (!await ensureAdminStepUp()) return; await api(`/api/admin/t2-settlements/${t2Settle.dataset.t2Settle}`, { method: "POST", body: "{}" }); showToast("Satış bakiyesi nakde aktarıldı."); await refreshCurrent(); return; }
  const logout = event.target.closest("[data-action='logout']");
  if (logout) { await api("/api/logout", { method: "POST", body: "{}" }); state.me = null; showToast("Oturum kapatıldı."); navigate("/esube/giris"); return; }
  const approve = event.target.closest("[data-admin-approve]");
  const reject = event.target.closest("[data-admin-reject]");
  const action = approve || reject;
  if (action) {
    const entity = action.dataset.adminApprove || action.dataset.adminReject;
    const verb = approve ? "approve" : "reject";
    if (["users", "orders", "money"].includes(entity) && !await ensureAdminStepUp()) return;
    let reason = "";
    if (["orders", "money"].includes(entity)) {
      reason = prompt(`${approve ? "Onay" : "Ret"} gerekçesi`, approve ? "Kontroller tamamlandı" : "İşlem koşulları sağlanmadı") || "";
      if (reason.trim().length < 8) { showToast("En az 8 karakterlik gerekçe girin."); return; }
    }
    await api(`/api/admin/${entity}/${action.dataset.id}/${verb}`, { method: "POST", body: JSON.stringify({ reason }) });
    showToast(approve ? "Onaylandı." : "Reddedildi.");
    await refreshCurrent();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.closest("#admin-studio-form")) {
    const form = event.target.form || event.target.closest("form");
    if (form) {
      const values = Object.fromEntries(new FormData(form).entries());
      state.publicConfig = state.publicConfig || {};
      state.publicConfig.branding = { ...(state.publicConfig.branding || {}), name: values.brand_name, descriptor: values.brand_descriptor, symbol: values.brand_symbol, tagline: values.brand_tagline, logo_url: values.brand_logo_url, primary: values.ui_primary_color, accent: values.ui_accent_color, danger: values.ui_danger_color, font: values.ui_font_family, radius: values.ui_radius };
      applyBranding();
      const previewLogo = document.querySelector("[data-studio-logo]");
      if (previewLogo) previewLogo.innerHTML = brandLockup();
      const tagline = document.querySelector("[data-studio-tagline]");
      if (tagline) tagline.textContent = values.brand_tagline || "";
    }
  }

  // Builder Input Handlers (Immediate live reaction on canvas)
  if (event.target.matches("[data-builder-radius-slider]")) {
    state.builder = state.builder || {};
    state.builder.radius = parseInt(event.target.value, 10);
    const display = document.querySelector("[data-radius-display]");
    if (display) display.textContent = `${state.builder.radius}px`;
    const viewport = document.querySelector("#builder-live-viewport");
    if (viewport) viewport.style.setProperty("--studio-radius", `${state.builder.radius}px`);
    return;
  }
  if (event.target.matches("[data-builder-primary-color]")) {
    state.builder = state.builder || {};
    state.builder.primary = event.target.value;
    const viewport = document.querySelector("#builder-live-viewport");
    if (viewport) viewport.style.setProperty("--studio-primary", state.builder.primary);
    const textInput = event.target.nextElementSibling;
    if (textInput) textInput.value = state.builder.primary;
    return;
  }
  if (event.target.matches("[data-builder-accent-color]")) {
    state.builder = state.builder || {};
    state.builder.accent = event.target.value;
    const viewport = document.querySelector("#builder-live-viewport");
    if (viewport) viewport.style.setProperty("--studio-accent", state.builder.accent);
    const textInput = event.target.nextElementSibling;
    if (textInput) textInput.value = state.builder.accent;
    return;
  }
  if (event.target.matches("[data-builder-font]")) {
    state.builder = state.builder || {};
    state.builder.font = event.target.value;
    const viewport = document.querySelector("#builder-live-viewport");
    if (viewport) viewport.style.fontFamily = `${state.builder.font}, sans-serif`;
    return;
  }
  if (event.target.matches("[data-builder-domain-input]")) {
    state.builder = state.builder || {};
    state.builder.domainInput = event.target.value;
    return;
  }

  if (event.target.matches("[data-search='stocks']")) {
    state.stockQuery = event.target.value;
    state.stockPage = 1;
    render({ motion: false, preserveScroll: true });
    requestAnimationFrame(() => { const input = document.querySelector("[data-search='stocks']"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } });
  }
  if (event.target.matches("[data-global-search]")) {
    state.searchQuery = event.target.value;
    const list = document.querySelector("[data-global-search-results]");
    if (list) list.innerHTML = globalSearchResultsHtml();
  }
  if (event.target.matches("[data-news-search]")) { state.newsQuery = event.target.value; render({ motion: false, preserveScroll: true }); requestAnimationFrame(() => document.querySelector("[data-news-search]")?.focus()); }
  if (event.target.matches("[data-transaction-search]")) { state.transactionQuery = event.target.value; render({ motion: false, preserveScroll: true }); requestAnimationFrame(() => document.querySelector("[data-transaction-search]")?.focus()); }
  if (event.target.closest("#order-form, #quick-order-form")) updateOrderEstimate(event.target.closest("form"));
  if (event.target.matches("[data-admin-search]")) { state.adminQuery = event.target.value; render(); requestAnimationFrame(() => document.querySelector("[data-admin-search]")?.focus()); }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-brand-logo-file]")) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 600 * 1024) { showToast("Logo dosyası 600 KB altında olmalıdır.", true); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => { const input = document.querySelector("[data-brand-logo-url]"); if (input) { input.value = String(reader.result || ""); input.dispatchEvent(new Event("input", { bubbles: true })); } };
    reader.readAsDataURL(file);
    return;
  }
  if (event.target.matches("[data-order-symbol]")) { state.selectedSymbol = event.target.value; render(); }
  if (event.target.matches("[data-order-type]")) { syncOrderTypeFields(event.target); updateOrderEstimate(event.target.form); }
  if (event.target.matches("[data-stock-sort]")) { state.stockSort = event.target.value; state.stockPage = 1; render(); }
  if (event.target.matches("[data-news-filter]")) { state.newsFilter = event.target.value; render({ motion: false, preserveScroll: true }); }
  if (event.target.matches("[data-transaction-from]")) { state.transactionFrom = event.target.value; render({ motion: false, preserveScroll: true }); }
  if (event.target.matches("[data-transaction-to]")) { state.transactionTo = event.target.value; render({ motion: false, preserveScroll: true }); }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (event.target.id === "login-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/login", { method: "POST", body: JSON.stringify(form) });
      showToast("Giriş başarılı.");
      await loadMe();
      navigate(state.me?.role === "admin" ? "/esube/admin" : "/esube");
    } else if (event.target.id === "forgot-password-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      const result = await api("/api/password/forgot", { method: "POST", body: JSON.stringify(form) });
      showToast(result.message);
      state.authMode = "login";
      render();
    } else if (event.target.id === "reset-password-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      form.token = new URLSearchParams(location.search).get("reset") || "";
      const result = await api("/api/password/reset", { method: "POST", body: JSON.stringify(form) });
      history.replaceState({}, "", "/esube/giris");
      state.authMode = "login";
      showToast(result.message);
      render();
    } else if (event.target.id === "register-form") {
      await api("/api/register", { method: "POST", body: new FormData(event.target), headers: {} });
      showToast("Hesap oluşturuldu. Giriş yapıp profilinizden kimlik belgelerinizi yükleyin.");
      state.authMode = "login";
      render();
    } else if (event.target.id === "order-form" || event.target.id === "quick-order-form") {
      const form = normalizeOrderForm(Object.fromEntries(new FormData(event.target).entries()));
      const estimate = orderEstimate(form);
      const summary = `${form.symbol} ${form.side === "buy" ? "ALIŞ" : "SATIŞ"}\n${estimate.quantity} adet × ${money(estimate.price)}\nİşlem tutarı: ${money(estimate.gross)}\nKomisyon: ${money(estimate.commission)}\n${form.side === "buy" ? "Toplam ödeme" : "Net satış"}: ${money(estimate.total)}`;
      if (!confirm(`${summary}\n\nEmri onaylıyor musunuz?`)) return;
      await api("/api/orders", { method: "POST", body: JSON.stringify(form) });
      showToast(form.order_type === "limit" ? "Limit emri başarıyla oluşturuldu." : "Piyasa işlemi tamamlandı.");
      state.tradeOpen = false;
      navigate("/esube/portfolio");
    } else if (event.target.id === "support-form") {
      const input = event.target.elements.message;
      const message = String(input.value || "").trim();
      if (!message) return;
      const chat = event.target.previousElementSibling;
      chat.insertAdjacentHTML("beforeend", `<div class="chat-bubble mine">${esc(message)}<time>Şimdi</time></div><div class="chat-bubble agent">Mesajınız destek ekibimize ulaştı. En kısa sürede yanıtlayacağız.<time>Şimdi</time></div>`);
      input.value = "";
      chat.scrollTop = chat.scrollHeight;
      showToast("Mesaj gönderildi.");
    } else if (event.target.id === "money-form") {
      const formData = new FormData(event.target);
      const requestType = formData.get("request_type");
      await api("/api/money-requests", { method: "POST", body: formData, headers: {} });
      showToast(requestType === "deposit" ? "Para yatırma talebiniz dekont bilgisiyle alındı." : requestType === "withdraw" ? "Para çekme talebiniz alındı." : "Başvuru onaya gönderildi.");
      await refreshCurrent();
    } else if (event.target.id === "identity-form") {
      await api("/api/profile/documents", { method: "POST", body: new FormData(event.target), headers: {} });
      showToast("Kimlik belgeleriniz onaya gönderildi.");
      await refreshCurrent();
    } else if (event.target.id === "password-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/profile/password", { method: "POST", body: JSON.stringify(form) });
      event.target.reset();
      showToast("Şifre güncellendi.");
    } else if (event.target.id === "two-factor-setup-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      const setup = await api("/api/profile/2fa/setup", { method: "POST", body: JSON.stringify(form) });
      const otp = prompt(`Doğrulama uygulamanıza bu anahtarı ekleyin:\n${setup.secret}\n\nArdından 6 haneli kodu girin`);
      if (otp) {
        await api("/api/profile/2fa/confirm", { method: "POST", body: JSON.stringify({ otp }) });
        await loadMe(); await loadSecurity(); render(); showToast("İki aşamalı doğrulama açıldı.");
      }
    } else if (event.target.id === "two-factor-disable-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/profile/2fa/disable", { method: "POST", body: JSON.stringify(form) });
      await loadMe(); await loadSecurity(); render(); showToast("İki aşamalı doğrulama kapatıldı.");
    } else if (event.target.id === "contact-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      const result = await api("/api/contact", { method: "POST", body: JSON.stringify(form) });
      event.target.reset();
      showToast(`Talebiniz alındı: ${result.reference}`);
    } else if (event.target.id === "system-bank-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      form.is_active = event.target.querySelector("[name='is_active']").checked ? "1" : "0";
      await api("/api/admin/bank-accounts", { method: "POST", body: JSON.stringify(form) });
      state.editBankId = null;
      showToast("Banka hesabı kaydedildi.");
      await route();
    } else if (event.target.id === "admin-user-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api(`/api/admin/users/${form.user_id}`, { method: "POST", body: JSON.stringify(form) });
      showToast("Kullanıcı güncellendi.");
      await route();
    } else if (event.target.id === "admin-balance-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/admin/balances", { method: "POST", body: JSON.stringify(form) });
      showToast("Bakiye işlendi.");
      await route();
    } else if (event.target.id === "admin-position-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/admin/positions", { method: "POST", body: JSON.stringify(form) });
      showToast("Portföy güncellendi.");
      await route();
    } else if (event.target.id === "admin-settings-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      form.trading_enabled = event.target.trading_enabled.checked ? "1" : "0";
      form.t2_enabled = event.target.t2_enabled.checked ? "1" : "0";
      form.maintenance_mode = event.target.maintenance_mode.checked ? "1" : "0";
      await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify(form) });
      showToast("Sistem ayarları kaydedildi.");
      await route();
    } else if (event.target.id === "admin-studio-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      delete form["data-brand-logo-file"];
      await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify(form) });
      await loadPublicConfig();
      showToast("Marka ve arayüz ayarları kaydedildi.");
      await route();
    } else if (event.target.id === "admin-t2-settings-form") {
      if (!await ensureAdminStepUp()) return;
      const form = { t2_enabled: event.target.t2_enabled.checked ? "1" : "0" };
      await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify(form) });
      showToast(form.t2_enabled === "1" ? "T+2 takası açıldı." : "T+2 takası kapatıldı; bekleyen tutarlar nakde aktarıldı.");
      await route();
    } else if (event.target.id === "admin-credit-settings-form") {
      if (!await ensureAdminStepUp()) return;
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/admin/system-settings", { method: "POST", body: JSON.stringify(form) });
      showToast("Kredi ayarları kaydedildi.");
      await route();
    } else if (event.target.id === "admin-stock-description-form") {
      const form = Object.fromEntries(new FormData(event.target).entries());
      await api("/api/admin/stock-descriptions", { method: "POST", body: JSON.stringify(form) });
      showToast("Hisse açıklaması kaydedildi.");
      await route();
    }
  } catch (error) {
    showToast(error.message);
  }
});

window.addEventListener("popstate", route);
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  showToast(event.reason?.message || "İşlem tamamlanamadı.");
});
window.addEventListener("error", (event) => {
  if (event.error) showToast("Sayfa bileşeni yüklenemedi. Lütfen tekrar deneyin.");
});
setInterval(async () => {
  if (document.hidden || state.path === "/esube/giris") return;
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  if (["input", "textarea", "select"].includes(activeTag)) return;
  const liveScreens = state.path === "/" || state.path === "/esube" || state.path === "/esube/stocks" || state.path === "/esube/admin" || state.path === "/esube/admin/settings";
  if (!liveScreens) return;
  try {
    await loadMarket();
    if (state.me && state.path.startsWith("/esube") && !state.path.startsWith("/esube/admin")) await loadPortfolio();
    render({ motion: false, preserveScroll: true });
  } catch (_) {
    // Market refresh is opportunistic; route-level loading still shows explicit errors.
  }
}, 45000);
route();
