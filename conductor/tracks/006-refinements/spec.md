# Specification: Gameday Designer Ranking & Layout Refinements

## Overview
Address critical usability and validation issues identified in the Gameday Designer during testing of the new Ranking Stages. This track covers four specific refinements: validation for self-referencing stages, preventing teams from playing themselves, ensuring the stage type editor is read-only by default, and improving field layout responsiveness on wide screens.

## Functional Requirements
1. **Self-Reference Validation**:
   - **Rule**: A Ranking Stage cannot contain a game that references a rank *from that same stage*.
   - **Enforcement**: This must be flagged as a critical validation **ERROR**.
   - **UI**: The dropdown for team selection within a Ranking Stage should ideally disable or filter out ranks from itself.

2. **Self-Play Validation**:
   - **Rule**: A game cannot have the same participant in both the Home and Away slots.
   - **Scope**: Must check:
     - Static Team ID vs Static Team ID (e.g., Team A vs Team A).
     - Dynamic Reference vs Dynamic Reference (e.g., Winner Game 1 vs Winner Game 1).
     - Mixed (Static vs Dynamic) is allowed unless the dynamic reference *resolves* to the same static ID (advanced, but basic ID matching is P0).
   - **Enforcement**: This must be flagged as a validation **ERROR**.

3. **Stage Type "Edit Mode"**:
   - **Interaction**: The `stageType` dropdown in the Stage Header must be **read-only** (or displayed as text) by default.
   - **Activation**: Clicking the existing "Edit" (pencil) button triggers "Edit Mode" for *both* the Stage Name and the Stage Type simultaneously.
   - **Controls**: While in edit mode, "Save" (check) and "Cancel" (x) buttons are shown.
   - **Persistence**: Changes are only applied to the model when "Save" is clicked.

4. **Responsive Layout**:
   - **Behavior**: On wide screens where fields are displayed in 2 columns, each column must take up 50% of the available width.
   - **Flexibility**: The layout should wrap to a single column (100% width) if the viewport drops below a sensible minimum width (e.g., standard tablet breakpoint).

## Acceptance Criteria
- [ ] Attempting to select "Rank X from Stage A" *inside* "Stage A" triggers a validation error or is prevented.
- [ ] Assigning "Team 1" vs "Team 1" triggers a validation error.
- [ ] Assigning "Winner Game X" vs "Winner Game X" triggers a validation error.
- [ ] The Stage Type dropdown is disabled/text-only until the Edit button is clicked.
- [ ] Fields correctly resize to 50% width on large desktops and stack on smaller screens.
