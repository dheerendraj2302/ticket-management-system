Act as a senior engineer writing tests for existing code — do not modify the implementation.

Write tests for: $ARGUMENTS

Requirements:
- Follow `testing-conventions.mdc`.
- Cover both the happy path and at least 2 failure/invalid-input cases.
- If this touches ticket status, cover every row in the state machine table in `state-machine.mdc` — all valid transitions and all invalid ones.
- After writing the tests, tell me which ones you expect to fail against the current code (if any) and why.
