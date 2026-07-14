const tg = window.Telegram?.WebApp;

const DEFAULT_DEPOSIT_CARD = '4937243010671153';
const DEFAULT_WITHDRAW_PLACEHOLDER = '0000 0000 0000 0000';
const CRYPTO_CURRENCY_CODES = new Set(['TON', 'USDT', 'BTC', 'ETH']);
const TON_CONNECT_CURRENCY_CODES = new Set(['TON', 'USDT']);
const TON_MAINNET_ID = '-239';
const TON_TESTNET_ID = '-3';
const DEFAULT_USDT_JETTON_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const walletConfig = window.OTS_WALLET_CONFIG || {};

let tonConnectUI = null;
let connectedTonWallet = null;

const currencies = [
  {
    code: 'TON',
    name: 'Toncoin',
    wallet: 'TON Кошелек',
    logo: './assets/currencies/ton.png',
    walletItems: [
      { label: 'Telegram Wallet', value: 'Не привязан', editable: true, connectable: true },
    ],
    deposit: { type: 'ton-connect', min: '0.1', preset: '1.00', button: 'Пополнить через Wallet' },
    withdraw: { type: 'standard', min: '10', preset: '10.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'USDT',
    name: 'Tether',
    wallet: 'USDT Кошелек',
    logo: './assets/currencies/usdt.png',
    walletItems: [
      { label: 'Telegram Wallet · TON', value: 'Не привязан', editable: true, connectable: true },
    ],
    deposit: { type: 'ton-connect', min: '1', preset: '5.00', button: 'Пополнить через Wallet' },
    withdraw: { type: 'standard', min: '5', preset: '5.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'STARS',
    name: 'Telegram Stars',
    wallet: 'STARS Баланс',
    logo: './assets/currencies/stars.svg',
    walletItems: [
      { label: 'Telegram Stars', value: '@username', editable: true, icon: '⭐', placeholder: 'Укажите свой Telegram username' },
    ],
    deposit: { type: 'stars', min: '50', preset: '50', button: 'Оплатить Stars' },
    withdraw: { type: 'standard', min: '50', preset: '50', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'RUB',
    name: 'Russian Ruble',
    wallet: 'RUB Кошелек',
    logo: './assets/currencies/rub.svg',
    walletItems: [
      { label: 'RUB карта', value: 'Не привязан', editable: true, placeholder: 'Номер карты для вывода' },
    ],
    deposit: { type: 'standard', card: '2202208544180481', min: '500', preset: '500.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '500', preset: '500.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'KGS',
    name: 'Kyrgyz Som',
    wallet: 'KGS Кошелек',
    logo: './assets/currencies/kgs.svg',
    walletItems: [
      { label: 'KGS карта', value: 'Не привязан', editable: true, placeholder: 'Номер карты для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '450', preset: '450.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '450', preset: '450.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'EUR',
    name: 'Euro',
    wallet: 'EUR Кошелек',
    logo: './assets/currencies/eur.svg',
    walletItems: [
      { label: 'EUR карта', value: 'Не привязан', editable: true, placeholder: 'IBAN / карта для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '5', preset: '5.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '5', preset: '5.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'GBP',
    name: 'Pound Sterling',
    wallet: 'GBP Кошелек',
    logo: './assets/currencies/gbp.svg',
    walletItems: [
      { label: 'GBP карта', value: 'Не привязан', editable: true, placeholder: 'IBAN / карта для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '5', preset: '5.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '5', preset: '5.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    wallet: 'JPY Кошелек',
    logo: './assets/currencies/jpy.svg',
    walletItems: [
      { label: 'JPY карта', value: 'Не привязан', editable: true, placeholder: 'Счёт / карта для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '500', preset: '500.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '500', preset: '500.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    wallet: 'TRY Кошелек',
    logo: './assets/currencies/try.svg',
    walletItems: [
      { label: 'TRY карта', value: 'Не привязан', editable: true, placeholder: 'Номер карты для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '200', preset: '200.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '200', preset: '200.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'UAH',
    name: 'Ukrainian Hryvnia',
    wallet: 'UAH Кошелек',
    logo: './assets/currencies/uah.svg',
    walletItems: [
      { label: 'UAH карта', value: 'Не привязан', editable: true, placeholder: 'Номер карты для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '200', preset: '200.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '200', preset: '200.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'KZT',
    name: 'Kazakhstani Tenge',
    wallet: 'KZT Кошелек',
    logo: './assets/currencies/kzt.svg',
    walletItems: [
      { label: 'KZT карта', value: 'Не привязан', editable: true, placeholder: 'Номер карты для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '2000', preset: '2000.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '2000', preset: '2000.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'BTC',
    name: 'Bitcoin',
    wallet: 'BTC Кошелек',
    logo: './assets/currencies/btc.svg',
    walletItems: [
      { label: 'BTC Wallet', value: 'Не привязан', editable: true, placeholder: 'Укажите адрес BTC' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '0.0001', preset: '0.0001', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '0.0001', preset: '0.0001', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'ETH',
    name: 'Ethereum',
    wallet: 'ETH Кошелек',
    logo: './assets/currencies/eth.svg',
    walletItems: [
      { label: 'ETH Wallet', value: 'Не привязан', editable: true, placeholder: 'Укажите адрес ETH' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '0.005', preset: '0.005', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '0.005', preset: '0.005', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    wallet: 'CNY Кошелек',
    logo: './assets/currencies/cny.svg',
    walletItems: [
      { label: 'CNY карта', value: 'Не привязан', editable: true, placeholder: 'Счёт / карта для вывода' },
    ],
    deposit: { type: 'standard', card: DEFAULT_DEPOSIT_CARD, min: '50', preset: '50.00', button: 'Я оплатил' },
    withdraw: { type: 'standard', min: '50', preset: '50.00', available: '0', button: 'Вывести', cardPlaceholder: DEFAULT_WITHDRAW_PLACEHOLDER },
  },
];

const state = {
  tab: 'deals',
  createStep: 'type',
  dealType: 'buy',
  selectedCurrency: currencies[0],
  selectedWallet: currencies[0],
  activeDeals: loadDeals('ots_fanpay_active_deals'),
  historyDeals: loadDeals('ots_fanpay_history_deals'),
  balances: loadBalances(),
  apiConnected: false,
  starsPaymentId: null,
  listMode: 'active',
  theme: localStorage.getItem('ots_fanpay_theme') || 'midnight',
  walletModalMode: null,
  walletEditIndex: null,
  walletActionBusy: false,
};


const API_BASE = String(window.OTS_APP_CONFIG?.apiBase || '').replace(/\/$/, '');
const DEAL_API_URL = String(window.OTS_APP_CONFIG?.dealApiUrl || '')
  .trim()
  .replace(/\/$/, '');
const CLOUD_DEALS_ONLY = Boolean(window.OTS_APP_CONFIG?.cloudDealsOnly);
const USE_WEBRTC_DEALS = Boolean(window.OTS_APP_CONFIG?.useWebrtcDeals);

function isConfiguredDealApi() {
  if (!DEAL_API_URL) return false;
  if (/PASTE_SUPABASE|ВСТАВЬТЕ_URL|YOUR_|PROJECT_REF/i.test(DEAL_API_URL)) return false;
  try {
    const url = new URL(DEAL_API_URL, window.location.href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isDealApiPath(path) {
  return String(path || '').startsWith('/api/deals');
}

function dealActionFromRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  if (path === '/api/deals' && method === 'GET') return { action: 'list' };
  if (path === '/api/deals' && method === 'POST') {
    return { action: 'create', deal: JSON.parse(options.body || '{}') };
  }
  if (path === '/api/deals/join' && method === 'POST') {
    return { action: 'join', ...JSON.parse(options.body || '{}') };
  }
  const statusMatch = /^\/api\/deals\/([^/]+)\/status$/.exec(path);
  if (statusMatch && method === 'PATCH') {
    return { action: 'status', id: decodeURIComponent(statusMatch[1]), ...JSON.parse(options.body || '{}') };
  }
  throw new Error('Неизвестная операция со сделкой');
}

async function cloudDealFetch(path, options = {}) {
  const payload = dealActionFromRequest(path, options);
  let response;
  try {
    response = await fetch(DEAL_API_URL, {
      method: 'POST',
      headers: authHeaders(options.headers || {}),
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    const error = new Error('Облачный сервис сделок временно недоступен. Попробуйте ещё раз');
    error.cause = cause;
    error.status = 0;
    throw error;
  }

  const raw = await response.text();
  let data = {};
  if (raw) {
    try { data = JSON.parse(raw); } catch {}
  }
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error.trim() : '';
    const error = new Error(message || `Ошибка облачного сервиса (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (!data || typeof data !== 'object') throw new Error('Облачный сервис вернул некорректный ответ');
  state.apiConnected = true;
  return data;
}

function emptyBalances() {
  return Object.fromEntries(currencies.map((currency) => [currency.code, 0]));
}

function loadBalances() {
  try {
    return { ...emptyBalances(), ...JSON.parse(localStorage.getItem('ots_fanpay_balances') || '{}') };
  } catch {
    return emptyBalances();
  }
}

function saveBalances() {
  localStorage.setItem('ots_fanpay_balances', JSON.stringify(state.balances));
}

function getBalance(code) {
  const value = Number(state.balances?.[code] || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatBalance(code, value = getBalance(code)) {
  const cryptoCodes = new Set(['BTC', 'ETH', 'TON']);
  const decimals = code === 'BTC' ? 8 : code === 'ETH' ? 6 : cryptoCodes.has(code) ? 4 : code === 'USDT' ? 2 : 2;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: code === 'STARS' ? 0 : 0,
    maximumFractionDigits: code === 'STARS' ? 0 : decimals,
  }).format(Number(value || 0));
}

function normalizeDeal(deal) {
  const statusMap = { active: 'unpaid', done: 'completed', cancelled: 'completed' };
  const status = statusMap[deal.status] || deal.status || 'unpaid';
  return {
    ...deal,
    code: String(deal.code || String(Math.floor(100000 + Math.random() * 900000))),
    status: ['unpaid', 'paid', 'completed'].includes(status) ? status : 'unpaid',
  };
}

function setDealsFromList(deals) {
  const normalized = (Array.isArray(deals) ? deals : []).map(normalizeDeal);
  state.activeDeals = normalized.filter((deal) => deal.status !== 'completed');
  state.historyDeals = normalized.filter((deal) => deal.status === 'completed');
  saveDeals();
}

function authHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': tg?.initData || '',
    ...extra,
  };

  // Удобно для локальной проверки с ALLOW_DEMO=true. В Telegram эти заголовки не используются.
  if (!tg?.initData && window.OTS_APP_CONFIG?.demoUserId) {
    headers['X-Demo-User-ID'] = String(window.OTS_APP_CONFIG.demoUserId);
    headers['X-Demo-Username'] = String(window.OTS_APP_CONFIG.demoUsername || 'demo_user');
  }
  return headers;
}

function apiConnectionMessage(path, status = 0) {
  if (status === 401) return 'Откройте приложение через Telegram-бота и попробуйте снова';
  if (status === 503) return 'Сервер ещё не настроен: проверьте BOT_TOKEN и перезапустите приложение';
  if (path.startsWith('/api/deals')) {
    return 'Облачный сервис сделок недоступен. Проверьте dealApiUrl в app-config.js';
  }
  return 'Не удалось подключиться к серверу приложения';
}

async function apiFetch(path, options = {}) {
  if (isDealApiPath(path)) {
    if (isConfiguredDealApi()) return cloudDealFetch(path, options);
    if (CLOUD_DEALS_ONLY) {
      const error = new Error('Сделки ещё не подключены к облаку. Заполните dealApiUrl в app-config.js');
      error.status = 503;
      throw error;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: authHeaders(options.headers || {}),
    });
  } catch (cause) {
    const error = new Error(apiConnectionMessage(path));
    error.cause = cause;
    error.status = 0;
    throw error;
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const raw = await response.text();
  let data = {};
  if (raw) {
    try { data = JSON.parse(raw); } catch {}
  }

  if (!response.ok) {
    const serverMessage = typeof data?.error === 'string' ? data.error.trim() : '';
    const error = new Error(serverMessage || apiConnectionMessage(path, response.status));
    error.status = response.status;
    throw error;
  }

  if (raw && !contentType.includes('application/json') && !(data && typeof data === 'object' && Object.keys(data).length)) {
    const error = new Error(apiConnectionMessage(path, response.status));
    error.status = response.status;
    throw error;
  }

  state.apiConnected = true;
  return data;
}

async function syncDealsState({ silent = true } = {}) {
  try {
    const data = await apiFetch('/api/deals');
    if (!isConfiguredDealApi() && Array.isArray(data.deals)) setDealsFromList(data.deals);
    renderProfile();
    updateCounters();
  } catch (error) {
    if (!silent) showToast(error.message);
  }
}

async function syncRemoteState({ silent = true } = {}) {
  try {
    const data = await apiFetch('/api/me');
    if (data.user?.balances) {
      state.balances = { ...emptyBalances(), ...data.user.balances };
      saveBalances();
    }
    if (Array.isArray(data.deals)) setDealsFromList(data.deals);
    renderWalletCard();
    renderProfile();
    updateCounters();
  } catch (error) {
    state.apiConnected = false;
    if (!silent) showToast(error.message);
  }
}

const els = {
  tabs: document.querySelectorAll('.tab-screen'),
  navItems: document.querySelectorAll('.nav-item'),
  dealsTab: document.getElementById('dealsTab'),
  walletsTab: document.getElementById('walletsTab'),
  leadersTab: document.getElementById('leadersTab'),
  profileTab: document.getElementById('profileTab'),
  quickProfileButton: document.getElementById('quickProfileButton'),
  themeQuickButton: document.getElementById('themeQuickButton'),
  currentThemeLabel: document.getElementById('currentThemeLabel'),
  themeButtons: document.querySelectorAll('.theme-option'),
  userPhoto: document.getElementById('userPhoto'),
  userInitials: document.getElementById('userInitials'),
  activeCount: document.getElementById('activeCount'),
  historyCount: document.getElementById('historyCount'),
  createDealButton: document.getElementById('createDealButton'),
  joinDealButton: document.getElementById('joinDealButton'),
  activeDealsButton: document.getElementById('activeDealsButton'),
  historyButton: document.getElementById('historyButton'),
  createTypeSheet: document.getElementById('createTypeSheet'),
  createFlow: document.getElementById('createFlow'),
  flowBackButton: document.getElementById('flowBackButton'),
  currencyStep: document.getElementById('currencyStep'),
  currencyGrid: document.getElementById('currencyGrid'),
  dealForm: document.getElementById('dealForm'),
  selectedCurrencyLogo: document.getElementById('selectedCurrencyLogo'),
  selectedDealText: document.getElementById('selectedDealText'),
  selectedCurrencyText: document.getElementById('selectedCurrencyText'),
  amountInput: document.getElementById('amountInput'),
  priceInput: document.getElementById('priceInput'),
  partnerInput: document.getElementById('partnerInput'),
  commentInput: document.getElementById('commentInput'),
  listSheet: document.getElementById('listSheet'),
  listTitle: document.getElementById('listTitle'),
  dealsList: document.getElementById('dealsList'),
  walletCard: document.getElementById('walletCard'),
  walletChips: document.getElementById('walletChips'),
  walletInfoList: document.getElementById('walletInfoList'),
  depositButton: document.getElementById('depositButton'),
  withdrawButton: document.getElementById('withdrawButton'),
  walletModal: document.getElementById('walletModal'),
  walletModalTitle: document.getElementById('walletModalTitle'),
  walletModalBody: document.getElementById('walletModalBody'),
  walletModalClose: document.getElementById('walletModalClose'),
  profileCard: document.getElementById('profileCard'),
  joinDealModal: document.getElementById('joinDealModal'),
  joinDealModalClose: document.getElementById('joinDealModalClose'),
  joinDealCodeInput: document.getElementById('joinDealCodeInput'),
  joinDealSubmit: document.getElementById('joinDealSubmit'),
  toast: document.getElementById('toast'),
};

function loadDeals(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveDeals() {
  localStorage.setItem('ots_fanpay_active_deals', JSON.stringify(state.activeDeals));
  localStorage.setItem('ots_fanpay_history_deals', JSON.stringify(state.historyDeals));
  updateCounters();
}

function updateCounters() {
  els.activeCount.textContent = String(state.activeDeals.length);
  els.historyCount.textContent = String(state.historyDeals.length);
}

function vibrate(type = 'light') {
  tg?.HapticFeedback?.impactOccurred?.(type);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 2100);
}

function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

function getFallbackUser() {
  return {
    id: 'demo',
    first_name: 'Demo',
    last_name: 'User',
    username: 'demo_user',
    language_code: 'ru',
    is_premium: false,
    photo_url: '',
  };
}

function getUser() {
  return getTelegramUser() || getFallbackUser();
}

function initials(user) {
  const first = user.first_name?.trim()?.[0] || '';
  const last = user.last_name?.trim()?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
}

function fullName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Пользователь';
}

function renderUserBadge() {
  const user = getUser();
  els.userInitials.textContent = initials(user);

  if (user.photo_url) {
    els.userPhoto.src = user.photo_url;
    els.userPhoto.classList.remove('hidden');
    els.userInitials.classList.add('hidden');
  } else {
    els.userPhoto.removeAttribute('src');
    els.userPhoto.classList.add('hidden');
    els.userInitials.classList.remove('hidden');
  }
}

function renderProfile() {
  const user = getUser();
  const username = user.username ? `@${user.username}` : '@username';
  const photo = user.photo_url
    ? `<img src="${escapeHtml(user.photo_url)}" alt="Фото профиля">`
    : `<span>${escapeHtml(initials(user))}</span>`;
  const totalDeals = state.activeDeals.length + state.historyDeals.length;

  const balanceCards = currencies.map((currency) => `
    <article class="profile-balance-card" data-profile-wallet="${escapeHtml(currency.code)}">
      <div class="profile-balance-head">
        <img src="${currency.logo}" alt="${escapeHtml(currency.code)}" />
        <span>${escapeHtml(currency.code)}</span>
      </div>
      <strong>${escapeHtml(formatBalance(currency.code))}</strong>
      <small>${escapeHtml(currency.name)}</small>
    </article>
  `).join('');

  els.profileCard.innerHTML = `
    <section class="profile-identity-card">
      <div class="profile-ambient"></div>
      <div class="profile-hero">
        <div class="profile-avatar">${photo}</div>
        <div class="profile-user-copy">
          <div class="profile-name">${escapeHtml(fullName(user))}</div>
          <div class="profile-username">${escapeHtml(username)}</div>
        </div>
        <span class="profile-online-dot" title="Активен"></span>
      </div>
      <div class="profile-mini-stats">
        <div><strong>${state.activeDeals.length}</strong><span>Активные</span></div>
        <div><strong>${state.historyDeals.length}</strong><span>Выполнено</span></div>
        <div><strong>${totalDeals}</strong><span>Всего</span></div>
      </div>
    </section>

    <div class="profile-section-head">
      <div><span>Кошельки</span><h2>Все балансы</h2></div>
      <small>${state.apiConnected ? 'Синхронизировано' : 'Локальные данные'}</small>
    </div>
    <div class="profile-balances-grid">${balanceCards}</div>

    <section class="promo-card">
      <div class="promo-card-head">
        <span class="promo-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9a2 2 0 0 0 0 4v3.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5V13a2 2 0 0 0 0-4V7.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2 3"/></svg>
        </span>
        <div><span>Бонусы</span><h3>Промокод</h3></div>
      </div>
      <p>Введите промокод, если получите его в официальных каналах сервиса.</p>
      <form class="promo-form" data-promo-form autocomplete="off">
        <label class="promo-input-shell">
          <input type="text" data-promo-input maxlength="32" placeholder="Введите промокод" autocapitalize="characters" spellcheck="false" aria-label="Промокод" />
        </label>
        <button type="submit" class="promo-submit">Применить</button>
      </form>
      <small class="promo-hint" data-promo-hint>Сейчас активных промокодов нет</small>
    </section>

    <section class="profile-details-card">
      <div class="profile-row"><span>Telegram ID</span><b>${escapeHtml(user.id || 'demo')}</b></div>
      <div class="profile-row"><span>Язык</span><b>${escapeHtml(user.language_code || 'не указан')}</b></div>
      <div class="profile-row"><span>Premium</span><b>${user.is_premium ? 'Да' : 'Нет'}</b></div>
    </section>
  `;
}

function setTab(tab) {
  state.tab = tab;
  const tabIds = {
    deals: els.dealsTab,
    wallets: els.walletsTab,
    leaders: els.leadersTab,
    profile: els.profileTab,
  };

  Object.entries(tabIds).forEach(([name, element]) => {
    element.classList.toggle('active', name === tab);
  });
  els.navItems.forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));

  if (tab === 'profile') renderProfile();
  if (tab === 'leaders') renderLeaders();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  vibrate('light');
}

function openTypeSheet() {
  state.createStep = 'type';
  els.createTypeSheet.classList.remove('hidden');
  els.createTypeSheet.setAttribute('aria-hidden', 'false');
  setBackButton(true, closeCreate);
  vibrate('medium');
}

function closeCreate() {
  els.createTypeSheet.classList.add('hidden');
  els.createTypeSheet.setAttribute('aria-hidden', 'true');
  els.createFlow.classList.add('hidden');
  els.createFlow.setAttribute('aria-hidden', 'true');
  els.currencyStep.classList.add('active');
  els.dealForm.classList.remove('active');
  state.createStep = 'type';
  setBackButton(false);
}

function chooseDealType(type) {
  state.dealType = type;
  state.createStep = 'currency';
  els.createTypeSheet.classList.add('hidden');
  els.createTypeSheet.setAttribute('aria-hidden', 'true');
  els.createFlow.classList.remove('hidden');
  els.createFlow.setAttribute('aria-hidden', 'false');
  els.currencyStep.classList.add('active');
  els.dealForm.classList.remove('active');
  renderCurrencies();
  setBackButton(true, closeCreate);
  vibrate('light');
}

function backInFlow() {
  if (state.createStep === 'form') {
    state.createStep = 'currency';
    els.currencyStep.classList.add('active');
    els.dealForm.classList.remove('active');
    renderCurrencies();
    return;
  }
  closeCreate();
  openTypeSheet();
}

function selectCurrency(code) {
  const currency = getCurrency(code);
  state.selectedCurrency = currency;
  state.createStep = 'form';
  updateSelectedCurrency();
  els.currencyStep.classList.remove('active');
  els.dealForm.classList.add('active');
  vibrate('light');
  setTimeout(() => els.amountInput.focus(), 120);
}

function updateSelectedCurrency() {
  const label = state.dealType === 'sell' ? 'Продажа' : 'Покупка';
  els.selectedCurrencyLogo.src = state.selectedCurrency.logo;
  els.selectedCurrencyLogo.alt = `${state.selectedCurrency.code} logo`;
  els.selectedDealText.textContent = `${label} ${state.selectedCurrency.code}`;
  els.selectedCurrencyText.textContent = `Выбрано: ${state.selectedCurrency.name}`;
}

function renderCurrencies() {
  els.currencyGrid.innerHTML = currencies.map((currency) => `
    <button class="currency-card ${currency.code === state.selectedCurrency.code ? 'selected' : ''}" type="button" data-currency="${escapeHtml(currency.code)}">
      <img class="currency-logo" src="${currency.logo}" alt="${escapeHtml(currency.code)} logo" />
      <span class="currency-code">${escapeHtml(currency.code)}</span>
    </button>
  `).join('');
}

async function createDeal(event) {
  event.preventDefault();

  const amount = els.amountInput.value.trim();
  const price = els.priceInput.value.trim();
  const partner = els.partnerInput.value.trim();
  const comment = els.commentInput.value.trim();

  if (!amount) {
    showToast('Укажи сумму сделки');
    els.amountInput.focus();
    return;
  }

  const payload = {
    type: state.dealType,
    currency: state.selectedCurrency.code,
    amount,
    price: price || 'Не указано',
    partner: partner || 'Не указан',
    comment: comment || 'Без комментария',
  };

  let deal;
  try {
    const data = await apiFetch('/api/deals', { method: 'POST', body: JSON.stringify(payload) });
    deal = normalizeDeal(data.deal);
  } catch (error) {
    showToast(error?.message || 'Не удалось создать сделку');
    return;
  }

  state.activeDeals.unshift(deal);
  saveDeals();
  els.dealForm.reset();
  closeCreate();
  openDealsList('active');
  showToast(`Сделка создана · код ${deal.code}`);
  vibrate('medium');
}

function openDealsList(mode) {
  state.listMode = mode;
  els.listTitle.textContent = mode === 'active' ? 'Активные сделки' : 'История сделок';
  renderDeals(mode);
  els.listSheet.classList.remove('hidden');
  els.listSheet.setAttribute('aria-hidden', 'false');
  setBackButton(true, closeList);
  vibrate('light');
}

function closeList() {
  els.listSheet.classList.add('hidden');
  els.listSheet.setAttribute('aria-hidden', 'true');
  setBackButton(false);
}

function buildDealJoinLink(code) {
  const botUsername = String(window.OTS_APP_CONFIG?.botUsername || '')
    .trim()
    .replace(/^@/, '');
  if (botUsername && !botUsername.includes('PASTE_')) {
    return `https://t.me/${encodeURIComponent(botUsername)}?startapp=deal_${encodeURIComponent(code)}`;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('deal', String(code));
  url.hash = '';
  return url.toString();
}

function openDealFromUrl() {
  const url = new URL(window.location.href);
  const startParam = String(
    tg?.initDataUnsafe?.start_param
    || url.searchParams.get('tgWebAppStartParam')
    || url.searchParams.get('deal')
    || '',
  );
  const match = /(?:deal_)?(\d{6})/.exec(startParam);
  const code = match?.[1] || '';
  if (code.length !== 6) return;
  if (els.joinDealCodeInput) els.joinDealCodeInput.value = code;
  openJoinDealModal();
  showToast('Код сделки получен из ссылки');
}

async function shareDealLink(code) {
  const url = buildDealJoinLink(code);
  const shareData = {
    title: 'Подключение к сделке',
    text: `Присоединитесь к сделке по коду ${code}`,
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(url);
  showToast('Ссылка на сделку скопирована');
}

function renderDeals(mode) {
  const list = mode === 'active' ? state.activeDeals : state.historyDeals;
  if (!list.length) {
    els.dealsList.innerHTML = `
      <div class="empty">
        <strong>${mode === 'active' ? 'Активных сделок нет' : 'История пустая'}</strong>
        <p>${mode === 'active' ? 'Создайте сделку или войдите по шестизначному коду.' : 'Выполненные сделки появятся здесь.'}</p>
      </div>
    `;
    return;
  }

  const statusMap = {
    unpaid: { label: 'Не оплачено', className: 'status-unpaid' },
    paid: { label: 'Оплачено', className: 'status-paid' },
    completed: { label: 'Выполнено', className: 'status-completed' },
  };

  els.dealsList.innerHTML = list.map((rawDeal) => {
    const deal = normalizeDeal(rawDeal);
    const currency = getCurrency(deal.currency);
    const status = statusMap[deal.status] || statusMap.unpaid;
    const action = deal.status === 'unpaid'
      ? '<button class="small-button paid" type="button" data-action="paid">Отметить оплаченной</button>'
      : deal.status === 'paid'
        ? '<button class="small-button done" type="button" data-action="completed">Завершить сделку</button>'
        : '';
    return `
      <article class="deal-card deal-card-v2" data-id="${escapeHtml(deal.id)}">
        <div class="deal-head">
          <div class="deal-title">
            <img src="${currency.logo}" alt="${escapeHtml(currency.code)} logo" />
            <div>
              <strong>${escapeHtml(dealTypeLabel(deal.type))} ${escapeHtml(currency.code)}</strong>
              <span>${escapeHtml(deal.amount)} ${escapeHtml(currency.code)}</span>
            </div>
          </div>
          <span class="deal-status ${status.className}">${status.label}</span>
        </div>
        <button class="deal-code-box" type="button" data-copy-deal-link="${escapeHtml(deal.code)}">
          <span>Код подключения</span>
          <strong>${escapeHtml(deal.code)}</strong>
          <em>${deal.joined ? 'Участник подключён' : 'Нажмите, чтобы скопировать код'}</em>
        </button>
        <div class="deal-meta">
          <div>Курс<strong>${escapeHtml(deal.price)}</strong></div>
          <div>Контрагент<strong>${escapeHtml(deal.partner)}</strong></div>
          <div>Создана<strong>${formatDate(deal.createdAt)}</strong></div>
          <div>Роль<strong>${deal.role === 'participant' ? 'Участник' : 'Создатель'}</strong></div>
        </div>
        <p class="deal-note">${escapeHtml(deal.comment)}</p>
        ${mode === 'active' && action ? `<div class="deal-actions one-action">${action}</div>` : ''}
      </article>
    `;
  }).join('');
}

async function changeDealStatus(id, status) {
  const index = state.activeDeals.findIndex((deal) => deal.id === id);
  if (index === -1) return;
  const deal = state.activeDeals[index];

  try {
    const data = await apiFetch(`/api/deals/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    Object.assign(deal, normalizeDeal(data.deal));
  } catch (error) {
    showToast(error?.message || 'Не удалось изменить статус сделки');
    return;
  }

  if (status === 'completed') {
    state.activeDeals.splice(index, 1);
    deal.completedAt = deal.completedAt || new Date().toISOString();
    state.historyDeals.unshift(deal);
  }
  saveDeals();
  renderDeals(state.listMode);
  renderProfile();
  showToast(status === 'paid' ? 'Статус: оплачено' : 'Сделка выполнена');
  vibrate(status === 'completed' ? 'medium' : 'light');
}

function openJoinDealModal() {
  els.joinDealModal?.classList.remove('hidden');
  els.joinDealModal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setBackButton(true, closeJoinDealModal);
  setTimeout(() => els.joinDealCodeInput?.focus(), 120);
  vibrate('medium');
}

function closeJoinDealModal() {
  els.joinDealModal?.classList.add('hidden');
  els.joinDealModal?.setAttribute('aria-hidden', 'true');
  if (els.joinDealCodeInput) els.joinDealCodeInput.value = '';
  document.body.classList.remove('modal-open');
  setBackButton(false);
}


async function joinDealWebRTC(code) {
  // Experimental single-browser fallback only. It cannot join a deal created
  // on another device because localStorage is not shared between users.
  const local = JSON.parse(localStorage.getItem('ots_fanpay_active_deals') || '[]')
    .find((deal) => String(deal.code) === String(code));
  if (!local) {
    throw new Error('WebRTC-режим не поддерживает подключение с другого устройства. Подключите общий API сделок');
  }
  return { ...local, joined: true, role: 'participant' };
}

async function joinDealByCode() {
  const code = String(els.joinDealCodeInput?.value || '').replace(/\D/g, '').slice(0, 6);
  if (code.length !== 6) {
    showToast('Введите шестизначный код');
    els.joinDealCodeInput?.focus();
    return;
  }

  const button = els.joinDealSubmit;
  const originalText = button?.textContent || 'Присоединиться';
  if (button?.disabled) return;
  if (button) {
    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = 'Подключаем…';
  }

  try {
    const data = USE_WEBRTC_DEALS ? { deal: await joinDealWebRTC(code) } : await apiFetch('/api/deals/join', { method: 'POST', body: JSON.stringify({ code }) });
    if (!data?.deal?.id) throw new Error('Сервер вернул некорректные данные сделки');

    const deal = normalizeDeal(data.deal);
    const existing = state.activeDeals.findIndex((item) => item.id === deal.id);
    if (existing >= 0) state.activeDeals[existing] = deal;
    else state.activeDeals.unshift(deal);
    saveDeals();
    closeJoinDealModal();
    openDealsList('active');
    showToast('Вы присоединились к сделке');
    vibrate('medium');
  } catch (error) {
    state.apiConnected = false;
    showToast(error?.message || 'Не удалось подключиться к сделке');
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('is-loading');
      button.textContent = originalText;
    }
  }
}

function renderWalletChips() {
  els.walletChips.innerHTML = currencies.map((currency) => `
    <button class="wallet-chip ${currency.code === state.selectedWallet.code ? 'active' : ''}" type="button" data-wallet="${escapeHtml(currency.code)}">
      <img src="${currency.logo}" alt="${escapeHtml(currency.code)} logo" />
      <span>${escapeHtml(currency.code)}</span>
    </button>
  `).join('');
  updateWalletPanel();
}

function selectWallet(code) {
  state.selectedWallet = getCurrency(code);
  updateWalletPanel();
  [...els.walletChips.querySelectorAll('.wallet-chip')].forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.wallet === code);
  });
  vibrate('light');
}

function updateWalletPanel() {
  renderWalletCard();
  els.depositButton.textContent = 'Пополнить';
  els.withdrawButton.textContent = 'Вывести';
}

function getTonConnectNetwork() {
  return walletConfig.network === TON_TESTNET_ID ? TON_TESTNET_ID : TON_MAINNET_ID;
}

function getConnectedTonAddress() {
  const rawAddress = connectedTonWallet?.account?.address || tonConnectUI?.account?.address || '';
  if (!rawAddress) return '';

  try {
    return window.TON_CONNECT_UI?.toUserFriendlyAddress?.(rawAddress, getTonConnectNetwork() === TON_TESTNET_ID) || rawAddress;
  } catch {
    return rawAddress;
  }
}

function shortenWalletAddress(address) {
  const value = String(address || '');
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-7)}`;
}

function syncTonWalletItems() {
  const connectedAddress = getConnectedTonAddress();
  for (const code of TON_CONNECT_CURRENCY_CODES) {
    const currency = getCurrency(code);
    const item = currency.walletItems?.find((walletItem) => walletItem.connectable);
    if (!item) continue;
    item.value = connectedAddress ? shortenWalletAddress(connectedAddress) : 'Не привязан';
    item.fullValue = connectedAddress || '';
  }
}

function refreshTonConnectModal() {
  const currency = state.selectedWallet;
  if (state.walletModalMode !== 'deposit' || currency.deposit?.type !== 'ton-connect') return;
  els.walletModalBody.innerHTML = buildWalletModalMarkup(currency, 'deposit', currency.deposit);
  initializeWalletModalFields();
}

function initializeTonConnect() {
  const TonConnectUI = window.TON_CONNECT_UI?.TonConnectUI;
  if (!TonConnectUI) {
    console.warn('TON Connect UI library is unavailable.');
    return;
  }

  const manifestUrl = walletConfig.manifestUrl || new URL('./tonconnect-manifest.json', window.location.href).href;
  try {
    tonConnectUI = new TonConnectUI({ manifestUrl });
    connectedTonWallet = tonConnectUI.wallet || null;
    syncTonWalletItems();

    tonConnectUI.onStatusChange((wallet) => {
      connectedTonWallet = wallet || null;
      syncTonWalletItems();
      renderWalletCard();
      refreshTonConnectModal();
    });
  } catch (error) {
    console.error('TON Connect initialization failed:', error);
  }
}

function renderWalletCard() {
  const currency = state.selectedWallet;
  const items = currency.walletItems?.length ? currency.walletItems : [
    { label: `${currency.code} кошелёк`, value: 'Не привязан', editable: true, placeholder: `Укажите реквизиты ${currency.code}` },
  ];

  const balanceOverview = `
    <section class="wallet-overview-card">
      <div class="wallet-overview-icon"><img src="${currency.logo}" alt="${escapeHtml(currency.code)}" /></div>
      <div class="wallet-overview-copy"><span>Доступный баланс</span><strong>${escapeHtml(formatBalance(currency.code))} <small>${escapeHtml(currency.code)}</small></strong></div>
      <span class="wallet-overview-state">${state.apiConnected ? 'online' : 'local'}</span>
    </section>
  `;
  const itemMarkup = items.map((item, index) => {
    const label = item.icon ? `<span class="wallet-inline-icon">${item.icon}</span> ${escapeHtml(item.label)}` : escapeHtml(item.label);
    return `
      <article class="wallet-info-card" data-wallet-item="${index}">
        <div class="wallet-info-copy">
          <div class="wallet-info-label">${label}</div>
          <div class="wallet-info-value ${String(item.value).includes('Не привязан') ? 'muted' : ''}"${item.fullValue ? ` title="${escapeHtml(item.fullValue)}"` : ''}>${escapeHtml(item.value)}</div>
        </div>
        ${item.editable ? `<button class="wallet-edit-button" type="button" data-edit-wallet-item="${index}" aria-label="Редактировать">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75L4 17.25Zm14.7-9.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.17 1.17 2.75 2.75 1.33-1.46Z" fill="currentColor"/></svg>
        </button>` : ''}
      </article>
    `;
  }).join('');
  els.walletInfoList.innerHTML = balanceOverview + itemMarkup;
}

function updateWalletItem(index) {
  const currency = state.selectedWallet;
  const item = currency.walletItems?.[index];
  if (!item || !item.editable) return;

  if (item.connectable && TON_CONNECT_CURRENCY_CODES.has(currency.code)) {
    openWalletModal('deposit');
    return;
  }

  const isTelegram = currency.code === 'STARS' || /telegram|username/i.test(`${item.label} ${item.placeholder || ''}`);
  state.walletModalMode = 'edit-item';
  state.walletEditIndex = index;
  els.walletModalTitle.textContent = isTelegram ? 'Telegram username' : 'Редактировать реквизиты';
  els.walletModalBody.innerHTML = buildWalletItemEditorMarkup(item, isTelegram);
  els.walletModal.classList.toggle('wallet-modal-telegram', isTelegram);
  els.walletModal.classList.add('wallet-modal-editor');
  els.walletModal.classList.remove('hidden');
  els.walletModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setBackButton(true, closeWalletModal);
  initializeWalletModalFields();
  vibrate('medium');

  const firstField = els.walletModalBody.querySelector('input, textarea');
  if (firstField) setTimeout(() => firstField.focus(), 120);
}

function buildWalletItemEditorMarkup(item, isTelegram) {
  const currentValue = item.value === 'Не привязан' ? '' : String(item.value || '');

  if (isTelegram) {
    const username = currentValue.replace(/^@+/, '');
    return `
      <div class="wallet-modal-stack wallet-editor-stack">
        <section class="wallet-recipient-card wallet-recipient-card-telegram">
          <div class="wallet-recipient-head">
            <span class="wallet-recipient-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 3.2a1.5 1.5 0 0 0-1.56-.22L3.36 9.45c-1.14.44-1.1 2.08.06 2.46l4.18 1.37 1.54 4.85c.35 1.1 1.75 1.42 2.55.59l2.34-2.43 4.42 3.27c.94.69 2.28.17 2.5-.98l2.33-13.72a1.5 1.5 0 0 0-1.68-1.66ZM9.1 12.32l8.38-5.2-6.64 6.67-.52 2.5-1.22-3.97Z"/></svg>
            </span>
            <span class="wallet-recipient-copy">
              <strong>Ваш Telegram username</strong>
              <small>Он будет использоваться для получения Stars</small>
            </span>
            <span class="wallet-recipient-tag">Stars</span>
          </div>

          <label class="wallet-username-shell" for="walletUsernameEditor">
            <span class="wallet-username-prefix">@</span>
            <input id="walletUsernameEditor" class="wallet-input wallet-username-input" name="modalWalletItem" value="${escapeHtml(username)}" placeholder="username" autocomplete="off" autocapitalize="none" spellcheck="false" data-telegram-username aria-label="Telegram username" />
            <span class="wallet-username-check" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m6 12 4 4 8-9"/></svg>
            </span>
          </label>
          <div class="wallet-username-note"><span>i</span> Например: @username</div>
        </section>

        <div class="wallet-modal-actions">
          <button class="gray-wide" type="button" data-modal-cancel>Отменить</button>
          <button class="blue-wide" type="button" data-modal-submit>Сохранить</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="wallet-modal-stack wallet-editor-stack">
      <section class="wallet-recipient-card">
        <label class="wallet-field">
          <span class="wallet-field-title">${escapeHtml(item.label)}</span>
          <input class="wallet-input" name="modalWalletItem" value="${escapeHtml(currentValue)}" placeholder="${escapeHtml(item.placeholder || 'Введите значение')}" autocomplete="off" />
        </label>
      </section>
      <div class="wallet-modal-actions">
        <button class="gray-wide" type="button" data-modal-cancel>Отменить</button>
        <button class="blue-wide" type="button" data-modal-submit>Сохранить</button>
      </div>
    </div>
  `;
}

function openWalletModal(mode) {
  const currency = state.selectedWallet;
  const config = mode === 'deposit' ? currency.deposit : currency.withdraw;
  if (!config) {
    showToast(mode === 'deposit' ? 'Пополнение недоступно' : 'Вывод недоступен');
    return;
  }

  state.walletModalMode = mode;
  state.walletEditIndex = null;
  const recipientField = mode === 'withdraw' ? getWithdrawRecipientField(currency, config) : null;
  els.walletModalTitle.textContent = `${mode === 'deposit' ? 'Пополнить' : 'Вывести'} ${currency.code === 'STARS' && mode === 'deposit' ? '⭐ Stars' : currency.code}`;
  els.walletModalBody.innerHTML = buildWalletModalMarkup(currency, mode, config);
  els.walletModal.classList.toggle('wallet-modal-telegram', recipientField?.type === 'telegram');
  els.walletModal.classList.toggle('wallet-modal-tonconnect', mode === 'deposit' && config.type === 'ton-connect');
  els.walletModal.classList.toggle('wallet-modal-withdraw', mode === 'withdraw');
  els.walletModal.classList.toggle('wallet-modal-stars', mode === 'deposit' && config.type === 'stars');
  els.walletModal.classList.remove('wallet-modal-editor');
  els.walletModal.classList.remove('hidden');
  els.walletModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setBackButton(true, closeWalletModal);
  initializeWalletModalFields();
  vibrate('medium');

  const firstField = els.walletModalBody.querySelector('input, textarea');
  if (firstField) setTimeout(() => firstField.focus(), 120);
}

function closeWalletModal() {
  els.walletModal.classList.add('hidden');
  els.walletModal.setAttribute('aria-hidden', 'true');
  els.walletModalBody.innerHTML = '';
  els.walletModal.classList.remove('wallet-modal-telegram', 'wallet-modal-editor', 'wallet-modal-tonconnect', 'wallet-modal-withdraw', 'wallet-modal-stars');
  document.body.classList.remove('modal-open');
  state.walletModalMode = null;
  state.walletEditIndex = null;
  setBackButton(false);
}

function buildWalletModalMarkup(currency, mode, config) {
  if (config.type === 'ton-connect' && mode === 'deposit') {
    return buildTonConnectDepositMarkup(currency, config);
  }

  if (config.type === 'stars' && mode === 'deposit') {
    return `
      <div class="wallet-modal-stack stars-purchase-shell">
        <section class="stars-purchase-hero">
          <div class="stars-orbit"><span>★</span></div>
          <div>
            <span class="modal-eyebrow">Telegram Stars</span>
            <h3>Пополнить баланс</h3>
            <p>После нажатия откроется официальное окно оплаты Telegram.</p>
          </div>
        </section>

        <section class="stars-amount-card">
          <label class="wallet-field">
            <span class="wallet-field-title">Количество Stars</span>
            <div class="amount-input-shell stars-amount-input">
              <input class="wallet-input" name="modalAmount" inputmode="numeric" value="${escapeHtml(config.preset)}" />
              <span>⭐</span>
            </div>
          </label>
          <div class="amount-presets" aria-label="Быстрый выбор суммы">
            ${[50, 100, 250, 500].map((value) => `<button type="button" data-stars-preset="${value}">${value}</button>`).join('')}
          </div>
          <div class="wallet-hint">Минимум: ${escapeHtml(config.min)} ⭐</div>
        </section>

        <section class="native-payment-note">
          <span>✓</span>
          <div><strong>Нативная оплата</strong><p>Stars поступят боту, а внутренний баланс обновится только после подтверждения платежа сервером.</p></div>
        </section>

        <button class="blue-wide submit wallet-modal-wide" type="button" data-modal-submit>${escapeHtml(config.button)}</button>
      </div>
    `;
  }

  if (mode === 'withdraw') {
    const recipientField = getWithdrawRecipientField(currency, config);
    const available = getBalance(currency.code);
    return `
      <div class="wallet-modal-stack withdraw-shell">
        <section class="withdraw-hero-v2">
          <div class="withdraw-hero-top">
            <div class="withdraw-currency-icon"><img src="${currency.logo}" alt="${escapeHtml(currency.code)}" /></div>
            <div class="withdraw-currency-copy"><span>Вывод средств</span><strong>${escapeHtml(currency.name)}</strong></div>
            <span class="withdraw-code-pill">${escapeHtml(currency.code)}</span>
          </div>
          <div class="withdraw-balance-line">
            <span>Доступно</span>
            <strong>${escapeHtml(formatBalance(currency.code, available))} <small>${escapeHtml(currency.code)}</small></strong>
          </div>
        </section>

        <section class="withdraw-form-card">
          <div class="withdraw-section-label"><span>1</span><strong>Куда отправить</strong></div>
          ${buildWithdrawRecipientMarkup(recipientField)}

          <div class="withdraw-divider"></div>
          <div class="withdraw-section-label"><span>2</span><strong>Сумма вывода</strong></div>
          <label class="amount-input-shell withdraw-amount-shell">
            <input class="wallet-input" name="modalAmount" inputmode="decimal" value="${escapeHtml(config.preset)}" />
            <span>${escapeHtml(currency.code)}</span>
          </label>
          <div class="amount-presets withdraw-presets">
            <button type="button" data-fill-percent="25">25%</button>
            <button type="button" data-fill-percent="50">50%</button>
            <button type="button" data-fill-percent="75">75%</button>
            <button type="button" data-fill-percent="100">MAX</button>
          </div>
          <div class="withdraw-minimum">Минимум ${escapeHtml(config.min)} ${escapeHtml(currency.code)}</div>
        </section>

        <section class="withdraw-summary-card">
          <div><span>Комиссия сервиса</span><strong>0 ${escapeHtml(currency.code)}</strong></div>
          <div class="withdraw-summary-main"><span>К получению</span><strong data-withdraw-receive>0 ${escapeHtml(currency.code)}</strong></div>
        </section>

        <section class="withdraw-security-note">
          <span class="withdraw-shield">✓</span>
          <p>Проверьте реквизиты. После создания заявка появится в серверной очереди на обработку.</p>
        </section>

        <div class="wallet-modal-actions withdraw-actions">
          <button class="gray-wide" type="button" data-modal-cancel>Отменить</button>
          <button class="blue-wide" type="button" data-modal-submit>${escapeHtml(config.button || 'Вывести')}</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="wallet-modal-stack">
      <section class="wallet-details-card">
        <div class="wallet-details-label">Номер карты для пополнения:</div>
        <div class="wallet-card-copy-row">
          <div class="wallet-card-copy-value">${escapeHtml(config.card || DEFAULT_DEPOSIT_CARD)}</div>
          <button class="wallet-copy-button" type="button" data-copy-value="${escapeHtml(config.card || DEFAULT_DEPOSIT_CARD)}" aria-label="Скопировать">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"/></svg>
          </button>
        </div>
      </section>

      <label class="wallet-field">
        <span class="wallet-field-title">Сумма ${escapeHtml(currency.code)}</span>
        <input class="wallet-input" name="modalAmount" inputmode="decimal" value="${escapeHtml(config.preset)}" />
      </label>
      <div class="wallet-hint">Минимум: ${escapeHtml(config.min)} ${escapeHtml(currency.code)}</div>

      <label class="wallet-field">
        <span class="wallet-field-title">Комментарий к переводу <b>(необязательно)</b></span>
        <input class="wallet-input" name="modalComment" placeholder="Ваш комментарий" />
      </label>

      <div class="wallet-modal-actions">
        <button class="gray-wide" type="button" data-modal-cancel>Отменить</button>
        <button class="blue-wide" type="button" data-modal-submit>${escapeHtml(config.button || 'Я оплатил')}</button>
      </div>
    </div>
  `;
}

function buildTonConnectDepositMarkup(currency, config) {
  const address = getConnectedTonAddress();
  const isConnected = Boolean(address);
  const walletName = connectedTonWallet?.device?.appName || 'Telegram Wallet';
  const recipientConfigured = isTonRecipientConfigured();

  return `
    <div class="wallet-modal-stack ton-connect-stack">
      <section class="ton-connect-card ${isConnected ? 'is-connected' : ''}">
        <div class="ton-connect-head">
          <span class="ton-connect-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4.8 5.5A2.8 2.8 0 0 1 7.6 2.7h8.8a2.8 2.8 0 0 1 2.8 2.8v2.1h.3a2.5 2.5 0 0 1 2.5 2.5v6.2a2.5 2.5 0 0 1-2.5 2.5h-.3v.2a2.8 2.8 0 0 1-2.8 2.8H7.6A2.8 2.8 0 0 1 4.8 19V5.5Zm2.2.1V19c0 .3.3.6.6.6h8.8c.3 0 .6-.3.6-.6v-.2h-2.7a4 4 0 0 1 0-8H17V5.5c0-.3-.3-.6-.6-.6H7.6c-.3 0-.6.3-.6.7Zm7.3 7.4a1.8 1.8 0 1 0 0 3.6h5.2c.2 0 .3-.1.3-.3v-3c0-.2-.1-.3-.3-.3h-5.2Z"/></svg>
          </span>
          <span class="ton-connect-copy">
            <strong>${escapeHtml(isConnected ? walletName : 'Telegram Wallet')}</strong>
            <small>${isConnected ? 'Кошелёк подключён через TON Connect' : 'Подключение и подтверждение откроются в Telegram'}</small>
          </span>
          <span class="ton-connect-status">${isConnected ? 'Подключён' : 'Не подключён'}</span>
        </div>

        <div class="ton-connect-address ${isConnected ? '' : 'muted'}">
          <span>${isConnected ? escapeHtml(shortenWalletAddress(address)) : 'Адрес появится после подключения'}</span>
          ${isConnected ? `<button type="button" data-copy-value="${escapeHtml(address)}" aria-label="Скопировать адрес"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"/></svg></button>` : ''}
        </div>

        <button class="ton-connect-toggle" type="button" data-ton-connect-toggle>
          ${isConnected ? 'Отключить кошелёк' : 'Подключить Telegram Wallet'}
        </button>
      </section>

      <label class="wallet-field">
        <span class="wallet-field-title">Сумма ${escapeHtml(currency.code)}</span>
        <input class="wallet-input" name="modalAmount" inputmode="decimal" value="${escapeHtml(config.preset)}" />
      </label>
      <div class="wallet-hint">Минимум: ${escapeHtml(config.min)} ${escapeHtml(currency.code)}</div>

      <section class="ton-connect-security-note">
        <span class="ton-connect-shield" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 4.5 5v5.7c0 5 3.2 9.6 7.5 11.3 4.3-1.7 7.5-6.3 7.5-11.3V5L12 2Zm0 3 5.2 2.1v3.6c0 3.7-2.2 7.3-5.2 8.8-3-1.5-5.2-5.1-5.2-8.8V7.1L12 5Zm-1.1 9.7-2.2-2.2 1.5-1.5.7.7 3-3 1.5 1.5-4.5 4.5Z"/></svg>
        </span>
        <div>
          <strong>Без передачи ключей</strong>
          <p>Приложение видит только публичный адрес. Перевод подтверждается внутри вашего кошелька.</p>
        </div>
      </section>

      ${recipientConfigured ? '' : '<div class="ton-connect-config-warning">Владелец приложения должен указать адрес получения в <b>wallet-config.js</b>.</div>'}

      <div class="wallet-modal-actions">
        <button class="gray-wide" type="button" data-modal-cancel>Отменить</button>
        <button class="blue-wide" type="button" data-modal-submit ${state.walletActionBusy ? 'disabled' : ''}>
          ${state.walletActionBusy ? 'Открываем Wallet…' : escapeHtml(isConnected ? config.button : 'Подключить кошелёк')}
        </button>
      </div>
    </div>
  `;
}

function isTonRecipientConfigured() {
  const address = String(walletConfig.recipientAddress || '').trim();
  return address.length >= 40 && !/YOUR|PASTE|example/i.test(address);
}

function buildWithdrawRecipientMarkup(recipientField) {
  if (recipientField.type === 'telegram') {
    return `
      <section class="wallet-recipient-card wallet-recipient-card-telegram">
        <div class="wallet-recipient-head">
          <span class="wallet-recipient-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 3.2a1.5 1.5 0 0 0-1.56-.22L3.36 9.45c-1.14.44-1.1 2.08.06 2.46l4.18 1.37 1.54 4.85c.35 1.1 1.75 1.42 2.55.59l2.34-2.43 4.42 3.27c.94.69 2.28.17 2.5-.98l2.33-13.72a1.5 1.5 0 0 0-1.68-1.66ZM9.1 12.32l8.38-5.2-6.64 6.67-.52 2.5-1.22-3.97Z"/></svg>
          </span>
          <span class="wallet-recipient-copy">
            <strong>${escapeHtml(recipientField.label)}</strong>
            <small>Укажите аккаунт, на который будут отправлены Stars</small>
          </span>
          <span class="wallet-recipient-tag">Stars</span>
        </div>

        <label class="wallet-username-shell" for="modalRecipientUsername">
          <span class="wallet-username-prefix">@</span>
          <input id="modalRecipientUsername" class="wallet-input wallet-username-input" name="modalRecipient" inputmode="text" placeholder="username" autocomplete="off" autocapitalize="none" spellcheck="false" data-telegram-username aria-label="Telegram username" />
          <span class="wallet-username-check" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m6 12 4 4 8-9"/></svg>
          </span>
        </label>
        <div class="wallet-username-note"><span>i</span> Например: @username</div>
      </section>
    `;
  }

  return `
    <label class="wallet-field">
      <span class="wallet-field-title">${escapeHtml(recipientField.label)}</span>
      <input class="wallet-input" name="modalRecipient" inputmode="${escapeHtml(recipientField.inputMode)}" placeholder="${escapeHtml(recipientField.placeholder)}" autocomplete="off" />
    </label>
  `;
}

function initializeWalletModalFields() {
  const usernameInput = els.walletModalBody.querySelector('[data-telegram-username]');
  if (usernameInput) {
    const card = usernameInput.closest('.wallet-recipient-card');
    const syncState = () => {
      const cleaned = usernameInput.value.replace(/^@+/, '').replace(/\s+/g, '');
      if (cleaned !== usernameInput.value) usernameInput.value = cleaned;
      card?.classList.toggle('has-value', cleaned.length > 0);
    };
    usernameInput.addEventListener('input', syncState);
    usernameInput.addEventListener('focus', () => card?.classList.add('is-focused'));
    usernameInput.addEventListener('blur', () => card?.classList.remove('is-focused'));
    syncState();
  }

  const amountInput = els.walletModalBody.querySelector('[name="modalAmount"]');
  const updateAmountView = () => {
    const raw = String(amountInput?.value || '').replace(',', '.');
    const amount = Number(raw);
    const currency = state.selectedWallet;
    const receive = els.walletModalBody.querySelector('[data-withdraw-receive]');
    if (receive) receive.textContent = `${Number.isFinite(amount) ? formatBalance(currency.code, amount) : '0'} ${currency.code}`;
    els.walletModalBody.querySelectorAll('[data-stars-preset]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.starsPreset) === amount);
    });
  };
  amountInput?.addEventListener('input', updateAmountView);

  els.walletModalBody.querySelectorAll('[data-fill-percent]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!amountInput) return;
      const percent = Number(button.dataset.fillPercent || 0) / 100;
      const balance = getBalance(state.selectedWallet.code);
      const decimals = state.selectedWallet.code === 'BTC' ? 8 : state.selectedWallet.code === 'ETH' ? 6 : ['TON', 'USDT'].includes(state.selectedWallet.code) ? 4 : 2;
      amountInput.value = (balance * percent).toFixed(decimals).replace(/\.?0+$/, '');
      updateAmountView();
      vibrate('light');
    });
  });

  els.walletModalBody.querySelectorAll('[data-stars-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!amountInput) return;
      amountInput.value = button.dataset.starsPreset || '';
      updateAmountView();
      vibrate('light');
    });
  });

  updateAmountView();
}

function getWithdrawRecipientField(currency, config = {}) {
  if (currency.code === 'STARS') {
    return {
      type: 'telegram',
      label: 'Ваш Telegram username',
      placeholder: '@username',
      inputMode: 'text',
      emptyMessage: 'Укажите свой Telegram username',
    };
  }

  if (CRYPTO_CURRENCY_CODES.has(currency.code)) {
    return {
      type: 'crypto',
      label: 'Номер кошелька',
      placeholder: 'Напишите свой номер кошелька',
      inputMode: 'text',
      emptyMessage: 'Напишите свой номер кошелька',
    };
  }

  return {
    type: 'card',
    label: 'Номер карты',
    placeholder: config.cardPlaceholder || DEFAULT_WITHDRAW_PLACEHOLDER,
    inputMode: 'numeric',
    emptyMessage: 'Введите номер карты',
  };
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('Скопировано');
    vibrate('light');
  } catch {
    showToast('Не удалось скопировать');
  }
}

async function toggleTonWalletConnection() {
  if (!tonConnectUI) {
    showToast('TON Connect не загрузился');
    return;
  }

  try {
    if (getConnectedTonAddress()) {
      await tonConnectUI.disconnect();
      showToast('Кошелёк отключён');
    } else {
      await tonConnectUI.openModal();
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    showToast('Не удалось подключить кошелёк');
  }
}

function decimalToUnits(rawValue, decimals) {
  const normalized = String(rawValue).trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('INVALID_AMOUNT');
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error('TOO_MANY_DECIMALS');
  }

  const base = 10n ** BigInt(decimals);
  const wholeUnits = BigInt(whole || '0') * base;
  const fractionUnits = BigInt((fraction.slice(0, decimals) || '').padEnd(decimals, '0') || '0');
  return (wholeUnits + fractionUnits).toString();
}

function setWalletActionBusy(busy, label = 'Обработка…') {
  state.walletActionBusy = Boolean(busy);
  const submitButton = els.walletModalBody.querySelector('[data-modal-submit]');
  if (!submitButton) return;
  submitButton.disabled = state.walletActionBusy;
  if (state.walletActionBusy) submitButton.textContent = label;
}

function rememberPendingTonDeposit(payload) {
  try {
    const key = 'ots_fanpay_pending_ton_deposits';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    current.unshift(payload);
    localStorage.setItem(key, JSON.stringify(current.slice(0, 25)));
  } catch (error) {
    console.warn('Could not save pending deposit:', error);
  }
}

async function submitTonConnectDeposit(currency, rawAmount) {
  if (!tonConnectUI) {
    showToast('TON Connect не загрузился');
    return;
  }

  const connectedAddress = getConnectedTonAddress();
  if (!connectedAddress) {
    await toggleTonWalletConnection();
    return;
  }

  if (!isTonRecipientConfigured()) {
    showToast('Не указан адрес получения платежей');
    return;
  }

  const recipientAddress = String(walletConfig.recipientAddress).trim();
  const network = getTonConnectNetwork();
  let request;

  try {
    if (currency.code === 'TON') {
      request = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network,
        from: connectedTonWallet?.account?.address,
        messages: [
          {
            address: recipientAddress,
            amount: decimalToUnits(rawAmount, 9),
          },
        ],
      };
    } else if (currency.code === 'USDT') {
      request = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network,
        from: connectedTonWallet?.account?.address,
        items: [
          {
            type: 'jetton',
            master: String(walletConfig.usdtJettonMaster || DEFAULT_USDT_JETTON_MASTER).trim(),
            destination: recipientAddress,
            amount: decimalToUnits(rawAmount, 6),
          },
        ],
      };
    } else {
      return;
    }
  } catch (error) {
    showToast(error.message === 'TOO_MANY_DECIMALS' ? 'Слишком много знаков после запятой' : 'Проверьте сумму');
    return;
  }

  setWalletActionBusy(true);
  try {
    const result = await tonConnectUI.sendTransaction(request);
    rememberPendingTonDeposit({
      currency: currency.code,
      amount: String(rawAmount),
      senderAddress: connectedAddress,
      recipientAddress,
      boc: result?.boc || '',
      traceId: result?.traceId || '',
      createdAt: new Date().toISOString(),
      status: 'submitted',
    });
    showToast(`Пополнение ${currency.code} отправлено`);
    closeWalletModal();
    vibrate('medium');
  } catch (error) {
    console.error('TON transaction failed:', error);
    const code = Number(error?.code);
    if (code === 300) {
      showToast('Подтверждение отменено');
    } else if (code === 400 && currency.code === 'USDT') {
      showToast('Кошелёк не поддерживает перевод USDT');
    } else {
      showToast('Не удалось отправить транзакцию');
    }
  } finally {
    state.walletActionBusy = false;
    if (state.walletModalMode === 'deposit') refreshTonConnectModal();
  }
}

function openTelegramInvoice(invoiceLink) {
  return new Promise((resolve, reject) => {
    if (!tg?.openInvoice) {
      reject(new Error('Оплата доступна только внутри Telegram'));
      return;
    }
    try {
      tg.openInvoice(invoiceLink, (status) => resolve(status));
    } catch (error) {
      reject(error);
    }
  });
}

async function waitForStarsCredit(paymentId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const data = await apiFetch(`/api/stars/payments/${encodeURIComponent(paymentId)}`);
      if (data.status === 'paid') {
        await syncRemoteState({ silent: true });
        return true;
      }
      if (data.status === 'failed') return false;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 850));
  }
  return false;
}

async function submitStarsDeposit(rawAmount) {
  const amount = Number(rawAmount);
  if (!Number.isInteger(amount)) {
    showToast('Количество Stars должно быть целым числом');
    return;
  }
  if (!tg?.initData || !tg?.openInvoice) {
    showToast('Откройте Mini App внутри Telegram');
    return;
  }

  setWalletActionBusy(true, 'Создаём счёт…');
  try {
    const invoice = await apiFetch('/api/stars/invoice', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    state.starsPaymentId = invoice.paymentId;
    setWalletActionBusy(true, 'Ожидаем оплату…');
    const status = await openTelegramInvoice(invoice.invoiceLink);

    if (status === 'paid' || status === 'pending') {
      showToast('Платёж принят, подтверждаем зачисление…');
      const credited = await waitForStarsCredit(invoice.paymentId);
      if (credited) {
        closeWalletModal();
        renderProfile();
        renderWalletCard();
        showToast(`${amount} ⭐ зачислены на баланс`);
        vibrate('medium');
        return;
      }
      showToast('Платёж обрабатывается сервером');
    } else if (status === 'cancelled') {
      showToast('Оплата отменена');
    } else {
      showToast('Оплата не завершена');
    }
  } catch (error) {
    console.error('Stars payment failed:', error);
    showToast(error.message || 'Не удалось создать счёт Stars');
  } finally {
    state.walletActionBusy = false;
    if (state.walletModalMode === 'deposit' && state.selectedWallet.code === 'STARS') {
      els.walletModalBody.innerHTML = buildWalletModalMarkup(state.selectedWallet, 'deposit', state.selectedWallet.deposit);
      initializeWalletModalFields();
    }
  }
}

async function submitWithdrawal(currency, rawAmount, recipient) {
  const amount = Number(String(rawAmount).replace(',', '.'));
  if (amount > getBalance(currency.code)) {
    showToast('Недостаточно средств на балансе');
    return false;
  }
  setWalletActionBusy(true, 'Создаём заявку…');
  try {
    const data = await apiFetch('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ currency: currency.code, amount, recipient }),
    });
    state.balances = { ...emptyBalances(), ...(data.balances || state.balances) };
    saveBalances();
    renderProfile();
    renderWalletCard();
    return true;
  } catch (error) {
    showToast(error.message);
    return false;
  } finally {
    state.walletActionBusy = false;
  }
}

function readModalAmount() {
  return els.walletModalBody.querySelector('[name="modalAmount"]')?.value?.trim() || '';
}

function validateAmount(raw, min) {
  const normalized = String(raw).trim().replace(',', '.');
  const minNormalized = String(min).trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
  const amount = Number.parseFloat(normalized);
  const minValue = Number.parseFloat(minNormalized);
  if (!Number.isFinite(amount)) return false;
  if (Number.isFinite(minValue) && amount < minValue) return false;
  return true;
}

async function submitWalletModal() {
  const currency = state.selectedWallet;
  const mode = state.walletModalMode;

  if (mode === 'edit-item') {
    submitWalletItemEditor();
    return;
  }

  const config = mode === 'deposit' ? currency.deposit : currency.withdraw;
  if (!config || state.walletActionBusy) return;

  const amount = readModalAmount();
  if (!validateAmount(amount, config.min)) {
    showToast(`Минимум: ${config.min} ${currency.code === 'STARS' && mode === 'deposit' ? '⭐' : currency.code}`);
    return;
  }

  if (mode === 'deposit' && config.type === 'ton-connect') {
    await submitTonConnectDeposit(currency, amount);
    return;
  }

  if (mode === 'deposit' && config.type === 'stars') {
    await submitStarsDeposit(amount);
    return;
  }

  if (mode === 'withdraw') {
    const recipientField = getWithdrawRecipientField(currency, config);
    const recipientInput = els.walletModalBody.querySelector('[name="modalRecipient"]');
    let recipient = recipientInput?.value?.trim() || '';
    if (recipientField.type === 'telegram') {
      recipient = recipient.replace(/^@+/, '').replace(/\s+/g, '');
      if (recipientInput) recipientInput.value = recipient;
      if (recipient) recipient = `@${recipient}`;
    }
    if (!recipient) {
      showToast(recipientField.emptyMessage);
      return;
    }
    const created = await submitWithdrawal(currency, amount, recipient);
    if (!created) return;
    closeWalletModal();
    showToast(`Заявка на вывод ${currency.code} создана`);
    vibrate('medium');
    return;
  }

  showToast(`Пополнение ${currency.code} отправлено на проверку`);
  closeWalletModal();
  vibrate('medium');
}

function submitWalletItemEditor() {
  const currency = state.selectedWallet;
  const item = currency.walletItems?.[state.walletEditIndex];
  const input = els.walletModalBody.querySelector('[name="modalWalletItem"]');
  if (!item || !input) return;

  const isTelegram = input.matches('[data-telegram-username]');
  let value = input.value.trim();
  if (isTelegram) {
    value = value.replace(/^@+/, '').replace(/\s+/g, '');
    if (!value) {
      showToast('Укажите свой Telegram username');
      input.focus();
      return;
    }
    value = `@${value}`;
  }

  item.value = value || 'Не привязан';
  renderWalletCard();
  showToast(isTelegram ? 'Username сохранён' : 'Реквизиты обновлены');
  closeWalletModal();
  vibrate('light');
}

function renderLeaders() {
  startLeaderboardCountdown();
}


function getLeaderboardDeadline() {
  const key = 'ots_fanpay_lb_deadline';
  const saved = Number(localStorage.getItem(key));
  if (Number.isFinite(saved) && saved > Date.now()) return saved;

  const fallbackDuration = (((12 * 24 + 10) * 60 + 54) * 60 + 10) * 1000;
  const deadline = Date.now() + fallbackDuration;
  localStorage.setItem(key, String(deadline));
  return deadline;
}

function startLeaderboardCountdown() {
  const daysEl = document.getElementById('lbDays');
  const hoursEl = document.getElementById('lbHours');
  const minutesEl = document.getElementById('lbMinutes');
  const secondsEl = document.getElementById('lbSeconds');
  const labelEl = document.querySelector('.start-label');
  const titleEl = document.querySelector('.season-title');
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  clearInterval(startLeaderboardCountdown.timer);
  const deadline = getLeaderboardDeadline();
  const paint = () => {
    const left = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.floor(left / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');

    if (left <= 0) {
      clearInterval(startLeaderboardCountdown.timer);
      if (labelEl) labelEl.textContent = 'Сезон';
      if (titleEl) titleEl.textContent = 'Лидерборд открыт';
    }
  };
  paint();
  startLeaderboardCountdown.timer = setInterval(paint, 1000);
}

function getCurrency(code) {
  const normalized = String(code || '').toUpperCase();
  return currencies.find((item) => item.code.toUpperCase() === normalized) || currencies[0];
}

function dealTypeLabel(type) {
  return type === 'sell' ? 'Продажа' : 'Покупка';
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Дата неизвестна';
  }
}

function setBackButton(show, handler = null) {
  if (!tg?.BackButton) return;
  if (show) {
    tg.BackButton.show();
    if (setBackButton.currentHandler) tg.BackButton.offClick(setBackButton.currentHandler);
    setBackButton.currentHandler = handler;
    if (handler) tg.BackButton.onClick(handler);
  } else {
    if (setBackButton.currentHandler) tg.BackButton.offClick(setBackButton.currentHandler);
    setBackButton.currentHandler = null;
    tg.BackButton.hide();
  }
}

const themeLabels = {
  midnight: 'Тёмная',
  graphite: 'Графит',
  light: 'Светлая',
  ocean: 'Синяя',
};
const themeOrder = Object.keys(themeLabels);

function applyTheme(theme) {
  const safeTheme = themeLabels[theme] ? theme : 'midnight';
  state.theme = safeTheme;
  document.body.dataset.theme = safeTheme;
  localStorage.setItem('ots_fanpay_theme', safeTheme);

  if (els.currentThemeLabel) els.currentThemeLabel.textContent = themeLabels[safeTheme];
  if (els.themeQuickButton) els.themeQuickButton.title = `Тема: ${themeLabels[safeTheme]}`;
  els.themeButtons?.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === safeTheme);
    button.setAttribute('aria-pressed', String(button.dataset.theme === safeTheme));
  });

  const isLight = safeTheme === 'light';
  tg?.setHeaderColor?.(isLight ? '#f6f7fb' : '#08090d');
  tg?.setBackgroundColor?.(isLight ? '#f6f7fb' : '#08090d');
}

function cycleTheme() {
  const index = themeOrder.indexOf(state.theme);
  const nextTheme = themeOrder[(index + 1 + themeOrder.length) % themeOrder.length];
  applyTheme(nextTheme);
  showToast(`Тема: ${themeLabels[nextTheme]}`);
  vibrate('light');
}

function setupTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.MainButton.hide();
  setBackButton(false);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.navItems.forEach((item) => {
  item.addEventListener('click', () => setTab(item.dataset.tab));
});
els.quickProfileButton?.addEventListener('click', () => setTab('profile'));
els.themeQuickButton?.addEventListener('click', cycleTheme);
els.themeButtons?.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.theme)));
els.createDealButton?.addEventListener('click', openTypeSheet);
els.joinDealButton?.addEventListener('click', openJoinDealModal);
els.activeDealsButton?.addEventListener('click', () => openDealsList('active'));
els.historyButton?.addEventListener('click', () => openDealsList('history'));
document.querySelectorAll('[data-close-create]').forEach((button) => button.addEventListener('click', closeCreate));
document.querySelectorAll('[data-close-list]').forEach((button) => button.addEventListener('click', closeList));
els.flowBackButton?.addEventListener('click', backInFlow);
els.createTypeSheet?.addEventListener('click', (event) => {
  const typeButton = event.target.closest('[data-type]');
  if (typeButton) chooseDealType(typeButton.dataset.type);
});
els.currencyGrid?.addEventListener('click', (event) => {
  const card = event.target.closest('[data-currency]');
  if (!card) return;
  selectCurrency(card.dataset.currency);
});
els.dealForm?.addEventListener('submit', createDeal);
els.dealsList?.addEventListener('click', (event) => {
  const copyLinkButton = event.target.closest('[data-copy-deal-link]');
  if (copyLinkButton) {
    void copyText(copyLinkButton.dataset.copyDealLink).then(() => showToast('Код сделки скопирован'));
    return;
  }
  const button = event.target.closest('button[data-action]');
  const card = event.target.closest('.deal-card');
  if (!button || !card) return;
  void changeDealStatus(card.dataset.id, button.dataset.action);
});
els.joinDealModalClose?.addEventListener('click', closeJoinDealModal);
els.joinDealModal?.addEventListener('click', (event) => {
  if (event.target.matches('[data-close-join-modal]')) closeJoinDealModal();
});
els.joinDealSubmit?.addEventListener('click', () => void joinDealByCode());
els.joinDealCodeInput?.addEventListener('input', () => {
  els.joinDealCodeInput.value = els.joinDealCodeInput.value.replace(/\D/g, '').slice(0, 6);
});
els.joinDealCodeInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void joinDealByCode();
  }
});

els.walletChips?.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-wallet]');
  if (!chip) return;
  selectWallet(chip.dataset.wallet);
});
els.walletInfoList?.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-wallet-item]');
  if (!editButton) return;
  updateWalletItem(Number(editButton.dataset.editWalletItem));
});
els.profileCard?.addEventListener('click', (event) => {
  const card = event.target.closest('[data-profile-wallet]');
  if (!card) return;
  state.selectedWallet = getCurrency(card.dataset.profileWallet);
  renderWalletChips();
  setTab('wallets');
});
els.profileCard?.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-promo-form]');
  if (!form) return;
  event.preventDefault();

  const input = form.querySelector('[data-promo-input]');
  const hint = form.parentElement?.querySelector('[data-promo-hint]');
  const code = String(input?.value || '').trim();
  if (!code) {
    input?.focus();
    form.classList.add('has-error');
    if (hint) hint.textContent = 'Сначала введите промокод';
    showToast('Введите промокод');
    return;
  }

  form.classList.add('has-error');
  if (hint) hint.textContent = 'Промокод не найден или больше не действует';
  showToast('Промокод не найден');
  vibrate('light');
});
els.profileCard?.addEventListener('input', (event) => {
  if (!event.target.matches('[data-promo-input]')) return;
  const form = event.target.closest('[data-promo-form]');
  const hint = form?.parentElement?.querySelector('[data-promo-hint]');
  form?.classList.remove('has-error');
  if (hint) hint.textContent = 'Сейчас активных промокодов нет';
});
els.depositButton?.addEventListener('click', () => openWalletModal('deposit'));
els.withdrawButton?.addEventListener('click', () => openWalletModal('withdraw'));
els.walletModalClose?.addEventListener('click', closeWalletModal);
els.walletModal?.addEventListener('click', (event) => {
  if (event.target.matches('[data-close-wallet-modal]')) closeWalletModal();
  const copyButton = event.target.closest('[data-copy-value]');
  if (copyButton) copyText(copyButton.dataset.copyValue);
  if (event.target.closest('[data-ton-connect-toggle]')) void toggleTonWalletConnection();
  if (event.target.closest('[data-modal-cancel]')) closeWalletModal();
  if (event.target.closest('[data-modal-submit]')) void submitWalletModal();
});
els.walletModal?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && event.target.matches('input')) {
    event.preventDefault();
    void submitWalletModal();
  }
});

applyTheme(state.theme);
renderUserBadge();
renderCurrencies();
initializeTonConnect();
setDealsFromList([...state.activeDeals, ...state.historyDeals]);
renderWalletChips();
renderLeaders();
renderProfile();
updateCounters();
setupTelegram();
void syncRemoteState({ silent: true });
void syncDealsState({ silent: true });
setTimeout(openDealFromUrl, 180);
tg?.onEvent?.('activated', () => {
  void syncRemoteState({ silent: true });
  void syncDealsState({ silent: true });
});
