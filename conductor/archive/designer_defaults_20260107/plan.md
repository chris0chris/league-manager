# Plan: Gameday Designer Defaults and Configurable Duration

## Phase 1: Update Global Defaults [checkpoint: 5b35131]
- [x] Task: Update the global `DEFAULT_START_TIME` constant to `10:00`.
- [x] Task: Update the global `DEFAULT_GAME_DURATION` constant to `70`.
- [x] Task: Write tests to verify that new gamedays and empty states use these new defaults.
- [x] Task: Implement/Verify updates across frontend components and hooks.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Update Global Defaults' (Protocol in workflow.md)

## Phase 2: Tournament Generator Modal UI [checkpoint: c4ba172]
- [x] Task: Add a new "Game Duration" numeric input field to the `TournamentGeneratorModal` component.
- [x] Task: Write tests to ensure the input field renders, has the correct label, and is initialized with the default duration (70).
- [x] Task: Implement state management for the new input field in the modal.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Tournament Generator Modal UI' (Protocol in workflow.md)

## Phase 3: Validation and Generation Logic [checkpoint: 5b35131]
- [x] Task: Implement validation logic for the game duration input (15 to 180 minutes).
- [x] Task: Write tests to verify that invalid durations (e.g., 10 or 200) trigger error messages and prevent submission.
- [x] Task: Update the `handleGenerateTournament` handler in `useDesignerController` to accept and pass the custom duration to the generation utility.
- [x] Task: Write tests to verify that generated games use the custom duration provided in the config.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Validation and Generation Logic' (Protocol in workflow.md)
