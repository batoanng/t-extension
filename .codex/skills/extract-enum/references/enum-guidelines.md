# Enum Guidelines

Use a TypeScript enum when values represent a fixed, reusable set of meaningful domain options.

## Good Enum Candidates

- User roles such as `admin`, `user`, and `guest`
- Workflow states such as `draft`, `submitted`, and `shipped`
- Payment or order statuses
- Shared app modes that need a runtime value for validation or schema work

Preferred form:

```ts
enum UserRole {
  Admin = "admin",
  User = "user",
  Guest = "guest",
}
```

## Signals To Extract

- The same string or value appears in multiple files or code paths
- The value has business meaning, not just presentation meaning
- Typos would be costly
- The value set is reused in validation, API boundaries, persistence, or branching logic
- A runtime object is useful for iteration or schema generation

## Signals To Keep A Union

- The values are simple frontend props such as `primary` or `secondary`
- The set is local to one component or module
- Only type safety is needed and no runtime object adds value

Example:

```ts
type ButtonSize = "small" | "medium" | "large";
```

## Enum Rules

1. Always use explicit values.
2. Make those values strings.
3. Replace raw literals with enum members after extraction.
4. Keep labels in a separate mapping if human-readable text is needed.

## Anti-Patterns

Avoid these patterns:

- Implicit enum values:

```ts
enum Suit {
  Hearts,
  Diamonds,
  Clubs,
  Spades,
}
```

- Numeric enums, even with explicit numbers:

```ts
enum Suit {
  Hearts = 0,
  Diamonds = 1,
  Clubs = 2,
  Spades = 3,
}
```

- Reverse lookups:

```ts
const key = Suit[Suit.Hearts];
```

- Passing raw literals when the type is an enum:

```ts
logSuit("hearts");
```

- `const enum` when runtime access to the enum object is needed
- Declaration merging across multiple enum declarations

## Refactoring Pattern

1. Find repeated literals for a single concept.
2. Confirm the concept is stable and shared.
3. Introduce a string enum near the domain model or shared types.
4. Replace existing literals with enum members.
5. Keep unions for lightweight UI-only variants.

## Quick Rule

Repeated domain strings such as:

```ts
"pending"
"paid"
"failed"
```

often should become:

```ts
enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
}
```
