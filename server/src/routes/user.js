const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getCartoonDetails } = require('../services/tmdb');

const router = express.Router();

/**
 * GET /api/user/favorites
 * Получить список избранных мультфильмов с подробностями
 */
router.get('/favorites', authenticateToken, async (req, res) => {
	try {
		const user = req.user;
		const favoriteIds = user.favoriteCartoonIds || [];

		// Получаем детали каждого мультфильма
		const favorites = await Promise.all(
			favoriteIds.map((id) => getCartoonDetails(id)),
		);

		// Фильтруем null значения (если какой-то мультфильм не найден)
		const validFavorites = favorites.filter((cartoon) => cartoon !== null);

		res.json({
			success: true,
			favorites: validFavorites,
		});
	} catch (error) {
		console.error('Error getting favorites:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * POST /api/user/favorites/:cartoonId
 * Добавить мультфильм в избранное
 */
router.post('/favorites/:cartoonId', authenticateToken, async (req, res) => {
	try {
		const cartoonId = parseInt(req.params.cartoonId);
		const user = req.user;

		if (!user.favoriteCartoonIds.includes(cartoonId)) {
			user.favoriteCartoonIds.push(cartoonId);
			await user.save();
		}

		res.json({
			success: true,
			favorites: user.favoriteCartoonIds,
		});
	} catch (error) {
		console.error('Error adding to favorites:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * DELETE /api/user/favorites/:cartoonId
 * Удалить мультфильм из избранного
 */
router.delete('/favorites/:cartoonId', authenticateToken, async (req, res) => {
	try {
		const cartoonId = parseInt(req.params.cartoonId);
		const user = req.user;

		user.favoriteCartoonIds = user.favoriteCartoonIds.filter(
			(id) => id !== cartoonId,
		);
		await user.save();

		res.json({
			success: true,
			favorites: user.favoriteCartoonIds,
		});
	} catch (error) {
		console.error('Error removing from favorites:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

/**
 * PUT /api/user/profile
 * Обновить профиль пользователя
 */
router.put('/profile', authenticateToken, async (req, res) => {
	try {
		const user = req.user;
		const { name, age } = req.body;

		if (name !== undefined) {
			user.name = name;
		}
		if (age !== undefined) {
			user.age = parseInt(age);
		}

		await user.save();

		res.json({
			success: true,
			user: {
				id: user._id,
				telegramId: user.telegramId,
				name: user.name,
				username: user.username,
				age: user.age,
				photoUrl: user.photoUrl,
				seenCartoonIds: user.seenCartoonIds,
				likedCartoonIds: user.likedCartoonIds,
				dislikedCartoonIds: user.dislikedCartoonIds,
				favoriteCartoonIds: user.favoriteCartoonIds,
				requestCount: user.requestCount,
				isUnlimited: user.isUnlimited,
				createdAt: user.createdAt,
			},
		});
	} catch (error) {
		console.error('Error updating profile:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
