/* Eminevim Yatırım Complete Flow & Design Adapter */
state.portfolioTab = state.portfolioTab || "positions";
state.portfolioCardSlide = state.portfolioCardSlide || 0;
state.profileMenuOpen = false;
state.installModalOpen = false;
state.selectedTxDetail = null;
state.specialNoticeOpen = false;
state.userLanguage = localStorage.getItem("eminevim_lang") || "tr";
state.fontSizeMode = localStorage.getItem("eminevim_font_size") || "medium";
state.customAvatar = localStorage.getItem("eminevim_avatar") || "";
state.notifPrefs = (() => {
  const defaults = { all: true, price: true, news: true, trade: true, referral: true, weekly: true };
  try {
    const saved = JSON.parse(localStorage.getItem("eminevim_notif_prefs") || "{}");
    return { ...defaults, ...saved };
  } catch (e) {
    return defaults;
  }
})();

function getCustomAvatarHtml() {
  if (state.customAvatar) {
    return `<img src="${state.customAvatar}" alt="Avatar" />`;
  }
  const initials = (state.me?.full_name || "İsim Soyisim").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return initials || "IS";
}

mobileHeaderBar = function () {
  const isHome = state.path === "/esube";
  const isPortfolio = state.path === "/esube/portfolio";
  const titles = {
    "/esube/stocks": "Piyasalar",
    "/esube/trade": "Alım Satım",
    "/esube/portfolio": "Portföy",
    "/esube/transactions": "Geçmiş",
    "/esube/money": "Para İşlemleri",
    "/esube/profile": "Profil",
    "/esube/profile/security": "Güvenlik",
    "/esube/profile/identity": "İletişim Bilgileri",
    "/esube/profile/documents": "Belgelerim",
    "/esube/settings": "Ayarlar",
    "/esube/notifications": "Bildirim Ayarları",
    "/esube/support": "Referans Fırsatları"
  };

  const isAdmin = state.me?.role === "admin";
  const avatarHtml = `<button type="button" class="rf-header-avatar" data-profile-menu-toggle aria-label="Profil menüsü">${getCustomAvatarHtml()}</button>`;
  
  if (isHome) {
    return `<header class="mobile-app-header rf-mobile-header home"><div class="rf-mobile-header-left">${avatarHtml}</div><div class="eminevim-script-title"><img src="/assets/eminevim-logo-square.webp" alt="Eminevim Yatırım" /><span>Eminevim Yatırım</span></div><div class="rf-header-actions">${isAdmin ? `<a href="/esube/admin" data-link class="rf-admin-badge-btn">${icon("shield", 14)} Admin</a>` : ""}<button type="button" class="icon-button" data-theme-toggle aria-label="Gece modu">${icon("moon", 21)}</button><a href="/esube/notifications" data-link class="icon-button" aria-label="Bildirimler">${icon("bell", 21)}<span class="notice-dot"></span></a></div></header>`;
  }

  if (isPortfolio) {
    return `<header class="mobile-app-header rf-mobile-header"><div class="rf-mobile-header-left">${avatarHtml}</div><div></div><div class="rf-header-actions">${isAdmin ? `<a href="/esube/admin" data-link class="rf-admin-badge-btn">${icon("shield", 14)} Admin</a>` : ""}<button type="button" class="icon-button" data-theme-toggle aria-label="Gece modu">${icon("moon", 21)}</button><a href="/esube/notifications" data-link class="icon-button" aria-label="Bildirimler">${icon("bell", 21)}</a></div></header>`;
  }

  const pageTitle = titles[state.path] || "Hesabım";
  return `<header class="mobile-app-header rf-mobile-header quiet"><div class="mobile-brand-title"><button type="button" class="mobile-back" data-mobile-back aria-label="Geri">${icon("arrow", 22)}</button><div><h1>${esc(pageTitle)}</h1></div></div><div class="rf-header-actions">${isAdmin ? `<a href="/esube/admin" data-link class="rf-admin-badge-btn">${icon("shield", 14)} Admin</a>` : ""}<button type="button" class="icon-button" data-theme-toggle aria-label="Gece modu">${icon("moon", 21)}</button><a href="/esube/notifications" data-link class="icon-button" aria-label="Bildirimler">${icon("bell", 21)}</a></div></header>`;
};

portfolioPageV2 = function () {
  const account = state.portfolio?.account || state.account || {};
  const positions = state.portfolio?.positions || [];
  const orders = state.portfolio?.orders || [];
  const txs = state.portfolio?.transactions || [];
  const value = positions.reduce((sum, p) => sum + Number(p.market_value || 0), 0);
  const pnl = positions.reduce((sum, p) => sum + Number(p.pnl || 0), 0);
  const total = Number(account.cash_balance || 0) + Number(account.pending_balance || 0) + value;
  const pctValue = value ? (pnl / Math.max(value - pnl, 1)) * 100 : 0;
  const posPct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  const cashPct = Math.max(0, 100 - posPct);
  const ringSplit = Math.max(0, Math.min(100, posPct));

  const cardSlide = state.portfolioCardSlide || 0;

  // Card 1: Portföy Özeti
  const card1Html = `<div class="bank-card"><button type="button" class="privacy-eye" data-balance-toggle aria-label="Bakiyeyi gizle">${icon(state.hideBalance ? "eyeOff" : "eye", 18)}</button><h2>Portföy özeti</h2><strong class="portfolio-total">${state.hideBalance ? "******" : money(total)}</strong><small class="rf-profit-sub ${pnl >= 0 ? "" : "down"}">${state.hideBalance ? "***" : `${pnl >= 0 ? "+" : ""}${money(pnl)} (%${number(Math.abs(pctValue))}) toplam kâr`}</small><div class="rf-donut-wrapper"><div class="profit-ring" style="background:conic-gradient(#fff 0 ${ringSplit}%, #fbbf24 ${ringSplit}% 96%, #34d399 96% 100%);"><span>${state.hideBalance ? "**" : `%${Math.round(posPct)}`}</span></div><div class="rf-card-legend"><span><i style="background:#fff;border:1px solid rgba(255,255,255,.6);"></i> Pozisyonlar · %${number(posPct)}</span><span><i style="background:#fbbf24;"></i> Bakiye · %${number(cashPct)}</span><span><i style="background:#34d399;"></i> Kâr · ${pnl >= 0 ? "+" : ""}%${number(pctValue)}</span></div></div><div class="rf-summary-grid"><span>Kullanılabilir<strong>${state.hideBalance ? "******" : money(account.cash_balance)}</strong></span><span>T+2 Bakiye<strong>${state.hideBalance ? "******" : money(account.pending_balance)}</strong></span></div></div>`;

  // Card 2: Getiri Grafiği (interactive drag-to-scrub)
  const chartPoints = [
    { x: 0, y: 70, date: "14 Ağu", pct: -2.10 },
    { x: 70, y: 45, date: "19 Ağu", pct: -0.85 },
    { x: 140, y: 40, date: "28 Ağu", pct: 1.35 },
    { x: 210, y: 35, date: "2 Eyl", pct: 2.40 },
    { x: 260, y: 20, date: "11 Eyl", pct: -0.53 },
    { x: 300, y: 15, date: "13 Eyl", pct: Number(number(pctValue)) || 4.63 }
  ];
  const pointsAttr = esc(JSON.stringify(chartPoints));
  const card2Html = `<div class="rf-chart-card"><div class="rf-chart-card-head"><strong>${icon("chart", 16)} Pozisyon sayısı: ${positions.length || 3}</strong><span>1 Ay</span></div><div class="rf-interactive-chart-box" id="rf-chart-drag-box" data-points="${pointsAttr}"><div class="rf-chart-tooltip" id="rf-chart-tooltip">Cum 11 Eyl · -%0,53</div><svg class="rf-chart-svg" viewBox="0 0 300 85" preserveAspectRatio="none"><defs><linearGradient id="rfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity="0.4"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.0"/></linearGradient></defs><path d="M0,70 Q40,65 70,45 T140,40 T210,35 T260,20 T300,15 L300,85 L0,85 Z" fill="url(#rfGrad)"/><path d="M0,70 Q40,65 70,45 T140,40 T210,35 T260,20 T300,15" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round"/><circle cx="260" cy="20" r="7" fill="#fff" stroke="#34d399" stroke-width="3" style="cursor:grab;touch-action:none;" id="rf-chart-drag-point"/></svg></div><div class="rf-chart-card-foot"><span>Toplam getiri: <strong>${money(pnl || 7432.50)}</strong></span><span>En yüksek getiri: <strong style="color:#34d399;">+%12,40</strong></span></div></div>`;

  const carouselHtml = `<div class="rf-carousel-container" id="rf-carousel-container"><div class="rf-carousel-track" style="transform: translateX(-${cardSlide * 50}%);"><div class="rf-carousel-slide">${card1Html}</div><div class="rf-carousel-slide">${card2Html}</div></div></div><div class="rf-slider-dots"><button type="button" class="rf-dot ${cardSlide === 0 ? "active" : ""}" data-card-slide="0" aria-label="Portföy Özeti"></button><button type="button" class="rf-dot ${cardSlide === 1 ? "active" : ""}" data-card-slide="1" aria-label="Getiri Grafiği"></button></div>`;

  // Tab Body
  let body = "";
  if (state.portfolioTab === "positions") {
    const filterQuery = (state.portfolioSearch || "").toLocaleLowerCase("tr-TR");
    const filteredPos = positions.filter((p) => !filterQuery || p.symbol.toLowerCase().includes(filterQuery) || (p.name || "").toLowerCase().includes(filterQuery));
    body = `<div class="rf-history-toolbar"><div class="rf-search-bar">${icon("search", 18)}<input type="text" data-portfolio-search value="${esc(state.portfolioSearch || "")}" placeholder="Pozisyon ara..." /></div></div><div class="rf-tab-body">${filteredPos.map((p, i) => referenceStockButton({ ...p, price: p.current_price || p.price, change_pct: p.change_pct || ((Number(p.pnl || 0) / Math.max(Number(p.market_value || 0) - Number(p.pnl || 0), 1)) * 100) }, i)).join("") || `<div class="empty-state">Portföyünüzde henüz hisse yok.</div>`}</div>`;
  } else if (state.portfolioTab === "orders") {
    body = `<div class="rf-tab-body" style="margin-top:14px;">${orders.map(orderRow).join("") || `<div class="empty-state">Bekleyen veya tamamlanan emir bulunmuyor.</div>`}</div>`;
  } else if (state.portfolioTab === "history") {
    const filter = state.transactionFilter || "all";
    const query = (state.transactionQuery || "").toLocaleLowerCase("tr-TR");
    let rows = txs.map((t) => {
      const type = String(t.transaction_type || "").includes("sell") ? "sell" : String(t.transaction_type || "").includes("buy") ? "buy" : "other";
      return { ...t, type, html: customTxRow(t) };
    });
    if (filter !== "all") rows = rows.filter((r) => r.type === filter);
    if (query) rows = rows.filter((r) => (r.code || "").toLowerCase().includes(query) || (r.reference || "").toLowerCase().includes(query));

    body = `<div class="rf-history-toolbar"><div class="rf-search-bar">${icon("search", 18)}<input type="text" data-tx-search value="${esc(state.transactionQuery || "")}" placeholder="İşlem ara" /></div><div class="rf-filter-row"><div class="rf-filter-chips"><button type="button" class="${filter === "all" ? "active" : ""}" data-transaction-filter="all">Tümü</button><button type="button" class="${filter === "buy" ? "active" : ""}" data-transaction-filter="buy">Alış</button><button type="button" class="${filter === "sell" ? "active" : ""}" data-transaction-filter="sell">Satış</button></div><button type="button" class="rf-calendar-btn" data-calendar-picker aria-label="Tarih seç">${icon("calendar", 20)}</button></div></div><div class="rf-tab-body">${rows.map((r) => r.html).join("") || `<div class="empty-state">Bu filtrede geçmiş işlem bulunmuyor.</div>`}</div>`;
  }

  const tabsHtml = `<div class="rf-tabs">${[["positions", "Pozisyonlar"], ["orders", "Emirler"], ["history", "Geçmiş"]].map(([key, label]) => `<button type="button" data-rf-portfolio-tab="${key}" class="${state.portfolioTab === key ? "active" : ""}">${label}</button>`).join("")}</div>`;

  return `<section class="rf-portfolio">${carouselHtml}${tabsHtml}${body}</section>`;
};

function referenceStockButton(q, index = 0) {
  const symbol = q.symbol || q.code || "THYAO";
  const price = Number(q.price ?? q.current_price ?? q.avg_price ?? 0);
  const change = Number(q.change_pct ?? q.pnl_pct ?? 0);
  const name = q.name || q.company_name || symbol;
  const line2 = q.quantity
    ? `${number(q.quantity)} lot · Ort. ₺${number(q.avg_price || price)}`
    : name;
  const assetClass = q.asset_class || "stock";
  const isSpecial = ["ipo", "fund", "fx"].includes(assetClass);
  return `<button type="button" class="rf-stock-row" ${isSpecial ? "data-special-market-click" : `data-trade-symbol="${esc(symbol)}"`} data-asset-class="${esc(assetClass)}" style="--row-index:${index}">
    <span class="market-identity">${stockLogo(symbol, name)}<span><strong>${esc(symbol)}</strong><small>${esc(line2)}</small></span></span>
    <span class="rf-stock-price"><strong>${money(price)}</strong><small>${q.quantity ? money(q.market_value || price * Number(q.quantity || 0)) : "Güncel"}</small></span>
    <span class="change-pill ${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${number(change)}%</span>
  </button>`;
}

function customTxRow(t) {
  const isSell = String(t.transaction_type || "").includes("sell");
  const isBuy = String(t.transaction_type || "").includes("buy");
  const symbol = t.code || t.symbol || (isSell ? "TUPRS" : "THYAO");
  const badgeLabel = isSell ? "SATIŞ" : isBuy ? "ALIŞ" : (t.type_label || "İŞLEM");
  const badgeClass = isSell ? "sell" : isBuy ? "buy" : "";
  const pnlPct = t.pnl_pct !== undefined ? t.pnl_pct : (isSell ? 4.55 : 0);
  const pnlAmount = t.pnl_amount !== undefined ? t.pnl_amount : (isSell ? 391.00 : 0);
  const qty = t.quantity || (isSell ? 50 : 150);
  const price = t.price || (isSell ? 180.00 : 288.00);

  return `<article class="rf-tx-item" data-tx-detail-id="${t.id || 1}" data-symbol="${esc(symbol)}" data-type="${isSell ? 'sell' : 'buy'}" data-qty="${qty}" data-price="${price}" data-pnl="${pnlAmount}" data-pnlpct="${pnlPct}" data-total="${t.total || (qty * price)}" data-date="${esc(t.created_at_label || '14 Eylül 2026 10:22')}"><div class="rf-tx-left"><div class="rf-tx-logo">${stockLogo(symbol, symbol)}</div><div class="rf-tx-info"><div class="rf-tx-title"><strong>${esc(symbol)}</strong><span class="rf-tx-badge ${badgeClass}">${badgeLabel}</span></div><span class="rf-tx-subtitle">${qty} lot · ₺${number(price)}</span></div></div><div class="rf-tx-right">${isSell ? `<span class="rf-tx-pnl up">+₺${number(pnlAmount)} (%${number(pnlPct)})</span>` : ""}<strong class="rf-tx-total">₺${number(t.total || (qty * price))}</strong><span class="rf-tx-date">${esc(t.created_at_label || "9 Eyl 10:42")}</span></div></article>`;
}

stocksPage = function () {
  const special = {
    ipo: [{ symbol: "AAGYO", name: "Ahlatcı Altın Gayrimenkul Yatırım Ortaklığı", price: 12.06, change_pct: 0.42, asset_class: "ipo" }, { symbol: "AKFIS", name: "Akfen İnşaat Turizm ve Ticaret", price: 16.48, change_pct: 0.18, asset_class: "ipo" }],
    fund: [{ symbol: "APPBDL", name: "Ak Portföy BIST Banka Dışı Likit 10 Endeksi Hisse Senedi Fonu", price: 41.18, change_pct: -0.53, asset_class: "fund" }, { symbol: "APX30", name: "Ak Portföy BIST 30 Endeksi Hisse Senedi Fonu", price: 41.46, change_pct: 0.21, asset_class: "fund" }],
    fx: [{ symbol: "USDTRY", name: "Amerikan Doları", price: 40.87, change_pct: 0.15, asset_class: "fx" }, { symbol: "EURTRY", name: "Euro", price: 47.28, change_pct: 0.11, asset_class: "fx" }]
  };
  const all = state.market.filter((q) => (q.asset_class || "stock") === "stock");
  const query = (state.stockQuery || "").toLocaleLowerCase("tr-TR");
  const tab = state.marketTab || "bist";
  let visible = tab === "bist" ? all.filter((q) => !query || `${q.symbol} ${q.name}`.toLocaleLowerCase("tr-TR").includes(query)) : (special[tab] || []);
  if (state.stockSort === "gain") visible.sort((a, b) => b.change_pct - a.change_pct);
  else if (state.stockSort === "loss") visible.sort((a, b) => a.change_pct - b.change_pct);
  else visible.sort((a, b) => a.symbol.localeCompare(b.symbol, "tr"));

  const tabs = [
    ["bist", "BIST Tüm"],
    ["bist100", "BIST 100"],
    ["bist30", "BIST 30"],
    ["bist_katilim", "BIST Katılım"],
    ["bist_temettu", "BIST Temettü"],
    ["ipo", "Halka Arzlar"],
    ["fund", "Fonlar"],
    ["fx", "Döviz"]
  ].map(([key, label]) => `<button type="button" data-market-tab="${key}" class="${tab === key ? "active" : ""}">${label}</button>`).join("");

  const notice = ["ipo", "fund", "fx"].includes(tab) ? `<div class="approval-alert referral-alert">${icon("bell", 18)} <span>Referansınız ile iletişime geçiniz. Bu ürün grubu için temsilciniz yönlendirme yapacaktır.</span></div>` : "";

  return `<section class="rf-stocks"><div class="rf-stock-tools"><label>${icon("search", 19)}<input data-search="stocks" value="${esc(state.stockQuery || "")}" placeholder="Ara..." /></label><select data-stock-sort aria-label="Sıralama"><option value="az" ${state.stockSort === "az" ? "selected" : ""}>A-Z</option><option value="gain" ${state.stockSort === "gain" ? "selected" : ""}>Yükselen</option><option value="loss" ${state.stockSort === "loss" ? "selected" : ""}>Düşen</option></select></div><div class="market-category-tabs rf-category-tabs" id="rf-category-scroll-bar">${tabs}</div>${notice}<div class="rf-market-list">${visible.map((q, i) => referenceStockButton(q, i)).join("") || `<div class="empty-state">Kayıt bulunamadı.</div>`}</div></section>`;
};

// Global Profile Dropdown Modal Component
function profileDropdownModal() {
  if (!state.profileMenuOpen) return "";
  const user = state.me || { full_name: "İsim Soyisim", account_no: "12345678" };
  return `<div class="modal-backdrop open" data-close-profile-menu><div class="rf-profile-menu-modal" data-modal-stop><div class="rf-menu-user-head"><label class="rf-menu-avatar-wrap" title="Fotoğraf Yükle">${getCustomAvatarHtml()}<input type="file" id="rf-avatar-file-input" accept="image/*" hidden /></label><div class="rf-menu-user-info"><h3>${esc(user.full_name)}</h3><p>Müşteri No: ${esc(user.account_no)}</p><p style="color:#2563eb;font-weight:700;">Bireysel Yatırım Hesabı</p></div></div><div class="rf-menu-links"><a href="/esube/support" data-link class="rf-menu-item" style="color:#d97706;">${icon("award", 18)} <strong>Referans Fırsatları</strong></a><a href="/esube/profile/security" data-link class="rf-menu-item">${icon("shield", 18)} Güvenlik</a><button type="button" class="rf-menu-item" data-open-install-modal>${icon("download", 18)} Uygulamayı Yükle</button><a href="/esube/settings" data-link class="rf-menu-item">${icon("settings", 18)} Ayarlar</a><button type="button" class="rf-menu-item danger" data-action="logout">${icon("arrow", 18)} Çıkış Yap</button></div></div></div>`;
}

// App Install Modal (Android APK & iOS Guide)
function appInstallModal() {
  if (!state.installModalOpen) return "";
  return `<div class="modal-backdrop open" data-close-install-modal><div class="modal rf-install-modal" data-modal-stop><header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h2 style="margin:0;font-size:18px;">Uygulamayı Yükle</h2><button type="button" class="icon-button" data-close-install-modal aria-label="Kapat">${icon("close", 20)}</button></header><p class="muted" style="font-size:13px;">Cihazınıza uygun seçeneği belirleyerek uygulamayı hemen ana ekranınıza ekleyin.</p><div class="rf-install-choice-grid"><a href="/app-release.apk" download class="rf-install-card" style="text-decoration:none;"><div style="width:44px;height:44px;border-radius:12px;background:#e0f2fe;color:#0284c7;display:grid;place-items:center;">${icon("device", 24)}</div><strong>Android</strong><small>Doğrudan APK İndir</small></a><div class="rf-install-card" data-ios-guide-toggle><div style="width:44px;height:44px;border-radius:12px;background:#f3e8ff;color:#9333ea;display:grid;place-items:center;">${icon("upload", 24)}</div><strong>Apple (iOS)</strong><small>Ana Ekrana Ekle</small></div></div><div id="rf-ios-guide-box" style="display:none;background:#f8fafc;padding:12px 14px;border-radius:12px;font-size:12.5px;color:#475569;line-height:1.4;">1. Safari tarayıcısının altındaki <strong>Paylaş</strong> butonuna dokunun.<br/>2. Açılan menüden <strong>'Ana Ekrana Ekle'</strong> seçeneğine tıklayın.<br/>3. Sağ üstteki <strong>Ekle</strong> butonuna basarak tamamlayın.</div></div></div>`;
}

// Transaction Detail Modal (Exact 7-Row Layout + K/Z Oranı badge)
function txDetailModal() {
  const d = state.selectedTxDetail;
  if (!d) return "";
  const isPositive = Number(d.pnl || 0) >= 0;
  return `<div class="modal-backdrop open" data-close-tx-detail><div class="modal rf-tx-modal" data-modal-stop><div class="rf-tx-modal-head"><div style="display:flex;align-items:center;gap:10px;">${stockLogo(d.symbol, d.symbol)}<div><h3 style="margin:0;font-size:17px;">${esc(d.symbol)}</h3><small class="muted">${esc(d.name || d.symbol)}</small></div></div><button type="button" class="icon-button" data-close-tx-detail aria-label="Kapat">${icon("close", 20)}</button></div><span class="rf-tx-modal-status-badge">● Gerçekleşti</span><div class="rf-tx-pnl-box ${isPositive ? "" : "down"}"><div class="rf-tx-pnl-box-left"><span>Net kâr / zarar</span><strong style="font-size:12px;">${isPositive ? "+" : ""}${money(d.pnl || 391.00)}</strong></div><div class="rf-tx-pnl-box-right"><span>K/Z Oranı</span><strong class="rf-tx-pnl-badge ${isPositive ? "" : "down"}" style="font-size:16px;">${isPositive ? "+" : ""}${number(d.pnlpct || 4.97)}%</strong></div></div><div class="rf-tx-detail-list"><div class="rf-tx-detail-row"><span>Alınan adet</span><strong>${d.qty || 100} lot</strong></div><div class="rf-tx-detail-row"><span>Satış tarihi</span><strong>${esc(d.date || "14 Eylül 2026, 10:22:58")}</strong></div><div class="rf-tx-detail-row"><span>Ort. alış fiyatı</span><strong>${money(d.price || 180.00)}</strong></div><div class="rf-tx-detail-row"><span>Satış fiyatı</span><strong>${money(Number(d.price || 180.00) + (Number(d.pnl || 391) / Math.max(Number(d.qty || 100), 1)))}</strong></div><div class="rf-tx-detail-row"><span>Toplam Maliyet</span><strong>${money(Number(d.qty || 100) * Number(d.price || 180.00))}</strong></div><div class="rf-tx-detail-row"><span>Komisyon</span><strong style="color:#16a34a;">Ücretsiz</strong></div><div class="rf-tx-detail-row" style="border-top:1px solid var(--rf-line);padding-top:8px;"><span>Net Sonuç</span><strong>${money(d.total || 18500.00)}</strong></div></div><button type="button" class="primary-button full" data-close-tx-detail>Devam et</button></div></div>`;
}

// Special Market Item Reference Modal
function specialNoticeModal() {
  if (!state.specialNoticeOpen) return "";
  return `<div class="modal-backdrop open" data-close-special-notice><div class="modal rf-install-modal" data-modal-stop><header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h2 style="margin:0;font-size:17px;">Yetkili Temsilci Bilgilendirmesi</h2><button type="button" class="icon-button" data-close-special-notice aria-label="Kapat">${icon("close", 20)}</button></header><div style="text-align:center;padding:10px 0;"><div style="width:54px;height:54px;border-radius:50%;background:#fef3c7;color:#d97706;display:grid;place-items:center;margin:0 auto 14px;">${icon("award", 28)}</div><h3 style="margin:0 0 8px;font-size:16px;">Referansınız İle İletişime Geçiniz</h3><p class="muted" style="font-size:13px;line-height:1.4;">Halka arz, fon ve döviz işlemleriniz için referans temsilciniz size özel tahsisat ve işlem yönlendirmesi sağlayacaktır.</p></div><a href="/esube/support" data-link class="primary-button full" style="margin-top:14px;text-decoration:none;display:block;text-align:center;">${icon("message", 18)} Temsilcimle İletişime Geç</a></div></div>`;
}

// Global modal injection
const originalRender = render;
render = function (options) {
  originalRender(options);
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  const container = document.getElementById("app");
  if (container) {
    container.insertAdjacentHTML("beforeend", profileDropdownModal() + appInstallModal() + txDetailModal() + specialNoticeModal());
  }
};
document.body.classList.toggle("theme-dark", state.theme === "dark");

// Global Event Listeners
document.addEventListener("click", (event) => {
  // Toggle profile dropdown
  if (event.target.closest("[data-profile-menu-toggle]")) {
    event.preventDefault();
    state.profileMenuOpen = !state.profileMenuOpen;
    render({ motion: false, preserveScroll: true });
    return;
  }
  if (event.target.closest("[data-close-profile-menu]") && !event.target.closest("[data-modal-stop]")) {
    state.profileMenuOpen = false;
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Open Install Modal
  if (event.target.closest("[data-open-install-modal]")) {
    event.preventDefault();
    state.profileMenuOpen = false;
    state.installModalOpen = true;
    render({ motion: false, preserveScroll: true });
    return;
  }
  if (event.target.closest("[data-close-install-modal]") || (event.target.closest("[data-close-install-modal]") && !event.target.closest("[data-modal-stop]"))) {
    state.installModalOpen = false;
    render({ motion: false, preserveScroll: true });
    return;
  }
  if (event.target.closest("[data-ios-guide-toggle]")) {
    const box = document.getElementById("rf-ios-guide-box");
    if (box) box.style.display = box.style.display === "none" ? "block" : "none";
    return;
  }

  // Card slide dot
  const dot = event.target.closest("[data-card-slide]");
  if (dot) {
    event.preventDefault();
    state.portfolioCardSlide = Number(dot.dataset.cardSlide || 0);
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Portfolio tab
  const tab = event.target.closest("[data-rf-portfolio-tab]");
  if (tab) {
    event.preventDefault();
    event.stopImmediatePropagation();
    state.portfolioTab = tab.dataset.rfPortfolioTab;
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Transaction row detail click
  const txItem = event.target.closest("[data-tx-detail-id]");
  if (txItem) {
    event.preventDefault();
    state.selectedTxDetail = {
      id: txItem.dataset.txDetailId,
      symbol: txItem.dataset.symbol,
      type: txItem.dataset.type,
      qty: txItem.dataset.qty,
      price: txItem.dataset.price,
      pnl: txItem.dataset.pnl,
      pnlpct: txItem.dataset.pnlpct,
      total: txItem.dataset.total,
      date: txItem.dataset.date
    };
    render({ motion: false, preserveScroll: true });
    return;
  }
  if (event.target.closest("[data-close-tx-detail]") || (event.target.closest("[data-close-tx-detail]") && !event.target.closest("[data-modal-stop]"))) {
    state.selectedTxDetail = null;
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Special notice modal for IPO, Fund, FX
  if (event.target.closest("[data-special-market-click]") || (event.target.closest("[data-demo-action]") && ["Halka Arz", "Fon", "Döviz"].some(k => event.target.closest("[data-demo-action]").dataset.demoAction?.includes(k)))) {
    event.preventDefault();
    state.specialNoticeOpen = true;
    render({ motion: false, preserveScroll: true });
    return;
  }
  if (event.target.closest("[data-close-special-notice]") || (event.target.closest("[data-close-special-notice]") && !event.target.closest("[data-modal-stop]"))) {
    state.specialNoticeOpen = false;
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Preserve category scroll position on tab click
  const catTab = event.target.closest("[data-market-tab]");
  if (catTab) {
    event.preventDefault();
    const scrollBar = document.getElementById("rf-category-scroll-bar");
    const scrollPos = scrollBar ? scrollBar.scrollLeft : 0;
    state.marketTab = catTab.dataset.marketTab;
    render({ motion: false, preserveScroll: true });
    requestAnimationFrame(() => {
      const newBar = document.getElementById("rf-category-scroll-bar");
      if (newBar) newBar.scrollLeft = scrollPos;
    });
    return;
  }

  // Open buy/sell modal for a regular BIST stock row
  const tradeSymbolBtn = event.target.closest("[data-trade-symbol]");
  if (tradeSymbolBtn) {
    event.preventDefault();
    event.stopImmediatePropagation();
    state.selectedSymbol = tradeSymbolBtn.dataset.tradeSymbol;
    state.orderSide = "buy";
    state.orderAmountMode = "cash";
    state.tradeOpen = true;
    render({ motion: false, preserveScroll: true });
    return;
  }

  // Percent trade button
  const percent = event.target.closest("[data-rf-percent]");
  if (percent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = percent.closest("form");
    const input = form?.elements.quantity;
    const q = state.market.find((item) => item.symbol === state.selectedSymbol) || {};
    const account = state.portfolio?.account || state.account || {};
    const base = state.orderSide === "buy" ? Math.floor((Number(account.cash_balance || 0) + Number(account.pending_balance || 0)) / Math.max(Number(q.price || 0), 0.01)) : sellableQuantity(q.symbol);
    if (input) {
      input.value = Math.max(0, Math.floor((base * Number(percent.dataset.rfPercent)) / 100));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }
}, true);

// Handle avatar upload
document.addEventListener("change", (event) => {
  if (event.target.id === "rf-avatar-file-input") {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.customAvatar = e.target.result;
        localStorage.setItem("eminevim_avatar", state.customAvatar);
        showToast("Profil fotoğrafı güncellendi");
        render({ motion: false, preserveScroll: true });
      };
      reader.readAsDataURL(file);
    }
  }

  if (event.target.id === "rf-font-size-select") {
    state.fontSizeMode = event.target.value;
    localStorage.setItem("eminevim_font_size", state.fontSizeMode);
    document.documentElement.style.fontSize = state.fontSizeMode === "small" ? "14px" : state.fontSizeMode === "large" ? "18px" : "16px";
    showToast("Yazı boyutu güncellendi");
  }

  if (event.target.id === "rf-lang-select") {
    state.userLanguage = event.target.value;
    localStorage.setItem("eminevim_lang", state.userLanguage);
    showToast("Dil tercihi güncellendi");
  }

  const notifPref = event.target.closest("[data-notif-pref]");
  if (notifPref) {
    const key = notifPref.dataset.notifPref;
    state.notifPrefs[key] = notifPref.checked;
    if (key === "all") {
      ["price", "news", "trade", "referral", "weekly"].forEach((k) => { state.notifPrefs[k] = notifPref.checked; });
    } else if (notifPref.checked) {
      state.notifPrefs.all = true;
    }
    localStorage.setItem("eminevim_notif_prefs", JSON.stringify(state.notifPrefs));
    render({ motion: false, preserveScroll: true });
  }
});

// Swipe between the two portfolio cards (touch/pointer drag)
let rfCarouselStartX = null;
let rfCarouselTrack = null;
document.addEventListener("pointerdown", (event) => {
  const container = event.target.closest("#rf-carousel-container");
  if (!container || event.target.closest("[data-balance-toggle]") || event.target.closest("#rf-chart-drag-box")) return;
  rfCarouselStartX = event.clientX;
  rfCarouselTrack = container.querySelector(".rf-carousel-track");
  if (rfCarouselTrack) rfCarouselTrack.style.transition = "none";
});
document.addEventListener("pointermove", (event) => {
  if (rfCarouselStartX === null || !rfCarouselTrack) return;
  const delta = event.clientX - rfCarouselStartX;
  const base = -(state.portfolioCardSlide || 0) * 50;
  const width = rfCarouselTrack.parentElement.getBoundingClientRect().width || 1;
  rfCarouselTrack.style.transform = `translateX(${base + (delta / width) * 100}%)`;
});
function rfEndCarouselDrag(event) {
  if (rfCarouselStartX === null || !rfCarouselTrack) return;
  const delta = (event.clientX || rfCarouselStartX) - rfCarouselStartX;
  if (delta < -40 && (state.portfolioCardSlide || 0) === 0) {
    state.portfolioCardSlide = 1;
  } else if (delta > 40 && (state.portfolioCardSlide || 0) === 1) {
    state.portfolioCardSlide = 0;
  }
  rfCarouselStartX = null;
  rfCarouselTrack = null;
  render({ motion: false, preserveScroll: true });
}
document.addEventListener("pointerup", rfEndCarouselDrag);
document.addEventListener("pointercancel", rfEndCarouselDrag);

// Interactive chart drag-to-scrub (card 2)
let rfChartDragging = false;
function rfUpdateChartPoint(clientX) {
  const box = document.getElementById("rf-chart-drag-box");
  const svg = box?.querySelector(".rf-chart-svg");
  const dot = document.getElementById("rf-chart-drag-point");
  const tooltip = document.getElementById("rf-chart-tooltip");
  if (!box || !svg || !dot || !tooltip) return;
  let points;
  try { points = JSON.parse(box.dataset.points || "[]"); } catch (e) { points = []; }
  if (!points.length) return;
  const rect = svg.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const targetX = ratio * 300;
  let nearest = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    const d = Math.abs(p.x - targetX);
    if (d < bestDist) { bestDist = d; nearest = p; }
  }
  dot.setAttribute("cx", nearest.x);
  dot.setAttribute("cy", nearest.y);
  const pct = Number(nearest.pct);
  tooltip.textContent = `${nearest.date} · ${pct >= 0 ? "+" : "-"}%${number(Math.abs(pct))}`;
  tooltip.style.right = "";
  tooltip.style.left = `${Math.max(4, Math.min(94, (nearest.x / 300) * 100 - 10))}%`;
}
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("#rf-chart-drag-point") || event.target.closest("#rf-chart-drag-box")) {
    rfChartDragging = true;
    rfUpdateChartPoint(event.clientX);
  }
});
document.addEventListener("pointermove", (event) => {
  if (rfChartDragging) rfUpdateChartPoint(event.clientX);
});
document.addEventListener("pointerup", () => { rfChartDragging = false; });
document.addEventListener("pointercancel", () => { rfChartDragging = false; });

// Search input handling
document.addEventListener("input", (event) => {
  if (event.target.matches("[data-tx-search]")) {
    state.transactionQuery = event.target.value;
    render({ motion: false, preserveScroll: true });
  }
  if (event.target.matches("[data-portfolio-search]")) {
    state.portfolioSearch = event.target.value;
    render({ motion: false, preserveScroll: true });
  }
});

// T+2 takasta toast on sell
const originalSubmitTrade = window.submitTrade;
if (typeof originalSubmitTrade === "function") {
  window.submitTrade = async function (...args) {
    const res = await originalSubmitTrade.apply(this, args);
    if (state.orderSide === "sell") {
      setTimeout(() => {
        showToast("T+2 Takasta");
      }, 400);
    }
    return res;
  };
}

// Initial render
requestAnimationFrame(() => {
  if (state.me && state.path.startsWith("/esube") && !state.path.startsWith("/esube/admin")) {
    render({ motion: false, preserveScroll: true });
  }
});


