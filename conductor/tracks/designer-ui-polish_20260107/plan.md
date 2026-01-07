# Plan: Gameday Designer UI/UX Polish

## Phase 1: Global UI & Asset Refinement [checkpoint: 46e1110]
Refine the foundation for global UI elements, including toasts, icons, and shared CSS utilities.

- [x] **Task: Fix Toast Clipping** (54ef298)
  - Adjust toast container positioning and z-index to ensure visibility across all viewports.
  - Implement tests verifying toast visibility constraints.
- [x] **Task: Define Refreshed Icon Set** (0637b70)
  - Update `useTypedTranslation` or a dedicated icon utility to use the new Bootstrap icons (`bi-calendar2-range`, `bi-diagram-3`, `bi-pennant`, etc.).
- [x] **Task: Create Adaptive Label Utility** (a0ac5d5)
  - Add CSS classes to `ListDesignerApp.css` or a shared utility file to handle responsive label visibility (e.g., hiding `.btn-label` on small containers).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Global UI & Asset Refinement' (Protocol in workflow.md)

## Phase 2: Field & Stage Component Polish [checkpoint: cd3880c]
Update the hierarchical containers to follow the new action button logic and styling.

- [x] **Task: Refactor FieldSection Buttons** (756ee09)
  - Ensure "Add Stage" in header is always visible.
  - Remove "Add Stage" button from the bottom of `FieldSection`.
  - Replace grey pencil link with `outline-secondary` Button.
  - Write Vitest tests to verify button presence in both empty and populated states.
- [x] **Task: Refactor StageSection Buttons** (d1bac1f)
  - Ensure "Add Game" in header is always visible.
  - Remove "Add Game" button from the bottom of `StageSection`.
  - Replace grey pencil link with `outline-secondary` Button.
  - Write Vitest tests for Stage-level button logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Field & Stage Component Polish' (Protocol in workflow.md)

## Phase 3: Game & Team Component Polish [checkpoint: 11607fe]
Standardize the interactive elements within game tables and team management cards.

- [x] **Task: Polish GameTable Actions** (37dd337)
  - Update edit/delete buttons in `GameTable` to use the standard visible style.
  - Apply the refreshed icon set to game actions.
  - Ensure consistent visibility for row actions.
- [x] **Task: Polish Team Management UI** (f19896f)
  - Update `TeamGroupCard` and `GlobalTeamTable` buttons.
  - Ensure the "+ Team" button is permanently visible in group headers.
  - Standardize edit/reorder buttons to match the new UI patterns.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Game & Team Component Polish' (Protocol in workflow.md)

## Phase 4: Responsive Layout & Final Verification
Implement the responsive grid and fine-tune the adaptive UI behaviors.

- [ ] **Task: Implement Responsive Field Grid**
  - Update `ListCanvas.tsx` and `ListCanvas.css` to use CSS Grid for Field containers.
  - Define breakpoints for multi-column vs. single-column layout.
- [ ] **Task: Apply Adaptive Button Labels**
  - Apply the responsive label hiding utility to all buttons in Field, Stage, Game, and Team components.
- [ ] **Task: Final UI/UX Audit**
  - Verify mobile responsiveness and touch targets.
  - Confirm all "grey inline buttons" are removed.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Responsive Layout & Final Verification' (Protocol in workflow.md)
