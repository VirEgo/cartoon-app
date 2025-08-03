const { Scenes, Markup } = require('telegraf');
const { broadcastPollToAll } = require('../adminCommandsConfig/commandConfig'); // ваша функция рассылки
const { getKeyboardForUser } = require('../keyboards/keyboards'); // импортируем клавиатуру
const { ADMIN_ID } = require('../../config/config');
const { createPoll } = require('../../services/TGPollService');

const broadcastScene = new Scenes.WizardScene(
	'broadcast',
	// step 1: проверяем права и спрашиваем текст
	// async (ctx) => {
	// 	if (ctx.from.id !== ADMIN_ID) {
	// 		await ctx.reply('Эта команда доступна только администратору.');
	// 		return ctx.scene.leave();
	// 	}
	// 	// await ctx.reply(
	// 	// 	'Введите текст сообщения для рассылки всем пользователям:',
	// 	// 	Markup.removeKeyboard(),
	// 	// );
	// 	return ctx.wizard.next();
	// },
	// step 2: получаем текст, запускаем рассылку и выходим из сцены
	// async (ctx) => {
	// 	const text = ctx.message.text;
	// 	await broadcastPollToAll(ctx.telegram, text);
	// 	await ctx.reply('✅ Рассылка запущена.', getKeyboardForUser(ctx));
	// 	return ctx.scene.leave();
	// },
	async (ctx) => {
		const question = 'Test';
		const options = ['👍', '👎'];

		await broadcastPollToAll(ctx.telegram, question, options, {
			open_period: 10,
			is_anonymous: false,
		});
		await ctx.reply(
			`📊 Опрос "${question}" отправлен всем.\nСобираем ответы…`,
			getKeyboardForUser(ctx),
		);
		return ctx.scene.leave();
	},
);

module.exports = broadcastScene;
