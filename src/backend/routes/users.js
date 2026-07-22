const express = require('express');

const usersController = require('../controllers/users');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(usersController.listUsers));

module.exports = router;
