const { createAuthCode } = require('../services/authCode');

/**
 * Отправляет код авторизации пользователю в Telegram
 * @param {object} bot - Экземпляр Telegraf бота
 * @param {number} telegramId - Telegram ID пользователя
 */
async function sendAuthCode(bot, telegramId) {
	try {
		const code = await createAuthCode(telegramId);
		await bot.telegram.sendMessage(
			telegramId,
			`🔐 *Код для входа в веб-приложение:*\n\n\`${code}\`\n\n` +
				`Код действителен 5 минут.\n` +
				`Никому не сообщайте этот код!`,
			{ parse_mode: 'Markdown' },
		);
		return { success: true };
	} catch (error) {
		console.error('❌ Error sending auth code:', error.message);
		return { success: false, error: error.message };
	}
}

module.exports = {
	sendAuthCode,
};
