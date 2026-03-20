# Plan: Generation & Data Integrity Fixes

## Phase 1: Generation Logic (TDD)
Fix the issues related to tournament generation.

- [x] Task: Implement Auto-Clear on Generate (#668)
    - [x] Write a Vitest integration test verifying that `generateTournament` clears the existing state.
    - [x] Update `useDesignerController.ts` handlers to trigger `handleClearAll` or equivalent before calling `tournamentGenerator`.
- [x] Task: Fix Generic Grouping Logic (#697)
    - [x] Create a failing test case in `tournamentGenerator.test.ts` for generation with empty initial pool.
    - [x] Fix logic in `tournamentGenerator.ts` to respect `splitCount` or phase structure when initial teams are being auto-generated.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Generation Logic' (Protocol in workflow.md)

## Phase 2: Data Protection & Validation
Enhance safeguards and error reporting.

- [x] Task: Protect Published Actions (#693)
    - [x] Update `GamedayMetadataAccordion.tsx` to conditionally render/disable "Clear" and "Delete" buttons based on `metadata.status`.
    - [x] Verify that these buttons remain functional in `DRAFT` state.
- [x] Task: Specific Save Failure Messages (#696)
    - [x] Update `useFlowValidation.ts` to specifically check for mandatory metadata.
    - [x] Pass detailed error info to the notification system in `ListDesignerApp.tsx`.
- [x] Task: Final Quality Gate
    - [x] Run full Vitest suite.
    - [x] Run `npm run eslint`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Data Protection & Validation' (Protocol in workflow.md)