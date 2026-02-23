# Plan: Gameday Designer UI/UX Refinements (Round 2) [checkpoint: 2632a60]

## Phase 1: Layout & Breakpoints
- [x] **Task 1: Increase 2-Column Breakpoint**
  - Update `ListCanvas.css` to change the grid breakpoint from 1200px to 2800px.
- [x] **Task 2: Responsive Verification**
  - Use Chrome MCP to verify fields stack correctly below 2800px and split above it.

## Phase 2: UI Component Refinements
- [x] **Task 1: Re-align Stage Editor Buttons**
  - Update `StageSection.tsx` to move Save/Cancel buttons immediately after the name input.
- [x] **Task 2: Fix Translations**
  - Update `de/ui.json` and `en/ui.json` to provide proper labels for `label.type`.
- [x] **Task 3: Enhance Stage Type Badge**
  - Increase font size and legibility of badges in `StageSection.tsx`.
- [x] **Task 4: Automated UI Verification via Chrome MCP**
  - Verify button placement and label translations in the browser.

## Phase 3: Verification & Cleanup
- [x] **Task 1: Update Tests**
  - Update any snapshots or interaction tests affected by the button movement.
- [x] **Task 2: Conductor - User Manual Verification 'Refinements' (Protocol in workflow.md)**
