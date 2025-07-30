const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { updateMovieFilter } = require('../../services/user');

// const genreScene = new BaseScene('genreScene');
// genreScene.enter((ctx) => ctx.reply('Введите новый жанр:'));
// genreScene.on('text', async (ctx) => {
// 	ctx.state.user.genre = ctx.message.text.trim();
// 	await ctx.state.user.save();
// 	await ctx.reply(`Жанр обновлён: ${ctx.state.user.genre}`);
// 	return ctx.scene.leave();
// });

const ratingScene = new BaseScene('ratingScene');
ratingScene.enter((ctx) =>
	ctx.reply('Введите новый минимальный рейтинг (1-10):'),
);
ratingScene.on('text', async (ctx) => {
	const val = Number(ctx.message.text.trim());
	if (isNaN(val) || val < 1 || val > 10) {
		return ctx.reply('Неверный ввод, введите число от 1 до 10');
	}

	const updated = await updateMovieFilter(ctx.from.id, {
		minVoteAverage: val,
	});
	await ctx.reply(
		`Минимальный рейтинг обновлён: ${updated.movieFilter.minVoteAverage}`,
	);
	return ctx.scene.leave();
});

// ratingScene.leave((ctx) => {
// 	updateMovieFilter(ctx.from.id, { minVoteAverage: ctx.state.user.minRating });
// });

// Сцены для исключения языков и стран сертификации
const languageScene = new BaseScene('languageScene');
languageScene.enter((ctx) =>
	ctx.reply('Введите языки для исключения через запятую:'),
);
languageScene.on('text', async (ctx) => {
	const langs = ctx.message.text.split(',').map((s) => s.trim());
	ctx.state.user.excludedLanguages = langs;
	await ctx.state.user.save();
	await ctx.reply(`Исключенные языки обновлены: ${langs.join(', ')}`);
	return ctx.scene.leave();
});

const countriesScene = new BaseScene('countriesScene');
countriesScene.enter((ctx) =>
	ctx.reply('Введите страны для фильтрации через запятую:'),
);
countriesScene.on('text', async (ctx) => {
	const countries = ctx.message.text.split(',').map((s) => s.trim());
	ctx.state.user.certificationCountries = countries;
	await ctx.state.user.save();
	await ctx.reply(`Страны сертификации обновлены: ${countries.join(', ')}`);
	return ctx.scene.leave();
});

module.exports = [ratingScene, languageScene, countriesScene];
