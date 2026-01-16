# Implementation Plan: Fix Validation Errors on "6 Teams - 2 Groups of 3" Generation

## Phase 1: Investigation and Bug Reproduction
- [x] Task: Reproduce the validation errors in the development environment.
    - [x] Open Gameday Designer.
    - [x] Select "6 Teams - 2 Groups of 3" template.
    - [x] Click "Generate" and confirm errors/warnings in the validation panel.
- [x] Task: Create a failing backend test case that mirrors the reported state.
    - [x] Analyze `gameday_designer/tests/` to find relevant validation tests.
    - [x] Create a new test file `gameday_designer/tests/test_validation_regression.py`.
    - [x] Write a test that applies the "6 Teams - 2 Groups of 3" template and runs the `TemplateValidationService`.
    - [x] Verify the test fails with the reported 6 overlap errors and standing warnings.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation and Bug Reproduction' (Protocol in workflow.md)

## Phase 2: Fix Overlap Validation Logic
- [x] Task: Identify the root cause of the "Game overlaps with itself" error.
    - [x] Debug `TemplateValidationService` logic responsible for overlap checks.
    - [x] Check if the logic is comparing a game's time range against itself without excluding the ID.
- [x] Task: Implement fix for overlap logic.
    - [x] Update validation code to ensure games are not compared against themselves.
    - [x] Ensure comparisons between different games on the same field correctly handle boundaries.
- [x] Task: Verify the fix with the failing test from Phase 1.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Fix Overlap Validation Logic' (Protocol in workflow.md)

## Phase 3: Fix Standing Reference Validation Logic
- [x] Task: Identify why standings are reported as "used by 2 games".
    - [x] Examine how the validation service tracks standing usage across stages.
    - [x] Check for duplicate entries in the progression mapping or standing aggregation logic.
- [x] Task: Implement fix for standing usage warnings.
    - [x] Update the validation logic to correctly count and attribute standing usage.
- [x] Task: Verify the fix with the failing test from Phase 1.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Fix Standing Reference Validation Logic' (Protocol in workflow.md)

## Phase 4: Verification and Quality Assurance
- [x] Task: Run full backend and frontend test suites.
    - [x] Execute `pytest` for backend.
    - [x] Execute `npm --prefix gameday_designer run test:run` for frontend.
- [x] Task: Perform manual validation in the UI.
    - [x] Generate the tournament again and confirm the validation panel is clear.
- [x] Task: Run project-wide QA checks (linting, type-checking).
- [x] Task: Conductor - User Manual Verification 'Phase 4: Verification and Quality Assurance' (Protocol in workflow.md)