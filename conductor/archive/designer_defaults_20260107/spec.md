# Spec: Gameday Designer Defaults and Configurable Duration

## Goal
Improve the user experience of the Gameday Designer by setting more sensible default values for time and duration, and providing the flexibility to customize game duration during bulk tournament generation.

## Scope
- **Global Defaults:** Update the system-wide default start time to 10:00 and the default game duration to 70 minutes.
- **Configurable Duration:** Add a numeric input field to the Tournament Generation Modal allowing users to override the default duration for all games in the generated tournament.
- **Validation:** Implement validation for the custom duration input (Min: 15 minutes, Max: 180 minutes).

## Functional Requirements
1.  **System Defaults:**
    *   Change the hardcoded default start time from its current value to `10:00`.
    *   Change the hardcoded default game duration from its current value to `70` minutes.
2.  **Tournament Generation Modal:**
    *   Add a labeled input field "Game Duration (min)" to the modal.
    *   Initialize this field with the new default value (70).
    *   Ensure the value entered here is passed to the tournament generation logic.
3.  **Validation:**
    *   Prevent the user from proceeding with tournament generation if the duration is less than 15 or greater than 180.
    *   Display a clear error message when validation fails.

## Non-Functional Requirements
- **Consistency:** Ensure the new defaults are reflected correctly in both the UI and the underlying state.
- **Usability:** The new input in the modal should be intuitive and correctly labeled.

## Acceptance Criteria
- [ ] New gamedays default to 10:00 start time.
- [ ] Tournament generation default duration is 70 minutes.
- [ ] Users can change the duration in the Tournament Generator Modal.
- [ ] Durations outside the 15-180 range trigger a validation error.
- [ ] Generated games correctly use the specified duration.

## Out of Scope
- Configurable defaults per user or association.
- Per-stage or per-game duration settings during generation.
