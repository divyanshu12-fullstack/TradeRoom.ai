# Coding Agent Rules — Humanized Output

These rules govern how all code in this codebase is written. The goal is output that reads like it came from a working developer, not a code generator.

---

## 1. Variable and Function Naming

- Mix naming lengths naturally. Short names for loop counters, local throwaway vars (`i`, `j`, `res`, `tmp`, `val`). Longer names only when ambiguity would hurt readability.
- Abbreviate where a real dev would. `req`, `res`, `err`, `ctx`, `cfg`, `msg`, `idx` are fine — don't spell them out.
- Avoid names that read like documentation (`handleUserAuthenticationProcess`, `processAndValidateInputData`). A human would write `handleLogin` or `validateInput`.
- Inconsistency in naming style across files is okay and expected. Don't normalize everything to one convention.

---

## 2. Comments

- Comment the *why*, not the *what*. Never write a comment that just re-states the line below it.
- Not every function needs a comment. If it's obvious, leave it blank.
- Keep comments short and casual. Contractions are fine. Full sentences aren't required.
- Drop the odd TODO or quick note where it makes sense:
  ```
  // TODO: handle edge case when user has no roles yet
  // might need to revisit this if pagination changes
  ```
- No JSDoc / docstring blocks unless the project already has them or the function is part of a public API. Don't add them retroactively.

---

## 3. Code Structure and Flow

- Vary function length. Not everything needs to be broken into micro-functions. A 60-line function that does one coherent thing is fine.
- It's okay to inline a simple check rather than extracting it. Humans don't always abstract.
- Don't symmetrize code blocks. If one branch of an if/else is 2 lines and another is 8, leave it.
- Early returns are preferred over deeply nested conditions, but don't force it everywhere.
- Avoid over-engineering. Don't add interfaces, abstractions, or design patterns unless there's a real reason.

---

## 4. Formatting and Whitespace

- Don't add blank lines between every logical "section" of a function. Space things naturally — group related lines, skip a line before a return.
- Avoid the pattern of: comment → code block → blank line → comment → code block. It's a dead giveaway.
- Trailing blank lines, minor spacing inconsistencies between files — leave them. Don't auto-clean.
- Align things only when it genuinely helps readability (e.g. a config object), not as a rule.

---

## 5. Error Handling

- Don't wrap everything in try/catch by default. Handle errors where they actually matter.
- Error messages should be short and direct: `"user not found"`, `"invalid token"` — not `"An error occurred while processing the user authentication request"`.
- Log just enough context. Not every caught error needs a stack trace dump.

---

## 6. Imports and Dependencies

- Import only what you use. Don't import a whole module for one utility.
- Group imports loosely (external → internal) but don't obsess over perfect grouping.
- If a quick inline solution is 3 lines, don't pull in a library for it.

---

## 7. Patterns and Style

- Prefer simple, readable patterns over clever or "best practice" ones. If a for loop is clearer than a chain of `.reduce().filter().map()`, use the for loop.
- Don't always use the same pattern for similar problems. Humans reach for different tools in different moods.
- Avoid the instinct to always return early, always use optional chaining, always destructure. Mix it up based on context.
- It's okay to have one file that's slightly more verbose and another that's terse. Real codebases aren't consistent.

---

## 8. What to Actively Avoid

These are the most common AI fingerprints — never do these:

- Exhaustive comments on every function
- Perfectly uniform formatting across every file
- Variable names that read like prose (`isUserAuthenticated`, `hasCompletedOnboarding`, `shouldDisplayErrorMessage`)
- Boilerplate "helper" functions that wrap one line
- Identical error handling patterns copy-pasted across every function
- `// Step 1:`, `// Step 2:` comment sequences
- Summary comments at the end of blocks (`// end of auth logic`)
- Over-descriptive console logs (`console.log("Successfully processed user request")`)
- Adding edge case handlers that weren't asked for

---

## 9. General Mindset

Write like someone who knows what they're doing but isn't trying to impress anyone. The code should work, be readable to a teammate, and look like it was written by a person solving a real problem — not generated to cover all bases.
