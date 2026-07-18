const { Markup } = require('telegraf');
const {
	buildSettingsKeyboard,
	buildMovieSettingsKeyboard,
	generateCartoonButtons,
} = require('../helpers/botHelpers');

function registerCallbackHandler(
	bot,
	{
		handleAdminCallback,
		addLikedCartoon,
		addDislikedCartoon,
		toggleFavoriteCartoon,
		resetUserData,
		ADMIN_ID,
		REQUEST_LIMIT,
		LIMIT_RESET_INTERVAL_MS,
		PAYMENT_PROVIDER_TOKEN,
	},
) {
	bot.action('change_rating', async (ctx) => {
		await ctx.answerCbQuery();
		return ctx.scene.enter('ratingScene');
	});

	bot.action('change_languages', async (ctx) => {
		await ctx.answerCbQuery();
		return ctx.scene.enter('languageScene');
	});

	bot.action('change_countries', async (ctx) => {
		await ctx.answerCbQuery();
		return ctx.scene.enter('countriesScene');
	});

	bot.action('change_name', async (ctx) => {
		const user = ctx.state.user;
		user.step = 'ask_name';
		await user.save();
		await ctx.answerCbQuery();
		await ctx.reply('Введите новое имя:');
	});

	bot.action('change_age', async (ctx) => {
		const user = ctx.state.user;
		user.step = 'ask_age';
		await user.save();
		await ctx.answerCbQuery();
		await ctx.reply('Введите новый возраст:');
	});

	bot.action('reset_user_data', async (ctx) => {
		await resetUserData(ctx.state.user.telegramId);
		await ctx.answerCbQuery('Данные сброшены');
		await ctx.reply('Начинаем заново. Как зовут ребёнка?');
	});

	bot.on('callback_query', async (ctx) => {
		const user = ctx.state.user;
		const data = ctx.callbackQuery.data;

		const adminHandled = await handleAdminCallback(ctx);
		if (adminHandled) {
			return;
		}

		if (data.startsWith('like_')) {
			const id = parseInt(data.split('_')[1], 10);
			if (isNaN(id)) {
				return ctx.reply('Некорректный ID мультфильма.');
			}

			const updatedUser = await addLikedCartoon(user.telegramId, id);
			if (updatedUser) {
				try {
					await ctx.editMessageReplyMarkup(
						generateCartoonButtons(updatedUser, { id }),
					);
					await ctx.answerCbQuery('Добавлено в избранное ❤️');
				} catch (error) {
					console.warn(
						'Не удалось обновить кнопки после лайка:',
						error.message,
					);
				}
			} else {
				await ctx.reply('Уже нравится!');
			}
			return;
		}

		if (data.startsWith('dislike_')) {
			const id = parseInt(data.split('_')[1], 10);
			if (isNaN(id)) {
				return ctx.reply('Некорректный ID мультфильма.');
			}

			const updatedUser = await addDislikedCartoon(user.telegramId, id);
			if (updatedUser) {
				try {
					await ctx.editMessageReplyMarkup(
						generateCartoonButtons(updatedUser, { id }),
					);
				} catch (error) {
					console.warn(
						'⚠️ Не удалось обновить кнопки после дизлайка:',
						error.message,
					);
				}
			} else {
				await ctx.reply('Уже отмечен как неинтересный.');
			}
			return;
		}

		if (data.startsWith('togglefav_')) {
			const id = parseInt(data.split('_')[1], 10);
			if (isNaN(id)) {
				return ctx.reply('Некорректный ID мультфильма.');
			}

			const { user: updatedUser, added } = await toggleFavoriteCartoon(
				user.telegramId,
				id,
			);
			if (updatedUser) {
				try {
					await ctx.editMessageReplyMarkup(
						generateCartoonButtons(updatedUser, { id }),
					);
				} catch (error) {
					console.warn(
						'⚠️ Не удалось обновить кнопки после добавления/удаления из избранного:',
						error.message,
					);
				}

				await ctx.reply(
					added
						? '⭐ Добавлено в избранное!'
						: '⭐ Убрано из избранного!',
				);
			} else {
				await ctx.reply(
					'Произошла ошибка при обновлении избранного.',
				);
			}
			return;
		}

		switch (data) {
			case 'already_liked':
				await ctx.answerCbQuery('Фильм уже в избранном ❤️', {
					show_alert: true,
				});
				return;
			case 'already_disliked':
				await ctx.answerCbQuery('Фильм уже в черном списке 👎', {
					show_alert: true,
				});
				return;
			case 'check_limit': {
				if (user.requestCount < REQUEST_LIMIT) {
					await ctx.editMessageText(
						'🎉 Лимит уже доступен! Поиск снова работает.',
					);
					return;
				}

				const now = new Date();
				const timeSinceLastReset = now - new Date(user.lastResetAt);
				const msLeft = LIMIT_RESET_INTERVAL_MS - timeSinceLastReset;
				const hours = Math.floor(msLeft / (1000 * 60 * 60));
				const minutes = Math.floor(
					(msLeft % (1000 * 60 * 60)) / (1000 * 60),
				);
				const newText = `⏳ Осталось ${hours}ч ${minutes}м`;
				const keyboard = Markup.inlineKeyboard([
					[Markup.button.callback('Проверить снова', 'check_limit')],
					[
						Markup.button.callback(
							'Запросить увеличение лимита',
							'request_more',
						),
					],
					[Markup.button.callback('🎰 1 мультфильм за 5 ⭐️', 'buy_spin')],
				]);

				if (ctx.callbackQuery.message?.text !== newText) {
					await ctx.editMessageText(newText, keyboard);
					return;
				}

				await ctx.answerCbQuery('Время ещё не изменилось');
				return;
			}
			case 'request_more': {
				if (isNaN(ADMIN_ID)) {
					await ctx.reply(
						'Функция запроса лимита недоступна (не установлен ADMIN_ID).',
					);
					return;
				}

				const message =
					`📬 Пользователь @${ctx.from.username || 'Без ника'} (${
						ctx.from.id
					}) запросил увеличение лимита.\n\n` +
					`👶 Имя ребёнка: ${user.name || '—'}\n` +
					`🎂 Возраст: ${user.age || '—'}\n` +
					`📊 Текущее: ${user.requestCount}/${REQUEST_LIMIT}`;

				await ctx.answerCbQuery('Мы передали твой запрос!', {
					show_alert: true,
				});

				const markup = Markup.inlineKeyboard([
					[
						Markup.button.callback(
							'✅ Approve',
							`admin_approve_${ctx.from.id}`,
						),
						Markup.button.callback(
							'♾ Unlimit',
							`admin_unlimit_${ctx.from.id}`,
						),
					],
					[
						Markup.button.callback(
							'⛔️ Limit',
							`admin_limit_${ctx.from.id}`,
						),
						Markup.button.callback(
							'ℹ️ Get Info',
							`admin_get_${ctx.from.id}`,
						),
					],
				]);

				await ctx.telegram.sendMessage(ADMIN_ID, message, {
					reply_markup: markup.reply_markup,
				});
				return;
			}
			case 'buy_spin': {
				await ctx.answerCbQuery();
				if (!PAYMENT_PROVIDER_TOKEN) {
					await ctx.reply('Платежи временно недоступны.');
					return;
				}

				await ctx.replyWithInvoice(
					{
						title: 'Один спин',
						description: 'Запуск рандомного мультфильма',
						payload: 'spin_payload_' + ctx.from.id,
						provider_token: PAYMENT_PROVIDER_TOKEN,
						currency: 'XTR',
						prices: [{ label: '1 мультфильм', amount: 5 }],
					},
					Markup.inlineKeyboard([
						Markup.button.pay('1 мультфильм за 5 ⭐️'),
					]),
				);
				return;
			}
			case 'change_params':
				await ctx.reply(
					`Отлично, ${user.name}. Введите новые параметры поиска мультфильмов:\n\n` +
						`1️⃣ Жанр (по умолчанию: Мультфильм)\n` +
						`2️⃣ Минимальный рейтинг (по умолчанию: 5)\n` +
						`3️⃣ Исключить оригинальные языки (по умолчанию: японский)\n` +
						`4️⃣ Страны сертификации (по умолчанию: UA, RU)\n`,
					buildMovieSettingsKeyboard(),
				);
				return;
			default:
				console.warn(`Получен неизвестный callback query: ${data}`);
				await ctx.answerCbQuery('Действие недоступно');
		}
	});
}

module.exports = { registerCallbackHandler };
