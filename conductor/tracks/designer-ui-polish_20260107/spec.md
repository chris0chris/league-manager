# Specification: Gameday Designer UI/UX Polish

## Overview
This track focuses on improving the user experience and visual consistency of the Gameday Designer. It addresses layout issues, optimizes action button placement, and modernizes the visual language.

## Functional Requirements
- **FR1: Toast Notification Correction:** Ensure error and info toasts are fully visible on all screen sizes and not clipped by viewport boundaries.
- **FR2: Action Button Logic & Visibility:**
    - **Persistent Header Actions:** "Add" buttons (e.g., "Add Stage" in Field header, "Add Game" in Stage header) must be **always visible** in the header, even if the container is empty.
    - **Empty State Entry Point:** Maintain the "big button" in the container body when no nested items exist.
    - **Remove Sequential Add Buttons:** Remove the "Add" buttons that appear at the bottom of the body list (below the last Game or Stage).
    - **Standardize Edit Buttons:** Remove "grey inline buttons" (pencil links). Replace them with standard `outline-secondary` buttons that are permanently visible.
- **FR3: Adaptive Button Labels:**
    - Buttons should display both an icon and a text label by default.
    - Automatically hide text labels (showing only icons) when container width is restricted (e.g., small screens or narrow grid columns).
- **FR4: Responsive Field Grid:** 
    - Arrange Field containers in a responsive grid (multi-column on desktop, single-column on mobile).
- **FR5: Icon Set Refresh:** 
    - Replace generic icons with a cohesive set (e.g., `bi-calendar2-range`, `bi-diagram-3`, `bi-pennant`).

## Acceptance Criteria
- [ ] Error toasts are fully readable on all devices.
- [ ] Header "Add" buttons are visible even when no Stages/Games exist.
- [ ] No "Add" button appears at the bottom of the Field or Stage body lists.
- [ ] Edit/Pencil buttons are standard, permanently visible buttons.
- [ ] Buttons hide labels gracefully in narrow viewports.
- [ ] Fields are arranged in a responsive grid.
- [ ] Icons are updated to the refreshed set.
