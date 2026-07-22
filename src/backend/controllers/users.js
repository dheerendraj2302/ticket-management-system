const usersRepository = require('../repositories/users');

async function listUsers(_req, res, next) {
  try {
    const users = await usersRepository.listUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
};
