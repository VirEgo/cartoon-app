const User = require('../models/User');

/**
 * Находит пользователя по Telegram ID или создает нового, если не найден.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {string} [username] - Username пользователя (для сохранения при первом создании).
 * @returns {Promise<User>} - Объект пользователя.
 */
async function findOrCreateUser(telegramId, username) {
	let user = await User.findOne({ telegramId });
	if (!user) {
		user = new User({ telegramId, username });
		await user.save();
	} else if (!user.username && username) {
		// Обновляем username, если он появился
		user.username = username;
		await user.save();
	}
	return user;
}

async function getAllUsers() {
	return User.find({}, 'telegramId').exec();
}

/**
 * Обновляет поле(поля) пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {object} updateData - Объект с данными для обновления.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function updateUser(telegramId, updateData) {
	return User.findOneAndUpdate({ telegramId }, updateData, { new: true });
}

/**
 * Сбрасывает лимит запросов для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function resetRequestLimit(telegramId) {
	return updateUser(telegramId, { requestCount: 0, lastResetAt: new Date() });
}

/**
 * Обновляет лимит пользователя, если окно лимита уже истекло.
 * @param {import('../models/User')} user
 * @param {number} limitResetIntervalMs
 * @returns {Promise<{user: any, didReset: boolean}>}
 */
async function refreshUserRequestLimit(user, limitResetIntervalMs) {
	if (!user || user.isUnlimited) {
		return { user, didReset: false };
	}

	const lastResetAt = user.lastResetAt ? new Date(user.lastResetAt) : new Date(0);
	const now = new Date();
	const timeSinceLastReset = now - lastResetAt;

	if (timeSinceLastReset < limitResetIntervalMs) {
		return { user, didReset: false };
	}

	user.requestCount = 0;
	user.lastResetAt = now;
	await user.save();

	return { user, didReset: true };
}

/**
 * Переключает безлимитный доступ для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {boolean} isUnlimited - Включить (true) или выключить (false) безлимит.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function toggleUnlimitedAccess(telegramId, isUnlimited) {
	return updateUser(telegramId, { isUnlimited });
}

/**
 * Обновляет только фильтры поиска (movieFilter) для пользователя
 * @param {number} telegramId - ID пользователя Telegram
 * @param {object} filterUpdates - объект с полями из movieFilter для обновления
 * @returns {Promise<User|null>} - обновлённый пользователь или null, если не найден
 */
async function updateMovieFilter(telegramId, filterUpdates) {
	// Подготавливаем $set для вложенных полей
	const setData = {};
	for (const [key, value] of Object.entries(filterUpdates)) {
		setData[`movieFilter.${key}`] = value;
	}

	const updated = await User.findOneAndUpdate(
		{ telegramId },
		{ $set: setData },
		{
			new: true,
			runValidators: true,
			context: 'query',
			select: '-__v',
		},
	).exec();

	return updated;
}

/**
 * Получает информацию о пользователе.
 * @param {number} telegramId - Telegram ID пользователя.

/**
 * Переключает безлимитный доступ для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {boolean} isUnlimited - Включить (true) или выключить (false) безлимит.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function toggleUnlimitedAccess(telegramId, isUnlimited) {
	return updateUser(telegramId, { isUnlimited });
}

/**
 * Обновляет только фильтры поиска (movieFilter) для пользователя
 * @param {number} telegramId - ID пользователя Telegram
 * @param {object} filterUpdates - объект с полями из movieFilter для обновления
 * @returns {Promise<User|null>} - обновлённый пользователь или null, если не найден
 */
async function updateMovieFilter(telegramId, filterUpdates) {
	// Подготавливаем $set для вложенных полей
	const setData = {};
	for (const [key, value] of Object.entries(filterUpdates)) {
		setData[`movieFilter.${key}`] = value;
	}

	const updated = await User.findOneAndUpdate(
		{ telegramId },
		{ $set: setData },
		{
			new: true,
			runValidators: true,
			context: 'query',
			select: '-__v',
		},
	).exec();

	return updated;
}

/**
 * Получает информацию о пользователе.
 * @param {number} telegramId - Telegram ID пользователя.
 * @returns {Promise<User|null>} - Объект пользователя или null, если пользователь не найден.
 */
async function getUserInfo(telegramId) {
	return User.findOne({ telegramId });
}

/**
 * Переключает лайк мультфильма для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<{user: User|null, added: boolean}>}
 */
async function toggleLikedCartoon(telegramId, cartoonId) {
	const user = await User.findOne({ telegramId });
	if (!user) return { user: null, added: false };

	if (!user.likedCartoonIds) user.likedCartoonIds = [];
	if (!user.dislikedCartoonIds) user.dislikedCartoonIds = [];
	if (!user.seenCartoonIds) user.seenCartoonIds = [];

	const index = user.likedCartoonIds.indexOf(cartoonId);
	let added = false;

	if (index > -1) {
		user.likedCartoonIds.splice(index, 1);
	} else {
		user.likedCartoonIds.push(cartoonId);
		added = true;

		// Remove from disliked if present
		const dislikedIndex = user.dislikedCartoonIds.indexOf(cartoonId);
		if (dislikedIndex > -1) {
			user.dislikedCartoonIds.splice(dislikedIndex, 1);
		}

		// Ensure it is in seen
		if (!user.seenCartoonIds.includes(cartoonId)) {
			user.seenCartoonIds.push(cartoonId);
		}
	}

	await user.save();
	return { user, added };
}

/**
 * Переключает дизлайк мультфильма для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<{user: User|null, added: boolean}>}
 */
async function toggleDislikedCartoon(telegramId, cartoonId) {
	const user = await User.findOne({ telegramId });
	if (!user) return { user: null, added: false };

	if (!user.likedCartoonIds) user.likedCartoonIds = [];
	if (!user.dislikedCartoonIds) user.dislikedCartoonIds = [];
	if (!user.seenCartoonIds) user.seenCartoonIds = [];

	const index = user.dislikedCartoonIds.indexOf(cartoonId);
	let added = false;

	if (index > -1) {
		user.dislikedCartoonIds.splice(index, 1);
	} else {
		user.dislikedCartoonIds.push(cartoonId);
		added = true;

		// Remove from liked if present
		const likedIndex = user.likedCartoonIds.indexOf(cartoonId);
		if (likedIndex > -1) {
			user.likedCartoonIds.splice(likedIndex, 1);
		}

		// Ensure it is in seen
		if (!user.seenCartoonIds.includes(cartoonId)) {
			user.seenCartoonIds.push(cartoonId);
		}
	}

	await user.save();
	return { user, added };
}

/**
 * Переключает наличие мультфильма в избранном для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<{user: User|null, added: boolean}>} - Объект с обновленным пользователем и флагом, был ли мультфильм добавлен.
 */
async function toggleFavoriteCartoon(telegramId, cartoonId) {
	const user = await User.findOne({ telegramId });
	if (!user) return { user: null, added: false };

	if (!user.favoriteCartoonIds) user.favoriteCartoonIds = [];

	const index = user.favoriteCartoonIds.indexOf(cartoonId);
	let added = false;

	if (index > -1) {
		user.favoriteCartoonIds.splice(index, 1);
		added = false;
	} else {
		user.favoriteCartoonIds.push(cartoonId);
		added = true;
	}

	await user.save();
	return { user, added };
}

/**
 * Сбрасывает все данные пользователя (имя, возраст, просмотренные).
 * @param {number} telegramId - Telegram ID пользователя.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function resetUserData(telegramId) {
	return updateUser(telegramId, {
		name: null,
		age: null,
		seenCartoonIds: [],
		likedCartoonIds: [],
		dislikedCartoonIds: [],
		favoriteCartoonIds: [],
		step: 'ask_name',
		requestCount: 0,
		lastResetAt: new Date(),
		isUnlimited: false,
	});
}

/**
 * Попытается атомарно уменьшить количество звёзд у пользователя.
 * @param {number} telegramId
 * @param {number} amount
 * @returns {Promise<User|null>} — обновлённый документ пользователя или null, если звёзд не хватило
 */
async function decrementUserStars(telegramId, amount) {
	// findOneAndUpdate с условием stars >= amount гарантирует атомарность
	const updated = await User.findOneAndUpdate(
		{ telegramId, stars: { $gte: amount } },
		{ $inc: { stars: -amount } },
		{ new: true },
	);
	return updated; // null, если условие не выполнилось
}

module.exports = {
	findOrCreateUser,
	updateUser,
	resetRequestLimit,
	refreshUserRequestLimit,
	toggleUnlimitedAccess,
	getUserInfo,
	toggleLikedCartoon,
	toggleDislikedCartoon,
	toggleFavoriteCartoon,
	resetUserData,
	decrementUserStars,
	updateMovieFilter,
	getAllUsers,
};
