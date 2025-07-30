const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

const { updateUser } = require('../../services/user');

const ageScene = new BaseScene('userAgeScene');
ageScene.enter((ctx) => ctx.reply('Введите новый возраст (1-18):'));
ageScene.on('text', async (ctx) => {
	const val = Number(ctx.message.text.trim());
	if (isNaN(val) || val < 1 || val > 19) {
		return ctx.reply('Неверный ввод, введите число от 1 до 18');
	}

	ctx.state.user.age = val;
	await ctx.state.user.save();
	await ctx.reply(`Возраст обновлён: ${val}`);
	return ctx.scene.leave();
});

ageScene.leave((ctx) => {
	updateUser(ctx.from.id, { age: ctx.state.user.age });
});

module.exports = [ageScene];
