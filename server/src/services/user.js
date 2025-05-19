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
 * Переключает безлимитный доступ для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {boolean} isUnlimited - Включить (true) или выключить (false) безлимит.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function toggleUnlimitedAccess(telegramId, isUnlimited) {
	return updateUser(telegramId, { isUnlimited });
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
 * Добавляет ID мультфильма в список понравившихся для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function addLikedCartoon(telegramId, cartoonId) {
	return User.findOneAndUpdate(
		{ telegramId, likedCartoonIds: { $ne: cartoonId } },
		{ $push: { likedCartoonIds: cartoonId, seenCartoonIds: cartoonId } },
		{ new: true },
	);
}

/**
 * Добавляет ID мультфильма в список не понравившихся для пользователя.
 * @param {number} telegramId - Telegram ID пользователя.
 * @param {number} cartoonId - ID мультфильма.
 * @returns {Promise<User|null>} - Обновленный объект пользователя или null, если пользователь не найден.
 */
async function addDislikedCartoon(telegramId, cartoonId) {
	return User.findOneAndUpdate(
		{ telegramId, dislikedCartoonIds: { $ne: cartoonId } },
		{ $push: { dislikedCartoonIds: cartoonId, seenCartoonIds: cartoonId } },
		{ new: true },
	);
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

module.exports = {
	findOrCreateUser,
	updateUser,
	resetRequestLimit,
	toggleUnlimitedAccess,
	getUserInfo,
	addLikedCartoon,
	addDislikedCartoon,
	toggleFavoriteCartoon,
	resetUserData,
};
