const Poll = require('../models/TGPoll'); // Import the TGPoll model

async function createPoll(pollData) {
	let poll = await Poll.findOne({ pollId: pollData.pollId });
	if (!poll) {
		poll = new Poll(pollData);
		await poll.save();
	}
	return poll;
}

async function updatePollById(pollId, updateData) {
	const updated = await Poll.findOneAndUpdate({ pollId }, updateData, {
		new: true,
		runValidators: true,
	});
	if (!updated) throw new Error('Poll not found');
	return updated;
}

async function getPollById(pollId) {
	const poll = await Poll.findOne({ pollId });
	if (!poll) throw new Error('Poll not found');
	return poll;
}

async function getAllPolls() {
	const polls = await Poll.find({});
	return polls;
}

async function deletePollById(pollId) {
	const deleted = await Poll.findOneAndDelete({ pollId });
	if (!deleted) throw new Error('Poll not found');
}

async function deleteAllPolls() {
	const deleted = await Poll.deleteMany({});
	return deleted;
}

const activePolls = new Set();

/**
 * Добавить список poll_id'ов в «активные»
 * @param {string[]} ids
 */
function addActivePolls(ids) {
	ids.forEach((id) => activePolls.add(id));
}

/**
 * Проверить, является ли poll_id активным
 * @param {string} id
 * @returns {boolean}
 */
function isActivePoll(id) {
	return activePolls.has(id);
}

/**
 * Инкрементирует счётчики голосов в опциях опроса.
 *
 * @param {string} pollId — Telegram poll.id
 * @param {number|number[]} optionIndexes — индекс (или массив индексов) опции/ий в массиве options
 * @returns {Promise<import('../models/TGPoll')>} — обновлённый документ опроса
 */
async function incrementPollVotes(pollId, optionIndexes) {
	// приводим к массиву
	const indexes = Array.isArray(optionIndexes)
		? optionIndexes
		: [optionIndexes];

	// формируем объект $inc
	const incFields = indexes.reduce((acc, idx) => {
		acc[`options.${idx}.voteCount`] = 1;
		return acc;
	}, {});

	const updated = await Poll.findOneAndUpdate(
		{ pollId },
		{ $inc: incFields },
		{ new: true, runValidators: true }, // вернёт уже обновлённый документ
	);

	if (!updated) {
		throw new Error(`Poll with pollId=${pollId} not found`);
	}
	return updated;
}

module.exports = {
	createPoll,
	updatePollById,
	addActivePolls,
	isActivePoll,
	incrementPollVotes,
	getPollById,
	getAllPolls,
	deletePollById,
	deleteAllPolls,
};
