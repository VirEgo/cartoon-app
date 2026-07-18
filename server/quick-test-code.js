#!/usr/bin/env node

/**
 * Быстрый тест отправки кода
 */

require('dotenv').config();
const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const TELEGRAM_ID = process.argv[2] || 123456789;

console.log(`🧪 Тест отправки кода авторизации`);
console.log(`📱 Telegram ID: ${TELEGRAM_ID}\n`);

function makeRequest(method, path, data = null) {
	return new Promise((resolve, reject) => {
		const url = new URL(SERVER_URL + path);
		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			method: method,
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const req = http.request(options, (res) => {
			let body = '';
			res.on('data', (chunk) => (body += chunk));
			res.on('end', () => {
				try {
					const parsed = JSON.parse(body);
					resolve({ status: res.statusCode, body: parsed });
				} catch (e) {
					resolve({ status: res.statusCode, body: body });
				}
			});
		});

		req.on('error', reject);

		if (data) {
			req.write(JSON.stringify(data));
		}
		req.end();
	});
}

async function test() {
	try {
		console.log('1️⃣  Отправка запроса на получение кода...');
		const response = await makeRequest('POST', '/api/auth/request-code', {
			telegramId: Number(TELEGRAM_ID),
		});

		console.log(`   Status: ${response.status}`);
		console.log(`   Response:`, response.body);

		if (response.status === 200 && response.body.success) {
			console.log('\n✅ Код успешно отправлен!');
			console.log(`   Проверьте Telegram на наличие кода (ID: ${TELEGRAM_ID})`);
		} else {
			console.log('\n❌ Ошибка при отправке кода');
		}
	} catch (error) {
		console.error('❌ Ошибка:', error.message);
		process.exit(1);
	}
}

test();
