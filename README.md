# 🎬 Cartoon Client + Server

Полноценное приложение с клиентом (React/Vite) и сервером (Telegram-бот на Node.js)

---

## 📁 Структура

```
cartoon-client/
├── client/        # React-приложение, деплой на GitHub Pages
├── server/        # Telegram-бот + API, деплой на Render
```

---

## 🚀 Клиент (client/)

### Команды

```bash
cd client
npm install
npm run dev       # локальный запуск
npm run build     # сборка для продакшена
npm run deploy    # публикация на GitHub Pages
```

### GitHub Pages

- Ветка: `gh-pages`
- Используется: `gh-pages` и `vite.config.ts` с `base: '/cartoon-client/'`

---

## 🤖 Сервер (server/)

### Стек

- `express` + `telegraf`
- MongoDB
- Webhook (через `RENDER_EXTERNAL_URL`)

### Деплой на Render

- Тип: **Web Service**
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node index.js`

### Переменные окружения:

```
TELEGRAM_BOT_TOKEN=...
TMDB_API_KEY=...
MONGO_URI=...
```

Render автоматически задаёт `RENDER_EXTERNAL_URL`.

---

## 📜 Лицензия

MIT
