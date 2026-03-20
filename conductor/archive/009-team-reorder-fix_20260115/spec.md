# Specification: Team Reorder Button Interaction Fix (#680)

## Overview
A bug was introduced where clicking the team reorder (up/down) buttons within a `TeamGroupCard` causes the card to unintendedly expand or collapse. This is likely due to the click event bubbling up from the button to the card's header interaction zone.

## Problem Description
- **Component:** `TeamGroupCard.tsx`
- **Affected Elements:** Team reorder buttons (up and down arrows).
- **Current Behavior:** Clicking a reorder button moves the team but also triggers the `onToggle` behavior of the group card, changing its expansion state.
- **Root Cause:** Event propagation from the `<button>` element to the parent container.

## Functional Requirements
- Clicking the "Move team up" button must reorder the team without affecting the card's expansion state.
- Clicking the "Move team down" button must reorder the team without affecting the card's expansion state.
- The expansion state of the `TeamGroupCard` should only change when explicitly clicking on the header toggle area (excluding the action buttons).

## Acceptance Criteria
- [ ] In the Gameday Designer team pool, clicking up/down on a team within a group reorders the team correctly.
- [ ] The group card remains in its current expansion state after the click.
- [ ] Automated tests verify that reorder clicks do not trigger expansion toggles.

## Out of Scope
- Changing the actual reordering logic (this is confirmed to be working).
- Modifying the visual style of the buttons.
