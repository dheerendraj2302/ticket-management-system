Act as a meticulous note-taker summarizing the session that just happened — do not start a new task or write any new code.

Target log (optional — infer from context if left blank): $ARGUMENTS

Steps:
1. If no target log was given, decide which lifecycle stage this session belongs to: planning, design, implementation, testing, debugging, code-review, or documentation. If it doesn't cleanly fit one, ask me before proceeding.
2. Open the matching file in `ai-prompts/` and check its existing entries to find the next Entry number.
3. Draft the new entry in the exact format already used in that file:
   - **Prompt:** a faithful summary of what I actually asked this session — not a cleaned-up version of it.
   - **AI Response Summary:** what you actually proposed or did.
   - **Accepted:** diff your original proposal against the current code/state and state what made it in unchanged.
   - **Changed:** state what was modified after your proposal, as far as you can tell from the diff.
   - **Rejected:** leave this heading empty.
   - **Why:** leave this heading empty.
4. Show me the drafted entry before appending it, so I can correct anything inaccurate.
5. Once I confirm, append it as a new Entry block to the file — never overwrite or reorder existing entries.
