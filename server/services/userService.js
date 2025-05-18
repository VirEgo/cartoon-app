const User = require('../models/User');

async function findUser(telegramId) {
  return await User.findOne({ telegramId });
}

async function createUser(telegramId) {
  const user = new User({ telegramId });
  await user.save();
  return user;
}

async function getOrCreateUser(telegramId) {
  let user = await findUser(telegramId);
  if (!user) {
    user = await createUser(telegramId);
  }
  return user;
}

async function updateUserField(telegramId, updates) {
  return await User.updateOne({ telegramId }, { $set: updates });
}

module.exports = {
  findUser,
  createUser,
  getOrCreateUser,
  updateUserField,
};