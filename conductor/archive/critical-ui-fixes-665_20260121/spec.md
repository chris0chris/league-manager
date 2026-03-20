# Specification: Critical UI & Navigation Fixes

## Overview
This track addresses high-priority UI and navigation bugs in the Gameday Designer that impact usability and visual integrity. These include navigation bar disappearance during selection, overlapping action buttons, and irritating hover behaviors.

## Functional Requirements
- **Fix Navigation Disappearance (#692):** Investigate and resolve the issue where the black navigation bar disappears when a team selection dropdown is opened in the Playoffs phase (or any nested stage).
- **Correct Action Button Placement (#695):** Reposition the "Publish Schedule" (Spielplan veröffentlichen) button to ensure it no longer overlaps the gameday date in the metadata accordion.
- **Polish Reorder Button Hover (#680):**
    - Disable the tooltip/title that shows the raw translation key (e.g., "button.down") on hover.
    - Remove or refine the button expansion/growth effect during hover to reduce visual jitter and irritation.

## Acceptance Criteria
- Navigation bar remains visible and functional during all selection operations.
- "Publish Schedule" button is correctly aligned and does not overlap any metadata fields.
- Reorder buttons have appropriate, localized tooltips (or none) and stable hover states.
- All fixes verified across different viewport sizes.

## Out of Scope
- Functional changes to tournament generation or team pooling.
- Backend API modifications.
