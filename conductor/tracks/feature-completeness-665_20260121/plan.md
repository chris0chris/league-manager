# Plan: Feature Completeness

## Phase 1: Metadata and Validation (TDD)
Implement new fields and strict validation rules.

- [x] Task: Expand Metadata Fields (#694, #666) [f649194c]
    - [x] Update `types.ts` and `metadata.json` schema.
    - [x] Update `GamedayMetadataAccordion.tsx` to include Season and League selectors.
    - [x] Ensure proper translation for all labels (including group and game names).
    - [x] Implement default value logic in `ListDesignerApp.tsx` for new gamedays.
- [x] Task: Implement Mandatory and Date Validation (#694) [43d799bd]
    - [x] Add validation rules to `useFlowValidation.ts`.
    - [x] Verify: Date must be set (**ERROR**), Date in future (**WARNING** if past), Venue not empty (**WARNING**).
    - [x] Recheck #694 coverage after #666 fixes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Metadata and Validation' (Protocol in workflow.md)

## Phase 2: Selection and Seeding (TDD)
Implement advanced assignment logic.

- [x] Task: Group-based Seeding (#671) [39164a87]
    - [x] Update `teamReference.ts` to support rank-by-group references.
    - [x] Update `TeamSelector.tsx` to display these options for playoff games.
- [x] Task: Team Swapping and Officials (#679) [39164a87]
    - [x] Implement team swapping logic in `useDesignerController.ts`.
    - [x] Expand officials selection pool in `GameTable.tsx`.
- [x] Task: Generation UI Polish (#678) [39164a87]
    - [x] Refactor `TournamentGeneratorModal.tsx` to allow team selection.
- [x] Task: Connect Existing Teams (#705) [3e69fc67]
    - [x] Implement team lookup and selection from the database pool.
- [x] Task: Final Quality Gate [3e69fc67]
    - [x] Run all tests and ensure >80% coverage for new logic.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Selection and Seeding' (Protocol in workflow.md)
