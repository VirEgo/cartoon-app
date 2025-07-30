const { ADMIN_ID } = require('../../config/config');

function initializeAdminCommands(bot) {
	const ctx = bot.context;
	if (ctx?.from?.id !== ADMIN_ID) return;

	bot.command('approve', async (ctx) => {
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

	bot.command('unlimit', async (ctx) => {
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

	bot.command('limit', async (ctx) => {
		const args = ctx.message.text.split(' ');
		const targetId = parseInt(args[1]);
		if (isNaN(targetId))
			return ctx.reply('Нужно указать Telegram ID пользователя.');

		const user = await toggleUnlimitedAccess(targetId, false);
		if (!user) return ctx.reply('Пользователь не найден.');

		await ctx.reply(` Убран безлимит у ${targetId}.`);
		await ctx.telegram.sendMessage(targetId, 'Безлимитный доступ отключён.');
	});

	bot.command('get', async (ctx) => {
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

module.exports = { initializeAdminCommands, initializeAdminCallbacks };
