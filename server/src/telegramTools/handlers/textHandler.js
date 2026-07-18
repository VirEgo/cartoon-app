const { Markup } = require('telegraf');
const {
	buildSettingsKeyboard,
	buildRandomCartoonCaption,
	generateCartoonButtons,
	replyWithCartoon,
} = require('../helpers/botHelpers');

function registerTextHandler(
	bot,
	{
		getKeyboardForUser,
		resetUserData,
		getCartoonDetails,
		getPosterUrl,
		fetchRandomCartoonImproved,
		ADMIN_ID,
		REQUEST_LIMIT,
		LIMIT_RESET_INTERVAL_MS,
	},
) {
	bot.on('text', async (ctx) => {
		const user = ctx.state.user;
		const text = ctx.message.text;

		async function deleteMenuTriggerMessage() {
			if (!ctx.chat || !ctx.message?.message_id) {
				return;
			}

			try {
				await ctx.deleteMessage(ctx.message.message_id);
			} catch (error) {
				console.warn(
					'Не удалось удалить сообщение пользователя:',
					error.message,
				);
			}
		}

		switch (text) {
			case '✏️ Сменить имя':
				user.step = 'ask_name';
				await user.save();
				await ctx.reply('Введите новое имя:', Markup.removeKeyboard());
				return;
			case '📅 Сменить возраст':
				user.step = 'ask_age';
				await user.save();
				await ctx.reply('Введите новый возраст:', Markup.removeKeyboard());
				return;
			case '🔄 Сбросить данные':
			case '🔄 Сбросить всё':
				await resetUserData(user.telegramId);
				await ctx.reply('Начинаем заново. Как зовут ребёнка?');
				return;
			case '⚙️ Настройки':
				await ctx.reply(
					`Отлично, ${user.name || 'друг'}. Выберите, что изменить:`,
					buildSettingsKeyboard(),
				);
				return;
			case '⭐ Избранное':
				if (
					!user.favoriteCartoonIds ||
					user.favoriteCartoonIds.length === 0
				) {
					await ctx.reply('У тебя пока нет избранных мультфильмов.');
					return;
				}

				try {
					const details = await Promise.all(
						user.favoriteCartoonIds.map((id) => getCartoonDetails(id)),
					);
					const valid = details.filter(Boolean);

					if (!valid.length) {
						await ctx.reply('Не удалось загрузить избранное.');
						return;
					}

					const media = valid.slice(0, 10).map((cartoon) => ({
						type: 'photo',
						media:
							getPosterUrl(cartoon.poster_path) ||
							'https://placehold.co/500x750/000000/FFFFFF?text=No+Poster',
						caption: `<b>${cartoon.title}</b>\n\n${
							cartoon.overview?.slice(0, 200) || 'Описание отсутствует'
						}...`,
						parse_mode: 'HTML',
					}));

					try {
						await ctx.replyWithMediaGroup(media);
					} catch (error) {
						console.error(
							'Ошибка при отправке медиа-группы:',
							error.message,
						);

						for (const item of media) {
							await ctx.replyWithPhoto(item.media, {
								caption: item.caption,
								parse_mode: 'HTML',
							});
						}
					}
				} catch (error) {
					console.error('Ошибка при загрузке избранного:', error);
					await ctx.reply(
						'Произошла ошибка при загрузке избранного.',
					);
				}
				return;
			case 'ℹ️ Мой профиль':
				await ctx.reply(
					`👶 Имя: ${user.name || 'не указано'}\n🎂 Возраст: ${
						user.age || 'не указан'
					}`,
				);
				return;
			case '🎲 Мультфильм':
				await deleteMenuTriggerMessage();

				if (user.step !== 'done') {
					await ctx.reply('Сначала заполни анкету. Введи /start.');
					return;
				}

				if (!user.isUnlimited) {
					if (user.requestCount >= REQUEST_LIMIT) {
						const timeSinceLastReset =
							new Date() - new Date(user.lastResetAt);
						const msLeft = LIMIT_RESET_INTERVAL_MS - timeSinceLastReset;
						const hours = Math.floor(msLeft / (1000 * 60 * 60));
						const minutes = Math.floor(
							(msLeft % (1000 * 60 * 60)) / (1000 * 60),
						);

						await ctx.reply(
							`⏳ Ты исчерпал лимит. Следующий доступ будет через ${hours}ч ${minutes}м.`,
							Markup.inlineKeyboard([
								Markup.button.callback('🔄 Проверить', 'check_limit'),
								Markup.button.callback(
									'📩 Запросить увеличение лимита',
									'request_more',
								),
							]),
						);
						return;
					}
				}

				try {
					const cartoon = await fetchRandomCartoonImproved(
						user.age,
						user.seenCartoonIds,
						user.dislikedCartoonIds,
						user.movieFilter.minVoteAverage,
					);

					if (!cartoon) {
						await ctx.reply(
							'Не удалось найти мультфильм, который вы еще не видели.\n\n' +
								'Попробуйте изменить параметры поиска или запросить больше мультфильмов.\n' +
								'Вы можете изменить возраст ребенка для расширения поисковых возможностей.',
							Markup.inlineKeyboard([
								Markup.button.callback(
									'Изменить параметры поиска',
									'change_params',
								),
							]),
						);
						return;
					}

					if (!user.seenCartoonIds.includes(cartoon.id)) {
						user.seenCartoonIds.push(cartoon.id);
						await user.save();
					}

					await replyWithCartoon(ctx, {
						photoUrl: getPosterUrl(cartoon.poster_path),
						caption: buildRandomCartoonCaption(cartoon),
						replyMarkup: generateCartoonButtons(user, cartoon),
					});

					if (!user.isUnlimited) {
						user.requestCount++;
						await user.save();
					}
				} catch (error) {
					console.error(
						'❌ Общая ошибка при поиске мультфильма:',
						error,
					);
					await ctx.reply('Произошла ошибка при поиске мультфильма.');
				}
				return;
			case '📢 Отправить сообщение всем пользователям':
				if (user.telegramId !== ADMIN_ID) {
					await ctx.reply('Эта команда доступна только администратору.');
					return;
				}

				await ctx.scene.enter('broadcast');
				return;
			default:
				if (user.step === 'ask_name') {
					user.name = text.trim();
					user.step = 'ask_age';
					await user.save();
					await ctx.reply(
						`Отлично, ${user.name}! Сколько лет ребёнку?`,
					);
					return;
				}

				if (user.step === 'ask_age') {
					const age = parseInt(text.trim(), 10);
					if (isNaN(age) || age < 1 || age > 12) {
						await ctx.reply('Введите возраст числом от 1 до 12.');
						return;
					}

					user.age = age;
					user.step = 'done';
					await user.save();

					await ctx.reply(
						'Готово! Используй меню ниже:',
						getKeyboardForUser(ctx),
					);
					return;
				}

				await ctx.reply(
					'Неизвестная команда. Используй кнопки меню или /start.',
				);
		}
	});
}

module.exports = { registerTextHandler };
