# Plan: Team Reorder Button Interaction Fix (#680)

## Phase 1: TDD Fix Implementation
- [x] **Task 1: Write failing unit test** f275ffd
  - Update `gameday_designer/src/components/list/__tests__/TeamGroupCard.test.tsx` to simulate a click on the reorder buttons and assert that the `onToggle` handler is not called.
- [x] **Task 2: Apply fix in TeamGroupCard** f275ffd
  - Identify the reorder buttons in `TeamGroupCard.tsx`.
  - Add `e.stopPropagation()` to their `onClick` handlers to prevent the event from reaching the header toggle zone.
- [ ] Task: Conductor - User Manual Verification 'TDD Fix Implementation' (Protocol in workflow.md)

## Phase 2: QA & Regression Testing
- [ ] **Task 1: Audit other action buttons**
  - Verify if "Edit Team" or "Delete Team" buttons within the same card suffer from the same bubbling issue and fix them if necessary.
- [ ] **Task 2: Full UI Test Run**
  - Execute `npm run test:run` in the `gameday_designer` directory to ensure no regressions.
- [ ] Task: Conductor - User Manual Verification 'QA & Regression Testing' (Protocol in workflow.md)
