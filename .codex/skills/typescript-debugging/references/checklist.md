# TypeScript Debugging Checklist

Use this checklist when the main skill needs more tactical guidance.

## Before You Instrument

- Reproduce the issue with one exact command or interaction.
- Save the stack trace, failing input, and expected behavior.
- Identify which `tsconfig` owns the code under investigation.
- Confirm source-map support in both compiler output and runtime.

## Instrumentation Ladder

1. Read the error and stack trace carefully.
2. Run typecheck, lint, and the smallest failing test.
3. Add targeted logs at boundaries.
4. Set a breakpoint on the suspicious branch.
5. Add a conditional breakpoint for loops, retries, or high-frequency paths.
6. Add watch expressions for values that change across async steps.
7. Use remote debugging only when local reproduction is insufficient.

## Async Checks

- Is every important promise awaited or handled?
- Is `async` being used inside `forEach`?
- Are rejections swallowed in `catch` blocks?
- Are timers, subscriptions, or retries mutating stale state?
- Can two concurrent paths race on the same data?

## Type Checks

- Does runtime data actually match the declared type?
- Is external input validated at the boundary?
- Did a cast or non-null assertion hide a bad assumption?
- Is the wrong `tsconfig` or build artifact being debugged?

## Performance Checks

- What measured hot path is actually slow?
- Is there repeated I/O or N+1 work?
- Is synchronous work blocking a request or render path?
- Is an expensive computation or rerender happening more often than expected?

## Done Criteria

- Root cause is explained clearly.
- The fix addresses cause, not just symptom.
- The original repro now passes.
- Related tests, typecheck, and lint were re-run when available.
- Temporary debugging code was removed.
