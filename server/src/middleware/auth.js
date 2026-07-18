const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');

/**
 * Middleware для проверки JWT токена
 * Добавляет объект user в req
 */
async function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		return res.status(401).json({ error: 'Access token required' });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(decoded.userId);

		if (!user) {
			return res.status(401).json({ error: 'User not found' });
		}

		req.user = user;
		next();
	} catch (error) {
		console.error('Token verification error:', error);
		return res.status(403).json({ error: 'Invalid token' });
	}
}

/**
 * Опциональная аутентификация
 * Не возвращает ошибку, если токен отсутствует
 */
async function optionalAuth(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (!token) {
		req.user = null;
		return next();
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(decoded.userId);
		req.user = user || null;
	} catch (error) {
		req.user = null;
	}

	next();
}

module.exports = {
	authenticateToken,
	optionalAuth,
};
