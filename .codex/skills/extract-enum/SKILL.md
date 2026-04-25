---
name: extract-enum
description: Use when refactoring TypeScript code that repeats a fixed set of meaningful values into a shared enum. Apply this when replacing repeated domain strings such as statuses, roles, or states with a reusable string enum, deciding when a union type is better for UI-only props, and migrating call sites without numeric enums, implicit values, reverse lookups, const enums, or declaration merging.
---

# Extract Enum

Use this skill when a TypeScript codebase has repeated literals that represent stable domain options and should become a shared runtime construct.

Read [references/enum-guidelines.md](references/enum-guidelines.md) when you need examples, anti-patterns, or a quick enum-vs-union decision check.

## Workflow

1. Inventory the repeated literals and confirm they represent a fixed set of meaningful options.
2. Check whether the values are part of domain logic, API contracts, validation, persistence, or shared business rules.
3. If the values are mostly local UI variants or one-off props, keep a union type instead of extracting an enum.
4. When extracting an enum, use a standard `enum` with explicit string values for every member.
5. Replace raw literals at call sites with enum members so enum-typed code does not mix in magic strings.
6. Keep user-facing labels in a separate mapping when descriptive names are needed; do not reverse-lookup enum keys.
7. Avoid numeric enums, implicit member values, `const enum`, and declaration merging unless the task explicitly requires one of those tradeoffs and the repo already relies on it.
8. If runtime validation, schema generation, or iteration needs the value set, prefer the enum object over a type-only union.

## Decision Rules

- Extract an enum when the same value appears in multiple places and carries business meaning.
- Prefer enums for shared statuses, roles, modes, and workflow states that benefit from a runtime object.
- Prefer unions for simple component props such as button variants or small local presentation choices.
- Do not create an enum for values that are only used once or have no domain significance.
- Do not use implicit numeric values; always assign explicit string values.
- Do not use raw string literals once an enum exists for that concept.
- Do not use reverse lookups like `Enum[Enum.Member]`; create an explicit mapping instead.
- Do not declaration-merge enums.

## Preferred Pattern

```ts
enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
  Refunded = "refunded",
}
```

Use the enum in code:

```ts
if (status === PaymentStatus.Paid) {
  // ...
}
```

Use a union instead when the values are lightweight UI options:

```ts
type ButtonVariant = "primary" | "secondary" | "danger";
```

## Output Expectations

When you finish a task that uses this skill, state:

- Whether the values were extracted to an enum or intentionally kept as a union
- Why the chosen representation fits the code's domain and runtime needs
- Where the enum or type now lives
- Whether repeated magic strings were replaced across call sites
- Any remaining literals or migration risks that still need follow-up
