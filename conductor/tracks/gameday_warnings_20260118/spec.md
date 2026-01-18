# Specification: Gameday Designer Validation Warnings

## Overview
This track enhances the Gameday Designer's validation system by introducing a set of "Confirmable Warnings". Unlike "Blocking Errors" which prevent publishing, these warnings identify potential configuration issues that the user might want to address but still allow the gameday to be published after explicit acknowledgement in the `PublishConfirmationModal`.

## Functional Requirements

### 1. New Validation Warnings
The following scenarios must trigger a warning:
- **No Teams:** The global team pool is empty.
- **No Games:** No games have been added to any stage.
- **Teams without Games:** A team exists in the global pool but is not assigned to any game (neither as Home nor Away team).
- **Unused Fields:** A field exists in the gameday but has no games assigned to it, *only* if at least one other field contains games (Staged Field Check).
- **Broken Dynamic Progressions:** A team is referenced via dynamic progression (e.g., "Winner Game 1") but the referenced game or standing is unreachable or invalid (Dynamic Team Check).

### 2. Validation Behavior
- All new validation items must be classified as **Warnings** (Severity: Warning).
- Warnings must be displayed in the `PublishConfirmationModal`.
- If only warnings are present (and no errors), the "Publish Anyway" button must be enabled.
- Clicking on a warning should trigger the existing highlighting logic used for errors to help the user locate the issue.

### 3. State Management
- The `TemplateValidationService` (or equivalent frontend logic) must be updated to return these new items with the correct severity.
- The `useDesignerController` and `flowState` should correctly track the presence of warnings versus errors.

## Non-Functional Requirements
- **Consistency:** Use existing i18next namespaces (`validation`) for all warning messages.
- **Performance:** Validation checks must run efficiently and not lag the UI during designer interactions.

## Acceptance Criteria
- [ ] Designer triggers "No Teams" warning when pool is empty.
- [ ] Designer triggers "No Games" warning when no games exist.
- [ ] Designer triggers "Teams without Games" warning for unassigned teams.
- [ ] Designer triggers "Unused Fields" warning correctly (respecting the Staged Field Check).
- [ ] Designer triggers "Broken Dynamic Progressions" warning for invalid references.
- [ ] All new items appear as warnings in the `PublishConfirmationModal`.
- [ ] User can publish gamedays with active warnings.
- [ ] Warnings correctly highlight the affected nodes/areas in the designer.

## Out of Scope
- Implementation of auto-fixing for any of these warnings.
- Changes to the backend `Gameinfo` models.
