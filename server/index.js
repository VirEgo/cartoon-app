const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/db/db');
const { PORT } = require('./src/config/config');
const bot = require('./src/bot');

const app = express();

app.use(cors());
app.use(bot.webhookCallback('/webhook'));

// Простой API эндпоинт (если нужен)
// app.get('/api/random-cartoon', async (req, res) => {
//     try {
//         // Здесь можно использовать логику из tmdb.js
//         const cartoon = await require('./tmdb').fetchRandomCartoonImproved(5); // Пример
//         res.json(cartoon);
//     } catch (err) {
//         res.status(500).json({ error: 'Ошибка при получении мультфильма' });
//     }
// });

async function start() {
	// Подключаемся к базе данных
	await connectDB();

	// Запускаем бота в зависимости от окружения (webhook или polling)
	if (process.env.RENDER_EXTERNAL_URL) {
		// 🔗 Рендер: запускаем в режиме Webhook
		const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
		await bot.telegram.setWebhook(webhookUrl);
		console.log('✅ Webhook установлен:', webhookUrl);
	} else {
		// 💻 Локальная разработка: включаем polling
		await bot.launch();
		console.log('🚀 Bot запущен в режиме polling');
	}

	// Запускаем Express сервер
	app.listen(PORT, () => {
		console.log(`🌐 Express listening on port ${PORT}`);
	});
}

start();

// Обработка сигналов остановки для корректного завершения работы бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
