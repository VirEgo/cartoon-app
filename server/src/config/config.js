require('dotenv').config();

// Константы
const ADMIN_ID = Number(process.env.ADMIN_ID);
const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CARTOON_GENRE_ID = 16; // ID жанра "Мультфильм" на TMDB
const MIN_VOTE_AVERAGE = 6; // Минимальный рейтинг мультфильма
const REQUEST_LIMIT = 10; // Лимит запросов на 12 часов
const LIMIT_RESET_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 часов в миллисекундах
const EXCLUDE_ORIGINAL_LANGUAGES = ['ja']; // Языки, которые нужно исключить из результатов (например, японский)
const DEFAULT_CERTIFICATION_COUNTRIES = ['UA', 'RU']; // Страны для сертификации (например, Украина и Россия)

// Проверка наличия необходимых переменных окружения
if (!TELEGRAM_BOT_TOKEN) {
	console.error(
		'❌ Ошибка: Переменная окружения TELEGRAM_BOT_TOKEN не установлена.',
	);
	process.exit(1);
}
if (!MONGO_URI) {
	console.error('❌ Ошибка: Переменная окружения MONGO_URI не установлена.');
	process.exit(1);
}
if (!TMDB_API_KEY) {
	console.error('❌ Ошибка: Переменная окружения TMDB_API_KEY не установлена.');
	process.exit(1);
}
if (isNaN(ADMIN_ID)) {
	console.warn(
		'⚠️ Предупреждение: Переменная окружения ADMIN_ID не установлена или некорректна. Админ-команды будут недоступны.',
	);
}

module.exports = {
	ADMIN_ID,
	PORT,
	TMDB_API_KEY,
	TELEGRAM_BOT_TOKEN,
	MONGO_URI,
	TMDB_BASE_URL,
	TMDB_IMAGE_BASE_URL,
	CARTOON_GENRE_ID,
	MIN_VOTE_AVERAGE,
	REQUEST_LIMIT,
	LIMIT_RESET_INTERVAL_MS,
	EXCLUDE_ORIGINAL_LANGUAGES,
	DEFAULT_CERTIFICATION_COUNTRIES,
};
