const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
	pollId: { type: String, required: true, unique: true },
	chatId: { type: Number, required: true },
	messageId: { type: Number, required: true },
	question: { type: String, required: true },
	options: [{ text: String, voteCount: { type: Number, default: 0 } }],
	isAnonymous: { type: Boolean, default: false },
	openPeriod: { type: Number, default: 600 },
	isActive: { type: Boolean, default: true, index: true },
	closedAt: { type: Date, default: null },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Poll', PollSchema);
