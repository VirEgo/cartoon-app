const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyAuthCode } = require('../services/authCode');
const { sendAuthCode } = require('../services/sendAuthCode');
const { reserveCooldown, clearCooldown } = require('../services/cooldown');
const { JWT_SECRET } = require('../config/config');

const router = express.Router();
const REQUEST_CODE_COOLDOWN_MS = 60 * 1000;

// Сохраняем ссылку на бота для использования в эндпоинтах
let botInstance = null;

router.setBotInstance = (bot) => {
	botInstance = bot;
};

/**
 * POST /api/auth/request-code
 * Запросить код авторизации
 */
router.post('/request-code', async (req, res) => {
	try {
		const { telegramId } = req.body;
		const normalizedTelegramId = Number(telegramId);

		if (
			!telegramId ||
			!Number.isInteger(normalizedTelegramId) ||
			normalizedTelegramId <= 0
		) {
			return res.status(400).json({ error: 'Telegram ID required' });
		}

		if (!botInstance) {
			return res
				.status(500)
				.json({ error: 'Telegram bot not initialized' });
		}

		const cooldownKey = `request-code:${req.ip}:${normalizedTelegramId}`;
		const cooldown = await reserveCooldown(
			cooldownKey,
			REQUEST_CODE_COOLDOWN_MS,
		);

		if (cooldown.isActive) {
			return res.status(429).json({
				error: 'Code was requested too recently. Please wait before retrying.',
				retryAfterMs: cooldown.remainingMs,
			});
		}

		try {
			const result = await sendAuthCode(botInstance, normalizedTelegramId);

			if (!result.success) {
				await clearCooldown(cooldownKey);
				return res.status(500).json({ error: 'Failed to send code' });
			}

			res.json({ success: true, message: 'Code sent to your Telegram' });
		} catch (error) {
			if (cooldown.acquired) {
				await clearCooldown(cooldownKey);
			}
			throw error;
		}
	} catch (error) {
		console.error('Request code error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/auth/verify-code
 * Проверить код и авторизоваться
 */
router.post('/verify-code', async (req, res) => {
	try {
		const { telegramId, code } = req.body;
		const normalizedTelegramId = Number(telegramId);

		if (
			!telegramId ||
			!code ||
			!Number.isInteger(normalizedTelegramId) ||
			normalizedTelegramId <= 0
		) {
			return res
				.status(400)
				.json({ error: 'Telegram ID and code required' });
		}

		const isValid = await verifyAuthCode(normalizedTelegramId, String(code).trim());

		if (!isValid) {
			return res.status(401).json({ error: 'Invalid or expired code' });
		}

		// Находим или создаем пользователя
		const User = require('../models/User');
		let user = await User.findOne({ telegramId: normalizedTelegramId });

		if (!user) {
			return res
				.status(404)
				.json({ error: 'User not found. Please start the bot first.' });
		}

		// Генерируем JWT токен
		const token = jwt.sign(
			{
				userId: user._id,
				telegramId: user.telegramId,
				username: user.username,
			},
			JWT_SECRET,
			{ expiresIn: '7d' },
		);

		res.json({
			success: true,
			token,
			user: {
				id: user._id,
				telegramId: user.telegramId,
				name: user.name,
				username: user.username,
				age: user.age,
				photoUrl: user.photoUrl,
				seenCartoonIds: user.seenCartoonIds,
				likedCartoonIds: user.likedCartoonIds,
				dislikedCartoonIds: user.dislikedCartoonIds,
				favoriteCartoonIds: user.favoriteCartoonIds,
				requestCount: user.requestCount,
				isUnlimited: user.isUnlimited,
				createdAt: user.createdAt,
			},
		});
	} catch (error) {
		console.error('Verify code error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * GET /api/auth/me
 * Получить информацию о текущем пользователе
 */
router.get('/me', async (req, res) => {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];

		if (!token) {
			return res.status(401).json({ error: 'Access token required' });
		}

		const decoded = jwt.verify(token, JWT_SECRET);
		const User = require('../models/User');
		const user = await User.findById(decoded.userId);

		if (!user) {
			return res.status(401).json({ error: 'User not found' });
		}

		console.log('User from DB:', {
			seenCartoonIds: user.seenCartoonIds,
			likedCartoonIds: user.likedCartoonIds,
			requestCount: user.requestCount,
			createdAt: user.createdAt,
		});

		res.json({
			success: true,
			user: {
				id: user._id,
				telegramId: user.telegramId,
				name: user.name,
				username: user.username,
				age: user.age,
				photoUrl: user.photoUrl,
				seenCartoonIds: user.seenCartoonIds || [],
				likedCartoonIds: user.likedCartoonIds || [],
				dislikedCartoonIds: user.dislikedCartoonIds || [],
				favoriteCartoonIds: user.favoriteCartoonIds || [],
				requestCount: user.requestCount || 0,
				isUnlimited: user.isUnlimited || false,
				createdAt: user.createdAt,
			},
		});
	} catch (error) {
		console.error('Auth verification error:', error);
		res.status(403).json({ error: 'Invalid token' });
	}
});

module.exports = router;
