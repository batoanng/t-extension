---
name: solid-typescript
description: Use when designing, reviewing, or refactoring TypeScript code so responsibilities, extension points, contracts, and dependencies stay cohesive and replaceable. Apply this to classes, modules, services, hooks, and React components when you need to split mixed concerns, extend behavior without editing stable code, keep interfaces narrow, preserve substitutability, or invert dependencies away from concrete infrastructure.
---

# SOLID TypeScript

Use this skill to apply SOLID as a practical design review for TypeScript. Treat the principles as pressure tests for maintainability, not as a reason to add ceremony.

Read [references/core-solid.md](references/core-solid.md) when you need the extracted principle summaries and TypeScript translations. Read [references/react-solid.md](references/react-solid.md) when the code is in React or frontend UI layers.

## Workflow

1. Identify the unit under change: class, module, service, hook, component, or adapter.
2. List the reasons that unit might change.
3. Split mixed concerns before adding new abstractions.
4. Define the stable contract the rest of the code should rely on.
5. Extend behavior through new implementations or composition before editing existing decision logic.
6. Check that replacements honoring the same contract do not break callers.
7. Shrink interfaces and prop types so consumers depend only on what they use.
8. Move high-level business logic to abstractions instead of concrete libraries, clients, or storage details.
9. Stop when the design is clearer; do not add layers that do not reduce coupling or volatility.

## Principle Checks

- `SRP`: A unit should have one reason to change. Separate business rules, I/O, mapping, formatting, persistence, rendering, and orchestration when they evolve for different reasons.
- `OCP`: Prefer adding a new implementation, strategy, or composed branch over editing a stable module every time a new variant appears.
- `LSP`: Any implementation of a shared contract must preserve the caller's expectations for inputs, outputs, side effects, and failure behavior.
- `ISP`: Keep interfaces, prop types, and service contracts small. Do not force consumers to depend on fields or methods they do not need.
- `DIP`: High-level policy should depend on abstract contracts, not concrete HTTP clients, databases, framework APIs, or singleton utilities.

## TypeScript Guidance

- Use `interface`, type aliases, discriminated unions, and function contracts to express stable seams.
- Keep domain types separate from transport DTOs and UI props when they change for different reasons.
- Prefer constructor parameters, function parameters, or factory arguments for injected dependencies over hidden imports inside business logic.
- When a module branches on many `kind`, `type`, or `instanceof` checks, consider whether the behavior belongs on the variant itself or behind a shared strategy.
- When reusing a type would leak unrelated fields into a consumer, derive a smaller type instead of passing the larger one through.
- If a new abstraction has only one implementation and no volatility, keep the code direct until a real extension point appears.

## React and Frontend Rules

- Keep presentational components focused on one UI problem.
- Separate rendering from data fetching, state persistence, HTTP details, and mapping logic when those concerns change independently.
- Prefer composition over adding many boolean or mode props to one reusable component.
- Keep component props narrow and avoid reusing large API response types as props.
- Put infrastructure details such as `fetch`, `axios`, storage, analytics, or feature-flag SDKs behind adapters when business logic should not depend on them directly.

## Review Questions

- What are the distinct reasons this unit would change?
- If a new variant is added next week, what file must be edited?
- Can one implementation be swapped for another without surprising callers?
- Which fields or methods in this contract are unused by the current consumer?
- Does this business rule import infrastructure directly when it could depend on a narrower contract?
- Did this refactor make the code easier to follow, or only more abstract?

## Expected Output

When using this skill, report:

- Which SOLID pressure points were present
- What responsibilities or dependencies were split
- Which contract or composition seam was introduced or preserved
- Any place where extra abstraction was intentionally avoided
