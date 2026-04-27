# SOLID in React and Frontend TypeScript

This file extracts the frontend-specific lessons from the source material and rewrites them as React and TypeScript guidance.

## General Position

SOLID can help frontend code age better, but it is easy to misuse if every component turns into an abstraction exercise. Use it to separate changing concerns and keep UI code composable.

## Single Responsibility in React

The source article frames the rule of thumb simply: each component should solve a specific problem.

### Practical translation

- Keep small view components focused on one rendering responsibility.
- Avoid components that hold state, fetch data, map responses, and render the entire page at once.
- Separate data access and state orchestration from presentational rendering when those concerns can be reused or change independently.

### Why this matters

- Smaller components reduce accidental duplication.
- Separate data layers make reuse easier across multiple screens.
- Narrower components reduce merge conflicts because fewer people change the same file.

## Open-Closed in React

The source article argues that extensible components should start with composition instead of continually accepting more props for every variation.

### Practical translation

- Do not turn one component into a giant configuration surface.
- Prefer slots, children, wrapper composition, or specialized leaf components over adding mode flags and conditional branches forever.
- Keep the base component stable and extend behavior around it.

## Liskov Substitution in React with TypeScript

The source article's main takeaway is that shared TypeScript contracts make it easier to swap components.

### Practical translation

- Components or hooks that claim to be interchangeable should accept the same meaningful props and preserve the same behavioral expectations.
- A replacement should not silently require extra props, different event assumptions, or incompatible return semantics.
- Type compatibility is the floor; caller expectations still matter.

## Interface Segregation in React

The source article emphasizes keeping interfaces small and cohesive.

### Practical translation

- Component prop types should contain only what the component actually needs.
- Do not reuse a large mapper or API response type as a component prop type just because it is available.
- Unused fields still create dependency and noise even if the component never destructures them.

### Secondary benefit

Smaller interfaces improve editor completion and make components easier to understand in isolation.

## Dependency Inversion in React

The source article shows the problem with a page component depending directly on `axios` and the HTTP response shape it exposes.

### Practical translation

- Pages, hooks, and business-facing UI logic should depend on a service or gateway contract rather than a concrete HTTP library.
- Keep URL construction, response mapping, and low-level request details in service or adapter modules.
- Provide alternate implementations such as fake data sources for tests, previews, or local development.

## Frontend Checklist

- Does this component solve one UI problem?
- Is data fetching mixed into rendering without a strong reason?
- Is this reusable component being extended with composition or with endless props?
- Does this prop type expose more data than the component uses?
- Does this UI logic depend directly on `axios`, `fetch`, storage, or SDK details that could sit behind an adapter instead?
