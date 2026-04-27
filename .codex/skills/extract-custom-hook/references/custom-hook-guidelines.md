# Custom Hook Guidelines

Use this reference when deciding whether to extract a custom Hook and how to shape it.

## Extract When

- Two or more components repeat the same stateful logic.
- One component is dominated by subscription, timer, fetch, or browser API wiring that obscures its intent.
- The call site becomes clearer when it can say `const isOnline = useOnlineStatus()` instead of repeating setup details.

## Do Not Extract When

- The logic is a pure calculation with no Hook usage.
- The code is only shared markup or UI structure; that should usually become a component.
- The real need is one shared state instance across components; use lifted state, context, or a store instead.
- The proposed Hook is just a lifecycle alias such as `useMount`, `useEffectOnce`, or `useComponentDidMount`.

## Naming And Shape

- Hook names start with `use` and describe behavior, not the primitive inside.
- Prefer names like `useOnlineStatus`, `useCounter`, `useChatRoom`, `useDocumentTitle`.
- Pass reactive inputs as arguments.
- Return only what callers need. A single value is fine; otherwise prefer a small object with clear names.

## Extraction Checklist

1. Copy the local state and Effects into a new `useX` function.
2. Keep the same cleanup and dependency semantics.
3. Replace hardcoded values with parameters where reuse actually needs them.
4. Update the component to call the Hook.
5. Verify every caller gets its own independent state and subscriptions.

## Callback Handling

If a Hook accepts an event handler and uses it from an Effect, subscription, or connection callback, prefer wrapping that handler with `useEffectEvent` when the repo uses that pattern. This keeps the external subscription stable while still reading the latest callback logic.

## Design Pressure Tests

- Can a caller understand the Hook's purpose from its name alone?
- Would a regular function be simpler because no Hooks are involved?
- Is the Hook combining more than one reason to change?
- Does the Hook expose intent, or just re-export `useEffect` with a different label?
- If React later adds a more specific built-in solution, would this Hook provide a clean migration boundary?
