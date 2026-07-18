const { Markup } = require('telegraf');

function isPrivateChat(ctx) {
	return ctx.chat?.type === 'private';
}

function generateCartoonButtons(user, cartoon) {
	const alreadyLiked = user.likedCartoonIds?.includes(cartoon.id);
	const alreadyInFav = user.favoriteCartoonIds?.includes(cartoon.id);
	const alreadyDisliked = user.dislikedCartoonIds?.includes(cartoon.id);

	const likeButton = Markup.button.callback(
		alreadyLiked ? '❤️ Нравится' : '👍 Нравится',
		`like_${cartoon.id}`
	);

	const dislikeButton = Markup.button.callback(
		alreadyDisliked ? '🖤 Не нравится' : '👎 Не нравится',
		`dislike_${cartoon.id}`
	);

	const favButton = Markup.button.callback(
		alreadyInFav ? '🌟 В избранном' : '⭐ В избранное',
		`togglefav_${cartoon.id}`,
	);

	return Markup.inlineKeyboard([[likeButton, dislikeButton], [favButton]])
		.reply_markup;
}

function buildMovieSettingsKeyboard() {
	return Markup.inlineKeyboard([
		[Markup.button.callback('Изменить рейтинг', 'change_rating')],
		[Markup.button.callback('Изменить языки', 'change_languages')],
		[Markup.button.callback('Изменить страны', 'change_countries')],
	]);
}

function buildSettingsKeyboard() {
	return Markup.inlineKeyboard([
		[Markup.button.callback('Изменить имя', 'change_name')],
		[Markup.button.callback('Изменить возраст', 'change_age')],
		[Markup.button.callback('Изменить рейтинг', 'change_rating')],
		[Markup.button.callback('Изменить языки', 'change_languages')],
		[Markup.button.callback('Изменить страны', 'change_countries')],
		[Markup.button.callback('Сбросить данные', 'reset_user_data')],
	]);
}

function buildRandomCartoonCaption(cartoon) {
	return `<b>${cartoon.title}</b>\nРейтинг: <i>${
		cartoon.vote_average?.toFixed(1) || '-'
	}</i>\n\n${
		cartoon.overview?.slice(0, 250) || 'Описание отсутствует'
	}...`;
}

async function replyWithCartoon(ctx, { photoUrl, caption, parseMode = 'HTML', replyMarkup }) {
	if (photoUrl) {
		try {
			await ctx.replyWithPhoto(photoUrl, {
				caption,
				parse_mode: parseMode,
				reply_markup: replyMarkup,
			});
			return;
		} catch (error) {
			console.error('Ошибка при отправке фото:', error.message);
		}
	}

	await ctx.reply(caption, {
		parse_mode: parseMode,
		reply_markup: replyMarkup,
	});
}

module.exports = {
	isPrivateChat,
	generateCartoonButtons,
	buildSettingsKeyboard,
	buildMovieSettingsKeyboard,
	buildRandomCartoonCaption,
	replyWithCartoon,
};
