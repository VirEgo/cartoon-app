const { isPrivateChat } = require('../helpers/botHelpers');

function registerAuthCommands(bot, { sendAuthCode }) {
	bot.command('getcode', async (ctx) => {
		try {
			if (!isPrivateChat(ctx)) {
				return ctx.reply(
					'Для безопасности запросите код в личном чате с ботом.',
				);
			}

			const telegramId = ctx.from.id;
			const result = await sendAuthCode(bot, telegramId);

			if (result.success) {
				await ctx.reply(
					'✅ Код для входа отправлен вам в личные сообщения!\n\n' +
						'Используйте его для входа в веб-приложение.',
				);
				return;
			}

			await ctx.reply('❌ Не удалось отправить код. Попробуйте позже.');
		} catch (error) {
			console.error('Error in /getcode command:', error);
			await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
		}
	});

	bot.command('login', async (ctx) => {
		try {
			if (!isPrivateChat(ctx)) {
				return ctx.reply(
					'Для безопасности авторизация доступна только в личном чате с ботом.',
				);
			}

			const telegramId = ctx.from.id;
			const result = await sendAuthCode(bot, telegramId);

			if (result.success) {
				await ctx.reply(
					'✅ Код для входа отправлен вам в этот чат.\n\n' +
						'Код действителен 5 минут.\n' +
						'Никому не сообщайте этот код!',
				);
				return;
			}

			await ctx.reply('❌ Не удалось создать код. Попробуйте позже.');
		} catch (error) {
			console.error('Error in /login command:', error);
			await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
		}
	});
}

module.exports = { registerAuthCommands };
