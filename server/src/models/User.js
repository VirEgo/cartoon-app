const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	telegramId: { type: Number, required: true, unique: true },
	name: String,
	age: Number,
	seenCartoonIds: [Number],
	likedCartoonIds: [Number],
	dislikedCartoonIds: [Number],
	favoriteCartoonIds: [Number],
	step: { type: String, default: 'ask_name' },
	createdAt: { type: Date, default: Date.now },
	requestCount: { type: Number, default: 0 },
	lastResetAt: { type: Date, default: Date.now },
	isUnlimited: { type: Boolean, default: false },
	username: { type: String, default: null },
});

module.exports = mongoose.model('User', UserSchema);
