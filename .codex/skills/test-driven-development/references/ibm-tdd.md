Source: IBM Think, "What is test-driven development (TDD)?"
URL: https://www.ibm.com/think/topics/test-driven-development

# IBM TDD Summary

IBM describes test-driven development as writing tests before the corresponding functions, then writing enough code to pass each test before refining both the code and the test.

## Core Cycle

The article frames TDD as a repeatable loop:

- Red: write a failing test for the intended behavior
- Green: write enough code to make the test pass
- Refactor: simplify and clean up while keeping the test green

IBM also breaks the workflow into five steps:

1. Write a test for a specific function or behavior.
2. Run it and confirm it fails because the behavior does not exist yet.
3. Add only enough code to pass.
4. Refactor the code and the test for simplicity.
5. Move to the next function or behavior and repeat.

## Two Levels

- Acceptance TDD: start from a customer- or stakeholder-visible behavior.
- Developer TDD: add focused tests that validate the programmer's solution to that behavior.

For feature work, this maps well to one higher-level behavior test plus smaller unit tests for the implementation details that appear underneath it.

## Why This Skill Uses It

IBM highlights these practical outcomes of TDD:

- clearer requirements before coding
- smaller debugging surface because failures appear earlier
- stronger documentation through executable tests
- simpler design through repeated refactoring

## Important Constraint

IBM also notes that TDD does not replace broader quality control. Passing tests for each increment can still leave integration or system-level issues, so broader verification may still be needed before merge or release.
