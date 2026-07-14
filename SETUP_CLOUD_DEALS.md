# Подключение сделок без `npm start`

Сделки перенесены в Supabase: пользователи просто открывают Mini App. Компьютер владельца и локальный Node.js-сервер не нужны.

## 1. Создайте бесплатный проект Supabase

Откройте Supabase Dashboard и создайте проект.

## 2. Создайте таблицу

В Dashboard откройте **SQL Editor → New query**, вставьте содержимое `supabase/schema.sql` и нажмите **Run**.

## 3. Создайте Edge Function

Откройте **Edge Functions → Deploy a new function → Via Editor**.

- имя функции: `deals`;
- замените код содержимым `supabase/functions/deals/index.ts`;
- отключите **Verify JWT**, потому что функция сама проверяет подписанные данные Telegram;
- нажмите **Deploy function**.

## 4. Добавьте секрет бота

Откройте **Edge Functions → Secrets** и добавьте:

```env
BOT_TOKEN=токен_бота_из_BotFather
MAX_INIT_DATA_AGE_SECONDS=86400
ALLOW_DEMO=false
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны функции автоматически.

## 5. Укажите адрес функции

Supabase покажет endpoint вида:

```text
https://PROJECT_REF.supabase.co/functions/v1/deals
```

Вставьте его в `app-config.js`:

```js
window.OTS_APP_CONFIG = {
  apiBase: '',
  dealApiUrl: 'https://PROJECT_REF.supabase.co/functions/v1/deals',
  botUsername: 'имя_вашего_бота_без_@',
  cloudDealsOnly: true,
};
```

После этого для сделок не требуется `npm start`. Сайт можно разместить как обычную статическую страницу на HTTPS-хостинге.

## Как подключается второй пользователь

1. Создатель создаёт сделку.
2. Нажимает на блок с шестизначным кодом — открывается системное меню «Поделиться».
3. Ссылка вида `https://t.me/ВАШ_БОТ?startapp=deal_123456` запускает Mini App прямо через Telegram.
4. Код подставляется автоматически; пользователь нажимает **Присоединиться**.

Можно и вручную открыть **Войти по коду** и ввести шесть цифр.

## Важно

Облачная функция проверяет `Telegram.WebApp.initData`, поэтому рабочее подключение выполняется внутри Telegram Mini App. Таблица закрыта от прямого доступа браузера; операции проходят через Edge Function.

Для прямых ссылок в `@BotFather` настройте **Main Mini App** для этого бота и укажите HTTPS-адрес сайта. Telegram передаст `startapp` в `start_param`, после чего приложение автоматически подставит код сделки.
