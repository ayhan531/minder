(function () {
  const capacitorNative = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
  const isNative = Boolean(
    capacitorNative ||
    (location.hostname === "localhost" && new URLSearchParams(location.search).has("native-demo"))
  );
  if (!isNative) return;
  // Installed apps start at the secure customer entrance, not the marketing website.
  if (capacitorNative && (location.pathname === "/" || location.pathname === "/index.html")) {
    history.replaceState({}, "", "/esube/giris");
  }

  const KEY = "minder-native-store-v1";
  const nowLabel = () => new Date().toLocaleString("tr-TR");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const quotes = [
    ["XU100", "BIST 100", 11048.12, .72, "index"], ["USDTRY", "Amerikan Doları", 40.87, .15, "fx"],
    ["THYAO", "Türk Hava Yolları A.O.", 300.50, -.17, "stock"], ["ASELS", "Aselsan Elektronik Sanayi", 381.25, -1.99, "stock"],
    ["GARAN", "Garanti BBVA", 134.70, 1.11, "stock"], ["AKBNK", "Akbank", 67.65, .80, "stock"],
    ["TUPRS", "Tüpraş", 145.80, .44, "stock"], ["FROTO", "Ford Otosan", 1045.00, 1.32, "stock"],
    ["BIMAS", "BİM Birleşik Mağazalar", 542.50, -.36, "stock"], ["TCELL", "Turkcell", 98.40, .91, "stock"],
  ].map(([symbol, name, price, change_pct, asset_class], index) => ({ symbol, name, price, change_pct, asset_class, volume: 1_000_000 + index * 275_000, updated_at: Date.now() / 1000 }));

  function seed() {
    return {
      session: new URLSearchParams(location.search).get("native-demo") === "user" ? "user" : null,
      users: {
        user: { id: 4, role: "user", status: "approved", status_label: "Onaylandı", account_no: "MD000004", full_name: "Mert Yılmaz", email: "mert.yilmaz@example.com", phone: "05•• ••• •• 42", tc: "20000000000" },
        admin: { id: 1, role: "admin", status: "approved", status_label: "Onaylandı", account_no: "MD000001", full_name: "Minder Admin", email: "admin@minder.local", tc: "10000000000" },
      },
      credentials: { "20000000000": "TestPass!2026", "10000000000": "AdminPass!2026" },
      account: { cash_balance: 123456.78, blocked_balance: 0, pending_balance: 0, credit_limit: 0 },
      positions: [
        ["THYAO", "Türk Hava Yolları A.O.", 292, 248.40], ["ASELS", "Aselsan Elektronik Sanayi", 150, 58.40],
        ["GARAN", "Garanti BBVA", 200, 102.20], ["TUPRS", "Tüpraş", 75, 145.80], ["AKBNK", "Akbank", 10, 67.65],
      ].map(([symbol, name, quantity, avg_price]) => ({ symbol, name, quantity, avg_price })),
      orders: [], money_requests: [], t2_settlements: [],
      transactions: [
        { id: 1, type_label: "Açılış Bakiyesi", transaction_type: "balance_open", reference: "MD-HRK-00000001", code: "", quantity: 0, total: 123456.78, created_at_label: nowLabel() },
      ],
                                                                        branding: {
        name: "MINDER",
        descriptor: "OTTOMAN",
        symbol: "M",
        logo_url: "/assets/paribu-logo.svg",
        tagline: "Referanslı yatırım deneyimi",
        primary: "#4f79d9",
        accent: "#0fbf7a",
        danger: "#ef3340",
        font: "Inter",
        radius: "18",
        support_email: "destek@minder.local",
        support_phone: "0850 303 6000",
      },
      company: {
        name: "Minder Ottoman",
        registry_number: "849204",
        mersis_number: "072108920400001",
        address: "Finans Merkezi, Barbaros Mah. Ataşehir / İstanbul",
        phone: "0850 303 6000",
        email: "destek@paribu.local",
        license_text: "SPK Geniş Yetkili Aracı Kurum Lisansı No: G-042/2026",
      },
      settings: {
        trading_enabled: "1",
        maintenance_mode: "0",
        t2_enabled: "0",
        brand_name: "MINDER",
        brand_descriptor: "OTTOMAN",
        brand_symbol: "M",
        brand_logo_url: "/assets/paribu-logo.svg",
        brand_tagline: "Referanslı yatırım deneyimi",
        ui_primary_color: "#4f79d9",
        ui_accent_color: "#0fbf7a",
        ui_danger_color: "#ef3340",
        ui_font_family: "Inter",
        ui_radius: "18",
        official_company_name: "Minder Ottoman",
        official_registry_number: "849204",
        official_mersis_number: "072108920400001",
        official_address: "Finans Merkezi, Barbaros Mah. Ataşehir / İstanbul",
        official_phone: "0850 303 6000",
        official_email: "destek@paribu.local",
        official_license_text: "SPK Geniş Yetkili Aracı Kurum Lisansı No: G-042/2026",
      },
      nextId: 10,
    };
  }

  function load() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.branding || !parsed.settings) {
          const fresh = seed();
          parsed.branding = parsed.branding || fresh.branding;
          parsed.settings = parsed.settings || fresh.settings;
          parsed.company = parsed.company || fresh.company;
          save(parsed);
        }
        return parsed;
      }
      const fresh = seed();
      save(fresh);
      return fresh;
    } catch (_) {
      const fresh = seed();
      save(fresh);
      return fresh;
    }
  }
  function save(store) { localStorage.setItem(KEY, JSON.stringify(store)); }
  function payload(options) {
    if (!options || options.body == null) return {};
    if (options.body instanceof FormData) return Object.fromEntries(options.body.entries());
    if (typeof options.body === "string") { try { return JSON.parse(options.body); } catch (_) { return {}; } }
    return options.body || {};
  }
  function currentUser(store) { return store.session ? store.users[store.session] : null; }
  function requireUser(store) { const user = currentUser(store); if (!user) throw new Error("Oturum açmanız gerekiyor"); return user; }
  function quoteFor(symbol) { return quotes.find((quote) => quote.symbol === symbol); }
  function hydratedPositions(store) {
    return store.positions.map((position) => {
      const quote = quoteFor(position.symbol) || { price: position.avg_price };
      const market_value = Number((quote.price * position.quantity).toFixed(2));
      return { ...position, current_price: quote.price, market_value, pnl: Number((market_value - position.avg_price * position.quantity).toFixed(2)), updated_at_label: nowLabel() };
    });
  }
  function portfolio(store) {
    return {
      account: clone(store.account), positions: hydratedPositions(store), orders: clone(store.orders),
      money_requests: clone(store.money_requests), transactions: clone(store.transactions), t2_settlements: clone(store.t2_settlements),
      settlement_settings: { t2_enabled: false },
      system_bank_accounts: [{ id: 1, bank_name: "Minder Demo Bankası", account_holder: "Minder Ottoman", iban: "TR330006100519786457841326", branch_name: "Dijital Şube", description: "Demo transfer hesabı", is_active: 1 }],
    };
  }
  function orderLabels(order) {
    return { ...order, side_label: order.side === "buy" ? "Alış" : "Satış", order_type_label: order.order_type === "market" ? "Piyasa" : "Limit", status_label: order.status === "approved" ? "Gerçekleşti" : order.status === "cancelled" ? "İptal" : "Bekliyor" };
  }
  function moneyLabels(request) {
    const labels = { deposit: "Para Yatırma", withdraw: "Para Çekme", credit: "Kredi Başvurusu" };
    return { ...request, type_label: labels[request.request_type], status_label: request.status === "pending" ? "Bekliyor" : request.status === "approved" ? "Onaylandı" : "İptal" };
  }

  window.__paribuNativeApi = async function nativeApi(path, options = {}) {
    const store = load();
    const method = String(options.method || "GET").toUpperCase();
    const body = payload(options);
    const url = new URL(path, "https://localhost");
    const route = url.pathname;

    if (route === "/api/health") return { ok: true, db: true, storage: true, native: true };
    if (route === "/api/public/config") {
      const b = clone(store.branding || {});
      const c = clone(store.company || {});
      return {
        company: c,
        branding: b,
        company_information_complete: true,
        fees: { stock_commission_rate_bps: 2, stock_commission_rate_percent: .02, minimum_commission: 1, configured: true },
        agreements_version: "2026-08"
      };
    }
    if (route === "/api/me") { const user = currentUser(store); return { user: user ? clone(user) : null, account: user ? clone(store.account) : null }; }
    if (route === "/api/login" && method === "POST") {
      const role = body.tc === store.users.admin.tc ? "admin" : body.tc === store.users.user.tc ? "user" : null;
      if (!role || store.credentials[body.tc] !== body.password) throw new Error("T.C. Kimlik / müşteri numarası veya şifre hatalı");
      store.session = role; save(store); return { user: clone(store.users[role]), account: clone(store.account) };
    }
    if (route === "/api/logout" && method === "POST") { store.session = null; save(store); return { ok: true }; }
    if (route === "/api/register" && method === "POST") {
      store.users.user = { ...store.users.user, full_name: body.full_name || "Yeni Kullanıcı", email: body.email || "", tc: body.tc || "20000000000", status: "approved", status_label: "Onaylandı" };
      store.credentials[store.users.user.tc] = body.password || "TestPass!2026"; store.session = "user"; save(store); return { user: clone(store.users.user) };
    }
    if (route.startsWith("/api/password/")) return { ok: true, message: "Demo modunda parola işlemi tamamlandı." };
    if (route === "/api/market") return { quotes: clone(quotes), meta: { ok: true, degraded: false, source: "APK demo piyasası", updated_at_label: nowLabel() } };
    if (route === "/api/news") return { items: [{ id: 1, source: "KAP", title: "Piyasa verileri ve şirket bildirimleri güncellendi", summary: "Demo haber akışı çevrimdışı kullanılabilir.", url: "#", published_at: new Date().toISOString() }], meta: { ok: true } };
    if (route.startsWith("/api/company/")) {
      const symbol = decodeURIComponent(route.split("/").pop()); const quote = quoteFor(symbol) || quotes[2];
      return { quote, profile: { sector: "Borsa İstanbul", industry: "Halka Açık Şirket", description: `${quote.name} şirket özeti.` }, history: Array.from({ length: 24 }, (_, index) => ({ price: quote.price * (.94 + index * .005 + Math.sin(index) * .01), recorded_at_label: `${index + 1}:00` })), news: [], disclosures: [] };
    }
    if (route === "/api/profile/security") { requireUser(store); return { two_factor_enabled: false, sessions: [{ id: "native", current: true, ip_address: "Yerel APK", last_seen_at_label: nowLabel() }], documents: [] }; }
    if (route.startsWith("/api/profile/")) { requireUser(store); return { ok: true, message: "İşlem tamamlandı", secret: "PARIBU2DEMO", otpauth_url: "otpauth://totp/Paribu2" }; }
    if (route === "/api/portfolio") { requireUser(store); return portfolio(store); }
    if (route === "/api/orders" && method === "GET") { requireUser(store); return { orders: store.orders.map(orderLabels) }; }
    if (route === "/api/orders" && method === "POST") {
      requireUser(store); const quote = quoteFor(body.symbol); if (!quote) throw new Error("Hisse bulunamadı");
      const quantity = Math.max(1, Math.floor(Number(body.quantity || 0))); const gross = Number((quantity * quote.price).toFixed(2)); const commission = Math.max(1, Number((gross * .0002).toFixed(2))); const side = body.side;
      const position = store.positions.find((item) => item.symbol === body.symbol);
      if (side === "buy") { if (store.account.cash_balance < gross + commission) throw new Error("Yetersiz işlem bakiyesi"); store.account.cash_balance -= gross + commission; if (position) { position.avg_price = ((position.avg_price * position.quantity) + gross) / (position.quantity + quantity); position.quantity += quantity; } else store.positions.push({ symbol: quote.symbol, name: quote.name, quantity, avg_price: quote.price }); }
      else { if (!position || position.quantity < quantity) throw new Error("Yetersiz satılabilir hisse"); position.quantity -= quantity; store.account.pending_balance += gross - commission; if (!position.quantity) store.positions = store.positions.filter((item) => item !== position); store.t2_settlements.unshift({ id: store.nextId++, code: quote.symbol, name: quote.name, amount: gross - commission, remaining_amount: gross - commission, quantity, sale_price: quote.price, status: "pending", status_label: "Bekliyor", settlement_date_label: "2 iş günü" }); }
      const order = orderLabels({ id: store.nextId++, symbol: quote.symbol, side, order_type: body.order_type || "market", quantity, limit_price: quote.price, gross_total: gross, commission, total: side === "buy" ? gross + commission : gross - commission, status: body.order_type === "limit" ? "pending" : "approved", execution_reference: `PM-EMR-${Date.now()}`, created_at_label: nowLabel() });
      store.orders.unshift(order); store.transactions.unshift({ id: store.nextId++, type_label: side === "buy" ? "Hisse Alışı" : "Hisse Satışı", transaction_type: `trade_${side}`, reference: order.execution_reference, code: quote.symbol, quantity, total: order.total, created_at_label: nowLabel() }); save(store); return { order: clone(order) };
    }
    const orderAction = route.match(/^\/api\/orders\/(\d+)\/(cancel|edit)$/);
    if (orderAction && method === "POST") { const order = store.orders.find((item) => item.id === Number(orderAction[1])); if (order) order.status = "cancelled"; save(store); return { ok: true, order: order ? orderLabels(order) : null }; }
    if (route === "/api/money-requests" && method === "GET") { requireUser(store); return { money_requests: store.money_requests.map(moneyLabels) }; }
    if (route === "/api/money-requests" && method === "POST") { requireUser(store); const amount = Number(body.amount || 0); if (amount <= 0) throw new Error("Geçerli bir tutar girin"); if (body.request_type === "withdraw" && amount > store.account.cash_balance) throw new Error("Yetersiz bakiye"); const request = moneyLabels({ id: store.nextId++, request_type: body.request_type, amount, account_holder: body.account_holder || "", bank_name: body.bank_name || "", iban: body.iban || "", account_ref: body.account_ref || "", transfer_code: body.transfer_code || `PM-${Date.now()}`, note: body.note || "", status: "pending", created_at_label: nowLabel() }); store.money_requests.unshift(request); save(store); return { request: clone(request) }; }
    const moneyCancel = route.match(/^\/api\/money-requests\/(\d+)\/cancel$/);
    if (moneyCancel && method === "POST") { const request = store.money_requests.find((item) => item.id === Number(moneyCancel[1])); if (request) request.status = "rejected"; save(store); return { ok: true }; }
    if (route === "/api/system-bank-accounts") return { system_bank_accounts: portfolio(store).system_bank_accounts };

    const user = requireUser(store);
    if (route === "/api/admin/step-up") return { ok: user.role === "admin", valid_for_seconds: 600 };
    if (!route.startsWith("/api/admin/") || user.role !== "admin") throw new Error("Yönetim paneli için yetki gerekli");
    const summary = { users: 1, pending_users: 0, pending_orders: store.orders.filter((item) => item.status === "pending").length, pending_money: store.money_requests.filter((item) => item.status === "pending").length, pending_deposits: 0, pending_withdrawals: store.money_requests.filter((item) => item.request_type === "withdraw" && item.status === "pending").length, pending_t2: store.t2_settlements.length, cash_total: store.account.cash_balance, blocked_total: 0, pending_balance_total: store.account.pending_balance };
    if (route === "/api/admin/summary") return { summary };
    if (route === "/api/admin/users") return { users: [clone(store.users.user)] };
    if (route === "/api/admin/orders") return { orders: store.orders.map((item) => ({ ...orderLabels(item), full_name: store.users.user.full_name })) };
    if (route === "/api/admin/money") return { money_requests: store.money_requests.map((item) => ({ ...moneyLabels(item), full_name: store.users.user.full_name })) };
    if (route === "/api/admin/reports") return { orders: [], money: [], users: [{ status: "approved", count: 1 }], audit: [], reconciliation: { cash: store.account.cash_balance, blocked: 0, pending: store.account.pending_balance, credit: 0 }, transactions: [] };
    if (route === "/api/admin/bank-accounts") return { system_bank_accounts: portfolio(store).system_bank_accounts, user_bank_accounts: [] };
    if (route === "/api/admin/t2-settlements") return { t2_settlements: clone(store.t2_settlements) };
    if (route === "/api/admin/transactions") return { transactions: clone(store.transactions) };
    if (route === "/api/admin/positions") return { positions: hydratedPositions(store).map((item) => ({ ...item, full_name: store.users.user.full_name })) };
    if (route === "/api/admin/user-balances") return { balances: [{ ...store.account, ...store.users.user }] };
    if (route === "/api/admin/system-settings") {
      if (method === "POST") {
        store.settings = { ...(store.settings || {}), ...body };
        store.branding = store.branding || {};
        store.company = store.company || {};
        if (body.brand_name) store.branding.name = body.brand_name;
        if (body.brand_descriptor) store.branding.descriptor = body.brand_descriptor;
        if (body.brand_symbol) store.branding.symbol = body.brand_symbol;
        if (body.brand_logo_url !== undefined) store.branding.logo_url = body.brand_logo_url;
        if (body.brand_tagline) store.branding.tagline = body.brand_tagline;
        if (body.ui_primary_color) store.branding.primary = body.ui_primary_color;
        if (body.ui_accent_color) store.branding.accent = body.ui_accent_color;
        if (body.ui_danger_color) store.branding.danger = body.ui_danger_color;
        if (body.ui_font_family) store.branding.font = body.ui_font_family;
        if (body.ui_radius) store.branding.radius = body.ui_radius;
        if (body.content_support_email) store.branding.support_email = body.content_support_email;
        if (body.content_support_phone) store.branding.support_phone = body.content_support_phone;
        if (body.official_company_name) store.company.name = body.official_company_name;
        if (body.official_registry_number) store.company.registry_number = body.official_registry_number;
        if (body.official_mersis_number) store.company.mersis_number = body.official_mersis_number;
        if (body.official_address) store.company.address = body.official_address;
        if (body.official_phone) store.company.phone = body.official_phone;
        if (body.official_email) store.company.email = body.official_email;
        if (body.official_license_text) store.company.license_text = body.official_license_text;
        save(store);
        return { ok: true, message: "Sistem ve marka ayarları kaydedildi" };
      }
      return { settings: clone(store.settings || {}) };
    }
    if (route === "/api/admin/stock-descriptions") return { descriptions: [] };
    if (route === "/api/admin/documents") return { documents: [] };
    if (route === "/api/admin/contact-messages") return { messages: [] };
    if (method === "POST") { save(store); return { ok: true, message: "Demo yönetim işlemi tamamlandı" }; }
    return {};
  };
})();
