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
	console.warn(
		'Running in API-only mode (missing some environment variables)',
		error,
	);
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

// Auth routes
const authRoutes = require('./src/routes/auth');
if (bot) {
	authRoutes.setBotInstance(bot);
} else {
	console.warn('Bot не инициализирован! authRoutes не получит bot');
}
app.use('/api/auth', authRoutes);

// User routes
const userRoutes = require('./src/routes/user');
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'Server is running', timestamp: new Date() });
});

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

async function start() {
	// Подключаемся к базе данных только если доступно
	if (connectDB) {
		await connectDB();
	}

	// Запускаем Express сервер первым
	app.listen(PORT, () => {
		console.log(`🌐 Express listening on port ${PORT}`);
	});

	// Запускаем бота в зависимости от окружения (webhook или polling) БЕЗ await
	if (bot) {
		if (process.env.RENDER_EXTERNAL_URL) {
			// Рендер: запускаем в режиме Webhook
			const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
			bot.telegram
				.setWebhook(webhookUrl)
				.then(() => {
					console.log('Webhook установлен:', webhookUrl);
				})
				.catch((err) => {
					console.error('Ошибка установки webhook:', err);
				});
		} else {
			// Локальная разработка: включаем polling в фоне
			bot.launch()
				.then(() => {
					console.log('Bot запущен в режиме polling');
				})
				.catch((err) => {
					console.error('Ошибка запуска бота:', err);
				});
		}
	}

	// Механизм анти-сна для Render (пингует сервер каждые 50 секунд)
	if (process.env.RENDER_EXTERNAL_URL) {
		const pingInterval = 50 * 1000; // 50 секунд
		const url = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
		console.log(`[Anti-sleep] Настроен пинг сервера ${url} каждые 50 секунд`);
		
		setInterval(() => {
			require('axios').get(url)
				.then(() => console.log(`[Anti-sleep] Ping успешный: ${url}`))
				.catch(err => console.error(`[Anti-sleep] Ошибка пинга:`, err.message));
		}, pingInterval);
	}
}

start();

// Обработка сигналов остановки для корректного завершения работы бота
if (bot) {
	process.once('SIGINT', () => bot.stop('SIGINT'));
	process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
