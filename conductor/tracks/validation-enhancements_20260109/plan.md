# Plan: Validation Bar Enhancements & Cross-Stage Logic

## Phase 1: Internationalization (i18n) [checkpoint: a818904]
- [x] Task: Identify and extract all hardcoded strings in the validation bar and validation service. a818904
- [x] Task: Add extracted strings to `gameday_designer` translation files (e.g., `locales/de/designer.json`). a818904
- [x] Task: Refactor Validation Bar component to use `useTranslation` and the `t()` function. a818904
- [x] Task: Refactor validation logic to return translation keys or objects compatible with `i18next`. a818904
- [x] Task: Conductor - User Manual Verification 'Phase 1: Internationalization (i18n)' (Protocol in workflow.md) a818904

## Phase 2: Interactive Error Highlighting [checkpoint: ea9c51c]
- [x] Task: Implement a global `highlightedElement` state (using Context API or existing state management). ea9c51c
- [x] Task: Add a pulsing border CSS animation to the project's global styles or component modules. ea9c51c
- [x] Task: Update the Validation Bar to trigger the highlight state with the element's ID and type on click. ea9c51c
- [x] Task: Implement "Scroll into View" utility and integrate it into the highlight trigger. ea9c51c
- [x] Task: Update Game, Stage, Field, and Team components to listen for the highlight state and apply the pulsing effect. ea9c51c
- [x] Task: Conductor - User Manual Verification 'Phase 2: Interactive Error Highlighting' (Protocol in workflow.md) ea9c51c

## Phase 3: Expanded Cross-Stage Validation Logic
- [ ] Task: Update the Validation Service signature to receive and process the entire hierarchical gameday state.
- [ ] Task: Implement Cross-Stage Time Overlap validation (Field conflicts).
- [ ] Task: Implement Cross-Stage Team Capacity validation (Simultaneous games for the same team).
- [ ] Task: Implement Stage Sequence and Progression integrity validation.
- [ ] Task: Implement the "Uneven Games" distribution warning.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Expanded Cross-Stage Validation Logic' (Protocol in workflow.md)

## Phase 4: Integration & Final QA
- [ ] Task: Verify all new validation errors properly link to IDs for highlighting.
- [ ] Task: Perform a full pass of the TDD suite and ensure 80% coverage on new logic.
- [ ] Task: Run project-wide linting and type checks.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration & Final QA' (Protocol in workflow.md)
