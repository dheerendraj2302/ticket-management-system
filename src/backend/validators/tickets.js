const {
  DEFAULT_PRIORITY,
  VALID_PRIORITIES,
  VALID_STATUSES,
  MAX_TITLE_LENGTH,
  MAX_TEXT_LENGTH,
  parseOptionalString,
  parseRequiredPositiveInteger,
  validateMaxLength,
} = require('../utils/tickets');
const { requiresRemarks } = require('../utils/stateMachine');

function validateCreateTicket(body) {
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    return { error: 'status cannot be set on create', status: 400 };
  }

  const titleResult = parseOptionalString(body.title, 'title');
  if (titleResult.error) {
    return { error: titleResult.error, status: 400 };
  }

  const descriptionResult = parseOptionalString(body.description, 'description');
  if (descriptionResult.error) {
    return { error: descriptionResult.error, status: 400 };
  }

  const title = titleResult.value?.trim();
  if (!title) {
    return { error: 'title is required', status: 400 };
  }

  const titleLengthResult = validateMaxLength(title, 'title', MAX_TITLE_LENGTH);
  if (titleLengthResult.error) {
    return { error: titleLengthResult.error, status: 400 };
  }

  const description = descriptionResult.value?.trim();
  if (!description) {
    return { error: 'description is required', status: 400 };
  }

  const descriptionLengthResult = validateMaxLength(
    description,
    'description',
    MAX_TEXT_LENGTH
  );
  if (descriptionLengthResult.error) {
    return { error: descriptionLengthResult.error, status: 400 };
  }

  const assignedToResult = parseRequiredPositiveInteger(body.assignedTo, 'assignedTo');
  if (assignedToResult.error) {
    return { error: assignedToResult.error, status: 400 };
  }

  const actingUserIdResult = parseRequiredPositiveInteger(body.actingUserId, 'actingUserId');
  if (actingUserIdResult.error) {
    return { error: actingUserIdResult.error, status: 400 };
  }

  let priority = DEFAULT_PRIORITY;
  if (body.priority !== undefined && body.priority !== null) {
    if (typeof body.priority !== 'string' || !VALID_PRIORITIES.includes(body.priority)) {
      return {
        error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        status: 400,
      };
    }

    priority = body.priority;
  }

  return {
    value: {
      title,
      description,
      priority,
      assignedTo: assignedToResult.value,
      actingUserId: actingUserIdResult.value,
    },
  };
}

function validateTicketIdParam(id) {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: 'id must be a valid ticket id', status: 400 };
  }

  return { value: parsed };
}

function validateUpdateTicket(body) {
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    return {
      error: 'status cannot be updated via this endpoint',
      status: 400,
    };
  }

  const actingUserIdResult = parseRequiredPositiveInteger(body.actingUserId, 'actingUserId');
  if (actingUserIdResult.error) {
    return { error: actingUserIdResult.error, status: 400 };
  }

  const updates = {
    actingUserId: actingUserIdResult.value,
  };

  if (body.title !== undefined) {
    const titleResult = parseOptionalString(body.title, 'title');
    if (titleResult.error) {
      return { error: titleResult.error, status: 400 };
    }

    const title = titleResult.value.trim();
    if (!title) {
      return { error: 'title must be non-empty', status: 400 };
    }

    const titleLengthResult = validateMaxLength(title, 'title', MAX_TITLE_LENGTH);
    if (titleLengthResult.error) {
      return { error: titleLengthResult.error, status: 400 };
    }

    updates.title = title;
  }

  if (body.description !== undefined) {
    const descriptionResult = parseOptionalString(body.description, 'description');
    if (descriptionResult.error) {
      return { error: descriptionResult.error, status: 400 };
    }

    const description = descriptionResult.value.trim();
    if (!description) {
      return { error: 'description must be non-empty', status: 400 };
    }

    const descriptionLengthResult = validateMaxLength(
      description,
      'description',
      MAX_TEXT_LENGTH
    );
    if (descriptionLengthResult.error) {
      return { error: descriptionLengthResult.error, status: 400 };
    }

    updates.description = description;
  }

  if (body.priority !== undefined && body.priority !== null) {
    if (typeof body.priority !== 'string' || !VALID_PRIORITIES.includes(body.priority)) {
      return {
        error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        status: 400,
      };
    }

    updates.priority = body.priority;
  }

  if (body.assignedTo !== undefined) {
    if (body.assignedTo === null) {
      return { error: 'assignedTo cannot be null', status: 400 };
    }

    const assignedToResult = parseRequiredPositiveInteger(body.assignedTo, 'assignedTo');
    if (assignedToResult.error) {
      return { error: assignedToResult.error, status: 400 };
    }

    updates.assignedTo = assignedToResult.value;
  }

  return { value: updates };
}

function validateUpdateTicketStatus(body) {
  if (body.status === undefined || body.status === null) {
    return { error: 'status is required', status: 400 };
  }

  if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
    return {
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      status: 400,
    };
  }

  const actingUserIdResult = parseRequiredPositiveInteger(body.actingUserId, 'actingUserId');
  if (actingUserIdResult.error) {
    return { error: actingUserIdResult.error, status: 400 };
  }

  let remarks;

  if (requiresRemarks(body.status)) {
    if (body.remarks === undefined || body.remarks === null) {
      return {
        error: 'Remarks are required when resolving or cancelling a ticket',
        status: 400,
      };
    }

    const remarksResult = parseOptionalString(body.remarks, 'remarks');
    if (remarksResult.error) {
      return { error: remarksResult.error, status: 400 };
    }

    remarks = remarksResult.value.trim();
    if (!remarks) {
      return {
        error: 'Remarks are required when resolving or cancelling a ticket',
        status: 400,
      };
    }

    const remarksLengthResult = validateMaxLength(remarks, 'remarks', MAX_TEXT_LENGTH);
    if (remarksLengthResult.error) {
      return { error: remarksLengthResult.error, status: 400 };
    }
  } else if (body.remarks !== undefined && body.remarks !== null) {
    const remarksResult = parseOptionalString(body.remarks, 'remarks');
    if (remarksResult.error) {
      return { error: remarksResult.error, status: 400 };
    }

    const trimmedRemarks = remarksResult.value.trim();
    if (trimmedRemarks) {
      const remarksLengthResult = validateMaxLength(
        trimmedRemarks,
        'remarks',
        MAX_TEXT_LENGTH
      );
      if (remarksLengthResult.error) {
        return { error: remarksLengthResult.error, status: 400 };
      }

      remarks = trimmedRemarks;
    }
  }

  return {
    value: {
      status: body.status,
      actingUserId: actingUserIdResult.value,
      remarks,
    },
  };
}

function validateListTicketsQuery(query) {
  const filters = {};

  if (query.search !== undefined) {
    const searchResult = parseOptionalString(query.search, 'search');
    if (searchResult.error) {
      return { error: searchResult.error, status: 400 };
    }

    const search = searchResult.value?.trim();
    if (search) {
      filters.search = search;
    }
  }

  if (query.status !== undefined && query.status !== '') {
    if (typeof query.status !== 'string' || !VALID_STATUSES.includes(query.status)) {
      return {
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        status: 400,
      };
    }

    filters.status = query.status;
  }

  if (query.priority !== undefined && query.priority !== '') {
    if (typeof query.priority !== 'string' || !VALID_PRIORITIES.includes(query.priority)) {
      return {
        error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        status: 400,
      };
    }

    filters.priority = query.priority;
  }

  return { value: filters };
}

module.exports = {
  validateCreateTicket,
  validateTicketIdParam,
  validateUpdateTicket,
  validateUpdateTicketStatus,
  validateListTicketsQuery,
};
