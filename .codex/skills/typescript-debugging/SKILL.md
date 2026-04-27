---
name: typescript-debugging
description: Use when debugging TypeScript or JavaScript code so failures are reproduced, source maps are verified, instrumentation stays intentional, and fixes target root cause instead of symptoms. Apply this to runtime exceptions, wrong output, async timing bugs, flaky tests, third-party integration issues, and performance regressions.
---

# TypeScript Debugging

Use this skill when a TypeScript or JavaScript issue needs a disciplined debugging workflow. The goal is to move from symptom to evidence to root cause with as little thrash as possible.

Read [references/checklist.md](references/checklist.md) when you need a quick decision guide for source maps, breakpoints, async bugs, or performance investigation.

## Workflow

1. Reproduce the failure with one exact command, request, or user interaction.
2. Write down expected behavior, actual behavior, and the smallest reliable repro path.
3. Verify the relevant `tsconfig` and runtime support source maps before trusting line numbers.
4. Run static signals first: typecheck, lint, focused test, build error, stack trace.
5. Add the lightest instrumentation that can answer the next question:
   - log at input and output boundaries
   - use a breakpoint to inspect local state
   - use a conditional breakpoint for loops or rare branches
   - use a watch expression when a value mutates over time
6. Compare runtime values against declared types, especially around API responses, env vars, storage, and browser events.
7. For async issues, trace awaits, promise rejection paths, timers, subscriptions, retries, and stale closures explicitly.
8. For third-party issues, isolate the adapter or wrapper boundary before debugging the entire app.
9. For performance issues, measure the hot path with timings or profiling before editing code.
10. Apply the smallest fix that addresses the proven cause, then re-run the same repro and nearby regression checks.

## Decision Rules

- Enable `sourceMap` or the repo's chosen source-map strategy whenever TypeScript must be debugged through emitted JavaScript.
- Prefer `node --enable-source-maps` or the equivalent runtime support when debugging Node output.
- Use `console.log` only when you need fast boundary visibility; remove it once the answer is known.
- Use conditional breakpoints instead of repeated logging inside loops, retries, or noisy render paths.
- Use watch expressions when a value changes across frames or asynchronous steps.
- Remote debug only when the bug depends on another environment, device, browser, container, or server.
- Treat `any`, non-null assertions, and broad casts as debugging suspects, not proof of correctness.
- Do not fix a symptom before you can explain why it happened.

## Pitfalls

- Starting without a reproducible failing path
- Ignoring compiler warnings
- Trusting source locations when source maps are broken
- Logging everywhere instead of asking one focused question
- Forgetting null, undefined, empty, and invalid-input cases
- Missing async race conditions because only happy paths were inspected
- Leaving breakpoints or `debugger` statements in committed code

## Output Expectations

When using this skill, state:

- the exact repro path
- what signal exposed the root cause
- whether source maps or runtime config needed correction
- the minimal fix that was applied
- how the fix was verified
