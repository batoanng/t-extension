# Type Organization Patterns

Use this reference when the task requires a concrete layout choice rather than a general cleanup.

## Baseline Layout

Use a central folder when types are reused across features:

```text
src/
  types/
    user.ts
    product.ts
    index.ts
```

Use the barrel only as a stable import surface:

```ts
export * from "./user";
export * from "./product";
```

## Domain Layout

When the app naturally splits by business area, group by domain:

```text
src/
  types/
    auth/
      user.ts
      session.ts
    shop/
      product.ts
      order.ts
    index.ts
```

Choose domain names that match the product language, such as `billing`, `cart`, `catalog`, or `identity`.

## Shared vs Feature-Specific

Use `shared/` for contracts reused across multiple features or layers:

```text
src/
  types/
    shared/
      user.ts
      error.ts
    cart/
      cart-item.ts
```

Keep local `types.ts` files for narrow props or helper shapes that belong to one component or one module:

```text
src/
  components/
    UserProfile/
      UserProfile.tsx
      types.ts
```

Move colocated types into the central structure once multiple modules start importing them.

## Duplication Rules

- Use `Pick<T, ...>` for summaries or view models.
- Use `Omit<T, ...>` when one shape is mostly another minus a few fields.
- Use `Partial<T>` for patch payloads, drafts, or form state only when optionality is semantically correct.
- Prefer derived aliases over copy-pasted interfaces.

## Documentation and Naming

- Keep naming consistent across the repo.
- Prefer plain names like `User`, `Product`, and `CartItem` unless the repo already uses `IUser`-style prefixes.
- Add JSDoc only for intent, invariants, or external contract meaning.

## Common Pitfalls

- Scattering related types across unrelated folders.
- Moving every type to a global folder even when it is only used once.
- Creating deep barrel hierarchies that make ownership unclear.
- Copying similar interfaces instead of deriving them.
- Leaving type organization unenforced by lint or review conventions.
