const mongoose = require('mongoose');

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const BotSessionSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true, index: true },
		data: { type: mongoose.Schema.Types.Mixed, default: null },
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

BotSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });

module.exports = mongoose.model('BotSession', BotSessionSchema);
