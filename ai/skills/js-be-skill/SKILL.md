---
name: backend-js-corpus
description: >
  Use this skill ONLY for backend work in a JavaScript (Node.js) codebase using Express-style controllers.
  The skill must first learn the repo’s existing patterns (controller structure, error handling, responses,
  validation, logging, Supabase usage, routing conventions) and then implement changes in the same style.
  If new backend conventions are discovered that are not already documented, the agent must create a NEW
  Markdown knowledge file to capture them for future tasks.
---

# Backend Skill: JS Express (Repo-Learned Conventions)

## Scope

This skill applies to:

- Express routes + controllers (JS)
- Middleware (auth, roles, request parsing, schema selection)
- Data access patterns (e.g., Supabase client usage)
- Validation and error/response conventions
- Refactors and feature additions that must match existing style

Not in scope unless explicitly requested:

- Frontend/UI work
- Infrastructure (Docker/K8s) and CI/CD
- Database schema design (SQL/functions/triggers) beyond small query adjustments
- Large architecture rewrites or migration to TypeScript

## Primary objective

1. Learn how THIS repo is written (conventions + utilities).
2. Implement the requested change with minimal disruption and consistent style.
3. If the agent discovers new conventions/patterns not documented yet, create a NEW `.md` file that records them.

---

## Operating rules

### A) “Learn first” requirement (mandatory)

Before editing code, inspect the repo to infer conventions.

Minimum inspection checklist:

- `package.json` (scripts, lint/test tools, module type, Node version assumptions)
- Entry point (`server.js`, `app.js`, `index.js`, etc.)
- `routes/` structure and route naming conventions
- `controllers/` conventions (signature, try/catch, `next`, async/await)
- Shared utilities (e.g., `AppError`, `successResponse`, `getSchemaFromReq`, logging helpers)
- Middleware patterns (auth, role checks, schema/tenant selection)
- Existing error i18n/message key conventions (e.g., `"errors.server"`, `"errors.schemaMissing"`)
- Data access wrapper conventions (e.g., Supabase client initialization, `.schema(schema)` usage)

Output expectation while working:

- Follow existing naming, file structure, and patterns you observed.
- Minimize diffs: change only what’s necessary.

### B) Match existing code style (mandatory)

- JavaScript only (do not convert files to TypeScript unless asked).
- Use async/await (avoid mixing with raw `.then()` if repo uses async/await).
- Preserve controller signatures used in the repo (commonly `(req, res, next)`).
- Use existing error/response utilities if present:
  - Throw repo’s standard error type (e.g., `AppError`) instead of `Error`.
  - Return responses through the repo’s standard wrapper (e.g., `successResponse`).
- Do not introduce new dependencies unless:
  1. The repo already uses them elsewhere, or
  2. The user explicitly asks for them, or
  3. There is no safe alternative and you explain why.

### C) Do not break API contracts

- Preserve response shape (keys, nested structures) unless user requests a breaking change.
- Preserve status codes used by the repo’s conventions.
- Preserve route naming patterns and pagination strategy already used.
- Maintain existing auth / role / tenant behavior unless explicitly asked.

### D) Security baseline

- Never log secrets (tokens, API keys).
- Validate and sanitize inputs following repo’s existing approach.
- Prefer parameterized queries / query builders (no string concatenation for SQL).
- Keep authorization checks consistent with existing middleware (do not bypass).

---

## Implementation workflow

### 1) Fast repo convention extraction

Create a short internal note (not a user-facing essay) listing:

- Controller template pattern
- Error handling pattern
- Response helper pattern
- Supabase access pattern (if present)
- Route file conventions

### 2) Plan minimal edits

- Identify exact files to change.
- If refactoring, do it incrementally and keep behavior identical unless requested.

### 3) Implement

Common patterns to follow (adapt to what you learned in the repo):

- Controller:
  - `try { ... } catch (error) { next(error); }`
- Tenant schema:
  - derive schema from request via repo helper
  - fail with repo error key if missing
- Data fetching:
  - use repo’s client wrapper and selection style
  - check `error` returned by client and throw repo `AppError`

### 4) Add/update tests only if repo already has a testing setup

- If tests exist, update/add minimal tests for new behavior.
- If no tests exist, do not introduce an entire test framework unless asked.

### 5) Verification

- Run the repo’s standard scripts if available:
  - `pnpm lint` / `npm run lint`
  - `pnpm test` / `npm test`
  - `pnpm build` (if relevant)
- Ensure no new warnings, and that API behavior matches conventions.

---

## “New knowledge capture” requirement

### When to create a NEW knowledge file

Create a new Markdown file if you discover a convention/pattern that is NOT already recorded in existing knowledge files, such as:

- A new controller template style different from what’s documented
- A new response wrapper format or metadata fields
- A new error key naming convention or translation key strategy
- A new tenant/schema selection rule
- A new auth/role middleware rule
- A new logging strategy or request tracing approach
- A new standard for pagination/filtering/sorting
- A new folder naming convention (e.g., by domain module)

Do NOT create a new file for trivial observations (formatting preferences, obvious JS syntax).

### Where to store knowledge files

Create the file under:
`.agents/skills/backend-js-corpus/learned/`

If that folder doesn’t exist, create it.

### File naming convention (mandatory)

`YYYY-MM-DD--<short-slug>.md`

Example:
`2026-02-20--supabase-schema-from-req.md`

### Knowledge file template (mandatory)

Each new file must contain:

1. Title + date
2. What was discovered (concise)
3. Why it matters (how it affects future work)
4. Examples from repo (short snippets or file references; avoid pasting large code)
5. Rules to follow going forward (checklist)

Template:

# <Topic>

Date: YYYY-MM-DD

## Discovery

- ...

## Why it matters

- ...

## Evidence in repo

- File(s):
  - `path/to/file.js`
- Snippet (max ~20 lines):

```js
// ...
```
