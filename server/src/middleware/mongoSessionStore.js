const BotSession = require('../models/BotSession');

class MongoSessionStore {
	async get(key) {
		const session = await BotSession.findOne({ key }).lean();
		return session?.data ?? undefined;
	}

	async set(key, value) {
		await BotSession.findOneAndUpdate(
			{ key },
			{ $set: { data: value } },
			{
				upsert: true,
				setDefaultsOnInsert: true,
			},
		);
	}

	async delete(key) {
		await BotSession.deleteOne({ key });
	}
}

module.exports = { MongoSessionStore };
