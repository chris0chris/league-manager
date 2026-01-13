# Plan: Gameday Designer Refinements (#671)

## Phase 1: Validation Rules
- [x] **Task 1: Prevent Self-Referencing Stages**
  - Update `GameTable.tsx` to filter out ranks from the current stage in the team selection dropdown.
  - Enhance `useFlowValidation.ts` to flag any existing self-references as errors.
- [x] **Task 2: Implement Self-Play Validation**
  - Update `useFlowValidation.ts` to detect and error when Home and Away teams are identical (static or dynamic).
  - Add unit tests for self-play scenarios.
- [x] **Task 3: Conductor - User Manual Verification 'Validation' (Protocol in workflow.md)**

## Phase 2: UI/UX Consistency
- [x] **Task 1: Integrate Stage Type into Edit Mode**
  - Update `StageSection.tsx` to disable the `stageType` selector by default.
  - Enable the selector only when `isEditingName` is true.
  - Ensure "Save" and "Cancel" handle both properties.
- [x] **Task 2: Conductor - User Manual Verification 'UI Refinements' (Protocol in workflow.md)**

## Phase 3: Layout and Styling
- [x] **Task 1: Fix Wide-Screen Field Widths**
  - Update `ListCanvas.css` or `FieldSection.css` to ensure `flex: 0 0 50%` for fields on wide screens.
  - Verify layout responsiveness.
- [x] **Task 2: Conductor - User Manual Verification 'Layout' (Protocol in workflow.md)**