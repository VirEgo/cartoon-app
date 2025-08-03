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
		// Можно добавить более продвинутую обработку ошибок или выход из приложения
		process.exit(1);
	}
}

module.exports = {
	connectDB,
	mongoose,
};
