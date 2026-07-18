const Cooldown = require('../models/Cooldown');

async function getActiveCooldown(key) {
	const now = new Date();

	const cooldown = await Cooldown.findOne({
		key,
		expiresAt: { $gt: now },
	}).lean();

	if (!cooldown) {
		return { isActive: false, acquired: false, remainingMs: 0 };
	}

	return {
		isActive: true,
		acquired: false,
		remainingMs: Math.max(cooldown.expiresAt.getTime() - now.getTime(), 0),
		expiresAt: cooldown.expiresAt,
	};
}

async function reserveCooldown(key, durationMs) {
	const now = new Date();
	const expiresAt = new Date(now.getTime() + durationMs);

	const activeCooldown = await getActiveCooldown(key);
	if (activeCooldown.isActive) {
		return activeCooldown;
	}

	try {
		await Cooldown.findOneAndUpdate(
			{
				key,
				$or: [
					{ expiresAt: { $lte: now } },
					{ expiresAt: { $exists: false } },
				],
			},
			{
				$set: { expiresAt },
				$setOnInsert: { key },
			},
			{
				upsert: true,
			},
		);

		return { isActive: false, acquired: true, remainingMs: 0, expiresAt };
	} catch (error) {
		if (error?.code !== 11000) {
			throw error;
		}

		return getActiveCooldown(key);
	}
}

async function clearCooldown(key) {
	await Cooldown.deleteOne({ key });
}

module.exports = {
	getActiveCooldown,
	reserveCooldown,
	clearCooldown,
};
