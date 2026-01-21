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

## Phase 2: Internationalization & UI Integration [checkpoint: 8bc8014]
Add localized messages and ensure the UI correctly displays and interacts with the new warnings.

- [x] Task: Localize Warning Messages [8bc8014]
    - [x] Update `gameday_designer/src/i18n/locales/en/validation.json` with new keys:
        - [x] `no_teams`, `no_games`, `team_without_games`, `unused_field`, `broken_progression`.
    - [x] Update `gameday_designer/src/i18n/locales/de/validation.json` with corresponding German translations.
- [x] Task: Update UI Highlighting Logic [8bc8014]
    - [x] Update `getHighlightType` in `gameday_designer/src/components/ListDesignerApp.tsx` to handle the new warning types.
    - [x] Ensure clicking these warnings in the `PublishConfirmationModal` or status bar highlights the relevant areas.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Internationalization & UI Integration' (Protocol in workflow.md)

## Phase 3: Final Verification & QA [checkpoint: 546d846]
Perform full system verification and ensure the publish workflow behaves as expected.

- [x] Task: Full Test Suite Execution [546d846]
    - [x] Run all frontend tests: `npm run test:run` in `gameday_designer/`.
    - [x] Verify that no existing validations (errors or warnings) were regressed.
- [x] Task: Manual Publish Workflow Test [546d846]
    - [x] Verify that "No Teams" and "No Games" appear as warnings in `PublishConfirmationModal`.
    - [x] Verify that "Publish Anyway" is enabled for these warnings.
    - [x] Verify highlighting for unused fields and teams.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Final Verification & QA' (Protocol in workflow.md)
