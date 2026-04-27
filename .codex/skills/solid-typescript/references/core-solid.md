# SOLID for TypeScript

This file extracts and adapts the main ideas from the source material into TypeScript-oriented guidance.

## Why SOLID Exists

SOLID is a set of design principles intended to make code easier to maintain, extend, test, and refactor as a project grows. The core value is not object orientation for its own sake; it is reducing fragility when requirements change.

These principles also apply beyond traditional classes. In TypeScript, the same ideas map to modules, functions, services, adapters, hooks, and components.

## Single Responsibility Principle

Core idea: one unit should have one reason to change.

The source material uses a shape example where an area calculator both knows shape-specific formulas and formats output. That mixes at least two responsibilities:

- mathematical calculation
- presentation or output formatting

The fix is to push shape-specific area logic into each shape and keep output formatting in a separate output layer.

### TypeScript translation

- A service should not both fetch remote data and decide UI formatting.
- A module should not both enforce business rules and talk directly to storage.
- A React component should not both orchestrate data access and render a complex view unless those concerns genuinely change together.

### Signals of an SRP problem

- One file changes for unrelated reasons.
- A class or module grows multiple clusters of methods.
- A component both fetches, transforms, stores, and renders data.
- Tests need heavy setup because too many concerns are coupled together.

### Typical fixes

- Split domain logic from transport and presentation.
- Extract formatters, mappers, repositories, and adapters from core policy.
- Separate container logic from presentational UI.

## Open-Closed Principle

Core idea: software should be open to extension and closed to modification.

The shape example shows the problem with a calculator that keeps adding `if` or `else` branches for every new shape. Each new type forces modification of existing logic. The improvement is to let each shape provide its own behavior through a shared contract, then let the calculator consume that contract.

### TypeScript translation

- Avoid central switch statements that must be edited for every new variant when the behavior can live with the variant.
- Prefer adding a new implementation of an interface, strategy object, or handler map over editing stable orchestration code.
- Prefer composition to prop explosion in reusable UI components.

### Signals of an OCP problem

- Every new provider, event type, or variant requires editing the same file.
- Reusable components keep accumulating mode flags.
- A service imports every concrete implementation it may ever need.

### Typical fixes

- Introduce a shared contract for variant behavior.
- Replace repeated branching with strategy objects or composition.
- Move creation and wiring to a factory or composition root instead of the core module.

## Liskov Substitution Principle

Core idea: a subtype or alternate implementation must be usable anywhere its base contract is expected without breaking correctness.

The source example shows a subclass returning an array where callers expected a scalar numeric value. The inheritance relationship compiles conceptually, but callers break because the behavioral contract changed.

### TypeScript translation

In TypeScript, matching property names is not enough. Substitutability also includes behavior:

- return values must preserve the expected shape and meaning
- preconditions should not become stricter
- failure behavior should not surprise callers
- side effects should remain within the agreed contract

### Signals of an LSP problem

- One implementation needs special handling everywhere it is used.
- Callers check concrete types before they can safely call a shared method.
- A subtype throws in cases the base contract implied were valid.
- A replacement returns the same fields but different semantics.

### Typical fixes

- Tighten the abstraction so all implementations can truly honor it.
- Split incompatible behaviors into different contracts.
- Prefer composition over inheritance when implementations do not share the same behavioral expectations.

## Interface Segregation Principle

Core idea: clients should not depend on methods or fields they do not use.

The source material shows a shape interface that tries to force both area and volume into all shapes. Two-dimensional shapes do not need volume, so the interface is too broad. The fix is to split the contract into smaller capability-based interfaces.

### TypeScript translation

- Do not pass large DTOs to components that only need two fields.
- Do not reuse a repository or mapper interface in UI code just because it already exists.
- Keep service contracts focused on one client's needs.

### Signals of an ISP problem

- A prop type includes many unused fields.
- Consumers ignore most of an interface.
- Autocomplete is noisy because a contract is overloaded with unrelated members.
- Mocking a dependency requires stubbing methods the test never touches.

### Typical fixes

- Split big contracts by capability or use case.
- Derive narrower prop or input types.
- Keep read and write responsibilities separate when consumers need only one side.

## Dependency Inversion Principle

Core idea: high-level policy should depend on abstractions, and low-level details should implement those abstractions.

The source example shows a password reminder depending directly on a concrete MySQL connection. That couples business behavior to infrastructure details. The improvement is to depend on a database connection interface instead, letting different concrete connectors plug in without changing the reminder logic.

### TypeScript translation

- Business rules should depend on repository, client, clock, logger, or gateway contracts, not directly on `axios`, `fetch`, Prisma, local storage, or framework-specific modules.
- Wiring concrete implementations belongs at the edge of the system.
- Depending on abstractions also makes testing easier because mocks and fakes can satisfy the same contract.

### Signals of a DIP problem

- Domain code imports infrastructure libraries directly.
- Tests need network or database setup to exercise policy logic.
- Swapping providers requires editing business logic.

### Typical fixes

- Define a narrow contract near the high-level policy.
- Implement that contract in infrastructure adapters.
- Inject the implementation through constructors, factories, or function parameters.

## Important Practical Note

The source material also warns against dogmatic use. SOLID is useful when it reduces coupling and clarifies change boundaries. It is not a reason to create extra wrappers, interfaces, or layers without a real maintenance payoff.
