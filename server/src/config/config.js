require('dotenv').config();

// Константы
const ADMIN_ID = Number(process.env.ADMIN_ID);
const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN || null;
const JWT_SECRET = process.env.JWT_SECRET;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CARTOON_GENRE_ID = 16; // ID жанра "Мультфильм" на TMDB
const MIN_VOTE_AVERAGE = 7; // Минимальный рейтинг мультфильма
const REQUEST_LIMIT = 10; // Лимит запросов на 1 час
const LIMIT_RESET_INTERVAL_MS = 1 * 60 * 60 * 1000; // 1 час в миллисекундах
const EXCLUDE_ORIGINAL_LANGUAGES = ['ja']; // Языки, которые нужно исключить из результатов
const DEFAULT_CERTIFICATION_COUNTRIES = 'RU'; // Страны для сертификации

if (!PAYMENT_PROVIDER_TOKEN) {
	console.warn('PAYMENT_PROVIDER_TOKEN не задан, покупки отключены.');
}

// Проверка наличия необходимых переменных окружения
if (!TELEGRAM_BOT_TOKEN) {
	throw new Error('Переменная окружения TELEGRAM_BOT_TOKEN не установлена.');
}
if (!MONGO_URI) {
	throw new Error('Переменная окружения MONGO_URI не установлена.');
}
if (!TMDB_API_KEY) {
	throw new Error('Переменная окружения TMDB_API_KEY не установлена.');
}
if (!JWT_SECRET) {
	throw new Error('Переменная окружения JWT_SECRET не установлена.');
}
if (isNaN(ADMIN_ID)) {
	console.warn(
		'Предупреждение: Переменная окружения ADMIN_ID не установлена или некорректна. Админ-команды будут недоступны.',
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
	PAYMENT_PROVIDER_TOKEN,
	JWT_SECRET,
};
