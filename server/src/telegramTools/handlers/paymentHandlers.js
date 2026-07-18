const { Markup } = require('telegraf');
const {
	replyWithCartoon,
} = require('../helpers/botHelpers');

function registerPaymentHandlers(
	bot,
	{ fetchRandomCartoonImproved, getPosterUrl },
) {
	bot.on('pre_checkout_query', async (ctx) => {
		await ctx.answerPreCheckoutQuery(true);
	});

	bot.on('successful_payment', async (ctx) => {
		const user = ctx.state.user;
		if (!user) {
			await ctx.reply(
				'Платеж получен, но не удалось определить профиль. Напишите /start.',
			);
			return;
		}

		const cartoon = await fetchRandomCartoonImproved(
			user.age,
			user.seenCartoonIds,
			user.dislikedCartoonIds,
			user.movieFilter?.minVoteAverage,
		);

		if (!cartoon) {
			await ctx.reply(
				'✅ Платёж получен, но подходящий мультфильм сейчас не найден. Попробуйте ещё раз позже.',
			);
			return;
		}

		if (!user.seenCartoonIds.includes(cartoon.id)) {
			user.seenCartoonIds.push(cartoon.id);
			await user.save();
		}

		await replyWithCartoon(ctx, {
			photoUrl: getPosterUrl(cartoon.poster_path),
			caption: `🎉 Спасибо! Вот ваш новый мультфильм: *${cartoon.title}*`,
			parseMode: 'Markdown',
			replyMarkup: Markup.inlineKeyboard([
				[
					Markup.button.callback(
						'⭐ Добавить в избранное',
						`togglefav_${cartoon.id}`,
					),
				],
			]).reply_markup,
		});
	});
}

module.exports = { registerPaymentHandlers };
