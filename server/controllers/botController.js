const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

module.exports = async function initBot() {
	require('dotenv').config();

	const app = express();
	const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
	const movieService = require('../services/movieService');
	const userService = require('../services/userService');
	const { getMainKeyboard } = require('../utils/helpers');

	app.use(cors());
	mongoose
		.connect(process.env.MONGO_URI)
		.then(() => {
			console.log('✅ Подключено к MongoDB');
		})
		.catch((err) => {
			console.error('❌ Ошибка подключения к MongoDB:', err);
		});

	const ADMIN_ID = process.env.ADMIN_ID;
	const PORT = process.env.PORT || 3001;

	bot.command('start', async (ctx) => {
		const user = await userService.getUserByTelegramId(ctx.from.id);
		if (!user) {
			await userService.createUser(ctx.from.id, ctx.from.username);
		}
		await ctx.reply(
			'Привет! Я бот для поиска фильмов и сериалов. Как я могу помочь тебе?',
		);
	});

	bot.on('message', async (ctx) => {
		const user = await userService.getUserByTelegramId(ctx.from.id);
		if (!user) {
			await userService.createUser(ctx.from.id, ctx.from.username);
		}
		await ctx.reply(
			'Привет! Я бот для поиска фильмов и сериалов. Как я могу помочь тебе?',
		);
	});
};
