const Poll = require('../models/TGPoll');

async function clearAllPollsFromDB() {
	const res = await Poll.deleteMany({});
	return res.deletedCount; // возвращает число удалённых документов
}

/**
 * Удаляет все ранее отправленные опросы из чатов пользователей.
 * @param {import('telegraf').Telegram} telegram
 * @returns {Promise<number>} — сколько сообщений было успешно удалено
 */
async function clearPollMessages(telegram) {
	const polls = await Poll.find({});
	let deleted = 0;

	for (const { chatId, messageId } of polls) {
		try {
			await telegram.deleteMessage(chatId, messageId);
			deleted++;
		} catch (err) {
			// Может упасть, если чат уже удалён или сообщение старше 48 часов
			console.warn(
				`Не удалось удалить сообщение ${messageId} в ${chatId}:`,
				err.description || err,
			);
		}
	}
	return deleted;
}

module.exports = { clearAllPollsFromDB, clearPollMessages };
