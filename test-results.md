# Test Results

_Must be real, captured output — run your tests and paste the actual result, don't reconstruct from memory._

## Command Run
```bash
cd src/backend && npm test -- --runInBand --forceExit
```

## Summary
- Total: 93
- Passed: 93
- Failed: 0
- Test Suites: 7 passed, 7 total
- Time: 46.417 s

## Full Output
```
> support-ticket-backend@1.0.0 test
> jest --runInBand --forceExit

PASS ../../tests/tickets.test.js (23.134 s)
PASS ../../tests/users.test.js
PASS ../../tests/seed.test.js (5.839 s)
PASS ../../tests/db.test.js
PASS ../../tests/comments.test.js
PASS ../../tests/schema.test.js
PASS ../../tests/stateMachine.test.js

Test Suites: 7 passed, 7 total
Tests:       93 passed, 93 total
Snapshots:   0 total
Time:        46.417 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
```

## Notes

- Run from `src/backend` on Thursday, Jul 23, 2026.
- `--runInBand` used to avoid parallel test DB setup races; `--forceExit` used because Jest reported open handles after completion.
- All suites passed: `tickets`, `db`, `comments`, `schema`, `users`, `seed`, `stateMachine`.
- Count rose from 90 → 92 with two new `POST /api/tickets` cases: agent creating a ticket (403) and `assignedTo` not an agent (400). Three pre-existing status/update setups were updated to create tickets as admin (not agent) and assign to the seeded agent, matching the new create-permission rules.
- Count rose 92 → 93 with a new `PATCH /api/tickets/:id` case: an agent updating a ticket assigned to them is denied (403), per the rule that agents cannot edit ticket fields (status transitions only).
