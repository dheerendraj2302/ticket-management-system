const ticketsRepository = require('../repositories/tickets');
const commentsRepository = require('../repositories/comments');
const usersRepository = require('../repositories/users');
const { validateTicketIdParam } = require('../validators/tickets');
const { validateCreateComment } = require('../validators/comments');

async function createComment(req, res, next) {
  try {
    const idValidation = validateTicketIdParam(req.params.id);
    if (idValidation.error) {
      res.status(idValidation.status).json({ error: idValidation.error });
      return;
    }

    const bodyValidation = validateCreateComment(req.body);
    if (bodyValidation.error) {
      res.status(bodyValidation.status).json({ error: bodyValidation.error });
      return;
    }

    const ticket = await ticketsRepository.findTicketById(idValidation.value);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const { message, actingUserId } = bodyValidation.value;

    const actor = await usersRepository.findUserById(actingUserId);
    if (!actor) {
      res.status(404).json({ error: 'actingUserId does not reference an existing user' });
      return;
    }

    const comment = await commentsRepository.createComment({
      ticketId: idValidation.value,
      message,
      createdBy: actingUserId,
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComment,
};
