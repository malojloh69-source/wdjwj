'use strict';

// OTS FanPay server: static Mini App, Telegram Stars invoices, balances and deal codes.
// Node.js 18+ only; no third-party dependencies are required.

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const TELEGRAM_API_BASE = String(process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
const MINI_APP_URL = process.env.MINI_APP_URL || process.env.PUBLIC_URL || '';
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const ALLOW_DEMO = String(process.env.ALLOW_DEMO || '').toLowerCase() === 'true';
const SUPPORT_USERNAME = String(process.env.SUPPORT_USERNAME || '').replace(/^@+/, '');
const TERMS_URL = String(process.env.TERMS_URL || '');
const UPDATES_MODE = (process.env.TELEGRAM_UPDATES_MODE || 'polling').toLowerCase();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || crypto.randomBytes(24).toString('hex');
const STATIC_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const MAX_INIT_DATA_AGE_SECONDS = Number(process.env.MAX_INIT_DATA_AGE_SECONDS || 86400);
const CURRENCY_CODES = ['TON', 'USDT', 'STARS', 'RUB', 'KGS', 'EUR', 'GBP', 'JPY', 'TRY', 'UAH', 'KZT', 'BTC', 'ETH', 'CNY'];
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

let store = null;
let writeQueue = Promise.resolve();
let pollingOffset = 0;

function emptyBalances() {
  return Object.fromEntries(CURRENCY_CODES.map((code) => [code, 0]));
}

function defaultStore() {
  return {
    version: 2,
    users: {},
    payments: {},
    processedCharges: {},
    deals: {},
    withdrawals: {},
    balanceEvents: [],
  };
}

async function loadStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    store = JSON.parse(await fsp.readFile(STORE_PATH, 'utf8'));
  } catch {
    store = defaultStore();
    await persistStore();
  }
  store.users ||= {};
  store.payments ||= {};
  store.processedCharges ||= {};
  store.deals ||= {};
  store.withdrawals ||= {};
  store.balanceEvents ||= [];

  // Совместимость с ранними версиями хранилища, где код мог сохраниться числом.
  for (const deal of Object.values(store.deals)) {
    if (!deal || typeof deal !== 'object') continue;
    deal.code = String(deal.code || '').replace(/\D/g, '').slice(0, 6);
    deal.status = ['unpaid', 'paid', 'completed'].includes(deal.status) ? deal.status : 'unpaid';
  }
}

function persistStore() {
  writeQueue = writeQueue.then(async () => {
    const tempPath = `${STORE_PATH}.tmp`;
    await fsp.writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8');
    await fsp.rename(tempPath, STORE_PATH);
  });
  return writeQueue;
}

function getOrCreateUser(user) {
  const id = String(user.id);
  if (!store.users[id]) {
    store.users[id] = {
      id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      balances: emptyBalances(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const record = store.users[id];
  record.firstName = user.first_name || record.firstName || '';
  record.lastName = user.last_name || record.lastName || '';
  record.username = user.username || record.username || '';
  record.balances = { ...emptyBalances(), ...(record.balances || {}) };
  record.updatedAt = new Date().toISOString();
  return record;
}

function safeEqualHex(actualHex, expectedHex) {
  try {
    const actual = Buffer.from(actualHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function validateTelegramInitData(rawInitData) {
  if (!BOT_TOKEN) throw Object.assign(new Error('BOT_TOKEN is not configured'), { statusCode: 503 });
  if (!rawInitData) throw Object.assign(new Error('Open the app inside Telegram'), { statusCode: 401 });

  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get('hash') || '';
  params.delete('hash');
  params.delete('signature');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(receivedHash, calculatedHash)) {
    throw Object.assign(new Error('Telegram authorization check failed'), { statusCode: 401 });
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > MAX_INIT_DATA_AGE_SECONDS) {
    throw Object.assign(new Error('Telegram authorization data has expired'), { statusCode: 401 });
  }

  let user;
  try {
    user = JSON.parse(params.get('user') || '{}');
  } catch {
    throw Object.assign(new Error('Telegram user data is invalid'), { statusCode: 401 });
  }
  if (!user?.id) throw Object.assign(new Error('Telegram user is missing'), { statusCode: 401 });
  return user;
}

function authenticateRequest(req) {
  const initData = String(req.headers['x-telegram-init-data'] || '');
  if (initData) return validateTelegramInitData(initData);
  if (ALLOW_DEMO) {
    const demoId = String(req.headers['x-demo-user-id'] || 'demo').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'demo';
    const demoUsername = String(req.headers['x-demo-username'] || `demo_${demoId}`).replace(/^@+/, '').slice(0, 32);
    return { id: demoId, first_name: 'Demo', last_name: demoId, username: demoUsername };
  }
  throw Object.assign(new Error('Open the app inside Telegram'), { statusCode: 401 });
}

function sendJson(res, statusCode, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(data);
}

async function readJson(req, maxBytes = 128 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 });
  }
}

async function callTelegram(method, payload) {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not configured');
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`${method} failed: ${data.description || JSON.stringify(data)}`);
  return data.result;
}

function publicUser(record) {
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    username: record.username,
    balances: { ...emptyBalances(), ...record.balances },
  };
}

function recordBalanceEvent({ userId, currency, amount, type, reference }) {
  const event = {
    id: crypto.randomUUID(),
    userId: String(userId),
    currency: String(currency),
    amount: Number(amount),
    type: String(type),
    reference: String(reference || ''),
    createdAt: new Date().toISOString(),
  };
  store.balanceEvents.unshift(event);
  if (store.balanceEvents.length > 10000) store.balanceEvents.length = 10000;
  return event;
}

function dealsForUser(userId) {
  return Object.values(store.deals)
    .filter((deal) => deal.creatorId === userId || deal.participantId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function publicDeal(deal, viewerId) {
  return {
    id: deal.id,
    code: deal.code,
    type: deal.type,
    currency: deal.currency,
    amount: deal.amount,
    price: deal.price,
    partner: deal.partner,
    comment: deal.comment,
    status: deal.status,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    completedAt: deal.completedAt || null,
    creatorId: deal.creatorId,
    participantId: deal.participantId || null,
    joined: Boolean(deal.participantId),
    role: deal.creatorId === viewerId ? 'creator' : 'participant',
  };
}

function randomDealCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(crypto.randomInt(100000, 1000000));
    const exists = Object.values(store.deals).some((deal) => deal.code === code && deal.status !== 'completed');
    if (!exists) return code;
  }
  throw new Error('Could not create a unique deal code');
}

function parseStarsPaymentPayload(payload) {
  const match = /^stars:([0-9a-f-]{36})$/i.exec(String(payload || ''));
  return match ? match[1] : '';
}

async function createStarsInvoice(user, amount) {
  const paymentId = crypto.randomUUID();
  const payload = `stars:${paymentId}`;
  store.payments[paymentId] = {
    id: paymentId,
    userId: String(user.id),
    amount,
    currency: 'XTR',
    status: 'pending',
    payload,
    createdAt: new Date().toISOString(),
  };
  await persistStore();

  try {
    const invoiceLink = await callTelegram('createInvoiceLink', {
      title: 'Пополнение OTS FanPay',
      description: `Зачисление ${amount} Telegram Stars на внутренний баланс`,
      payload,
      currency: 'XTR',
      prices: [{ label: 'Telegram Stars', amount }],
    });
    return { paymentId, invoiceLink };
  } catch (error) {
    store.payments[paymentId].status = 'failed';
    store.payments[paymentId].error = error.message;
    await persistStore();
    throw error;
  }
}

async function processTelegramUpdate(update) {
  const query = update.pre_checkout_query;
  if (query) {
    const paymentId = parseStarsPaymentPayload(query.invoice_payload);
    const payment = store.payments[paymentId];
    const valid = Boolean(
      payment &&
      payment.status === 'pending' &&
      payment.userId === String(query.from?.id) &&
      query.currency === 'XTR' &&
      Number(query.total_amount) === Number(payment.amount)
    );

    await callTelegram('answerPreCheckoutQuery', {
      pre_checkout_query_id: query.id,
      ok: valid,
      ...(valid ? {} : { error_message: 'Счёт недействителен или уже обработан. Создайте новый счёт.' }),
    });
    return;
  }

  const message = update.message;
  if (!message) return;

  if (message.successful_payment) {
    const paymentInfo = message.successful_payment;
    const paymentId = parseStarsPaymentPayload(paymentInfo.invoice_payload);
    const payment = store.payments[paymentId];
    const chargeId = String(paymentInfo.telegram_payment_charge_id || '');

    if (
      payment &&
      chargeId &&
      !store.processedCharges[chargeId] &&
      payment.userId === String(message.from?.id) &&
      paymentInfo.currency === 'XTR' &&
      Number(paymentInfo.total_amount) === Number(payment.amount)
    ) {
      const user = getOrCreateUser(message.from);
      user.balances.STARS = Number(user.balances.STARS || 0) + Number(payment.amount);
      recordBalanceEvent({
        userId: user.id,
        currency: 'STARS',
        amount: Number(payment.amount),
        type: 'stars_deposit',
        reference: chargeId,
      });
      payment.status = 'paid';
      payment.paidAt = new Date().toISOString();
      payment.telegramPaymentChargeId = chargeId;
      store.processedCharges[chargeId] = { paymentId, processedAt: payment.paidAt };
      await persistStore();

      await callTelegram('sendMessage', {
        chat_id: message.chat.id,
        text: `✅ Оплата получена. ${payment.amount} ⭐ зачислены на баланс OTS FanPay.`,
      });
    }
    return;
  }

  if (message.text === '/start') {
    await callTelegram('sendMessage', {
      chat_id: message.chat.id,
      text: 'Открой OTS FanPay Mini App: кошельки, сделки и пополнение Telegram Stars.',
      reply_markup: MINI_APP_URL ? {
        inline_keyboard: [[{ text: 'Открыть OTS FanPay', web_app: { url: MINI_APP_URL } }]],
      } : undefined,
    });
  } else if (message.text === '/paysupport' || message.text === '/support') {
    const contact = SUPPORT_USERNAME ? `@${SUPPORT_USERNAME}` : 'администратору бота';
    await callTelegram('sendMessage', {
      chat_id: message.chat.id,
      text: `По вопросам платежей напишите ${contact} и приложите дату, сумму и скриншот оплаты.`,
    });
  } else if (message.text === '/terms') {
    await callTelegram('sendMessage', {
      chat_id: message.chat.id,
      text: TERMS_URL ? `Условия использования: ${TERMS_URL}` : 'Владелец сервиса должен указать ссылку на условия использования в переменной TERMS_URL.',
      disable_web_page_preview: true,
    });
  }
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, version: 3, time: new Date().toISOString() });
  }

  if (req.method === 'POST' && url.pathname === '/api/telegram/webhook') {
    if (UPDATES_MODE !== 'webhook') return sendJson(res, 404, { error: 'Webhook mode is disabled' });
    if (req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
      return sendJson(res, 403, { error: 'Forbidden' });
    }
    const update = await readJson(req);
    await processTelegramUpdate(update);
    return sendJson(res, 200, { ok: true });
  }

  const telegramUser = authenticateRequest(req);
  const user = getOrCreateUser(telegramUser);
  const userId = String(user.id);

  if (req.method === 'GET' && url.pathname === '/api/me') {
    await persistStore();
    return sendJson(res, 200, {
      user: publicUser(user),
      deals: dealsForUser(userId).map((deal) => publicDeal(deal, userId)),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/balance-events') {
    const events = store.balanceEvents.filter((event) => event.userId === userId).slice(0, 100);
    return sendJson(res, 200, { events });
  }

  if (req.method === 'POST' && url.pathname === '/api/stars/invoice') {
    const body = await readJson(req);
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 50 || amount > 100000) {
      return sendJson(res, 400, { error: 'Количество Stars должно быть целым числом от 50 до 100000' });
    }
    const invoice = await createStarsInvoice(telegramUser, amount);
    return sendJson(res, 201, invoice);
  }

  const paymentMatch = /^\/api\/stars\/payments\/([0-9a-f-]{36})$/i.exec(url.pathname);
  if (req.method === 'GET' && paymentMatch) {
    const payment = store.payments[paymentMatch[1]];
    if (!payment || payment.userId !== userId) return sendJson(res, 404, { error: 'Payment not found' });
    return sendJson(res, 200, { id: payment.id, amount: payment.amount, status: payment.status });
  }

  if (req.method === 'GET' && url.pathname === '/api/deals') {
    return sendJson(res, 200, { deals: dealsForUser(userId).map((deal) => publicDeal(deal, userId)) });
  }

  if (req.method === 'POST' && url.pathname === '/api/deals') {
    const body = await readJson(req);
    const currency = String(body.currency || '').toUpperCase();
    const type = body.type === 'sell' ? 'sell' : 'buy';
    const amount = String(body.amount || '').trim();
    if (!CURRENCY_CODES.includes(currency) || !amount || amount.length > 40) {
      return sendJson(res, 400, { error: 'Проверьте валюту и сумму сделки' });
    }
    const now = new Date().toISOString();
    const deal = {
      id: crypto.randomUUID(),
      code: randomDealCode(),
      creatorId: userId,
      participantId: null,
      type,
      currency,
      amount,
      price: String(body.price || 'Не указано').slice(0, 120),
      partner: String(body.partner || 'Не указан').slice(0, 120),
      comment: String(body.comment || 'Без комментария').slice(0, 500),
      status: 'unpaid',
      createdAt: now,
      updatedAt: now,
    };
    store.deals[deal.id] = deal;
    await persistStore();
    return sendJson(res, 201, { deal: publicDeal(deal, userId) });
  }

  if (req.method === 'POST' && url.pathname === '/api/deals/join') {
    const body = await readJson(req);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return sendJson(res, 400, { error: 'Введите полный шестизначный код сделки' });

    const deal = Object.values(store.deals).find((item) => (
      item && String(item.code || '').replace(/\D/g, '').slice(0, 6) === code && item.status !== 'completed'
    ));
    if (!deal) return sendJson(res, 404, { error: 'Сделка с таким кодом не найдена' });
    if (String(deal.creatorId) === userId) return sendJson(res, 400, { error: 'Нельзя подключиться к собственной сделке' });
    if (deal.participantId && String(deal.participantId) !== userId) {
      return sendJson(res, 409, { error: 'К сделке уже присоединился другой участник' });
    }

    deal.participantId = userId;
    deal.updatedAt = new Date().toISOString();
    await persistStore();
    return sendJson(res, 200, { deal: publicDeal(deal, userId) });
  }

  const dealStatusMatch = /^\/api\/deals\/([0-9a-f-]{36})\/status$/i.exec(url.pathname);
  if (req.method === 'PATCH' && dealStatusMatch) {
    const deal = store.deals[dealStatusMatch[1]];
    if (!deal || (deal.creatorId !== userId && deal.participantId !== userId)) {
      return sendJson(res, 404, { error: 'Сделка не найдена' });
    }
    const body = await readJson(req);
    const nextStatus = String(body.status || '');
    const transitions = { unpaid: ['paid'], paid: ['completed'], completed: [] };
    if (!transitions[deal.status]?.includes(nextStatus)) {
      return sendJson(res, 409, { error: 'Недопустимый переход статуса сделки' });
    }
    deal.status = nextStatus;
    deal.updatedAt = new Date().toISOString();
    if (nextStatus === 'completed') deal.completedAt = deal.updatedAt;
    await persistStore();
    return sendJson(res, 200, { deal: publicDeal(deal, userId) });
  }

  if (req.method === 'POST' && url.pathname === '/api/withdrawals') {
    const body = await readJson(req);
    const currency = String(body.currency || '').toUpperCase();
    const amount = Number(String(body.amount || '').replace(',', '.'));
    const recipient = String(body.recipient || '').trim().slice(0, 240);
    if (!CURRENCY_CODES.includes(currency) || !Number.isFinite(amount) || amount <= 0 || !recipient) {
      return sendJson(res, 400, { error: 'Проверьте сумму и реквизиты' });
    }
    const available = Number(user.balances[currency] || 0);
    if (amount > available) return sendJson(res, 409, { error: 'Недостаточно средств на балансе' });

    const id = crypto.randomUUID();
    user.balances[currency] = available - amount;
    recordBalanceEvent({
      userId,
      currency,
      amount: -amount,
      type: 'withdrawal_reserved',
      reference: id,
    });
    store.withdrawals[id] = {
      id,
      userId,
      currency,
      amount,
      recipient,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await persistStore();
    return sendJson(res, 201, { withdrawal: store.withdrawals[id], balances: user.balances });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

async function serveStatic(req, res, url) {
  let relativePath = decodeURIComponent(url.pathname);
  if (relativePath === '/') relativePath = '/index.html';
  const filePath = path.resolve(STATIC_ROOT, `.${relativePath}`);
  if (!filePath.startsWith(`${STATIC_ROOT}${path.sep}`) && filePath !== path.join(STATIC_ROOT, 'index.html')) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('not file');
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    res.end(data);
  } catch {
    if (!path.extname(relativePath)) {
      const data = await fsp.readFile(path.join(STATIC_ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
      return;
    }
    sendJson(res, 404, { error: 'File not found' });
  }
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Внутренняя ошибка сервера. Проверьте журнал запуска Node.js' });
  }
}

async function pollTelegram() {
  if (!BOT_TOKEN || UPDATES_MODE !== 'polling') return;
  while (true) {
    try {
      const updates = await callTelegram('getUpdates', {
        offset: pollingOffset,
        timeout: 30,
        allowed_updates: ['message', 'pre_checkout_query'],
      });
      for (const update of updates) {
        pollingOffset = update.update_id + 1;
        try {
          await processTelegramUpdate(update);
        } catch (error) {
          console.error('Telegram update failed:', error.message);
        }
      }
    } catch (error) {
      console.error('Telegram polling failed:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function configureWebhook() {
  if (!BOT_TOKEN || UPDATES_MODE !== 'webhook' || !MINI_APP_URL) return;
  const webhookUrl = new URL('/api/telegram/webhook', MINI_APP_URL).href;
  await callTelegram('setWebhook', {
    url: webhookUrl,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'pre_checkout_query'],
  });
  console.log(`Telegram webhook configured: ${webhookUrl}`);
}

async function configureBotProfile() {
  if (!BOT_TOKEN) return;
  const commands = [
    { command: 'start', description: 'Открыть OTS FanPay' },
    { command: 'paysupport', description: 'Помощь с платежом' },
    { command: 'terms', description: 'Условия использования' },
  ];
  try {
    await callTelegram('setMyCommands', { commands });
    if (MINI_APP_URL) {
      await callTelegram('setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'Открыть OTS FanPay', web_app: { url: MINI_APP_URL } },
      });
    }
  } catch (error) {
    console.error('Could not configure bot commands/menu:', error.message);
  }
}

async function main() {
  await loadStore();
  const server = http.createServer(requestHandler);
  server.listen(PORT, HOST, () => {
    console.log(`OTS FanPay is running at http://${HOST}:${PORT}`);
    if (!BOT_TOKEN) console.warn('BOT_TOKEN is not configured: Stars payments and Telegram updates are disabled.');
    if (ALLOW_DEMO) console.warn('ALLOW_DEMO=true: disable this in production.');
  });
  if (BOT_TOKEN && UPDATES_MODE === 'polling') {
    try {
      await callTelegram('deleteWebhook', { drop_pending_updates: false });
    } catch (error) {
      console.error('Could not disable the previous webhook:', error.message);
    }
  }
  await configureBotProfile();
  await configureWebhook();
  void pollTelegram();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
