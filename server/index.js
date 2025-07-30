const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Try to load config, but allow partial loading for API-only mode
let PORT = 3001;
let bot = null;
let connectDB = null;

try {
	const config = require('./src/config/config');
	PORT = config.PORT;
	connectDB = require('./src/db/db').connectDB;
	bot = require('./src/bot');
} catch (error) {
	console.warn('Running in API-only mode (missing some environment variables)');
}

const app = express();

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB limit
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
			cb(null, true);
		} else {
			cb(new Error('Only JPG and PNG files are allowed'), false);
		}
	},
});

app.use(cors());
app.use(express.json());

// Only add webhook if bot is available
if (bot) {
	app.use(bot.webhookCallback('/webhook'));
}

// API endpoint for image cartoonization
app.post('/api/cartoonize', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No image file provided' });
		}

		// For now, return a mock base64 encoded cartoon image
		// In a real implementation, this would process the image using AI/ML services
		const mockCartoonImage = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;

		res.json({
			success: true,
			processedImage: mockCartoonImage,
			message: 'Image processed successfully',
		});
	} catch (error) {
		console.error('Error processing image:', error);
		res.status(500).json({
			error: 'Failed to process image',
			message: error.message,
		});
	}
});

// Error handling for file upload errors
app.use((error, req, res, next) => {
	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res
				.status(400)
				.json({ error: 'File too large. Maximum size is 5MB' });
		}
	}
	if (error.message === 'Only JPG and PNG files are allowed') {
		return res.status(400).json({ error: error.message });
	}
	res.status(500).json({ error: 'Internal server error' });
});

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
	// Подключаемся к базе данных только если доступно
	if (connectDB) {
		await connectDB();
	}

	// Запускаем бота в зависимости от окружения (webhook или polling)
	if (bot) {
		if (process.env.RENDER_EXTERNAL_URL) {
			// Рендер: запускаем в режиме Webhook
			const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
			await bot.telegram.setWebhook(webhookUrl);
			console.log('✅ Webhook установлен:', webhookUrl);
		} else {
			// Локальная разработка: включаем polling
			await bot.launch();
			console.log('🚀 Bot запущен в режиме polling');
		}
	}

	// Запускаем Express сервер
	app.listen(PORT, () => {
		console.log(`🌐 Express listening on port ${PORT}`);
	});
}

start();

// Обработка сигналов остановки для корректного завершения работы бота
if (bot) {
	process.once('SIGINT', () => bot.stop('SIGINT'));
	process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
