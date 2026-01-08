# Plan: Manual Team Color Generation (#672)

## Phase 1: Logic Implementation & Unit Testing
Implement the global color rotation logic within the state management layer.

- [ ] **Task: Create Failing Unit Tests for Manual Color Assignment**
  - Add tests to `useFlowState-global-teams.test.ts` or a new specialized test file.
  - Verify that adding the first team manually assigns `TEAM_COLORS[0]`.
  - Verify that adding subsequent teams increments the color index.
  - Verify that the color index wraps around correctly after reaching the end of the palette.
- [ ] **Task: Implement Color Rotation Logic in `useFlowState`**
  - Update the `addGlobalTeam` handler in `useTeamPoolState.ts` (delegated from `useFlowState`).
  - Calculate the next color using `totalTeams % TEAM_COLORS.length`.
  - Ensure the new team object includes the calculated `color` property.
- [ ] **Task: Verify Logic with Passing Tests**
  - Run the newly created unit tests and confirm they pass.
  - Ensure existing team generation tests still pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Logic Implementation & Unit Testing' (Protocol in workflow.md)

## Phase 2: UI Integration & Final Audit
Ensure the assigned colors are correctly displayed and manageable in the UI.

- [ ] **Task: Verify Team Table UI Rendering**
  - Confirm that `GlobalTeamTable.tsx` and `TeamGroupCard.tsx` correctly render the `color` property from the team object.
  - Verify that the color badge/indicator update immediately upon adding a team.
- [ ] **Task: Audit Manual Overrides**
  - Ensure the user can still change the color manually after the initial assignment.
  - Verify that manual edits are correctly persisted in the state.
- [ ] **Task: Final Integration Check**
  - Run the full suite of Gameday Designer tests.
  - Perform a manual verification on localhost.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Integration & Final Audit' (Protocol in workflow.md)