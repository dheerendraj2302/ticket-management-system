Act as a strict, skeptical senior engineer reviewing this diff — assume it has problems until proven otherwise.

Review: $ARGUMENTS

Check specifically for:
- Missing or weak input validation
- SQL injection or unescaped query risk
- State-machine transitions not enforced correctly (see `state-machine.mdc`)
- Missing error handling or swallowed errors
- N+1 queries or obviously inefficient database access
- Anything committed that looks like a secret or credential

Output a numbered list of findings, each marked Must Fix / Should Fix / Nitpick. Don't rewrite the code yourself — just review it.
