const mongoose = require('mongoose');

const AuthCodeSchema = new mongoose.Schema({
	telegramId: { type: Number, required: true },
	code: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, expires: 300 }, // автоудаление через 5 минут
	used: { type: Boolean, default: false },
});

// Индекс для быстрого поиска
AuthCodeSchema.index({ telegramId: 1, code: 1 });

module.exports = mongoose.model('AuthCode', AuthCodeSchema);
