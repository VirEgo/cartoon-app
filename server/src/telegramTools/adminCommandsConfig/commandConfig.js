const { ADMIN_ID } = require('../../config/config');
const {
	getAllUsers,
	resetRequestLimit,
	toggleUnlimitedAccess,
	getUserInfo,
} = require('../../services/user');
const { createPoll, addActivePolls } = require('../../services/TGPollService');

function initializeAdminCommands(botEntity) {
	const ctx = botEntity.context;
	if (ctx?.from?.id !== ADMIN_ID) return;
	console.log(ctx, 'Admin commands initialized for', ctx.from.id);

	botEntity.command('approve', async (ctx) => {
		const args = ctx.message.text.split(' ');
		const targetId = parseInt(args[1]);
		if (isNaN(targetId))
			return ctx.reply('Нужно указать Telegram ID пользователя.');

		const user = await resetRequestLimit(targetId);
		if (!user) return ctx.reply('Пользователь не найден.');

		await ctx.reply(`Лимит сброшен для ${targetId}`);
		await ctx.telegram.sendMessage(
			targetId,
			'🎉 Твой лимит был обновлён администратором. Можешь снова искать мультфильмы!',
		);
	});

	botEntity.command('unlimit', async (ctx) => {
		const args = ctx.message.text.split(' ');
		const targetId = parseInt(args[1]);
		if (isNaN(targetId))
			return ctx.reply('Нужно указать Telegram ID пользователя.');

		const user = await toggleUnlimitedAccess(targetId, true);
		if (!user) return ctx.reply('Пользователь не найден.');

		await ctx.reply(`Пользователь ${targetId} теперь безлимитный.`);
		await ctx.telegram.sendMessage(
			targetId,
			'✨ Администратор дал тебе безлимитный доступ!',
		);
	});

	botEntity.command('limit', async (ctx) => {
		const args = ctx.message.text.split(' ');
		const targetId = parseInt(args[1]);
		if (isNaN(targetId))
			return ctx.reply('Нужно указать Telegram ID пользователя.');

		const user = await toggleUnlimitedAccess(targetId, false);
		if (!user) return ctx.reply('Пользователь не найден.');

		await ctx.reply(` Убран безлимит у ${targetId}.`);
		await ctx.telegram.sendMessage(targetId, 'Безлимитный доступ отключён.');
	});

	botEntity.command('get', async (ctx) => {
		const args = ctx.message.text.split(' ');
		const targetId = parseInt(args[1]);
		if (isNaN(targetId))
			return ctx.reply('Нужно указать Telegram ID пользователя.');

		const user = await getUserInfo(targetId);
		if (!user) return ctx.reply('Пользователь не найден.');

		await ctx.reply(
			`👤 Пользователь @${user.username || 'неизвестно'} (${targetId})\n` +
				`Имя: ${user.name || '-'}\nВозраст: ${user.age || '-'}\n` +
				`Запросов: ${user.requestCount}/${REQUEST_LIMIT}\n` +
				`Безлимит: ${user.isUnlimited ? 'Да' : 'Нет'}`,
		);
	});
}

/**
 * Рассылка опроса всем пользователям.
 * @param {import('telegraf').Telegram} telegram
 * @param {string} question — текст опроса
 * @param {string[]} options — варианты ответа
 * @returns {Promise<string[]>} — массив отправленных poll_id
 */
async function broadcastPollToAll(telegram, question, options) {
	const users = await getAllUsers();
	const testUsers = [{ telegramId: 129600319 }, { telegramId: 6121961198 }];
	const pollIds = [];

	for (const { telegramId: chatId } of testUsers) {
		if (!chatId) continue;
		try {
			const sent = await telegram.sendPoll(chatId, question, options, {
				is_anonymous: false,
				open_period: 10 * 60,
			});
			pollIds.push(sent.poll.id);
			await createPoll({
				pollId: sent.poll.id,
				chatId, // <- сюда
				messageId: sent.message_id,
				question: sent.poll.question,
				options: sent.poll.options.map((o) => ({
					text: o.text,
					voteCount: o.voter_count,
				})),
				isAnonymous: sent.poll.is_anonymous,
				openPeriod: sent.poll.open_period,
			});
		} catch (err) {
			console.error(`Не удалось отправить опрос пользователю ${chatId}:`, err);
		}
		await new Promise((r) => setTimeout(r, 34));
	}

	// сохраняем все poll_id для последующей фильтрации
	addActivePolls(pollIds);
	return pollIds;
}

async function initializeAdminCallbacks(bot) {
	const ctx = bot.context;
	if (!ctx || ctx?.from?.id !== ADMIN_ID) return;
	const data = ctx.callbackQuery.data;

	// Обработка callback query для админа
	if (data.startsWith('admin_')) {
		if (!ctx || ctx?.from?.id !== ADMIN_ID) {
			return ctx.reply('У вас нет прав для выполнения этой команды.');
		}

		const [_, action, targetIdStr] = data.split('_');
		const targetId = parseInt(targetIdStr);
		if (isNaN(targetId))
			return ctx.reply('Некорректный Telegram ID пользователя.');

		const targetUser = await getUserInfo(targetId);
		if (!targetUser) return ctx.reply('Пользователь не найден.');

		try {
			switch (action) {
				case 'approve':
					await resetRequestLimit(targetId);
					await ctx.editMessageText(`Лимит сброшен для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'🎉 Администратор обновил твой лимит. Приятного просмотра!',
					);
					break;
				case 'unlimit':
					await toggleUnlimitedAccess(targetId, true);
					await ctx.reply(`Безлимит включен для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'✨ Администратор дал тебе безлимитный доступ!',
					);
					break;
				case 'limit':
					await toggleUnlimitedAccess(targetId, false);
					await ctx.reply(`Безлимит отключён для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'Безлимитный доступ отключён.',
					);
					break;
				case 'get':
					await ctx.reply(
						`👤 Пользователь @${
							targetUser.username || 'неизвестно'
						} (${targetId})\n` +
							`Имя: ${targetUser.name || '-'}\nВозраст: ${
								targetUser.age || '-'
							}\n` +
							`Запросов: ${targetUser.requestCount}/${REQUEST_LIMIT}\n` +
							`Безлимит: ${targetUser.isUnlimited ? 'Да' : 'Нет'}`,
					);
					break;
				default:
					ctx.reply('Неизвестная админская команда.');
			}
		} catch (error) {
			console.error('Ошибка в админской команде:', error);
			ctx.reply('Произошла ошибка при выполнении админской команды.');
		}
		return;
	}
}

module.exports = {
	initializeAdminCommands,
	initializeAdminCallbacks,
	broadcastPollToAll,
};
