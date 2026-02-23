# Specification: Unified App Header & Global Language Selector

## Overview
This track introduces a unified application layout for the Gameday Designer, featuring a persistent global header. This header will consolidate application-level concerns like branding, page navigation, language selection, and user profile management, providing a consistent experience across the Dashboard and the Editor.

## Functional Requirements

### 1. Unified App Layout
- Create a `MainLayout` component that wraps the entire Gameday Designer application routes.
- The layout must provide a consistent top-level `Header` component.

### 2. Unified Header Elements
The header must include the following elements, organized from left to right:
- **App Title:** "Gameday Designer" (localized).
- **Separator:** A simple hyphen or pipe character.
- **Page Title:** 
    - On Dashboard: "Dashboard" (localized).
    - On Editor: The name of the current gameday (e.g., "Season Opening 2026").
- **Navigation Action:** 
    - On Editor: A "Back" button (icon-only or localized text) that returns the user to the Dashboard.
- **Spacer:** Flexible space to push the following elements to the right.
- **Language Selector:** Relocate the existing `LanguageSelector` from the `FlowToolbar` to this global position.
- **User Profile:** A placeholder or component displaying the current user's name/initials (fetched from the existing auth state).

### 3. State Management & Navigation
- The "Page Title" and "Navigation Action" must react to the current route (Dashboard vs. Editor).
- Language selection must remain persistent and globally applicable within the Gameday Designer scope.

## Technical Implementation Details
- **Component Placement:** The `MainLayout` will be implemented in `gameday_designer/src/components/layout/`.
- **Router Integration:** Update `App.tsx` to wrap the dashboard and editor routes within this layout.
- **Refactoring:** Remove the `LanguageSelector` from `FlowToolbar.tsx` and the individual page headers in `GamedayDashboard.tsx` and `ListDesignerApp.tsx`.

## Acceptance Criteria
- [ ] Header is visible on both Dashboard and Editor views.
- [ ] Header correctly displays "Gameday Designer - Dashboard" when on the main page.
- [ ] Header correctly displays "Gameday Designer - [Gameday Name]" when editing a tournament.
- [ ] "Back" button appears only when in the Editor view.
- [ ] Language Selector works correctly and updates the UI instantly.
- [ ] User profile information is displayed in the header.
- [ ] Code is refactored to remove redundant layout elements from individual pages.

## Out of Scope
- Synchronizing language with other LeagueSphere apps (e.g., Passcheck).
- Implementing new User Profile management features (e.g., "Edit Profile").
