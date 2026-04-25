---
name: react-avoid-use-effect
description: Review and refactor React code to remove unnecessary `useEffect` usage and replace it with React-first patterns. Use when working in React or React-like component files and you need to simplify Effects used for derived render data, prop-to-state syncing, event-driven logic, parent notifications, state resets, chained state updates, manual external-store subscriptions, or other cases covered by React's "You Might Not Need an Effect" guidance.
---

# React Avoid useEffect

Refactor away Effects that only manage React data flow. Keep Effects only when synchronizing with an external system such as the DOM, a network request tied to visible UI state, a browser API, a third-party widget, or another non-React source of truth.

Read [references/you-might-not-need-an-effect.md](references/you-might-not-need-an-effect.md) when you need the full replacement matrix. Use this file as the working checklist.

## Workflow

1. Find every `useEffect` in scope.
2. Classify why each Effect exists before editing it.
3. Remove Effects that only transform data, mirror props or state, or react to user actions.
4. Keep Effects that truly synchronize with something outside React.
5. Explain each retained Effect in terms of the external system it syncs with.

## Decision Tree

Ask these questions in order:

- Can the value be calculated from existing props or state during render?
  Replace redundant state and the Effect with a render-time expression.
- Is the computation pure but expensive?
  Keep it in render and use `useMemo` only if measurement or scale justifies it. Mention that React Compiler may remove the need for manual memoization.
- Is the Effect resetting an entire subtree when an identity-like prop changes?
  Split the component if needed and use a `key`.
- Is the Effect adjusting one piece of state because props changed?
  First try deriving the answer during render. If identity must be tracked, prefer storing an ID or comparable stable value. Only fall back to guarded same-component state updates during render when simpler options fail.
- Is the code caused by a click, submit, drag, or other user interaction?
  Move it into the event handler. If multiple handlers share it, extract a shared function and call it from those handlers.
- Is the Effect notifying a parent or synchronizing sibling state?
  Update both states in the same event, or lift state up and make the child controlled.
- Is the component subscribing to mutable external data?
  Prefer `useSyncExternalStore` over manual subscription Effects.
- Is the Effect fetching data because the component must stay synchronized with current visible inputs?
  An Effect may be appropriate, but add cleanup to ignore stale responses. Prefer framework data fetching when available.
- Is the code true app initialization?
  Prefer module-level initialization or a guarded root-level pattern rather than assuming mount-once behavior.
- Is the Effect synchronizing with an external DOM API, third-party widget, timer, media API, or network lifecycle?
  Keep the Effect. This is the correct escape hatch use case.

## Replacement Rules

- Do not keep duplicate state just to concatenate, filter, map, count, or format values for rendering.
- Do not move event-specific side effects into `useEffect` to avoid repeating code. Extract a function instead.
- Do not use an Effect to pass fetched child data upward. Fetch in the parent when both parent and child need the same data.
- Do not chain Effects that trigger more state updates solely to drive other Effects.
- Do not add `useMemo` by default for cheap work.
- Do not remove Effects that synchronize with an actual external system.

## Expected Output

When reviewing or refactoring, give a short result for each changed Effect:

- What the Effect was doing
- Why it was unnecessary or why it must stay
- Which replacement pattern you applied
- Any caveat, such as needing cleanup for fetches or leaving a true synchronization Effect in place

## Reference

Use [references/you-might-not-need-an-effect.md](references/you-might-not-need-an-effect.md) for concrete mappings:

- Render-time derivation
- `useMemo` for measured expensive pure work
- `key`-based resets
- Event-handler extraction
- Lifted state and controlled components
- `useSyncExternalStore`
- Fetch cleanup and when an Effect is still correct
