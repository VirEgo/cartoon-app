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

function formatTimeLeft(ms) {
	const hours = Math.floor(ms / (1000 * 60 * 60));
	const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((ms % (1000 * 60)) / 1000);
	return `${hours}ч ${minutes}м ${seconds}с`;
}

module.exports = {
	getMainKeyboard,
	formatTimeLeft,
};
