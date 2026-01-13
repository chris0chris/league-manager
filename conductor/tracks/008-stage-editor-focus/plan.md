# Plan: Stage Editor Focus & Interaction Fix [checkpoint: 75768d0]

## Phase 1: Smart Focus Implementation
- [x] **Task 1: Update StageSection with Smart Blur**
  - Implement a container ref for the editing zone in `StageSection.tsx`.
  - Update `handleSaveEdit` or `onBlur` logic to check if `relatedTarget` is within the container.
- [x] **Task 2: Browser Verification**
  - Use Chrome MCP to verify clicking the dropdown no longer closes edit mode.

## Phase 2: Visual Refinements
- [x] **Task 1: Add Editing Zone Styling**
  - Update `StageSection.css` to include a style for the active editing zone.
  - Apply the style conditionally in `StageSection.tsx`.
- [x] **Task 2: Final UI Verification via Chrome MCP**
  - Verify background highlight appears during edit.

## Phase 3: Verification & Cleanup
- [ ] **Task 1: Update Tests**
  - Ensure tests still pass with the new container structure.
- [ ] **Task 2: Conductor - User Manual Verification 'Interaction Fix' (Protocol in workflow.md)**