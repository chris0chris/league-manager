# Implementation Plan: Unified App Header & Global Language Selector

This plan outlines the steps to implement a unified application layout and a persistent global header for the Gameday Designer, improving navigation and consolidating global settings like language selection.

## Phase 1: Foundation & Refactoring [checkpoint: 4b1bd45]
Set up the new layout structure and extract shared components.

- [x] Task: Create Layout Components [4b1bd45]
    - [x] Create directory `gameday_designer/src/components/layout/`.
    - [x] Implement `AppHeader.tsx` with basic structure (Title, Spacer, LanguageSelector, UserProfile).
    - [x] Implement `MainLayout.tsx` using `AppHeader` and `Outlet` from `react-router-dom`.
- [x] Task: Relocate Language Selector [4b1bd45]
    - [x] Remove `LanguageSelector` import and usage from `gameday_designer/src/components/FlowToolbar.tsx`.
    - [x] Verify `LanguageSelector.tsx` is ready for global usage.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Refactoring' (Protocol in workflow.md)

## Phase 2: Header Logic & State Integration [checkpoint: 588d19f]
Implement dynamic content and connect the header to the application state.

- [x] Task: Implement Dynamic Header Content [588d19f]
    - [x] Use `useLocation` and `useParams` in `AppHeader` to determine the current view.
    - [x] Implement logic to display the Gameday name in the header when in the Editor view (fetching from `metadata` if necessary).
    - [x] Add the "Back to Dashboard" button to the header, visible only in the Editor view.
- [x] Task: Integrate User Profile [588d19f]
    - [x] Implement `UserProfile` component to display current user information (utilizing existing auth context/APIs).
- [x] Task: Update Localization [588d19f]
    - [x] Add header-related keys to `gameday_designer/src/i18n/locales/en/ui.json` and `de/ui.json`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Header Logic & State Integration' (Protocol in workflow.md)

## Phase 3: Application Integration & Cleanup [checkpoint: 588d19f]
Apply the new layout globally and remove redundant UI elements.

- [x] Task: Update App Routing [588d19f]
    - [x] Modify `gameday_designer/src/App.tsx` to wrap all routes within `MainLayout`.
- [x] Task: Clean Up Dashboard UI [588d19f]
    - [x] Remove the redundant header/title row from `gameday_designer/src/components/dashboard/GamedayDashboard.tsx`.
- [x] Task: Clean Up Editor UI [588d19f]
    - [x] Remove the redundant header/title row and "Back" button from `gameday_designer/src/components/ListDesignerApp.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Application Integration & Cleanup' (Protocol in workflow.md)

## Phase 4: Final Verification & QA [checkpoint: a510f38]
Ensure everything works as expected across different views and edge cases.

- [x] Task: Unit Testing [a510f38]
    - [x] Implement comprehensive unit tests for `AppHeader` and `MainLayout` using Vitest and React Testing Library.
    - [x] Verify routing logic and dynamic title updates in tests.
- [x] Task: Integration Testing [a510f38]
    - [x] Run full test suite for Gameday Designer to ensure no regressions in existing functionality.
    - [x] Fix any broken tests due to UI changes (header relocation, etc.).
- [x] Task: Manual Verification [a510f38]
    - [x] Verify language switching persists and updates correctly.
    - [x] Verify "Back to Dashboard" button correctly navigates and is conditionally visible.
    - [x] Verify User Profile displays correct placeholder information.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & QA' (Protocol in workflow.md)
