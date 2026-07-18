const mongoose = require('mongoose');
const { MONGO_URI } = require('../config/config');

// Подключение к MongoDB
async function connectDB() {
	try {
		await mongoose.connect(MONGO_URI, {
			serverSelectionTimeoutMS: 5000,
		});
		console.log('✅ Подключено к MongoDB');
	} catch (err) {
		console.error('❌ Ошибка подключения к MongoDB:', err);
		// Пробрасываем ошибку дальше, чтобы index.js мог её поймать и не "убить" весь сервер
		throw err;
	}
}

module.exports = {
	connectDB,
	mongoose,
};
