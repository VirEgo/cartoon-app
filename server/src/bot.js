const { Telegraf, session, Scenes } = require('telegraf');
const { MongoSessionStore } = require('./middleware/mongoSessionStore');
const sceneList = require('./telegramTools/scenes/movieSettingsScenes');
const userProfileScenes = require('./telegramTools/scenes/userProfileScenes');
const broadcastScene = require('./telegramTools/scenes/broadcastScene');
const { getKeyboardForUser } = require('./telegramTools/keyboards/keyboards');
const {
	initializeAdminCommands,
	handleAdminCallback,
} = require('./telegramTools/adminCommandsConfig/commandConfig');
const {
	registerAuthCommands,
} = require('./telegramTools/handlers/authCommands');
const {
	registerTextHandler,
} = require('./telegramTools/handlers/textHandler');
const {
	registerCallbackHandler,
} = require('./telegramTools/handlers/callbackHandler');
const {
	registerPaymentHandlers,
} = require('./telegramTools/handlers/paymentHandlers');
const {
	TELEGRAM_BOT_TOKEN,
	ADMIN_ID,
	REQUEST_LIMIT,
	LIMIT_RESET_INTERVAL_MS,
	PAYMENT_PROVIDER_TOKEN,
} = require('./config/config');

const {
	findOrCreateUser,
	refreshUserRequestLimit,
	toggleLikedCartoon,
	toggleDislikedCartoon,
	toggleFavoriteCartoon,
	resetUserData,
} = require('./services/user');

const { sendAuthCode } = require('./services/sendAuthCode');

const {
	fetchRandomCartoonImproved,
	getCartoonDetails,
	getPosterUrl,
} = require('./services/tmdb');

const {
	isActivePoll,
	incrementPollVotes,
} = require('./services/TGPollService');

const {
	clearAllPollsFromDB,
	clearPollMessages,
} = require('./services/clearService');

const stage = new Scenes.Stage([
	...sceneList,
	...userProfileScenes,
	broadcastScene,
]);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const sessionStore = new MongoSessionStore();

bot.use(async (ctx, next) => {
	const chatId = ctx.chat?.id || ctx.from?.id;
	const username = ctx.from?.username;
	if (chatId) {
		const user = await findOrCreateUser(chatId, username);
		const { user: refreshedUser } = await refreshUserRequestLimit(
			user,
			LIMIT_RESET_INTERVAL_MS,
		);
		ctx.state.user = refreshedUser;
	}
	const updateType = ctx.updateType || 'unknown_update';
	console.log(
		`🤖 ${new Date().toISOString()} User ${chatId} (${
			username || 'no_username'
		}) - ${updateType}`,
	);
	await next();
});

bot.use(session({ store: sessionStore }));
bot.use(stage.middleware());

// --- Обработчики команд ---
bot.start(async (ctx) => {
	const user = ctx.state.user;

	if (!user.name || !user.age) {
		user.step = 'ask_name';
		await user.save();
		ctx.reply('Привет! Давай подберём тебе мультфильм.\nКак зовут ребёнка?');
		return;
	}

	// Just for testing purposes
	// await deleteAllPolls();

	user.step = 'done';
	await user.save();

	ctx.reply(
		`Привет снова, ${user.name}! Готов подобрать мультфильм?`,
		getKeyboardForUser(ctx),
	);
});

bot.on('poll_answer', async (ctx) => {
	const { poll_id, option_ids, user } = ctx.update.poll_answer;
	if (!(await isActivePoll(poll_id))) return;

	const poll = await incrementPollVotes(poll_id, option_ids);
	const results = poll.options
		.map((o, i) => `${i}. ${o.text}: ${o.voteCount}`)
		.join('\n');

	await ctx.telegram.sendMessage(
		ADMIN_ID,
		`Пользователь ${
			user.username || user.id
		} проголосовал за [${option_ids.join(', ')}]\n\n` +
			`Текущие результаты:\n${results}`,
	);
});

// Команды администратора
initializeAdminCommands(bot);

bot.command('age', async (ctx) => {
	return ctx.scene.enter('userAgeScene');
});
registerAuthCommands(bot, { sendAuthCode });

bot.hears('🗑️ Очистить опросы', async (ctx) => {
	if (ctx.from.id !== ADMIN_ID) {
		return ctx.reply(
			'❌ Только администратор может это сделать.',
			getKeyboardForUser(ctx),
		);
	}

	await ctx.reply('⚙️ Удаляю все опросы…');
	try {
		const count = await clearPollMessages(ctx.telegram);
		await clearAllPollsFromDB();
		await ctx.reply(
			`✅ Успешно удалено ${count} опрос${count === 1 ? '' : 'ов'}.`,
			getKeyboardForUser(ctx),
		);
	} catch (err) {
		console.error('Ошибка при удалении опросов:', err);
		await ctx.reply(
			'❌ Не удалось удалить опросы. Смотрите логи.',
			getKeyboardForUser(ctx),
		);
	}
});

registerTextHandler(bot, {
	getKeyboardForUser,
	resetUserData,
	getCartoonDetails,
	getPosterUrl,
	fetchRandomCartoonImproved,
	ADMIN_ID,
	REQUEST_LIMIT,
	LIMIT_RESET_INTERVAL_MS,
});

registerCallbackHandler(bot, {
	handleAdminCallback,
	toggleLikedCartoon,
	toggleDislikedCartoon,
	toggleFavoriteCartoon,
	resetUserData,
	ADMIN_ID,
	REQUEST_LIMIT,
	LIMIT_RESET_INTERVAL_MS,
	PAYMENT_PROVIDER_TOKEN,
});

registerPaymentHandlers(bot, {
	fetchRandomCartoonImproved,
	getPosterUrl,
});

bot.catch((err, ctx) => {
	console.error(`Ошибка для @${ctx.from?.username || 'unknown user'}:`, err);
	ctx.reply('Произошла внутренняя ошибка. Попробуйте позже.');
});

module.exports = bot;
