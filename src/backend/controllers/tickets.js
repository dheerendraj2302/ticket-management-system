const ticketsRepository = require('../repositories/tickets');
const commentsRepository = require('../repositories/comments');
const usersRepository = require('../repositories/users');
const {
  validateCreateTicket,
  validateTicketIdParam,
  validateUpdateTicket,
  validateUpdateTicketStatus,
  validateListTicketsQuery,
} = require('../validators/tickets');
const { DEFAULT_STATUS } = require('../utils/tickets');
const {
  canCreateTicket,
  isAssignableUser,
  canUpdateTicketFields,
} = require('../utils/permissions');

async function createTicket(req, res, next) {
  try {
    const validation = validateCreateTicket(req.body);
    if (validation.error) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const { title, description, priority, assignedTo, actingUserId } = validation.value;

    const usersById = await usersRepository.findUsersByIds([actingUserId, assignedTo]);

    const actor = usersById.get(actingUserId);
    if (!actor) {
      res.status(404).json({ error: 'actingUserId does not reference an existing user' });
      return;
    }

    if (!canCreateTicket(actor)) {
      res.status(403).json({ error: 'Only customers and admins can create tickets' });
      return;
    }

    const assignee = usersById.get(assignedTo);
    if (!assignee) {
      res.status(400).json({ error: 'assignedTo does not reference an existing user' });
      return;
    }

    if (!isAssignableUser(assignee)) {
      res.status(400).json({ error: 'assignedTo must reference an agent' });
      return;
    }

    const ticket = await ticketsRepository.insertTicket({
      title,
      description,
      priority,
      status: DEFAULT_STATUS,
      assignedTo,
      actingUserId,
    });

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
}

async function listTickets(req, res, next) {
  try {
    const validation = validateListTicketsQuery(req.query);
    if (validation.error) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const tickets = await ticketsRepository.listTickets(validation.value);
    res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
}

async function getTicketById(req, res, next) {
  try {
    const validation = validateTicketIdParam(req.params.id);
    if (validation.error) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const ticket = await ticketsRepository.findTicketById(validation.value);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const comments = await commentsRepository.listCommentsByTicketId(validation.value);
    res.status(200).json({ ...ticket, comments });
  } catch (error) {
    next(error);
  }
}

async function updateTicket(req, res, next) {
  try {
    const idValidation = validateTicketIdParam(req.params.id);
    if (idValidation.error) {
      res.status(idValidation.status).json({ error: idValidation.error });
      return;
    }

    const bodyValidation = validateUpdateTicket(req.body);
    if (bodyValidation.error) {
      res.status(bodyValidation.status).json({ error: bodyValidation.error });
      return;
    }

    const ticket = await ticketsRepository.findTicketById(idValidation.value);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const { actingUserId, ...updates } = bodyValidation.value;

    const actor = await usersRepository.findUserById(actingUserId);
    if (!actor) {
      res.status(404).json({ error: 'actingUserId does not reference an existing user' });
      return;
    }

    if (!canUpdateTicketFields(actor, ticket)) {
      res.status(403).json({ error: 'You do not have permission to update this ticket' });
      return;
    }

    if (updates.assignedTo !== undefined) {
      const usersById = await usersRepository.findUsersByIds([updates.assignedTo]);
      const assignee = usersById.get(updates.assignedTo);

      if (!assignee) {
        res.status(404).json({ error: 'assignedTo does not reference an existing user' });
        return;
      }

      if (!isAssignableUser(assignee)) {
        res.status(400).json({ error: 'assignedTo must reference an agent' });
        return;
      }
    }

    const updatedTicket = await ticketsRepository.updateTicket(
      idValidation.value,
      updates,
      actingUserId
    );

    res.status(200).json(updatedTicket);
  } catch (error) {
    next(error);
  }
}

async function updateTicketStatus(req, res, next) {
  try {
    const idValidation = validateTicketIdParam(req.params.id);
    if (idValidation.error) {
      res.status(idValidation.status).json({ error: idValidation.error });
      return;
    }

    const bodyValidation = validateUpdateTicketStatus(req.body);
    if (bodyValidation.error) {
      res.status(bodyValidation.status).json({ error: bodyValidation.error });
      return;
    }

    const { status, actingUserId, remarks } = bodyValidation.value;

    const actor = await usersRepository.findUserById(actingUserId);
    if (!actor) {
      res.status(404).json({ error: 'actingUserId does not reference an existing user' });
      return;
    }

    const updatedTicket = await ticketsRepository.updateTicketStatus(
      idValidation.value,
      status,
      actor,
      remarks
    );

    res.status(200).json(updatedTicket);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
};
