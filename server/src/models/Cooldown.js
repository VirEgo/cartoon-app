const mongoose = require('mongoose');

const CooldownSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true, index: true },
		expiresAt: { type: Date, required: true, index: true },
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

CooldownSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cooldown', CooldownSchema);
