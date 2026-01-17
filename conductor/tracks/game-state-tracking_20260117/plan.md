# Plan: Game State Tracking & Result Management

## Phase 1: Database & Model Updates
This phase establishes the necessary data structures to support game states and result tracking within the existing `Gameday` and `Gameinfo` models.

- [x] Task: Update `Gameinfo` Model 027fe9a
    - [x] Add `status` field (Draft, Published, In Progress, Completed).
    - [x] Add `halftime_score` and `final_score` fields (JSON or separate integer fields).
    - [x] Add `is_locked` boolean flag.
- [x] Task: Create `Gameday` Lifecycle Fields 027fe9a
    - [x] Add `status` field to `Gameday` model (Draft, Published, In Progress, Completed).
    - [x] Add `published_at` timestamp.
- [x] Task: TDD - Write tests for model updates and state transitions. 027fe9a
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database & Model Updates' (Protocol in workflow.md) [checkpoint: 522aeba]


## Phase 2: Backend API Logic
This phase implements the business logic for state transitions, result updates, and reference resolution.

- [ ] Task: Implement Gameday Publish Endpoint
    - [ ] Create API endpoint to transition Gameday from Draft to Published.
    - [ ] Implement validation logic (e.g., all games must have fields and times).
- [ ] Task: Implement Game Result Endpoint
    - [ ] Create API endpoint for updating game scores (halftime/final).
    - [ ] Implement automatic state transition logic (Game -> In Progress/Completed).
- [ ] Task: Implement Dynamic Reference Resolution Logic
    - [ ] Create service method to resolve "Winner of Game X" based on current results.
    - [ ] Update `Gameday` serializer to include resolved team names for downstream games.
- [ ] Task: TDD - Write tests for API endpoints and resolution logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend API Logic' (Protocol in workflow.md)

## Phase 3: Frontend - Gameday Lifecycle UI
This phase adds the controls to the Gameday Designer to manage the overall gameday state.

- [ ] Task: Add "Publish Schedule" Button
    - [ ] Implement button in the toolbar.
    - [ ] Add confirmation modal explaining the "Locked" state.
- [ ] Task: Implement Locked State UI
    - [ ] visual indicators for "Published" state.
    - [ ] Disable/Restrict drag-and-drop and editing features when locked.
    - [ ] Add "Unlock" mechanism (with strict confirmation).
- [ ] Task: TDD - Write tests for lifecycle UI components.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend - Gameday Lifecycle UI' (Protocol in workflow.md)

## Phase 4: Frontend - Result Entry & Visualization
This phase enables users to enter scores and see the dynamic flow of the tournament.

- [ ] Task: Create Result Entry Modal
    - [ ] Design modal to enter Halftime and Final scores for a game.
    - [ ] Add entry point from the Game Node (e.g., "Enter Result" button).
- [ ] Task: Update Game Node Display
    - [ ] Show current game status (In Progress, Completed).
    - [ ] Display scores directly on the node.
- [ ] Task: Implement Dynamic Reference Visualization
    - [ ] Update `GameNode` to display resolved team names (e.g., "Winner G1 (Team Alpha)") alongside placeholders.
    - [ ] Ensure real-time updates when results change.
- [ ] Task: TDD - Write tests for result entry and node updates.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend - Result Entry & Visualization' (Protocol in workflow.md)

## Phase 5: Final Polish & Integration
- [ ] Task: End-to-End Testing
    - [ ] Verify complete flow: Create -> Publish -> Enter Results -> View Progression.
- [ ] Task: UI/UX Refinements
    - [ ] Polish transitions and empty states.
    - [ ] Ensure mobile responsiveness for result entry.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish & Integration' (Protocol in workflow.md)
