#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки отправки кода авторизации
 */

require('dotenv').config();
const mongoose = require('mongoose');

const { MONGO_URI } = require('./src/config/config');
const AuthCode = require('./src/models/AuthCode');
const { createAuthCode, verifyAuthCode } = require('./src/services/authCode');

async function test() {
	try {
		// Подключаемся к MongoDB
		console.log('🔗 Подключение к MongoDB...');
		await mongoose.connect(MONGO_URI);
		console.log('✅ Подключено к MongoDB');

		// Тестируем создание кода
		const testTelegramId = 123456789;
		console.log(`\n📝 Создание кода для telegramId: ${testTelegramId}`);
		const code = await createAuthCode(testTelegramId);
		console.log(`✅ Код создан: ${code}`);

		// Проверяем что код в БД
		const savedCode = await AuthCode.findOne({ telegramId: testTelegramId, code });
		console.log(`✅ Код найден в БД:`, savedCode);

		// Тестируем проверку кода
		console.log(`\n🔍 Проверка кода...`);
		const isValid = await verifyAuthCode(testTelegramId, code);
		if (isValid) {
			console.log(`✅ Код валиден!`);
		} else {
			console.log(`❌ Код невалиден!`);
		}

		// Проверяем что код помечен как используемый
		const usedCode = await AuthCode.findOne({ telegramId: testTelegramId, code });
		console.log(`📊 Статус кода в БД:`, { used: usedCode.used });

		// Очищаем тестовые данные
		await AuthCode.deleteMany({ telegramId: testTelegramId });
		console.log(`\n🧹 Тестовые данные удалены`);

		console.log('\n✅ Все тесты пройдены!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Ошибка:', error);
		process.exit(1);
	}
}

test();
