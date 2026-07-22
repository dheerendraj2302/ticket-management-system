const express = require('express');

const commentsController = require('../controllers/comments');
const ticketsController = require('../controllers/tickets');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(ticketsController.listTickets));
router.get('/:id', asyncHandler(ticketsController.getTicketById));
router.post('/', asyncHandler(ticketsController.createTicket));
router.post('/:id/comments', asyncHandler(commentsController.createComment));
router.patch('/:id/status', asyncHandler(ticketsController.updateTicketStatus));
router.patch('/:id', asyncHandler(ticketsController.updateTicket));

module.exports = router;
