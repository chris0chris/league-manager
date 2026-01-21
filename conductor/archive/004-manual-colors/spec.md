# Specification: Manual Team Color Generation (#672)

## Overview
Automatically assign distinct colors to teams when they are added manually to the team pool. This ensures visual variety and consistency, matching the behavior of auto-generated tournaments.

## Functional Requirements
1. **Automatic Assignment**: When a new team is created via the "+ Team" button in any group, it must be assigned a color from the standard `TEAM_COLORS` palette.
2. **Global Rotation Strategy**: The initial color index will be determined by the total number of teams already in the global pool (e.g., `TEAM_COLORS[totalTeams % TEAM_COLORS.length]`).
3. **Immediate Visibility**: The assigned color must be rendered immediately in the team pool table/card.
4. **User Override**: Users must retain the ability to manually change the assigned color using the existing color picker (no change to existing edit logic).

## Non-Functional Requirements
- **Performance**: Color calculation must be instantaneous on the client side.
- **Robustness**: Logic must handle empty pools and very large team counts (wrap around).

## Acceptance Criteria
- [ ] Adding the 1st team to any group assigns `TEAM_COLORS[0]`.
- [ ] Adding the 5th team (regardless of group) assigns `TEAM_COLORS[4]`.
- [ ] Adding the 17th team wraps around to `TEAM_COLORS[0]` (based on the current 16-color palette).
- [ ] Manual color changes are preserved and not overwritten by the auto-generation logic after the initial creation.

## Out of Scope
- Automatic color re-shuffling when teams are deleted.
- Collision detection (ensuring no two teams have the same color if the palette is not yet exhausted).
