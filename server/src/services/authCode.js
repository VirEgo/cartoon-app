const AuthCode = require('../models/AuthCode');
const crypto = require('crypto');

/**
 * Генерирует 6-значный код
 */
function generateCode() {
	return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Создает новый код для пользователя
 * @param {number} telegramId - Telegram ID пользователя
 * @returns {Promise<string>} - Сгенерированный код
 */
async function createAuthCode(telegramId) {
	// Удаляем старые неиспользованные коды этого пользователя
	await AuthCode.deleteMany({ telegramId, used: false });

	const code = generateCode();
	await AuthCode.create({
		telegramId,
		code,
	});

	return code;
}

/**
 * Проверяет код и возвращает telegramId если код валиден
 * @param {number} telegramId - Telegram ID пользователя
 * @param {string} code - Введенный код
 * @returns {Promise<number|null>} - telegramId или null
 */
async function verifyAuthCode(telegramId, code) {
	const authCode = await AuthCode.findOneAndUpdate(
		{
		telegramId,
		code,
		used: false,
		},
		{ $set: { used: true } },
		{ new: true },
	);

	if (!authCode) {
		return null;
	}

	return telegramId;
}

module.exports = {
	createAuthCode,
	verifyAuthCode,
};
