# You Might Not Need an Effect

Source of truth: [React docs: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

Use this file when deciding whether to remove or keep a `useEffect`.

## Core Rule

Keep an Effect only when code must synchronize React with something outside React. If there is no external system, prefer a render-time calculation, an event handler, a `key`, lifted state, or a purpose-built hook.

## Replacement Matrix

| Smell | Better pattern |
| --- | --- |
| State exists only to mirror other props or state | Calculate during render |
| Pure but expensive derived value | Keep it in render and use `useMemo` only when needed |
| Reset all local state when an identity prop changes | Use a `key` on the subtree |
| Reset or adjust part of local state on prop change | Derive during render, store stable IDs, or guarded same-component state updates during render |
| User clicked, submitted, dragged, or confirmed something | Handle it in the event handler |
| Same logic repeated across multiple handlers | Extract a shared function and call it from handlers |
| Child Effect notifies parent about state changes | Update both in the same event or lift state up |
| Child fetches data and then pushes it to parent in an Effect | Fetch in the parent and pass data down |
| Manual subscription to external mutable state | Use `useSyncExternalStore` |
| Fetching data to keep visible UI synchronized with current inputs | Effect is acceptable, but add cleanup to ignore stale responses |
| Chain of Effects that successively update more state | Compute as much as possible during render and do coordinated updates in the event |

## Keep the Effect

An Effect is still the right tool when:

- Synchronizing with a non-React widget or DOM API
- Subscribing to browser or third-party state and there is no higher-level abstraction available
- Fetching data because the component must stay synchronized with current visible inputs
- Managing timers, media APIs, sockets, or similar external lifecycles

When keeping a fetching Effect, guard against stale responses with cleanup.

## Review Heuristics

Use these checks while editing:

- Ask "what external system is this syncing with?"
- If the honest answer is "none", remove the Effect.
- Ask "did this code run because the component appeared, or because the user did something?"
- If the answer is "because the user did something", move it to the handler.
- Ask "can I remove state instead of synchronizing state?"
- Prefer fewer state variables over more synchronization code.

## Common Refactors

### Derived data

- Full names, filtered lists, counts, formatted labels, booleans, and selected objects usually belong in render.
- Avoid `useEffect(() => setX(derive(...)), [...])`.

### Expensive derivation

- Start with a plain render-time calculation.
- Add `useMemo` only when the work is pure and measurably expensive.
- Remember that React Compiler can remove some need for manual memoization.

### Resetting state

- If the whole logical screen changes identity, prefer `key`.
- If only selection-like state changes, store `selectedId` and derive the selected object during render.

### Event-driven logic

- POST requests initiated by submit buttons belong in submit handlers.
- Notifications caused by clicks belong in click handlers.
- If two handlers need the same steps, extract a helper and call it from both.

### Parent-child synchronization

- Prefer downward data flow.
- If parent and child both need the same state, lift it up.
- Controlled components often remove the need for synchronization Effects entirely.

### External stores

- Prefer `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` to manual subscription Effects.

### Fetching

- Fetching can stay in an Effect when the UI must stay synchronized with visible inputs such as `query` or `page`.
- Ignore stale responses in cleanup.
- Prefer framework data APIs over ad hoc component Effects when available.

## Output Pattern

When reporting back on a refactor, summarize each Effect with:

1. Classification: derived data, event logic, true external sync, fetch, subscription, reset, or parent sync
2. Action: removed, replaced, or kept
3. Replacement: render calculation, `useMemo`, event handler, `key`, lifted state, `useSyncExternalStore`, or retained Effect with cleanup
4. Reason: one sentence tied to React data flow
