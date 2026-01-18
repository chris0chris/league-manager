# Implementation Plan: Unified App Header & Global Language Selector

This plan outlines the steps to implement a unified application layout and a persistent global header for the Gameday Designer, improving navigation and consolidating global settings like language selection.

## Phase 1: Foundation & Refactoring
Set up the new layout structure and extract shared components.

- [x] Task: Create Layout Components
    - [x] Create directory `gameday_designer/src/components/layout/`.
    - [x] Implement `AppHeader.tsx` with basic structure (Title, Spacer, LanguageSelector, UserProfile).
    - [x] Implement `MainLayout.tsx` using `AppHeader` and `Outlet` from `react-router-dom`.
- [x] Task: Relocate Language Selector
    - [x] Remove `LanguageSelector` import and usage from `gameday_designer/src/components/FlowToolbar.tsx`.
    - [x] Verify `LanguageSelector.tsx` is ready for global usage.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Refactoring' (Protocol in workflow.md)

## Phase 2: Header Logic & State Integration
Implement dynamic content and connect the header to the application state.

- [ ] Task: Implement Dynamic Header Content
    - [ ] Use `useLocation` and `useParams` in `AppHeader` to determine the current view.
    - [ ] Implement logic to display the Gameday name in the header when in the Editor view (fetching from `metadata` if necessary).
    - [ ] Add the "Back to Dashboard" button to the header, visible only in the Editor view.
- [ ] Task: Integrate User Profile
    - [ ] Implement `UserProfile` component to display current user information (utilizing existing auth context/APIs).
- [ ] Task: Update Localization
    - [ ] Add header-related keys to `gameday_designer/src/i18n/locales/en/ui.json` and `de/ui.json`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Header Logic & State Integration' (Protocol in workflow.md)

## Phase 3: Application Integration & Cleanup
Apply the new layout globally and remove redundant UI elements.

- [ ] Task: Update App Routing
    - [ ] Modify `gameday_designer/src/App.tsx` to wrap all routes within `MainLayout`.
- [ ] Task: Clean Up Dashboard UI
    - [ ] Remove the redundant header/title row from `gameday_designer/src/components/dashboard/GamedayDashboard.tsx`.
- [ ] Task: Clean Up Editor UI
    - [ ] Remove the redundant header/title row and "Back" button from `gameday_designer/src/components/ListDesignerApp.tsx`.
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
