-- Seed data for Support Ticket Management System
-- Clears existing rows so the script can be re-run safely after migrate.

TRUNCATE comments, tickets, users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email, role) VALUES
  ('Alice Customer', 'alice@example.com', 'customer'),
  ('Bob Agent', 'bob@example.com', 'agent'),
  ('Carol Admin', 'carol@example.com', 'admin');

INSERT INTO tickets (
  title,
  description,
  priority,
  status,
  assigned_to,
  created_by,
  updated_by
) VALUES
  (
    'Login broken',
    'Cannot log in after password reset',
    'High',
    'Open',
    2,
    1,
    1
  ),
  (
    'Billing discrepancy',
    'Invoice total does not match the subscription plan',
    'Medium',
    'In Progress',
    2,
    1,
    2
  ),
  (
    'Export report feature',
    'Need CSV export for monthly ticket summary',
    'Low',
    'Resolved',
    2,
    1,
    2
  ),
  (
    'Email notifications not received',
    'No alert emails after ticket status changes',
    'High',
    'Closed',
    2,
    1,
    1
  ),
  (
    'Duplicate account setup',
    'Customer created two accounts by mistake',
    'Medium',
    'Cancelled',
    2,
    1,
    1
  );

INSERT INTO comments (ticket_id, message, created_by) VALUES
  (
    1,
    'Investigating the login issue and checking auth logs',
    2
  ),
  (
    2,
    'Reviewing billing records for the last billing cycle',
    2
  ),
  (
    3,
    'Implemented CSV export on the reports page',
    2
  ),
  (
    4,
    'Customer confirmed notification emails are working again',
    1
  ),
  (
    5,
    'Cancelled as duplicate — original ticket remains open',
    1
  );
