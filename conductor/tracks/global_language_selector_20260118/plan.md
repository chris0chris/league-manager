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

## Phase 2: Header Logic & State Integration
Implement dynamic content and connect the header to the application state.

- [x] Task: Implement Dynamic Header Content
    - [x] Use `useLocation` and `useParams` in `AppHeader` to determine the current view.
    - [x] Implement logic to display the Gameday name in the header when in the Editor view (fetching from `metadata` if necessary).
    - [x] Add the "Back to Dashboard" button to the header, visible only in the Editor view.
- [x] Task: Integrate User Profile
    - [x] Implement `UserProfile` component to display current user information (utilizing existing auth context/APIs).
- [x] Task: Update Localization
    - [x] Add header-related keys to `gameday_designer/src/i18n/locales/en/ui.json` and `de/ui.json`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Header Logic & State Integration' (Protocol in workflow.md)

## Phase 3: Application Integration & Cleanup
Apply the new layout globally and remove redundant UI elements.

- [x] Task: Update App Routing
    - [x] Modify `gameday_designer/src/App.tsx` to wrap all routes within `MainLayout`.
- [x] Task: Clean Up Dashboard UI
    - [x] Remove the redundant header/title row from `gameday_designer/src/components/dashboard/GamedayDashboard.tsx`.
- [x] Task: Clean Up Editor UI
    - [x] Remove the redundant header/title row and "Back" button from `gameday_designer/src/components/ListDesignerApp.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Application Integration & Cleanup' (Protocol in workflow.md)

## Phase 4: Final Verification & QA
Ensure stability and correctness through testing.

- [ ] Task: Write Tests for New Components
    - [ ] Add unit tests for `AppHeader.tsx` verifying dynamic titles and button visibility.
- [ ] Task: Run Full Test Suite
    - [ ] Execute `npm run test:run` in `gameday_designer/` to ensure no regressions in existing features.
- [ ] Task: Manual Layout Audit
    - [ ] Verify header behavior across all routes and screen sizes (responsive check).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & QA' (Protocol in workflow.md)
