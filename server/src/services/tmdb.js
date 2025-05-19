const axios = require('axios');
const {
	TMDB_API_KEY,
	TMDB_BASE_URL,
	TMDB_IMAGE_BASE_URL,
	CARTOON_GENRE_ID,
	MIN_VOTE_AVERAGE,
	EXCLUDE_ORIGINAL_LANGUAGES,
	DEFAULT_CERTIFICATION_COUNTRIES,
} = require('../config/config');

/**
 * Получает список мультфильмов из TMDB API.
 * @param {number} page - Номер страницы результатов.
 * @param {number} age - Возраст пользователя для фильтрации по рейтингу.
 * @param {number[]} [seenIds=[]] - Список ID уже просмотренных мультфильмов.
 * @param {number[]} [dislikedIds=[]] - Список ID не понравившихся мультфильмов.
 * @returns {Promise<object[]>} - Массив объектов мультфильмов.
 */
async function fetchCartoons({ page, age, seenIds = [], dislikedIds = [] }) {
	try {
		const certificationCountryString = (
			DEFAULT_CERTIFICATION_COUNTRIES
				? DEFAULT_CERTIFICATION_COUNTRIES
				: ['UA', 'RU']
		).join(',');
		const excludeOriginalLanguagesString = EXCLUDE_ORIGINAL_LANGUAGES.join(',');

		const res = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
			params: {
				api_key: TMDB_API_KEY,
				with_genres: CARTOON_GENRE_ID,
				language: 'ru',
				include_adult: false,
				'vote_average.gte': MIN_VOTE_AVERAGE, // исключим плохие мультфильмы
				region: ['UA', 'RU'], // или другой регион по необходимости
				page: page,
				// certification_country: certificationCountryString, // или другой регион по необходимости
				'certification.lte': age < 6 ? 'G' : 'PG', // Устанавливаем сертификацию в зависимости от возраста
				exclude_original_language: excludeOriginalLanguagesString, // Исключаем японский язык
			},
		});

		const all = res.data.results;
		// Фильтруем мультфильмы, которые пользователь уже видел или не любит
		const filtered = all.filter(
			(c) => !seenIds.includes(c.id) && !dislikedIds.includes(c.id),
		);

		// Если после фильтрации ничего не осталось, вернем все (возможно, стоит пересмотреть эту логику)
		return filtered.length ? filtered : all;
	} catch (error) {
		console.error('❌ Ошибка при запросе к TMDB:', error.message);
		throw new Error('Не удалось получить список мультфильмов из TMDB. 11');
	}
}

/**
 * Получает детальную информацию о мультфильме по ID.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<object|null>} - Объект с деталями мультфильма или null, если не найдено.
 */
async function getCartoonDetails(cartoonId) {
	try {
		const res = await axios.get(`${TMDB_BASE_URL}/movie/${cartoonId}`, {
			params: {
				api_key: TMDB_API_KEY,
				language: 'ru',
			},
		});
		return res.data;
	} catch (error) {
		console.error(
			`❌ Ошибка при запросе деталей мультфильма ${cartoonId} к TMDB:`,
			error.message,
		);
		return null;
	}
}

/**
 * Формирует URL постера мультфильма.
 * @param {string} posterPath - Путь к постеру из TMDB API.
 * @returns {string|null} - Полный URL постера или null, если posterPath отсутствует.
 */
function getPosterUrl(posterPath) {
	return posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : null;
}

/**
 * Получает общее количество страниц для мультфильмов по заданным критериям.
 * @returns {Promise<number>} - Общее количество страниц.
 */
async function getTotalCartoonPages() {
	try {
		const res = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
			params: {
				api_key: TMDB_API_KEY,
				with_genres: CARTOON_GENRE_ID,
				language: 'ru',
				include_adult: false,
				'vote_average.gte': MIN_VOTE_AVERAGE,
				region: 'UA',
				certification_country: 'UA',
				'certification.lte': 'G',
				page: 1, // Запрашиваем только первую страницу для получения общего количества
			},
		});
		return res.data.total_pages || 1; // Вернем 1, если total_pages отсутствует или 0
	} catch (error) {
		console.error(
			'❌ Ошибка при запросе общего количества страниц к TMDB:',
			error.message,
		);
		return 1; // В случае ошибки вернем 1 страницу
	}
}

/**
 * Получает случайный мультфильм, учитывая предпочтения пользователя, из более широкого пула страниц.
 * @param {number} age - Возраст пользователя.
 * @param {number[]} [seenIds=[]] - Список ID уже просмотренных мультфильмов.
 * @param {number[]} [dislikedIds=[]] - Список ID не понравившихся мультфильмов.
 * @returns {Promise<object|null>} - Объект случайного мультфильма или null, если не найдено.
 */
async function fetchRandomCartoonImproved(age, seenIds = [], dislikedIds = []) {
	const totalPages = await getTotalCartoonPages();
	const maxPageToConsider = Math.min(totalPages, 100); // Ограничим, например, 100 страницами

	const pagesToFetch = new Set();
	// Выберем несколько случайных уникальных страниц
	const numberOfPagesToFetch = 5; // Например, 5 случайных страниц
	while (
		pagesToFetch.size < numberOfPagesToFetch &&
		pagesToFetch.size < maxPageToConsider
	) {
		const randomPage = Math.floor(Math.random() * maxPageToConsider) + 1;
		pagesToFetch.add(randomPage);
	}

	let usableCartoons = [];

	// Запрашиваем мультфильмы с выбранных случайных страниц
	for (const page of pagesToFetch) {
		try {
			const cartoons = await fetchCartoons({ page, age, seenIds, dislikedIds });
			// Добавляем только те мультфильмы, которые еще не были добавлены (избегаем дубликатов, если мультфильм на нескольких страницах)
			cartoons.forEach((cartoon) => {
				if (!usableCartoons.some((c) => c.id === cartoon.id)) {
					usableCartoons.push(cartoon);
				}
			});
		} catch (error) {
			console.error(`❌ Ошибка при запросе страницы ${page}:`, error.message);
			// Продолжаем с другими страницами, даже если одна не загрузилась
		}
	}

	// Фильтруем по просмотренным и не понравившимся (повторно, на всякий случай)
	const filteredUsable = usableCartoons.filter(
		(c) => !seenIds.includes(c.id) && !dislikedIds.includes(c.id),
	);

	if (filteredUsable.length === 0) {
		console.warn(
			'⚠️ Не удалось найти новые мультфильмы, соответствующие критериям, из выбранных случайных страниц.',
		);
		// Здесь можно добавить логику для обработки случая, когда новых мультфильмов нет
		// Например, вернуть null или мультфильм из likedCartoonIds
		return null;
	}

	// Выбираем случайный мультфильм из отфильтрованного списка
	const random =
		filteredUsable[Math.floor(Math.random() * filteredUsable.length)];

	return random;
}

module.exports = {
	fetchRandomCartoonImproved,
	getCartoonDetails,
	getPosterUrl,
};
