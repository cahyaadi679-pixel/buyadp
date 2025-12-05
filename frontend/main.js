(function () {
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || "/api";

  const plans = [
    { key: "1gb", label: "1GB", cpu: 40,  disk: 1000, ram: 1000,  price: 1000, type: "panel" },
    { key: "2gb", label: "2GB", cpu: 60,  disk: 1000, ram: 2000,  price: 2000, type: "panel" },
    { key: "3gb", label: "3GB", cpu: 80,  disk: 2000, ram: 3000,  price: 3000, type: "panel" },
    { key: "4gb", label: "4GB", cpu: 100, disk: 2000, ram: 4000,  price: 4000, type: "panel" },
    { key: "5gb", label: "5GB", cpu: 120, disk: 3000, ram: 5000,  price: 5000, type: "panel" },
    { key: "6gb", label: "6GB", cpu: 140, disk: 3000, ram: 6000,  price: 6000, type: "panel" },
    { key: "7gb", label: "7GB", cpu: 160, disk: 4000, ram: 7000,  price: 7000, type: "panel" },
    { key: "8gb", label: "8GB", cpu: 180, disk: 4000, ram: 8000,  price: 8000, type: "panel" },
    { key: "9gb", label: "9GB", cpu: 200, disk: 5000, ram: 9000,  price: 9000, type: "panel" },
    { key: "10gb",label: "10GB",cpu: 220, disk: 5000, ram:10000,  price: 10000, type: "panel" },
    { key: "unlimited", label: "Unlimited", cpu: 0, disk: 0, ram: 0, unlimited: true, price: 11000, type: "panel" }
  ];

  const scriptPlan = {
    key: "script_alpha",
    label: "Script Alpha Centauri v4.5",
    price: 15000,
    type: "script"
  };

  const state = {
    currentOrderId: null,
    currentPlanKey: null,
    currentPlanType: null,
    pollingTimer: null
  };

  const liveNames = [
    "Fauzan", "Rizky", "Nanda", "Aurel", "Ryan", "Dinda",
    "Ikhsan", "Salsa", "Bagas", "Rara", "Kevin", "Celine",
    "Reza", "Intan", "Bima", "Nayla", "Arya", "Hani"
  ];

  const STORAGE_KEY_ORDER = "yp_last_order";
  const STORAGE_KEY_SERVER = "yp_last_server";
  const STORAGE_KEY_SCRIPT = "yp_last_script";

  function randomName() {
    return liveNames[Math.floor(Math.random() * liveNames.length)];
  }

  function maskOrder(orderId) {
    if (!orderId) return "";
    if (orderId.length <= 6) return orderId;
    return "********-" + orderId.slice(-6);
  }

  function saveLastOrder(orderId, planKey, planType) {
    try {
      localStorage.setItem(
        STORAGE_KEY_ORDER,
        JSON.stringify({ orderId, planKey, planType })
      );
    } catch (e) {
      console.warn("Gagal simpan order ke storage:", e);
    }
  }

  function loadLastOrder() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ORDER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal baca order dari storage:", e);
      return null;
    }
  }

  function clearLastOrder() {
    try {
      localStorage.removeItem(STORAGE_KEY_ORDER);
    } catch (e) {}
  }

  function saveServerInfoLocal(server) {
    try {
      localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(server));
    } catch (e) {
      console.warn("Gagal simpan server ke storage:", e);
    }
  }

  function loadServerInfoLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SERVER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal baca server dari storage:", e);
      return null;
    }
  }

  function saveScriptInfoLocal(info) {
    try {
      localStorage.setItem(STORAGE_KEY_SCRIPT, JSON.stringify(info));
    } catch (e) {
      console.warn("Gagal simpan script ke storage:", e);
    }
  }

  function loadScriptInfoLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SCRIPT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal baca script dari storage:", e);
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initImages();
    initSplash();
    renderPlans();
    initScriptCard();
    updateYear();
    startLiveSimulation();

    // Restore order terakhir
    var lastOrder = loadLastOrder();
    if (lastOrder && lastOrder.orderId) {
      state.currentOrderId = lastOrder.orderId;
      state.currentPlanKey = lastOrder.planKey || null;
      state.currentPlanType = lastOrder.planType || null;
      togglePaymentSection(true);
      setPaymentStatus("Mengembalikan status order terakhir...", "warning");
      startPollingStatus();
      setActiveProduct(lastOrder.planKey, lastOrder.planType);
    }

    // Restore hasil panel
    var lastServer = loadServerInfoLocal();
    if (lastServer && lastServer.panelUrl) {
      showServerInfo(lastServer);
    }

    // Restore hasil script
    var lastScript = loadScriptInfoLocal();
    if (lastScript && lastScript.downloadUrl) {
      showScriptInfo(lastScript);
    }
  });

  function initImages() {
    var logoUrl = (window.APP_CONFIG && window.APP_CONFIG.mainLogoUrl) || "";
    var brandLogoImg = document.getElementById("brand-logo");
    if (brandLogoImg && logoUrl) {
      brandLogoImg.src = logoUrl;
    }
    var splashLogo = document.getElementById("splash-logo");
    if (splashLogo && logoUrl) {
      splashLogo.src = logoUrl;
    }

    var scriptImg = document.getElementById("script-image");
    var scriptUrl = (window.APP_CONFIG && window.APP_CONFIG.scriptImageUrl) || logoUrl;
    if (scriptImg && scriptUrl) {
      scriptImg.src = scriptUrl;
    }
  }

  function initSplash() {
    const splash = document.getElementById("splash");
    setTimeout(function () {
      if (!splash) return;
      splash.classList.add("hidden");
      setTimeout(function () {
        if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      }, 500);
    }, 900);
  }

  function updateYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function renderPlans() {
    var grid = document.getElementById("plans-grid");
    grid.innerHTML = "";
    var planImageUrl = (window.APP_CONFIG && window.APP_CONFIG.planImageUrl) || "";

    plans.forEach(function (plan) {
      var card = document.createElement("article");
      card.className = "card plan-card";
      card.setAttribute("data-plan-key", plan.key);
      card.setAttribute("data-plan-type", "panel");

      var main = document.createElement("div");
      main.className = "plan-main";

      var media = document.createElement("div");
      media.className = "plan-media";
      if (planImageUrl) {
        var img = document.createElement("img");
        img.src = planImageUrl;
        img.alt = "Panel Bot " + plan.label;
        media.appendChild(img);
      }

      var body = document.createElement("div");
      body.className = "plan-body";

      var titleRow = document.createElement("div");
      titleRow.className = "plan-title";

      var nameEl = document.createElement("div");
      nameEl.className = "plan-name";
      nameEl.textContent = "Panel Bot " + plan.label;

      var chip = document.createElement("span");
      chip.className = "plan-chip";
      chip.textContent = plan.unlimited ? "Best value" : "Rekomendasi";

      titleRow.appendChild(nameEl);
      titleRow.appendChild(chip);

      var desc = document.createElement("div");
      desc.className = "plan-desc";
      desc.textContent = plan.unlimited
        ? "Resource fleksibel untuk kebutuhan khusus bot."
        : "Cocok untuk bot WhatsApp / Telegram skala kecil-menengah.";

      var meta = document.createElement("div");
      meta.className = "plan-meta";

      meta.appendChild(makeBadge("CPU", plan.cpu ? plan.cpu + "%" : "Unlimited"));
      meta.appendChild(makeBadge("RAM", plan.unlimited ? "Unlimited" : formatRam(plan.ram)));
      meta.appendChild(makeBadge("Disk", plan.unlimited ? "Unlimited" : formatDisk(plan.disk)));

      body.appendChild(titleRow);
      body.appendChild(desc);
      body.appendChild(meta);

      main.appendChild(media);
      main.appendChild(body);

      var footer = document.createElement("div");
      footer.className = "plan-footer";

      var price = document.createElement("div");
      price.className = "plan-price";
      price.innerHTML = formatCurrency(plan.price) + ' <span>/bulan</span>';

      var button = document.createElement("button");
      button.className = "btn btn-primary";
      button.textContent = "Beli Panel";
      button.addEventListener("click", function () {
        handleBuy(plan);
      });

      footer.appendChild(price);
      footer.appendChild(button);

      card.appendChild(main);
      card.appendChild(footer);

      grid.appendChild(card);
    });
  }

  function initScriptCard() {
    var btn = document.getElementById("script-buy-btn");
    var card = document.getElementById("script-card");
    if (btn) {
      btn.addEventListener("click", function () {
        handleBuy(scriptPlan);
      });
    }
    if (card) {
      card.setAttribute("data-plan-type", "script");
    }
  }

  function setActiveProduct(planKey, planType) {
    var cards = document.querySelectorAll(".plan-card, .script-card");
    cards.forEach(function (card) {
      var key = card.getAttribute("data-plan-key");
      var type = card.getAttribute("data-plan-type");
      if (key === planKey && type === planType) {
        card.classList.add("is-active");
      } else {
        card.classList.remove("is-active");
      }
    });
  }

  function makeBadge(label, value) {
    var badge = document.createElement("span");
    badge.className = "badge";
    badge.innerHTML = "<strong>" + label + "</strong> " + value;
    return badge;
  }

  function formatRam(mb) {
    if (!mb) return "-";
    if (mb >= 1024) {
      var gb = mb / 1024;
      return (gb % 1 === 0 ? gb : gb.toFixed(1)) + " GB";
    }
    return mb + " MB";
  }

  function formatDisk(mb) {
    return formatRam(mb);
  }

  function formatCurrency(amount) {
    if (amount === undefined || amount === null) return "-";
    var prefix = (window.APP_CONFIG && window.APP_CONFIG.currencyPrefix) || "Rp";
    return prefix + " " + amount.toLocaleString("id-ID");
  }

  async function handleBuy(plan) {
    try {
      state.currentPlanType = plan.type || "panel";
      state.currentPlanKey = plan.key;
      setActiveProduct(plan.key, plan.type);

      togglePaymentSection(true);
      setPaymentStatus("Membuat QRIS...", "warning");
      document.getElementById("result-section").classList.add("hidden");

      var res = await fetch(API_BASE + "/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: plan.key })
      });

      var data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal membuat order");
      }

      state.currentOrderId = data.orderId;
      state.currentPlanKey = plan.key;
      state.currentPlanType = data.planType || plan.type || "panel";

      saveLastOrder(data.orderId, plan.key, state.currentPlanType);
      pushLivePurchase(plan);
      renderPaymentInfo(data, plan);
      startPollingStatus();
    } catch (err) {
      console.error(err);
      setPaymentStatus("Gagal membuat QRIS: " + err.message, "error");
    }
  }

  function togglePaymentSection(show) {
    var section = document.getElementById("payment-section");
    if (!section) return;
    if (show) section.classList.remove("hidden");
    else section.classList.add("hidden");
  }

  function setPaymentStatus(text, variant) {
    var badge = document.getElementById("payment-status-badge");
    if (!badge) return;
    badge.textContent = text;
    badge.classList.remove("success");
    badge.classList.remove("error");
    if (variant === "success") badge.classList.add("success");
    if (variant === "error") badge.classList.add("error");
  }

  function renderPaymentInfo(apiData, plan) {
    var descEl = document.getElementById("payment-description");
    var isScript = (plan.type === "script");
    if (isScript) {
      descEl.textContent = "Order " + plan.label + ". Silakan scan QRIS di bawah ini. Setelah pembayaran berhasil, script akan bisa diunduh.";
    } else {
      descEl.textContent = "Order Panel Bot " + plan.label + ". Silakan scan QRIS di bawah ini menggunakan aplikasi bank / e-wallet. Jika ada kendala, segera hubungi owner melalui WhatsApp di atas.";
    }

    var metaEl = document.getElementById("payment-meta");
    var amountText = formatCurrency(apiData.amount || plan.price);
    var expiredAt = apiData.expiredAt ? new Date(apiData.expiredAt).toLocaleString("id-ID") : "-";

    metaEl.innerHTML = "";
    metaEl.insertAdjacentHTML("beforeend", "<li>Nominal: <strong>" + amountText + "</strong></li>");
    metaEl.insertAdjacentHTML("beforeend", "<li>Order ID: <code>" + apiData.orderId + "</code></li>");
    metaEl.insertAdjacentHTML("beforeend", "<li>Kadaluarsa: " + expiredAt + "</li>");

    var qrContainer = document.getElementById("qris-container");
    qrContainer.innerHTML = "";

    if (apiData.paymentNumber) {
      var img = document.createElement("img");
      var encoded = encodeURIComponent(apiData.paymentNumber);
      img.src = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" + encoded;
      img.alt = "QRIS Payment";
      qrContainer.appendChild(img);
      setPaymentStatus("Silakan scan QRIS untuk membayar.", "warning");
    } else {
      qrContainer.textContent = "QRIS gagal dimuat.";
      setPaymentStatus("QRIS gagal dimuat dari server.", "error");
    }
  }

  function startPollingStatus() {
    if (state.pollingTimer) {
      clearInterval(state.pollingTimer);
    }
    checkStatusOnce();
    state.pollingTimer = setInterval(checkStatusOnce, 4500);
  }

  async function checkStatusOnce() {
    if (!state.currentOrderId) return;
    try {
      var url = API_BASE + "/order-status?orderId=" + encodeURIComponent(state.currentOrderId);
      var res = await fetch(url);
      var data = await res.json();
      if (!res.ok || !data.ok) {
        console.warn("Status order tidak ok", data);
        return;
      }

      var planType = data.planType || state.currentPlanType || "panel";

      if (!data.paid) {
        setPaymentStatus("Menunggu pembayaran...", "warning");
        return;
      }

      setPaymentStatus("Pembayaran diterima. Memproses produk...", "success");

      if (planType === "panel") {
        if (data.serverCreated && data.server) {
          clearInterval(state.pollingTimer);
          saveServerInfoLocal(data.server);
          showServerInfo(data.server);
        }
      } else if (planType === "script") {
        if (data.scriptDelivered && data.downloadUrl) {
          clearInterval(state.pollingTimer);
          var info = {
            downloadUrl: data.downloadUrl,
            planLabel: data.planLabel || scriptPlan.label,
            orderId: data.orderId
          };
          saveScriptInfoLocal(info);
          showScriptInfo(info);
        }
      }
    } catch (err) {
      console.error("Gagal cek status order:", err);
    }
  }

  function showServerInfo(server) {
    var section = document.getElementById("result-section");
    var container = document.getElementById("server-info");
    var title = document.getElementById("result-title");
    var subtitle = document.getElementById("result-subtitle");

    section.classList.remove("hidden");
    title.textContent = "Step 3 · Panel Bot Siap Dipakai";
    subtitle.textContent = "Berikut detail login panel bot kamu. Simpan baik-baik. Jika ada kendala atau error, silakan hubungi owner di WhatsApp.";

    var panelUrl = server.panelUrl || "#";

    container.innerHTML = ""
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Panel URL</div>'
      + '  <div class="server-info-value"><a href="' + panelUrl + '" target="_blank" rel="noopener noreferrer">'
      + panelUrl + "</a></div>"
      + "</div>"
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Email Login</div>'
      + '  <div class="server-info-value"><code>' + (server.email || "-") + "</code></div>"
      + "</div>"
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Username</div>'
      + '  <div class="server-info-value"><code>' + (server.username || "-") + "</code></div>"
      + "</div>"
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Password Awal</div>'
      + '  <div class="server-info-value"><code>' + (server.password || "Silakan reset via panel") + "</code></div>"
      + "</div>"
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Plan</div>'
      + '  <div class="server-info-value">' + (server.planLabel || "-") + "</div>"
      + "</div>"
      + '<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      + '  <p style="margin:0;font-size:12px;color:#6b7280;">Jika ada kendala atau error, silakan hubungi owner di '
      + '    <a href="https://wa.me/6281239977516" target="_blank" rel="noopener noreferrer">WhatsApp</a>.'
      + '  </p>'
      + '  <button class="btn btn-sm btn-ghost" id="copy-credentials-btn">Salin data login</button>'
      + '</div>';

    var copyBtn = document.getElementById("copy-credentials-btn");
    if (copyBtn && navigator.clipboard) {
      copyBtn.addEventListener("click", function () {
        var text = "Panel URL: " + panelUrl + "\n"
          + "Email: " + (server.email || "-") + "\n"
          + "Username: " + (server.username || "-") + "\n"
          + "Password: " + (server.password || "-") + "\n";
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Tersalin!";
          setTimeout(function () {
            copyBtn.textContent = "Salin data login";
          }, 1500);
        }).catch(function () {
          alert("Gagal menyalin. Silakan salin manual.");
        });
      });
    }
  }

  function showScriptInfo(info) {
    var section = document.getElementById("result-section");
    var container = document.getElementById("server-info");
    var title = document.getElementById("result-title");
    var subtitle = document.getElementById("result-subtitle");

    section.classList.remove("hidden");
    title.textContent = "Step 3 · Script Siap Diunduh";
    subtitle.textContent = "Script Alpha Centauri v4.5 sudah siap. Simpan file zip-nya, dan jangan dibagi sembarang orang.";

    var downloadUrl = info.downloadUrl || "#";

    container.innerHTML = ""
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Produk</div>'
      + '  <div class="server-info-value">Script Alpha Centauri v4.5</div>'
      + '</div>'
      + '<div class="server-info-row">'
      + '  <div class="server-info-label">Order ID</div>'
      + '  <div class="server-info-value"><code>' + (info.orderId || "-") + "</code></div>"
      + '</div>'
      + '<div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      + '  <p style="margin:0;font-size:12px;color:#6b7280;">Jika link tidak bisa dibuka, hubungi owner untuk dibantu manual.</p>'
      + '  <a id="script-download-btn" class="btn btn-sm" '
      + '     style="background:#ef4444;color:#f9fafb;"'
      + '     href="' + downloadUrl + '"'
      + '     download>'
      + '    Download'
      + '  </a>'
      + '</div>';
  }

  /* live feed */

  function pushLivePurchase(plan) {
    var feed = document.getElementById("live-purchase-feed");
    if (!feed) return;
    var name = randomName();
    var orderId = state.currentOrderId || ("ORD-" + Math.random().toString(36).substring(2, 8));
    var label = plan.type === "script" ? "Script Alpha Centauri" : "Bot " + plan.label + " RAM";

    var toast = document.createElement("div");
    toast.className = "live-toast";

    toast.innerHTML =
      '<div class="live-toast-icon">🛒</div>' +
      '<div class="live-toast-body">' +
      '<div class="live-toast-title">Seseorang telah membeli <span>' + label + '</span></div>' +
      '<div class="live-toast-sub">Order ID: ' + maskOrder(orderId) + '</div>' +
      "</div>";

    
