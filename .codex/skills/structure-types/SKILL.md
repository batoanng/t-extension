---
name: structure-types
description: Use when organizing, reviewing, or refactoring TypeScript types and interfaces so they are easy to find, reuse, and scale. Apply this when deciding between centralized `types/` folders and local `types.ts` files, grouping definitions by business domain, separating shared vs feature-specific types, reducing duplication with utility types, and enforcing consistent naming, barrel exports, and lint rules.
---

# Structure Types

Use this skill to make a TypeScript codebase easier to navigate. Prefer an intentional type layout over ad hoc interfaces scattered across feature files.

Read [references/patterns.md](references/patterns.md) when you need concrete folder patterns, naming guidance, or a checklist for common pitfalls.

## Workflow

1. Inventory where the relevant types currently live and who imports them.
2. Separate shared types from feature-local types before moving files.
3. Group reusable types by business domain when multiple related models exist.
4. Keep small one-off component or module types colocated only when they are not reused.
5. Replace duplicated variants with utility types such as `Pick`, `Omit`, `Partial`, or narrower derived aliases.
6. Add or update barrel exports only at stable boundaries, and avoid barrel chains that increase circular-dependency risk.
7. Add brief JSDoc only where intent or constraints are not obvious from the type itself.
8. If the repo uses linting for TypeScript, keep imports and type style consistent with those rules.

## Decision Rules

- Create or use a central `src/types/` or `src/interfaces/` folder when types are shared across features or layers.
- Use subfolders such as `types/auth/` or `types/shop/` when the project has clear business domains.
- Put cross-cutting contracts in a `shared/` area when multiple features depend on them.
- Keep feature-only types beside the feature when moving them to a global folder would add indirection without reuse.
- Prefer descriptive names such as `User` or `AuthSession`; only use prefixes like `IUser` if the repo already standardizes on them.
- Prefer derived types over restating the same shape in multiple files.
- Use barrel files to simplify imports, but do not hide ownership or create deep re-export graphs.

## Output Expectations

When you finish a task that uses this skill, state:

- Where shared types live
- Which types remain colocated and why
- Whether domains or shared folders were introduced
- Which duplications were removed with utility types or derived aliases
- Any linting, import, or circular-dependency risk that still needs follow-up
