const { Telegraf } = require('telegraf');
const { TELEGRAM_BOT_TOKEN } = require('./src/config/config');

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function setupBotCommands() {
	try {
		await bot.telegram.setMyCommands([
			{ command: 'start', description: 'Начать работу и заполнить анкету' },
			{ command: 'profile', description: 'Показать профиль ребёнка' },
			{ command: 'favorite', description: 'Показать избранные мультфильмы' },
			{ command: 'name', description: 'Сменить имя ребёнка' },
			{ command: 'age', description: 'Сменить возраст ребёнка' },
			{ command: 'reset', description: 'Сбросить анкету и начать заново' },
			{ command: 'random', description: 'Подобрать мультфильм' },
			{ command: 'help', description: 'Помощь и описание команд' },
		]);

		console.log('✅ Команды успешно установлены для бота.');
	} catch (err) {
		console.error('❌ Ошибка при установке команд:', err);
	} finally {
		process.exit();
	}
}

setupBotCommands();
