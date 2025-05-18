require('dotenv').config();
const User = require('./models/User');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const app = express();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

app.use(cors());
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log('✅ Подключено к MongoDB');
	})
	.catch((err) => {
		console.error('❌ Ошибка подключения к MongoDB:', err);
	});

const ADMIN_ID = process.env.ADMIN_ID;
const PORT = process.env.PORT || 3001;
const TMDB_URL = 'https://api.themoviedb.org/3/discover/movie';

function getMainKeyboard() {
	return {
		keyboard: [
			['🎲 Мультфильм'],
			['ℹ️ Мой профиль', '⭐ Избранное'],
			['✏️ Сменить имя', '📅 Сменить возраст'],
			['🔄 Сбросить всё'],
		],
		resize_keyboard: true,
	};
}

async function fetchRandomCartoon(age = 5, seenIds = [], dislikedIds = []) {
	const randomPage = Math.floor(Math.random() * 5) + 1;
	const res = await axios.get(TMDB_URL, {
		params: {
			api_key: process.env.TMDB_API_KEY,
			with_genres: 16,
			language: 'ru',
			include_adult: false,
			'vote_average.gte': 6, // исключим плохие мультфильмы
			region: 'UA',
			page: randomPage,
			certification_country: 'UA',
			'certification.lte': 'G',
		},
	});

	const all = res.data.results;
	const filtered = all.filter(
		(c) => !seenIds.includes(c.id) && !dislikedIds.includes(c.id),
	);

	const usable = filtered.length ? filtered : all;
	// Выбрать один случайный мультфильм
	const random = usable[Math.floor(Math.random() * usable.length)];

	return random;
}

function generateButtons(user, cartoon) {
	const alreadyLiked = user.likedCartoonIds?.includes(cartoon.id);
	const alreadyInFav = user.favoriteCartoonIds?.includes(cartoon.id);
	return {
		inline_keyboard: [
			[
				{
					text: '❤️ Нравится',
					callback_data: `like_${cartoon.id}`,
					// отключим, если уже лайк
					...(alreadyLiked && {
						callback_data: 'already_liked',
						text: '❤️ Уже нравится',
						disabled: true,
					}),
				},
				{
					text: '👎 Не нравится',
					callback_data: `dislike_${cartoon.id}`,
					...(alreadyInFav && {
						callback_data: 'already_liked',
						text: '👎 Уже не нравится',
						disabled: true,
					}),
				},
			],
			[{ text: '⭐ В избранное', callback_data: `fav_${cartoon.id}` }],
		],
	};
}

// API для фронта
app.get('/api/random-cartoon', async (req, res) => {
	try {
		const cartoon = await fetchRandomCartoon();
		res.json(cartoon);
	} catch (err) {
		res.status(500).json({ error: 'Ошибка при получении мультфильма' });
	}
});

// Telegram логика
bot.start(async (ctx) => {
	const chatId = ctx.chat.id;
	let user = await User.findOne({ telegramId: chatId });

	if (!user) {
		user = new User({
			telegramId: chatId,
			step: 'ask_name',
		});
		await user.save();
		ctx.reply('Привет! Давай подберём тебе мультфильм.\nКак зовут ребёнка?');
		return;
	}

	if (!user.name || !user.age) {
		user.step = 'ask_name';
		await user.save();
		ctx.reply('Давай продолжим анкету. Как зовут ребёнка?');
		return;
	}
	user.step = 'done';
	await user.save();
	ctx.reply(`Привет снова, ${user.name}! Готов подобрать мультфильм?`, {
		reply_markup: getMainKeyboard(),
	});
});

bot.command('approve', async (ctx) => {
	if (parseInt(ctx.from.id) !== parseInt(ADMIN_ID)) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (!targetId) return ctx.reply('Нужно указать Telegram ID');

	const user = await User.findOne({ telegramId: targetId });
	if (!user) return ctx.reply('Пользователь не найден');

	user.requestCount = 0;
	user.lastResetAt = new Date();
	await user.save();

	await ctx.reply(`✅ Лимит сброшен для ${targetId}`);
	await bot.telegram.sendMessage(
		targetId,
		'🎉 Твой лимит был обновлён администратором. Можешь снова искать мультфильмы!',
	);
});

bot.command('unlimit', async (ctx) => {
	if (parseInt(ctx.from.id) !== parseInt(ADMIN_ID)) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (!targetId) return ctx.reply('Нужно указать Telegram ID');

	const user = await User.findOne({ telegramId: targetId });
	if (!user) return ctx.reply('Пользователь не найден');

	user.isUnlimited = true;
	await user.save();

	await ctx.reply(`♾ Пользователь ${targetId} теперь безлимитный`);
});

bot.command('limit', async (ctx) => {
	if (parseInt(ctx.from.id) !== parseInt(ADMIN_ID)) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (!targetId) return ctx.reply('Нужно указать Telegram ID');

	const user = await User.findOne({ telegramId: targetId });
	if (!user) return ctx.reply('Пользователь не найден');

	user.isUnlimited = false;
	await user.save();

	await ctx.reply(`⛔️ Убран безлимит у ${targetId}`);
});

bot.command('get', async (ctx) => {
	if (parseInt(ctx.from.id) !== parseInt(ADMIN_ID)) return;

	const args = ctx.message.text.split(' ');
	const targetId = parseInt(args[1]);
	if (!targetId) return ctx.reply('Нужно указать Telegram ID');

	const user = await User.findOne({ telegramId: targetId });
	if (!user) return ctx.reply('Пользователь не найден');

	await ctx.reply(
		`👤 Пользователь @${user.username || 'неизвестно'} (${targetId})\n` +
			`Имя: ${user.name || '-'}\nВозраст: ${user.age || '-'}\n` +
			`Запросов: ${user.requestCount}/10\n` +
			`Безлимит: ${user.isUnlimited ? 'Да' : 'Нет'}`,
	);
});

bot.on('text', async (ctx) => {
	const chatId = ctx.chat.id;
	let user = await User.findOne({ telegramId: chatId });
	if (!user) {
		user = new User({ telegramId: chatId });
		await user.save();
	}

	const text = ctx.message.text;

	if (text === '✏️ Сменить имя') {
		user.step = 'ask_name';
		ctx.reply('Введите новое имя:', {
			reply_markup: {
				remove_keyboard: true,
			},
		});
		await user.save();
		return;
	}
	if (text === '📅 Сменить возраст') {
		user.step = 'ask_age';
		ctx.reply('Введите новый возраст:', {
			reply_markup: {
				remove_keyboard: true,
			},
		});
		await user.save();
		return;
	}
	if (text === '🔄 Сбросить всё') {
		user.name = null;
		user.age = null;
		user.seenCartoonIds = [];
		user.step = 'ask_name';
		await user.save();
		ctx.reply('Начинаем заново. Как зовут ребёнка?');
		return;
	}
	if (text === '⭐ Избранное') {
		if (!user.favoriteCartoonIds || user.favoriteCartoonIds.length === 0) {
			ctx.reply('У тебя пока нет избранных мультфильмов.');
			return;
		}
		try {
			const details = await Promise.all(
				user.favoriteCartoonIds.map((id) =>
					axios
						.get(`https://api.themoviedb.org/3/movie/${id}`, {
							params: {
								api_key: process.env.TMDB_API_KEY,
								language: 'ru',
							},
						})
						.then((res) => res.data)
						.catch(() => null),
				),
			);

			const valid = details.filter(Boolean);
			if (!valid.length) {
				ctx.reply('Не удалось загрузить избранное.');
				return;
			}

			const media = valid.slice(0, 10).map((c) => ({
				type: 'photo',
				media: `https://image.tmdb.org/t/p/w500${c.poster_path}`,
				caption: `${c.title}\n\n${c.overview?.slice(0, 150)}...`,
			}));

			await ctx.replyWithMediaGroup(media);
		} catch (e) {
			console.error(e);
			ctx.reply('Ошибка при загрузке избранного.');
		}
		return;
	}
	if (text === 'ℹ️ Мой профиль') {
		ctx.reply(
			`👶 Имя: ${user.name || 'не указано'}\n🎂 Возраст: ${
				user.age || 'не указан'
			}`,
		);
		return;
	}
	if (text === '🎲 Мультфильм') {
		if (user.step !== 'done') {
			ctx.reply('Сначала заполни анкету. Введи /start.');
			return;
		}
		if (!user.isUnlimited) {
			const now = new Date();
			const resetTime = 12 * 60 * 60 * 1000; // 12 часов в мс
			if (!user.lastResetAt) {
				user.lastResetAt = now;
				user.requestCount = 0;
			}

			const timeSinceReset = now - user.lastResetAt;
			if (timeSinceReset > resetTime) {
				user.lastResetAt = now;
				user.requestCount = 0;
				await user.save();

				await ctx.reply('🎉 Лимит обновлён! Поиск снова доступен.');
			}

			if (user.requestCount === 8) {
				await ctx.reply(
					'⚠️ У тебя осталось 2 попытки. Потом нужно будет подождать 12 часов.',
				);
			}

			if (user.requestCount >= 10) {
				const msLeft = resetTime - timeSinceReset;
				const hours = Math.floor(msLeft / (1000 * 60 * 60));
				const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);

				return ctx.reply(
					`⏳ Ты исчерпал лимит. Следующий доступ будет через ${hours}ч ${minutes}м.`,
					{
						reply_markup: {
							inline_keyboard: [
								[{ text: '🔄 Проверить', callback_data: 'check_limit' }],
							],
						},
					},
				);
			}
			// увеличиваем счётчик
			user.requestCount++;
			await user.save();
		}

		const age = Math.min(user.age + 2, 8);
		const seen = user.seenCartoonIds || [];
		const disliked = user.dislikedCartoonIds || [];

		try {
			const cartoon = await fetchRandomCartoon(age, seen, disliked);

			if (!cartoon) {
				await ctx.reply('Не удалось найти мультфильм.');
				return;
			}

			if (!seen.includes(cartoon.id)) {
				seen.push(cartoon.id);
				await user.updateOne({ seenCartoonIds: seen });
			}

			await user.updateOne({ seenCartoonIds: seen });
			// Проверка на наличие постера
			const photoUrl = cartoon.poster_path
				? `https://image.tmdb.org/t/p/w500${cartoon.poster_path}`
				: null;

			const caption = `<b>${cartoon.title}</b>\n\n Рейтинг: <b>${cartoon.vote_average}</b>\n\n ${cartoon.overview}\n\n <a href="https://www.themoviedb.org/movie/${cartoon.id}">TMDB</a>\n\n Страна: <b>${cartoon.original_language}</b>\n\n Год: <b>${cartoon.release_date}`;

			if (photoUrl) {
				await ctx.replyWithPhoto(photoUrl, {
					caption,
					parse_mode: 'HTML',
					reply_markup: generateButtons(user, cartoon),
				});
			} else {
				await ctx.reply(caption, {
					parse_mode: 'HTML',
					reply_markup: generateButtons(user, cartoon),
				});
			}
		} catch (err) {
			console.error(err);
			ctx.reply('Ошибка при получении мультфильмов.');
		}

		return;
	}
	if (user.step === 'ask_name' || user.step === 'ask_age') {
		// Анкетирование
		if (user.step === 'ask_name') {
			user.name = text;
			user.step = 'ask_age';
			await user.save();
			ctx.reply(`Отлично, ${user.name}! Сколько лет ребёнку?`);
			return;
		}

		if (user.step === 'ask_age') {
			const age = parseInt(text);
			if (isNaN(age) || age < 1 || age > 12) {
				ctx.reply('Введите возраст числом от 1 до 12.');
				return;
			}

			user.age = age;
			user.step = 'done';
			await user.save();

			await ctx.reply(
				`✅ Возраст успешно изменён на ${age}\n\n⬇️ Готово! Используй меню ниже:`,
				{
					reply_markup: getMainKeyboard(),
				},
			);
			return;
		}
	}

	ctx.reply('Неизвестная команда. Используй кнопки меню или /start.');
});

bot.on('callback_query', async (ctx) => {
	const chatId = ctx.from.id;
	const user = await User.findOne({ telegramId: chatId });
	const data = ctx.callbackQuery.data;
	console.log(chatId, ADMIN_ID, ctx.callbackQuery.data);
	if (!user) return ctx.answerCbQuery('Ошибка пользователя');

	if (data.startsWith('admin_')) {
		if (parseInt(chatId) !== parseInt(ADMIN_ID))
			return ctx.answerCbQuery(`Недоступно для ${chatId}, admin: ${ADMIN_ID}`);

		const [_, action, targetIdStr] = data.split('_');
		const targetId = parseInt(targetIdStr);
		const targetUser = await User.findOne({ telegramId: targetId });

		if (!targetUser) return ctx.reply('Пользователь не найден');

		if (action === 'approve') {
			targetUser.requestCount = 0;
			targetUser.lastResetAt = new Date();
			await targetUser.save();

			await ctx.editMessageText(`✅ Лимит сброшен для ${targetId}`);
			await bot.telegram.sendMessage(
				targetId,
				'🎉 Администратор обновил твой лимит. Приятного просмотра!',
			);

			await ctx.answerCbQuery(); // Закрыть анимацию
		}

		if (action === 'unlimit') {
			targetUser.isUnlimited = true;
			await targetUser.save();
			await ctx.reply(`♾ Безлимит включен для ${targetId}`);
			await bot.telegram.sendMessage(
				targetId,
				'✨ Администратор дал тебе безлимитный доступ!',
			);
		}

		if (action === 'limit') {
			targetUser.isUnlimited = false;
			await targetUser.save();
			await ctx.reply(`⛔️ Безлимит отключён для ${targetId}`);
			await bot.telegram.sendMessage(
				targetId,
				'⛔️ Безлимитный доступ отключён.',
			);
		}

		if (action === 'get') {
			await ctx.reply(
				`👤 Пользователь @${targetUser.username || 'неизвестно'} (${targetId})
				Имя: ${targetUser.name || '-'}
				Возраст: ${targetUser.age || '-'}
				Запросов: ${targetUser.requestCount}/10
				Безлимит: ${targetUser.isUnlimited ? 'Да' : 'Нет'}`,
			);
		}
		return;
	}

	if (data.startsWith('like_')) {
		const id = parseInt(data.split('_')[1]);
		if (!user.likedCartoonIds.includes(id)) {
			user.likedCartoonIds.push(id);
			user.seenCartoonIds.push(id);
			await user.save();
			return ctx.answerCbQuery('❤️ Добавлено в понравившиеся!');
		} else {
			return ctx.answerCbQuery('Уже нравится!');
		}
	}

	if (data.startsWith('dislike_')) {
		const id = parseInt(data.split('_')[1]);
		if (!user.dislikedCartoonIds.includes(id)) {
			user.dislikedCartoonIds.push(id);
			user.seenCartoonIds.push(id);
			await user.save();
			return ctx.answerCbQuery('👎 Больше не покажем!');
		} else {
			return ctx.answerCbQuery('Уже отмечен как неинтересный.');
		}
	}

	if (data.startsWith('fav_')) {
		const id = parseInt(data.split('_')[1]);
		if (!user.favoriteCartoonIds.includes(id)) {
			user.favoriteCartoonIds.push(id);
			await user.save();
			return ctx.answerCbQuery('⭐ Добавлено в избранное!');
		} else {
			return ctx.answerCbQuery('Уже в избранном!');
		}
	}

	if (data === 'already_liked') {
		return ctx.answerCbQuery('Уже нравится ❤️');
	}
	if (data === 'check_limit') {
		const user = await User.findOne({ telegramId: ctx.from.id });
		const now = new Date();
		const resetTime = 12 * 60 * 60 * 1000;
		const timeSinceReset = now - user.lastResetAt;

		if (timeSinceReset > resetTime) {
			user.requestCount = 0;
			user.lastResetAt = now;
			await user.save();

			return ctx.editMessageText('🎉 Лимит обнулён! Поиск снова доступен.');
		} else {
			const msLeft = resetTime - timeSinceReset;
			const hours = Math.floor(msLeft / (1000 * 60 * 60));
			const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

			const newText = `⏳ Осталось ${hours}ч ${minutes}м`;

			// проверим: уже ли такой текст?
			if (
				ctx.message?.text === newText ||
				ctx.update?.callback_query?.message?.text === newText
			) {
				return ctx.answerCbQuery('⏳ Время ещё не изменилось');
			}

			return ctx.editMessageText(newText, {
				reply_markup: {
					inline_keyboard: [
						[{ text: '🔄 Проверить снова', callback_data: 'check_limit' }],
						[
							{
								text: '📩 Запросить увеличение лимита',
								callback_data: 'request_more',
							},
						],
					],
				},
			});
		}
	}

	if (data === 'request_more') {
		const user = await User.findOne({ telegramId: ctx.from.id });

		const msg = `📬 Пользователь @${ctx.from.username || 'Без ника'} 
		(${ctx.from.id}) запросил увеличение лимита.
		
			Имя ребёнка: ${user.name || '—'}
			Возраст: ${user.age || '—'}
			Текущее: ${user.requestCount}/10`;

		await ctx.answerCbQuery('✅ Запрос отправлен администратору');
		await ctx.reply('Мы передали твой запрос!');

		await bot.telegram.sendMessage(ADMIN_ID, msg, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '✅ Approve',
							callback_data: `admin_approve_${ctx.from.id}`,
						},
						{
							text: '♾ Unlimit',
							callback_data: `admin_unlimit_${ctx.from.id}`,
						},
					],
					[
						{ text: '⛔️ Limit', callback_data: `admin_limit_${ctx.from.id}` },
						{ text: 'ℹ️ Get Info', callback_data: `admin_get_${ctx.from.id}` },
					],
				],
			},
		});
	}
});

bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/webhook`);
app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => {
	res.send('Bot is running...');
});

app.listen(PORT, () => {
	console.log(`🚀 Server listening on port ${PORT}`);
});
