---
name: extract-custom-hook
description: Use when refactoring React or React-like components to extract duplicated stateful logic into a focused custom Hook. Apply this when multiple components repeat the same `useState`, `useEffect`, `useContext`, subscription, timer, browser API, or external-system synchronization pattern; when deciding between a custom Hook, a plain function, or lifted state; and when designing a Hook API, naming it correctly, and avoiding vague lifecycle wrappers such as `useMount`.
---

# Extract Custom Hook

Extract a custom Hook when it makes component intent clearer and removes repeated stateful logic. A custom Hook should package one concrete React use case, not act as a generic lifecycle wrapper.

Read [references/custom-hook-guidelines.md](references/custom-hook-guidelines.md) when you need examples, anti-patterns, or a quick extraction check.

## Workflow

1. Find the repeated or noisy logic and identify the real purpose behind it.
2. Confirm the logic actually needs Hooks. If not, extract a regular function instead of a custom Hook.
3. Decide whether the problem is reuse of stateful logic, or true shared state that should be lifted or stored elsewhere.
4. Design the Hook around a concrete use case with a purpose-based name like `useOnlineStatus` or `useChatRoom`.
5. Move the state, Effects, and helper logic into the Hook without changing dependency behavior, cleanup, or external synchronization semantics.
6. Pass reactive inputs into the Hook as arguments, and return the minimum values and actions the component needs.
7. Replace the old component-local logic with the Hook call and verify each caller still works independently.

## Decision Rules

- Extract a custom Hook when the same stateful logic appears in multiple components or when one component becomes much easier to read after the stateful details are hidden behind a clearer API.
- Use a regular function, not a Hook, when the extracted code does not call Hooks.
- Do not expect a custom Hook to share state between components. Each call gets its own state and Effects.
- If multiple components need the same state instance, lift the state up or use context or an external store.
- Name Hooks with `use` followed by a capital letter, and name them after purpose rather than implementation details.
- Keep the Hook focused on one high-level behavior. Do not create generic lifecycle wrappers such as `useMount`, `useOnce`, or `useEffectOnce` unless the codebase already has a deliberate pattern and the task explicitly requires it.
- Keep Hook code pure with respect to render: no conditional Hook calls, no hidden mutation during render, and no dependency suppression to force behavior.
- If the Hook accepts callbacks that are used from an Effect or subscription, wrap them with `useEffectEvent` when that pattern is available in the codebase.
- If the extracted logic is mostly UI structure, prefer a component. If it is mostly behavior and stateful coordination, prefer a custom Hook.

## API Checklist

- Choose a purpose-based name: `useOnlineStatus`, `useCounter`, `useChatRoom`.
- Accept reactive values explicitly as parameters instead of closing over unrelated module state.
- Return the smallest useful surface area: a value, an object, or a small set of actions.
- Prefer arguments and return values that read declaratively at the call site.
- Keep external-system setup and cleanup inside the Hook so components express intent instead of wiring details.

## Guardrails

- Do not extract a Hook only to move code around without improving reuse, clarity, or API shape.
- Do not use a Hook to hide broken Effect dependencies or stale-closure bugs.
- Do not prefix helper functions with `use` unless they actually call Hooks now or are intentionally reserved for imminent Hook usage.
- Do not collapse unrelated behaviors into one broad Hook just because they happen in the same component today.
- Do not replace a straightforward render-time calculation with a Hook.

## Expected Output

When you finish a task that uses this skill, state:

- Why the logic was extracted to a custom Hook, or why it was intentionally kept local
- Why the extraction is a Hook instead of a regular function, component, or lifted state
- The Hook name, its inputs, and what it returns
- Any React-specific caveats, such as independent state per caller, retained Effect cleanup, or callback handling with `useEffectEvent`
