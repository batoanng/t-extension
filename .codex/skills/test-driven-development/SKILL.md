---
name: test-driven-development
description: Use when building a new feature, helper, API, or function and you want a test-first workflow. Follow a red-green-refactor loop: write one failing test for the intended behavior, run it to confirm failure, write only enough code to pass, refactor both the code and the test, then repeat for the next behavior. Prefer acceptance-style tests for user-visible behavior and unit tests for function-level logic.
---

# Test-Driven Development

Use this skill when the safest way to build new behavior is to drive implementation from tests. Keep the loop small: one behavior, one failing test, one minimal implementation, one refactor.

Read [references/ibm-tdd.md](references/ibm-tdd.md) when you want the IBM-based rationale or a refresher on the TDD cycle.

## Workflow

1. Identify the next smallest observable behavior to add.
2. Choose the test level before writing code.
3. Write one test that describes the intended behavior.
4. Run the test and confirm it fails for the expected reason.
5. Write only enough production code to make that test pass.
6. Re-run the smallest relevant test scope until green.
7. Refactor the implementation and the test for clarity and simplicity without changing behavior.
8. Repeat for the next behavior.
9. After the slice is complete, run the broader relevant test suite and any required lint or type checks.

## Test Level Selection

- Use an acceptance-style or integration test when the behavior is user-visible, API-facing, or spans multiple modules.
- Use a developer/unit test when the change is centered on a single function, helper, class, or algorithm.
- For a larger feature, start with one acceptance-level behavior, then add unit tests for the lower-level logic that emerges.

## Rules

- Do not write production code before the test that requires it.
- If the new test passes before the code change, fix the test before continuing.
- Test observable behavior, contracts, and outputs rather than private implementation details.
- Keep each cycle small enough that the cause of failure is obvious.
- Prefer targeted mocks or fakes only at system boundaries such as network, filesystem, time, randomness, or third-party APIs.
- Keep tests deterministic and independent.
- For a bug fix, start with a regression test that reproduces the failure.

## Repo Guidance

- Inspect the nearest `package.json` before starting so you use the right test command for the package you are changing.
- In this repo, prefer the smallest relevant test scope first. Use workspace-wide `pnpm test` only when package-level targeting is not enough.
- When changing public APIs or cross-package behavior, add or update the higher-level test that proves the contract still holds.

## Expected Output

When finishing a task that uses this skill, include a short note covering:

- The behavior that was specified first in tests
- Which test level you used and why
- The minimal implementation added to get green
- Any refactor performed after the test passed
- Any remaining risk that still requires broader QA beyond TDD
