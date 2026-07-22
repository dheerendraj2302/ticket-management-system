const {
  parseOptionalString,
  parseRequiredPositiveInteger,
  validateMaxLength,
  MAX_TEXT_LENGTH,
} = require('../utils/tickets');

function validateCreateComment(body) {
  const messageResult = parseOptionalString(body.message, 'message');
  if (messageResult.error) {
    return { error: messageResult.error, status: 400 };
  }

  const message = messageResult.value?.trim();
  if (!message) {
    return { error: 'message is required', status: 400 };
  }

  const messageLengthResult = validateMaxLength(message, 'message', MAX_TEXT_LENGTH);
  if (messageLengthResult.error) {
    return { error: messageLengthResult.error, status: 400 };
  }

  const actingUserIdResult = parseRequiredPositiveInteger(body.actingUserId, 'actingUserId');
  if (actingUserIdResult.error) {
    return { error: actingUserIdResult.error, status: 400 };
  }

  return {
    value: {
      message,
      actingUserId: actingUserIdResult.value,
    },
  };
}

module.exports = {
  validateCreateComment,
};
