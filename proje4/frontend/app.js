const API_BASE = "http://localhost:4000/api";

let mode = "login";
let token = localStorage.getItem("token") || "";
let currentUser = null;

const $ = (id) => document.getElementById(id);

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "İstek başarısız");
  }

  return data;
}

function setMode(next) {
  mode = next;

  if ($("registerTab")) $("registerTab").classList.toggle("active", mode === "register");
  if ($("loginTab")) $("loginTab").classList.toggle("active", mode === "login");

  $("nameGroup").classList.toggle("hidden", mode === "login");
  $("authButton").textContent = mode === "register" ? "Kayıt Ol" : "Giriş Yap";

  if ($("authTitle")) $("authTitle").textContent = mode === "register" ? "Yeni hesap oluştur" : "Hesabına giriş yap";
  if ($("authSubtitle")) {
    $("authSubtitle").textContent = mode === "register"
      ? "Üyelik bilgilerini doldur. Kayıt tamamlandıktan sonra giriş yapman gerekir."
      : "Sinyal paneline erişmek için telefon numaran ve şifrenle giriş yap.";
  }
  if ($("authNote")) {
    $("authNote").innerHTML = mode === "register"
      ? 'Zaten hesabın var mı? <button type="button" class="link-button" id="switchAuthButton">Giriş yap</button>'
      : 'Henüz hesabın yok mu? <button type="button" class="link-button" id="switchAuthButton">Kayıt ol</button>';
    bindSwitchButton();
  }

  if ($("authForm")) $("authForm").reset();
}

function bindSwitchButton() {
  const button = $("switchAuthButton");
  if (!button) return;
  button.onclick = () => setMode(mode === "register" ? "login" : "register");
}

function scrollToApp(nextMode) {
  setMode(nextMode);
  document.querySelector("#app").scrollIntoView({ behavior: "smooth" });
}

function updateUserUI() {
  const loggedIn = !!currentUser;
  $("emptyState").classList.toggle("hidden", loggedIn);
  $("signalPanel").classList.toggle("hidden", !loggedIn);

  if ($("guestNavActions")) $("guestNavActions").classList.toggle("hidden", loggedIn);
  if ($("userNavActions")) $("userNavActions").classList.toggle("hidden", !loggedIn);
  if ($("navUserName") && currentUser) $("navUserName").textContent = currentUser.name;

  if ($("authArea")) $("authArea").classList.toggle("hidden", loggedIn);
  if ($("accountCard")) $("accountCard").classList.toggle("hidden", !loggedIn);

  const session = $("sessionStatus");
  if (session) session.classList.toggle("hidden", !loggedIn);

  const verifyCard = $("verifyCard");
  if (verifyCard) {
    verifyCard.classList.toggle("hidden", !loggedIn || currentUser.isPhoneVerified);
  }

  const verifyState = $("verifyState");
  if (verifyState && currentUser) {
    verifyState.textContent = currentUser.isPhoneVerified ? "Aktif" : "Bekliyor";
    verifyState.classList.toggle("success", currentUser.isPhoneVerified);
    verifyState.classList.toggle("warning", !currentUser.isPhoneVerified);
  }

  if (!loggedIn) {
    if (session) session.textContent = "";
    if ($("authForm")) $("authForm").reset();
    return;
  }

  if ($("accountName")) $("accountName").textContent = currentUser.name;
  if ($("accountPhone")) $("accountPhone").textContent = currentUser.phone;
  if ($("accountCredits")) $("accountCredits").textContent = currentUser.signalCredits;
  if ($("accountPrice")) $("accountPrice").textContent = `${currentUser.nextPriceUsd}$`;
  if ($("accountStatusText")) $("accountStatusText").textContent = currentUser.isPhoneVerified ? "Aktif" : "Doğrulama bekliyor";

  if (session) session.textContent = `${currentUser.name} • ${currentUser.isPhoneVerified ? "Aktif Hesap" : "Doğrulama Bekliyor"}`;
  $("credits").textContent = currentUser.signalCredits;
  $("nextPrice").textContent = `${currentUser.nextPriceUsd}$`;
  $("deliveryNotice").textContent = currentUser.isPhoneVerified
    ? "Hesabın aktif. Sinyal hakkın varsa yeni işlem fırsatı alabilirsin."
    : "Hesabını aktifleştirmek için telefon doğrulama kodunu gir.";
}

function renderSignal(signal) {
  $("pairName").textContent = signal.pair;
  $("entry").textContent = `${signal.entryPrice} $`;
  $("target").textContent = `${signal.targetPrice} $`;
  $("stop").textContent = `${signal.stopLoss} $`;
  $("profit").textContent = `%${signal.profitPercent}`;
  $("confidence").textContent = `%${signal.confidence}`;
  $("sources").innerHTML = signal.source
    .split("+")
    .map((item) => `<span class="source">${item.trim()}</span>`)
    .join("");
}

async function loadMe() {
  if (!token) {
    updateUserUI();
    return;
  }

  try {
    const data = await api("/auth/me");
    currentUser = data.user;
    updateUserUI();
  } catch (error) {
    localStorage.removeItem("token");
    token = "";
    currentUser = null;
    updateUserUI();
  }
}

async function submitAuth(event) {
  event.preventDefault();

  const payload = {
    phone: $("phone").value.trim(),
    password: $("password").value.trim()
  };

  if (mode === "register") {
    payload.name = $("name").value.trim();
  }

  try {
    const data = await api(mode === "register" ? "/auth/register" : "/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (mode === "register") {
      token = "";
      currentUser = null;
      localStorage.removeItem("token");
      setMode("login");
      updateUserUI();
      document.querySelector("#app").scrollIntoView({ behavior: "smooth" });
      showToast("Kayıt başarıyla tamamlandı. Şimdi giriş yapabilirsin.");
      return;
    }

    token = data.token;
    localStorage.setItem("token", token);
    currentUser = data.user;
    if ($("authForm")) $("authForm").reset();
    updateUserUI();
    document.querySelector("#app").scrollIntoView({ behavior: "smooth" });
    showToast("Giriş başarılı.");
  } catch (error) {
    showToast(error.message);
  }
}

async function verifyOtp(event) {
  event.preventDefault();

  try {
    const phone = currentUser?.phone || $("phone")?.value?.trim();

    if (!phone) {
      showToast("Telefon doğrulaması için önce giriş yapmalısın.");
      return;
    }

    const data = await api("/auth/verify-phone", {
      method: "POST",
      body: JSON.stringify({
        phone,
        code: $("otpCode").value.trim()
      })
    });

    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
    }

    if (data.user) {
      currentUser = data.user;
    }

    if ($("otpCode")) $("otpCode").value = "";
    updateUserUI();
    showToast(data.message || "Telefon doğrulandı.");
  } catch (error) {
    showToast(error.message);
  }
}

async function sendOtp() {
  try {
    const data = await api("/auth/send-otp", { method: "POST" });
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function generateSignal() {
  try {
    if (!token) {
      showToast("Yeni sinyal almak için önce giriş yapmalısın.");
      return;
    }

    const data = await api("/signals/generate", { method: "POST" });
    currentUser = data.user;
    renderSignal(data.signal);
    updateUserUI();
    showToast("Yeni sinyal hazırlandı.");
  } catch (error) {
    showToast(error.message);
  }
}

async function createPayment() {
  try {
    const created = await api("/payments/create", { method: "POST" });

    const confirmed = await api("/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ paymentId: created.paymentId })
    });

    currentUser = confirmed.user;
    updateUserUI();
    showToast("İşlem tamamlandı. 1 sinyal hakkı eklendi.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadHistory() {
  try {
    const data = await api("/signals");
    $("history").innerHTML = data.signals.length
      ? data.signals.map((s) => `
        <div class="history-item">
          <strong>${s.pair}</strong> • ${s.direction} • Giriş: ${s.entryPrice}$ • Hedef: ${s.targetPrice}$ • Stop: ${s.stopLoss}$ • Güven: %${s.confidence}
        </div>
      `).join("")
      : `<div class="history-item">Henüz geçmiş sinyal yok.</div>`;
  } catch (error) {
    showToast(error.message);
  }
}


async function handlePaymentRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") !== "success" || !params.get("paymentId")) return;

  try {
    const data = await api("/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ paymentId: params.get("paymentId") })
    });
    currentUser = data.user;
    updateUserUI();
    showToast("Ödeme tamamlandı. Sinyal hakkın eklendi.");
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    showToast(error.message);
  }
}

function logout() {
  token = "";
  currentUser = null;
  localStorage.removeItem("token");
  setMode("login");
  updateUserUI();
  showToast("Oturum kapatıldı.");
}



let allMarketTickers = [];
let marketLimit = 6;

function formatUsd(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  if (number >= 1000) return number.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " $";
  if (number >= 1) return number.toLocaleString("en-US", { maximumFractionDigits: 4 }) + " $";
  return number.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " $";
}

function formatVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number >= 1_000_000_000) return (number / 1_000_000_000).toFixed(2) + "B $";
  if (number >= 1_000_000) return (number / 1_000_000).toFixed(2) + "M $";
  if (number >= 1_000) return (number / 1_000).toFixed(2) + "K $";
  return number.toFixed(2) + " $";
}

function renderMarketRows(list) {
  const rows = $("marketRows");

  if (!rows) return;

  if (!list.length) {
    rows.innerHTML = `<tr><td colspan="6">Aramana uygun parite bulunamadı.</td></tr>`;
    return;
  }

  rows.innerHTML = list.map((coin) => {
    const change = Number(coin.priceChangePercent);
    const changeClass = change >= 0 ? "market-up" : "market-down";
    const changePrefix = change >= 0 ? "+" : "";

    return `
      <tr>
        <td><span class="coin-symbol">${coin.symbol}</span></td>
        <td>${formatUsd(coin.lastPrice)}</td>
        <td class="${changeClass}">${changePrefix}${change.toFixed(2)}%</td>
        <td>${formatUsd(coin.highPrice)}</td>
        <td>${formatUsd(coin.lowPrice)}</td>
        <td>${formatVolume(coin.quoteVolume)}</td>
      </tr>
    `;
  }).join("");
}

function filterMarket() {
  const query = ($("marketSearch")?.value || "").trim().toUpperCase();
  const filtered = allMarketTickers.filter((coin) => coin.symbol.includes(query));
  renderMarketRows(filtered);
}

async function loadMarket() {
  const status = $("marketStatus");
  if (status) status.textContent = "Binance spot piyasa verileri alınıyor...";

  try {
    const query = ($("marketSearch")?.value || "").trim().toUpperCase();
    const data = await api(`/market/tickers?quote=USDT&limit=${marketLimit}${query ? `&search=${encodeURIComponent(query)}` : ""}`);
    allMarketTickers = data.tickers || [];
    filterMarket();

    if (status) {
      const time = new Date(data.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      status.textContent = `Son güncelleme: ${time} • Kaynak: ${data.source}`;
    }
  } catch (error) {
    if (status) status.textContent = "Piyasa verileri alınamadı. Backend çalışıyor mu kontrol et.";
    showToast(error.message);
  }
}






function toggleMarketLimit() {
  marketLimit = marketLimit === 6 ? 20 : 6;
  if ($("marketSizeButton")) {
    $("marketSizeButton").textContent = marketLimit === 6 ? "Daha Fazla Göster" : "Daha Az Göster";
  }
  loadMarket();
}


document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => scrollToApp(button.dataset.mode));
});

if ($("registerTab")) $("registerTab").addEventListener("click", () => setMode("register"));
if ($("loginTab")) $("loginTab").addEventListener("click", () => setMode("login"));
$("authForm").addEventListener("submit", submitAuth);
$("otpForm").addEventListener("submit", verifyOtp);
$("sendOtpButton").addEventListener("click", sendOtp);
$("generateButton").addEventListener("click", generateSignal);
$("payButton").addEventListener("click", createPayment);
$("historyButton").addEventListener("click", loadHistory);
$("logoutButton").addEventListener("click", logout);
if ($("navLogoutButton")) $("navLogoutButton").addEventListener("click", logout);
if ($("refreshMarketButton")) $("refreshMarketButton").addEventListener("click", loadMarket);
if ($("marketSizeButton")) $("marketSizeButton").addEventListener("click", toggleMarketLimit);
if ($("marketSearch")) $("marketSearch").addEventListener("input", () => {
  clearTimeout(window.__marketSearchTimer);
  window.__marketSearchTimer = setTimeout(loadMarket, 300);
});
$("year").textContent = new Date().getFullYear();
bindSwitchButton();
setMode("login");

loadMe();
loadMarket();
setInterval(loadMarket, 30000);
