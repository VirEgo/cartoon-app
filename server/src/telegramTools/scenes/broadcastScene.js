const { Scenes, Markup } = require('telegraf');
const { broadcastMessageToAll } = require('../adminCommandsConfig/commandConfig');
const { getKeyboardForUser } = require('../keyboards/keyboards');
const { ADMIN_ID } = require('../../config/config');

const broadcastScene = new Scenes.WizardScene(
	'broadcast',
	async (ctx) => {
		if (ctx.from.id !== ADMIN_ID) {
			await ctx.reply('Эта команда доступна только администратору.');
			return ctx.scene.leave();
		}

		await ctx.reply(
			'Введите текст сообщения для рассылки всем пользователям.\n\n' +
				'Для отмены отправьте "Отмена".',
			Markup.removeKeyboard(),
		);
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();
		if (!text) {
			await ctx.reply('Введите непустой текст сообщения.');
			return;
		}

		if (text.toLowerCase() === 'отмена') {
			await ctx.reply('Рассылка отменена.', getKeyboardForUser(ctx));
			return ctx.scene.leave();
		}

		const { sentCount, failedCount } = await broadcastMessageToAll(
			ctx.telegram,
			text,
		);

		await ctx.reply(
			`✅ Рассылка завершена.\nОтправлено: ${sentCount}\nОшибок: ${failedCount}`,
			getKeyboardForUser(ctx),
		);
		return ctx.scene.leave();
	},
);

module.exports = broadcastScene;
