# Specification: Validation Bar Enhancements & Cross-Stage Logic

## Overview
This track enhances the Gameday Designer's validation system. It introduces internationalization (i18n) for validation messages, interactive error reporting with element highlighting, and expanded validation logic that accounts for relationships between stages and games.

## Functional Requirements

### 1. Internationalization (i18n)
- All messages displayed in the validation bar must be moved to translation files using `i18next`.
- Supports the existing language switching mechanism in the application.

### 2. Interactive Error Highlighting
- Validation error entries in the bar must be clickable.
- Clicking an error must trigger a "Visual Glow/Border" effect (e.g., a pulsing border) on the specific element containing the error.
- The highlighting is context-aware:
    - **Games**: Highlighting individual game nodes or list items.
    - **Stages**: Highlighting stage containers or headers.
    - **Fields**: Highlighting field containers.
    - **Teams**: Highlighting team assignments or pool entries.
- The UI should scroll the highlighted element into view if it is off-screen.

### 3. Expanded Validation Logic
Validation must now evaluate rules that span across games and stages:
- **Time Overlaps**: Check for scheduling conflicts for games on the same field across different stages.
- **Team Capacity**: Detect if a team is scheduled in multiple games simultaneously across different stages.
- **Stage Sequence**: Validate that stage start/end times follow logical tournament progression.
- **Progression Logic**: Verify integrity of winner/loser progression paths between stages.
- **Game Distribution Warning**: Add a warning when a team has fewer games than others during team-vs-team play phases.

## Non-Functional Requirements
- **Performance**: Validation logic should be optimized to handle large gamedays (many games/stages) without UI lag.
- **UX**: Highlighting should be temporary or easily dismissible to avoid cluttering the UI.

## Acceptance Criteria
- [ ] All validation messages are successfully translated via `i18next`.
- [ ] Clicking any error in the validation bar highlights the correct offending element in the designer.
- [ ] Validation correctly identifies time conflicts across different stages.
- [ ] Validation correctly identifies team double-bookings across different stages.
- [ ] The "Uneven Games" warning triggers correctly based on team game counts.

## Out of Scope
- Implementing a full "Fix-it" wizard (automatic error correction).
- Validating external gameday dependencies outside of the current designer state.
