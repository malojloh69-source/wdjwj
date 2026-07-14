import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-init-data, x-demo-user-id, x-demo-username",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const encoder = new TextEncoder();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

async function hmacSha256(key: Uint8Array, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function telegramUser(req: Request) {
  const initData = req.headers.get("x-telegram-init-data") || "";
  const botToken = Deno.env.get("BOT_TOKEN") || "";
  const allowDemo = String(Deno.env.get("ALLOW_DEMO") || "false").toLowerCase() === "true";

  if (!initData) {
    if (allowDemo) {
      const id = (req.headers.get("x-demo-user-id") || "").trim();
      if (id) return { id, username: req.headers.get("x-demo-username") || "demo_user" };
    }
    throw Object.assign(new Error("Откройте приложение через Telegram-бота"), { status: 401 });
  }
  if (!botToken) throw Object.assign(new Error("BOT_TOKEN не добавлен в Secrets облачной функции"), { status: 503 });

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  params.delete("hash");
  params.delete("signature");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const calculatedHash = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!timingSafeEqualHex(calculatedHash, receivedHash)) {
    throw Object.assign(new Error("Telegram-авторизация не прошла проверку"), { status: 401 });
  }

  const authDate = Number(params.get("auth_date") || 0);
  const maxAge = Number(Deno.env.get("MAX_INIT_DATA_AGE_SECONDS") || 86400);
  if (!authDate || Math.abs(Math.floor(Date.now() / 1000) - authDate) > maxAge) {
    throw Object.assign(new Error("Сессия Telegram устарела. Закройте и снова откройте Mini App"), { status: 401 });
  }

  let user: { id?: number | string; username?: string } = {};
  try { user = JSON.parse(params.get("user") || "{}"); } catch {}
  if (!user.id) throw Object.assign(new Error("Telegram не передал данные пользователя"), { status: 401 });
  return { id: String(user.id), username: user.username || "telegram_user" };
}

function cleanText(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function publicDeal(row: Record<string, unknown>, viewerId: string) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    currency: row.currency,
    amount: row.amount,
    price: row.price,
    partner: row.partner,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
    creatorId: String(row.creator_id),
    participantId: row.participant_id ? String(row.participant_id) : null,
    joined: Boolean(row.participant_id),
    role: String(row.creator_id) === viewerId ? "creator" : "participant",
  };
}

function randomCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await telegramUser(req);
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body.action, 20);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (action === "list") {
      const { data, error } = await db
        .from("deals")
        .select("*")
        .or(`creator_id.eq.${user.id},participant_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ deals: (data || []).map((row) => publicDeal(row, user.id)) });
    }

    if (action === "create") {
      const input = body.deal || {};
      const type = input.type === "sell" ? "sell" : "buy";
      const currency = cleanText(input.currency, 12).toUpperCase();
      const amount = cleanText(input.amount, 60);
      if (!currency || !amount) return json({ error: "Укажите валюту и сумму сделки" }, 400);

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const row = {
          code: randomCode(),
          creator_id: user.id,
          participant_id: null,
          type,
          currency,
          amount,
          price: cleanText(input.price, 80) || "Не указано",
          partner: cleanText(input.partner, 80) || "Не указан",
          comment: cleanText(input.comment, 500) || "Без комментария",
          status: "unpaid",
        };
        const { data, error } = await db.from("deals").insert(row).select("*").single();
        if (!error) return json({ deal: publicDeal(data, user.id) }, 201);
        if (error.code !== "23505") throw error;
      }
      return json({ error: "Не удалось создать уникальный код. Повторите ещё раз" }, 503);
    }

    if (action === "join") {
      const code = cleanText(body.code, 6).replace(/\D/g, "");
      if (!/^\d{6}$/.test(code)) return json({ error: "Введите шестизначный код" }, 400);
      const { data: deal, error } = await db.from("deals").select("*").eq("code", code).neq("status", "completed").maybeSingle();
      if (error) throw error;
      if (!deal) return json({ error: "Сделка с таким кодом не найдена" }, 404);
      if (String(deal.creator_id) === user.id) return json({ error: "Нельзя подключиться к собственной сделке" }, 400);
      if (deal.participant_id && String(deal.participant_id) !== user.id) return json({ error: "К этой сделке уже подключён другой участник" }, 409);
      if (deal.participant_id && String(deal.participant_id) === user.id) return json({ deal: publicDeal(deal, user.id) });

      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await db
        .from("deals")
        .update({ participant_id: user.id, updated_at: now })
        .eq("id", deal.id)
        .is("participant_id", null)
        .select("*")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "К сделке только что подключился другой участник" }, 409);
      return json({ deal: publicDeal(updated, user.id) });
    }

    if (action === "status") {
      const id = cleanText(body.id, 60);
      const nextStatus = cleanText(body.status, 20);
      const { data: deal, error } = await db.from("deals").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!deal || (String(deal.creator_id) !== user.id && String(deal.participant_id || "") !== user.id)) {
        return json({ error: "Сделка не найдена или недоступна" }, 404);
      }
      const allowed: Record<string, string[]> = { unpaid: ["paid"], paid: ["completed"], completed: [] };
      if (!allowed[String(deal.status)]?.includes(nextStatus)) return json({ error: "Недопустимый переход статуса" }, 400);
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status: nextStatus, updated_at: now };
      if (nextStatus === "completed") patch.completed_at = now;
      const { data: updated, error: updateError } = await db
        .from("deals")
        .update(patch)
        .eq("id", id)
        .eq("status", deal.status)
        .select("*")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "Статус сделки уже изменился. Обновите список" }, 409);
      return json({ deal: publicDeal(updated, user.id) });
    }

    return json({ error: "Неизвестная операция" }, 400);
  } catch (error) {
    console.error(error);
    const status = Number((error as { status?: number })?.status || 500);
    const message = error instanceof Error ? error.message : "Внутренняя ошибка облачного сервиса";
    return json({ error: status >= 500 && !message ? "Внутренняя ошибка облачного сервиса" : message }, status);
  }
});
