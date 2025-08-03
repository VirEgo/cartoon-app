const { Markup } = require('telegraf');
const { ADMIN_ID } = require('../../config/config');
/**
 * Генерирует основную клавиатуру для пользователя.
 * @param {import('telegraf').Context} ctx
 * @returns {object} - Объект разметки клавиатуры Telegraf.
 */
function getKeyboardForUser(ctx) {
	const isAdmin = ctx.from?.id === ADMIN_ID;

	const buttons = isAdmin
		? [
				['🎲 Мультфильм'],
				['ℹ️ Мой профиль', '⭐ Избранное'],
				['📢 Отправить сообщение всем пользователям'],
				['🔄 Сбросить данные', '⚙️ Настройки'],
				['🗑️ Очистить опросы', '❌ Удалить пользователя'],
		  ]
		: [['🎲 Мультфильм'], ['ℹ️ Мой профиль', '⭐ Избранное']];

	return Markup.keyboard(buttons).resize();
}
module.exports = { getKeyboardForUser };
