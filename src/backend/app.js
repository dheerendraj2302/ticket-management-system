const express = require('express');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const ticketsRouter = require('./routes/tickets');
const usersRouter = require('./routes/users');

function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/tickets', ticketsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
