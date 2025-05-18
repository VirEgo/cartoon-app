# Telegram Cartoon Bot

Простой Telegram-бот для выбора мультфильмов с учётом возраста, истории просмотров и лимитов.

## 🚀 Деплой на Render.com

### 1. Создайте аккаунт на https://render.com

### 2. Создайте новый сервис → Background Worker

- Type: **Background Worker**
- Name: `cartoon-bot`
- Environment: **Node**
- Build Command: `npm install`
- Start Command: `node index.js`
- Автоопределение root: включено
- Репозиторий: подключите свой GitHub или загрузите ZIP

### 3. Настройте переменные окружения (Environment Variables)

```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TMDB_API_KEY=ваш_ключ_от_tmdb
MONGO_URI=ваш_uri_от_mongodb
```

### 4. Активируйте бота

Перейдите в Telegram, откройте своего бота и нажмите **Start**

---

## 📁 Структура проекта

```
telegram-cartoon-bot/
├── index.js
├── Procfile
├── controllers/
├── services/
├── models/
├── utils/
└── README.md
```

## 🛠 Зависимости

- `telegraf`, `mongoose`, `axios`, `express`, `cors`, `dotenv`
