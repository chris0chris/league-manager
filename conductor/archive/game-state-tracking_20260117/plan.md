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

- [x] Task: Implement Gameday Publish Endpoint 16ba265
    - [x] Create API endpoint to transition Gameday from Draft to Published.
    - [x] Implement validation logic (e.g., all games must have fields and times).
- [x] Task: Implement Game Result Endpoint 16ba265
    - [x] Create API endpoint for updating game scores (halftime/final).
    - [x] Implement automatic state transition logic (Game -> In Progress/Completed).
- [x] Task: Implement Dynamic Reference Resolution Logic 16ba265
    - [x] Create service method to resolve "Winner of Game X" based on current results.
    - [x] Update `Gameday` serializer to include resolved team names for downstream games.
- [x] Task: TDD - Write tests for API endpoints and resolution logic. 16ba265
- [x] Task: Conductor - User Manual Verification 'Phase 2: Backend API Logic' (Protocol in workflow.md) [checkpoint: dfc6cc6]


## Phase 3: Frontend - Gameday Lifecycle UI
This phase adds the controls to the Gameday Designer to manage the overall gameday state.

- [x] Task: Add "Publish Schedule" Button 8e6c18e
    - [x] Implement button in the toolbar (moved to Actions dropdown/Metadata header).
    - [x] Add confirmation modal explaining the "Locked" state.
- [x] Task: Implement Locked State UI 8e6c18e
    - [x] visual indicators for "Published" state.
    - [x] Disable/Restrict drag-and-drop and editing features when locked.
    - [x] Add "Unlock" mechanism (with strict confirmation).
- [x] Task: TDD - Write tests for lifecycle UI components. 8e6c18e
- [x] Task: Conductor - User Manual Verification 'Phase 3: Frontend - Gameday Lifecycle UI' (Protocol in workflow.md) [checkpoint: 881192e]


## Phase 4: Frontend - Result Entry & Visualization
This phase enables users to enter scores and see the dynamic flow of the tournament.

- [x] Task: Create Result Entry Modal 8e6c18e
    - [x] Design modal to enter Halftime and Final scores for a game.
    - [x] Add entry point from the Game Node (e.g., "Enter Result" button).
- [x] Task: Update Game Node Display 8e6c18e
    - [x] Show current game status (In Progress, Completed).
    - [x] Display scores directly on the node.
- [x] Task: Implement Dynamic Reference Visualization 8e6c18e
    - [x] Update `GameNode` to display resolved team names (e.g., "Winner G1 (Team Alpha)") alongside placeholders.
    - [x] Ensure real-time updates when results change.
- [x] Task: TDD - Write tests for result entry and node updates. 8e6c18e
- [x] Task: Conductor - User Manual Verification 'Phase 4: Frontend - Result Entry & Visualization' (Protocol in workflow.md) [checkpoint: a3ca8ca]


## Phase 5: Final Polish & Integration
- [x] Task: End-to-End Testing 8e6c18e
    - [x] Verify complete flow: Create -> Publish -> Enter Results -> View Progression.
- [x] Task: UI/UX Refinements 8e6c18e
    - [x] Polish transitions and empty states.
    - [x] Ensure mobile responsiveness for result entry.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Final Polish & Integration' (Protocol in workflow.md) [checkpoint: db918db]