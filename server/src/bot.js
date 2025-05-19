const { Telegraf, Markup } = require('telegraf');
const {
	TELEGRAM_BOT_TOKEN,
	ADMIN_ID,
	REQUEST_LIMIT,
	LIMIT_RESET_INTERVAL_MS,
} = require('./config/config');
const {
	findOrCreateUser,
	updateUser,
	resetRequestLimit,
	toggleUnlimitedAccess,
	getUserInfo,
	addLikedCartoon,
	addDislikedCartoon,
	toggleFavoriteCartoon,
	resetUserData,
} = require('./services/user');
const {
	fetchRandomCartoonImproved,
	getCartoonDetails,
	getPosterUrl,
} = require('./services/tmdb');

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const userActionTimestamps = new Map(); // Хранит временные метки действий пользователей
function limitUserActions({
	generalLimitMs = 5 * 60 * 1000,
	cartoonLimitMs = 3000,
} = {}) {
	return async (ctx, next) => {
		const userId = ctx.from?.id;
		if (!userId) return next();

		const now = Date.now();
		const text = ctx.message?.text?.trim();
		const isCartoonRequest =
			text === '🎲 Мультфильм' ||
			text === '/random' ||
			ctx.callbackQuery?.data === 'random';

		const lastTimes = userActionTimestamps.get(userId) || {
			general: 0,
			cartoon: 0,
		};

		if (isCartoonRequest) {
			if (now - lastTimes.cartoon < cartoonLimitMs) {
				await ctx.reply('⏳ Подожди пару секунд перед следующим мультфильмом.');
				return;
			}
			lastTimes.cartoon = now;
		} else {
			if (now - lastTimes.general < generalLimitMs) {
				await ctx.answerCbQuery?.('⏳ Подожди немного перед повтором.', {
					show_alert: false,
				});
				return;
			}
			lastTimes.general = now;
		}

		userActionTimestamps.set(userId, lastTimes);
		await next();
	};
}

// Middleware для логирования и получения пользователя

bot.use(limitUserActions());
bot.use(async (ctx, next) => {
	const chatId = ctx.chat?.id || ctx.from?.id;
	const username = ctx.from?.username;
	if (chatId) {
		ctx.state.user = await findOrCreateUser(chatId, username);
	}
	console.log(
		`🤖 ${new Date().toISOString()} User ${chatId} (${
			username || 'no_username'
		}) - ${ctx.message?.text || ctx.callbackQuery?.data}`,
	);
	await next();
});

/**
 * Генерирует основную клавиатуру для пользователя.
 * @returns {object} - Объект разметки клавиатуры Telegraf.
 */
function getMainKeyboard() {
	return Markup.keyboard([
		['🎲 Мультфильм'],
		['ℹ️ Мой профиль', '⭐ Избранное'],
		// ['✏️ Сменить имя', '📅 Сменить возраст'],
		// ['🔄 Сбросить всё'],
	]).resize();
}

/**
 * Генерирует инлайн-кнопки для мультфильма.
 * @param {object} user - Объект пользователя.
 * @param {object} cartoon - Объект мультфильма.
 * @returns {object} - Объект разметки инлайн-клавиатуры Telegraf.
 */
function generateCartoonButtons(user, cartoon) {
	const alreadyLiked = user.likedCartoonIds?.includes(cartoon.id);
	const alreadyInFav = user.favoriteCartoonIds?.includes(cartoon.id);
	const alreadyDisliked = user.dislikedCartoonIds?.includes(cartoon.id);

	const likeButton = alreadyLiked
		? Markup.button.callback('❤️ Уже нравится', 'already_liked')
		: Markup.button.callback('❤️ Нравится', `like_${cartoon.id}`);

	const dislikeButton = alreadyDisliked
		? Markup.button.callback('👎 Уже не нравится', 'already_disliked')
		: Markup.button.callback('👎 Не нравится', `dislike_${cartoon.id}`);

	const favButton = Markup.button.callback(
		alreadyInFav ? '⭐ Убрать из избранного' : '⭐ В избранное',
		`togglefav_${cartoon.id}`,
	);

	return Markup.inlineKeyboard([[likeButton, dislikeButton], [favButton]])
		.reply_markup;
}

// --- Обработчики команд ---
bot.start(async (ctx) => {
	const user = ctx.state.user;

	if (!user.name || !user.age) {
		user.step = 'ask_name';
		await user.save();
		ctx.reply('Привет! Давай подберём тебе мультфильм.\nКак зовут ребёнка?');
		return;
	}

	user.step = 'done';
	await user.save();
	ctx.reply(
		`Привет снова, ${user.name}! Готов подобрать мультфильм?`,
		getMainKeyboard(),
	);
});

// Команды администратора
bot.command('approve', async (ctx) => {
	if (ctx.from.id !== ADMIN_ID) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (isNaN(targetId))
		return ctx.reply('Нужно указать Telegram ID пользователя.');

	const user = await resetRequestLimit(targetId);
	if (!user) return ctx.reply('Пользователь не найден.');

	await ctx.reply(`✅ Лимит сброшен для ${targetId}`);
	await ctx.telegram.sendMessage(
		targetId,
		'🎉 Твой лимит был обновлён администратором. Можешь снова искать мультфильмы!',
	);
});

bot.command('unlimit', async (ctx) => {
	if (ctx.from.id !== ADMIN_ID) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (isNaN(targetId))
		return ctx.reply('Нужно указать Telegram ID пользователя.');

	const user = await toggleUnlimitedAccess(targetId, true);
	if (!user) return ctx.reply('Пользователь не найден.');

	await ctx.reply(`♾ Пользователь ${targetId} теперь безлимитный.`);
	await ctx.telegram.sendMessage(
		targetId,
		'✨ Администратор дал тебе безлимитный доступ!',
	);
});

bot.command('limit', async (ctx) => {
	if (ctx.from.id !== ADMIN_ID) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (isNaN(targetId))
		return ctx.reply('Нужно указать Telegram ID пользователя.');

	const user = await toggleUnlimitedAccess(targetId, false);
	if (!user) return ctx.reply('Пользователь не найден.');

	await ctx.reply(`⛔️ Убран безлимит у ${targetId}.`);
	await ctx.telegram.sendMessage(targetId, '⛔️ Безлимитный доступ отключён.');
});

bot.command('get', async (ctx) => {
	if (ctx.from.id !== ADMIN_ID) return;

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

// --- Обработчики текстовых сообщений ---
bot.on('text', async (ctx) => {
	const user = ctx.state.user;
	const text = ctx.message.text;

	// Обработка команд из главного меню
	switch (text) {
		case '✏️ Сменить имя':
			user.step = 'ask_name';
			await user.save();
			ctx.reply('Введите новое имя:', Markup.removeKeyboard());
			return;
		case '📅 Сменить возраст':
			user.step = 'ask_age';
			await user.save();
			ctx.reply('Введите новый возраст:', Markup.removeKeyboard());
			return;
		case '🔄 Сбросить всё':
			await resetUserData(user.telegramId);
			ctx.reply('Начинаем заново. Как зовут ребёнка?');
			return;
		case '⭐ Избранное':
			if (!user.favoriteCartoonIds || user.favoriteCartoonIds.length === 0) {
				ctx.reply('У тебя пока нет избранных мультфильмов.');
				return;
			}
			try {
				// Получаем детали мультфильмов из избранного
				const details = await Promise.all(
					user.favoriteCartoonIds.map((id) => getCartoonDetails(id)),
				);

				const valid = details.filter(Boolean); // Отфильтровываем неудачные запросы
				if (!valid.length) {
					ctx.reply('Не удалось загрузить избранное.');
					return;
				}

				// Формируем медиа-группу для отправки постеров
				const media = valid.slice(0, 10).map((c) => ({
					type: 'photo',
					media:
						getPosterUrl(c.poster_path) ||
						'https://placehold.co/500x750/000000/FFFFFF?text=No+Poster', // Заглушка на случай отсутствия постера
					caption: `<b>${c.title}</b>\n\n${
						c.overview?.slice(0, 200) || 'Описание отсутствует'
					}...`, // Ограничиваем длину описания
					parse_mode: 'HTML',
				}));

				// Отправляем медиа-группу или отдельные фото, если группа не поддерживается
				try {
					await ctx.replyWithMediaGroup(media);
				} catch (e) {
					console.error('❌ Ошибка при отправке медиа-группы:', e.message);
					// Отправляем по одному, если медиа-группа не работает (например, слишком много фото)
					for (const item of media) {
						await ctx.replyWithPhoto(item.media, {
							caption: item.caption,
							parse_mode: 'HTML',
						});
					}
				}
			} catch (e) {
				console.error('❌ Ошибка при загрузке избранного:', e);
				ctx.reply('Произошла ошибка при загрузке избранного.');
			}
			return;
		case 'ℹ️ Мой профиль':
			ctx.reply(
				`👶 Имя: ${user.name || 'не указано'}\n🎂 Возраст: ${
					user.age || 'не указан'
				}`,
			);
			return;
		case '🎲 Мультфильм':
			if (user.step !== 'done') {
				ctx.reply('Сначала заполни анкету. Введи /start.');
				return;
			}

			// Проверка лимита запросов
			if (!user.isUnlimited) {
				const now = new Date();
				const timeSinceLastReset = now - new Date(user.lastResetAt);

				// Сбрасываем лимит, если прошло более 12 часов
				if (timeSinceLastReset > LIMIT_RESET_INTERVAL_MS) {
					user.requestCount = 0;
					user.lastResetAt = now;
					await user.save();
					await ctx.reply('🎉 Лимит обновлён! Поиск снова доступен.');
				}

				if (user.requestCount >= REQUEST_LIMIT) {
					const msLeft = LIMIT_RESET_INTERVAL_MS - timeSinceLastReset;
					const hours = Math.floor(msLeft / (1000 * 60 * 60));
					const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

					return ctx.reply(
						`⏳ Ты исчерпал лимит. Следующий доступ будет через ${hours}ч ${minutes}м.`,
						Markup.inlineKeyboard([
							Markup.button.callback('🔄 Проверить', 'check_limit'),
							Markup.button.callback(
								'📩 Запросить увеличение лимита',
								'request_more',
							),
						]),
					);
				}
			}

			// Получаем случайный мультфильм
			try {
				// Возраст для поиска может быть немного больше возраста ребенка
				const searchAge = Math.min(user.age + 2, 12); // Ограничиваем максимальный возраст поиска
				const cartoon = await fetchRandomCartoonImproved(
					searchAge,
					user.seenCartoonIds,
					user.dislikedCartoonIds,
				);

				if (!cartoon) {
					await ctx.reply(
						'Не удалось найти мультфильм, который вы еще не видели.',
					);
					return;
				}

				// Добавляем мультфильм в список просмотренных (если его там еще нет)
				if (!user.seenCartoonIds.includes(cartoon.id)) {
					user.seenCartoonIds.push(cartoon.id);
					await user.save(); // Сохраняем сразу после добавления в seen
				}

				const photoUrl = getPosterUrl(cartoon.poster_path);
				const caption = `<b>${cartoon.title}</b>\nРейтинг: <i>${
					cartoon.vote_average?.toFixed(1) || '-'
				}</i>\n\n${
					cartoon.overview?.slice(0, 250) || 'Описание отсутствует'
				}...`;

				const replyMarkup = generateCartoonButtons(user, cartoon);
				if (photoUrl) {
					try {
						await ctx.replyWithPhoto(photoUrl, {
							caption,
							parse_mode: 'HTML',
							reply_markup: replyMarkup,
						});
					} catch (e) {
						console.error('❌ Ошибка при отправке фото:', e.message);
						// Если отправка фото не удалась, отправляем только текст
						await ctx.reply(caption, {
							parse_mode: 'HTML',
							reply_markup: replyMarkup,
						});
					}
				} else {
					// Если нет постера, отправляем только текст
					await ctx.reply(caption, {
						parse_mode: 'HTML',
						reply_markup: replyMarkup,
					});
				}

				// Увеличиваем счетчик запросов (только если не безлимит)
				if (!user.isUnlimited) {
					user.requestCount++;
					await user.save(); // Сохраняем после увеличения счетчика
				}
			} catch (err) {
				console.error('❌ Общая ошибка при поиске мультфильма:', err);
				await ctx.reply('Произошла ошибка при поиске мультфильма.');
			}

			return;
		default:
			// Обработка шагов анкетирования
			if (user.step === 'ask_name') {
				user.name = text.trim(); // Удаляем пробелы по краям
				user.step = 'ask_age';
				await user.save();
				ctx.reply(`Отлично, ${user.name}! Сколько лет ребёнку?`);
				return;
			}

			if (user.step === 'ask_age') {
				const age = parseInt(text.trim());
				if (isNaN(age) || age < 1 || age > 12) {
					ctx.reply('Введите возраст числом от 1 до 12.');
					return;
				}

				user.age = age;
				user.step = 'done';
				await user.save();

				await ctx.reply(
					`✅ Возраст успешно изменён на ${age}\n\n⬇️ Готово! Используй меню ниже:`,
					getMainKeyboard(),
				);
				return;
			}

			// Если ни одна из команд или шагов не совпала
			ctx.reply('Неизвестная команда. Используй кнопки меню или /start.');
			break;
	}
});

// --- Обработчики callback query ---
bot.on('callback_query', async (ctx) => {
	const user = ctx.state.user;
	const data = ctx.callbackQuery.data;
	// Отвечаем на callback query, чтобы убрать "часики"
	await ctx.answerCbQuery();

	// Обработка админских callback query
	if (data.startsWith('admin_')) {
		if (ctx.from.id !== ADMIN_ID) {
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
					await ctx.editMessageText(`✅ Лимит сброшен для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'🎉 Администратор обновил твой лимит. Приятного просмотра!',
					);
					break;
				case 'unlimit':
					await toggleUnlimitedAccess(targetId, true);
					await ctx.reply(`♾ Безлимит включен для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'✨ Администратор дал тебе безлимитный доступ!',
					);
					break;
				case 'limit':
					await toggleUnlimitedAccess(targetId, false);
					await ctx.reply(`⛔️ Безлимит отключён для ${targetId}`);
					await ctx.telegram.sendMessage(
						targetId,
						'⛔️ Безлимитный доступ отключён.',
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
			console.error('❌ Ошибка в админской команде:', error);
			ctx.reply('Произошла ошибка при выполнении админской команды.');
		}
		return;
	}

	// Обработка callback query для мультфильмов
	if (data.startsWith('like_')) {
		const id = parseInt(data.split('_')[1]);
		if (isNaN(id)) return ctx.reply('Некорректный ID мультфильма.');

		const updatedUser = await addLikedCartoon(user.telegramId, id);
		if (updatedUser) {
			// Обновляем кнопки, чтобы показать, что мультфильм уже понравился
			try {
				await ctx.editMessageReplyMarkup(
					generateCartoonButtons(updatedUser, { id }),
				);
			} catch (e) {
				console.warn('⚠️ Не удалось обновить кнопки после лайка:', e.message);
				// Игнорируем ошибку, если сообщение не может быть изменено (например, слишком старое)
			}
		} else {
			// Если updatedUser null, значит мультфильм уже был в likedCartoonIds
			ctx.reply('Уже нравится!');
		}
		return;
	}

	if (data.startsWith('dislike_')) {
		const id = parseInt(data.split('_')[1]);
		if (isNaN(id)) return ctx.reply('Некорректный ID мультфильма.');

		const updatedUser = await addDislikedCartoon(user.telegramId, id);
		if (updatedUser) {
			// Обновляем кнопки
			try {
				await ctx.editMessageReplyMarkup(
					generateCartoonButtons(updatedUser, { id }),
				);
			} catch (e) {
				console.warn(
					'⚠️ Не удалось обновить кнопки после дизлайка:',
					e.message,
				);
			}
		} else {
			ctx.reply('Уже отмечен как неинтересный.');
		}
		return;
	}

	if (data.startsWith('togglefav_')) {
		const id = parseInt(data.split('_')[1]);
		if (isNaN(id)) return ctx.reply('Некорректный ID мультфильма.');

		const { user: updatedUser, added } = await toggleFavoriteCartoon(
			user.telegramId,
			id,
		);
		if (updatedUser) {
			// Обновляем кнопки
			try {
				await ctx.editMessageReplyMarkup(
					generateCartoonButtons(updatedUser, { id }),
				);
			} catch (e) {
				console.warn(
					'⚠️ Не удалось обновить кнопки после добавления/удаления из избранного:',
					e.message,
				);
			}
			ctx.reply(
				added ? '⭐ Добавлено в избранное!' : '⭐ Убрано из избранного!',
			);
		} else {
			ctx.reply('Произошла ошибка при обновлении избранного.');
		}
		return;
	}

	// Обработка других callback query
	switch (data) {
		case 'already_liked':
			ctx.reply('Фильм уже в избранном ❤️');
			break;
		case 'already_disliked':
			ctx.reply('Фильм уже в черном списке 👎');
			break;
		case 'check_limit':
			const now = new Date();
			const timeSinceLastReset = now - new Date(user.lastResetAt);

			if (timeSinceLastReset > LIMIT_RESET_INTERVAL_MS) {
				// Сбрасываем лимит и обновляем сообщение
				await resetRequestLimit(user.telegramId);
				await ctx.editMessageText('🎉 Лимит обнулён! Поиск снова доступен.');
			} else {
				const msLeft = LIMIT_RESET_INTERVAL_MS - timeSinceLastReset;
				const hours = Math.floor(msLeft / (1000 * 60 * 60));
				const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

				const newText = `⏳ Осталось ${hours}ч ${minutes}м`;

				// Проверяем, изменился ли текст, чтобы избежать ошибки редактирования
				if (ctx.callbackQuery.message?.text !== newText) {
					await ctx.editMessageText(newText, {
						reply_markup: Markup.inlineKeyboard([
							[Markup.button.callback('🔄 Проверить снова', 'check_limit')],
							[
								Markup.button.callback(
									'📩 Запросить увеличение лимита',
									'request_more',
								),
							],
						]),
					});
				} else {
					// Если текст не изменился, просто отвечаем на callback query
					// ctx.answerCbQuery('⏳ Время ещё не изменилось'); // Уже ответили в начале
				}
			}
			break;
		case 'request_more':
			if (isNaN(ADMIN_ID)) {
				ctx.reply(
					'Функция запроса лимита недоступна (не установлен ADMIN_ID).',
				);
				return;
			}
			const msg =
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
					Markup.button.callback('✅ Approve', `admin_approve_${ctx.from.id}`),
					Markup.button.callback('♾ Unlimit', `admin_unlimit_${ctx.from.id}`),
				],
				[
					Markup.button.callback('⛔️ Limit', `admin_limit_${ctx.from.id}`),
					Markup.button.callback('ℹ️ Get Info', `admin_get_${ctx.from.id}`),
				],
			]);
			await ctx.telegram.sendMessage(ADMIN_ID, msg, {
				reply_markup: markup.reply_markup,
			});
			break;
		default:
			// Неизвестный callback query
			console.warn(`⚠️ Получен неизвестный callback query: ${data}`);
			// Можно ответить пользователю или просто проигнорировать
			// ctx.reply('Неизвестное действие.');
			break;
	}
});

bot.catch((err, ctx) => {
	console.error(`❌ Ошибка для @${ctx.from?.username || 'unknown user'}:`, err);
	ctx.reply('Произошла внутренняя ошибка. Попробуйте позже.');
});

module.exports = bot;
