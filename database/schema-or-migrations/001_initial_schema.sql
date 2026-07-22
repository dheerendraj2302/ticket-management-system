-- Initial schema: users, tickets (with updated_by), comments
-- Enum values match tool-specific/cursor-workflow/spec.md

CREATE TYPE user_role AS ENUM ('customer', 'agent', 'admin');

CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE ticket_status AS ENUM (
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
  'Cancelled'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role NOT NULL
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'Medium',
  status ticket_status NOT NULL DEFAULT 'Open',
  assigned_to INTEGER NOT NULL REFERENCES users (id),
  created_by INTEGER NOT NULL REFERENCES users (id),
  updated_by INTEGER NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets (id),
  message TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_ticket_id ON comments (ticket_id);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_priority ON tickets (priority);
