# Implementation Plan: Gameday Designer Validation Warnings

This plan outlines the steps to introduce new confirmable warnings to the Gameday Designer's validation system, ensuring a safer and more guided tournament creation process.

## Phase 1: Validation Logic Expansion (TDD) [checkpoint: b67f30a]
Focus on implementing the core logic for detecting the new warning scenarios in the frontend validation service.

- [x] Task: Write Failing Tests for New Warnings [b67f30a]
    - [x] Create test cases in `gameday_designer/src/hooks/__tests__/useFlowValidation.test.ts` for:
        - [x] No teams in global pool.
        - [x] No games in any stage.
        - [x] Teams in pool with zero games (home/away).
        - [x] Fields with zero games (Staged Field Check).
        - [x] Broken dynamic progressions (referencing non-existent standings).
- [x] Task: Implement Validation Logic [b67f30a]
    - [x] Update `gameday_designer/src/hooks/useFlowValidation.ts` to implement:
        - [x] `checkNoTeams`: Warn if `globalTeams` is empty.
        - [x] `checkNoGames`: Warn if no game nodes exist.
        - [x] `checkTeamsWithoutGames`: Warn if any `globalTeam` is unused.
        - [x] `checkUnusedFields`: Warn if a field is empty but others are not.
        - [x] `checkBrokenDynamicProgressions`: Detect invalid standing references.
    - [x] Integrate these new checks into the `useFlowValidation` hook.
- [x] Task: Verify Tests and Refactor [b67f30a]
    - [x] Run tests to ensure they pass: `npm run test:run` in `gameday_designer/`.
    - [x] Refactor logic for clarity and performance if necessary.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Validation Logic Expansion' (Protocol in workflow.md)

## Phase 2: Internationalization & UI Integration
Add localized messages and ensure the UI correctly displays and interacts with the new warnings.

- [ ] Task: Localize Warning Messages
    - [ ] Update `gameday_designer/src/i18n/locales/en/validation.json` with new keys:
        - [ ] `no_teams`, `no_games`, `team_without_games`, `unused_field`, `broken_progression`.
    - [ ] Update `gameday_designer/src/i18n/locales/de/validation.json` with corresponding German translations.
- [ ] Task: Update UI Highlighting Logic
    - [ ] Update `getHighlightType` in `gameday_designer/src/components/ListDesignerApp.tsx` to handle the new warning types.
    - [ ] Ensure clicking these warnings in the `PublishConfirmationModal` or status bar highlights the relevant areas.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Internationalization & UI Integration' (Protocol in workflow.md)

## Phase 3: Final Verification & QA
Perform full system verification and ensure the publish workflow behaves as expected.

- [ ] Task: Full Test Suite Execution
    - [ ] Run all frontend tests: `npm run test:run` in `gameday_designer/`.
    - [ ] Verify that no existing validations (errors or warnings) were regressed.
- [ ] Task: Manual Publish Workflow Test
    - [ ] Verify that "No Teams" and "No Games" appear as warnings in `PublishConfirmationModal`.
    - [ ] Verify that "Publish Anyway" is enabled for these warnings.
    - [ ] Verify highlighting for unused fields and teams.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Verification & QA' (Protocol in workflow.md)
