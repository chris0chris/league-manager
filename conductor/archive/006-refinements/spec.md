# Specification: Gameday Designer Refinements (#671)

## Overview
This track addresses several refinements and issues identified following the implementation of Ranking Stages. It focuses on stricter validation rules, UI/UX consistency, and responsive layout improvements.

## Functional Requirements
1. **Self-Reference Prevention**:
   - A Ranking Stage must not be allowed to reference its own ranking results.
   - The team selection dropdown within a stage should filter out ranks from that same stage.
   - Validation must flag any self-referencing game-to-stage connections as an ERROR.

2. **Self-Play Validation**:
   - A game must trigger an ERROR if the same team is assigned to both the Home and Away slots (e.g., Team 1 vs Team 1).
   - This must apply to both static team assignments and dynamic references.

3. **Stage Type Edit Mode Integration**:
   - Changing the `stageType` (Standard vs Ranking) must be disabled by default.
   - It should only become active when the user clicks the "Edit" (pencil) button, consistent with the stage title editing behavior.

4. **Wide-Screen Layout Fix**:
   - On wide screens where fields are displayed in 2 columns, each field must be constrained to exactly 50% of the available width.
   - The layout should wrap to a single column (100% width) on smaller viewports.

## Acceptance Criteria
- [ ] Ranking Stages cannot select ranks from themselves in the team dropdown.
- [ ] Identical home/away team assignments trigger a validation error.
- [ ] Stage type dropdown is read-only until "Edit" is clicked.
- [ ] Field columns are exactly 50% width on wide screens.