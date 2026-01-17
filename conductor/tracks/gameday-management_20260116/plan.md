# Plan: Gameday Management & Dashboard

## Phase 1: Mock API & Data Layer Refinement
Extend the existing service layer to support Gameday-level CRUD operations.

- [x] **Task: Define Gameday Interfaces & Types** 9493429
    - [x] Add `GamedayMetadata` and `Gameday` (full structure) interfaces to `types.ts`.
- [x] **Task: Expand Mock Service Layer (TDD)** 9493429
    - [x] Write tests for `GamedayService` mock endpoints (GET all, GET by ID, POST, PATCH).
    - [x] Implement mock storage for multiple gamedays.
    - [x] Ensure service signatures match DRF patterns.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Mock API & Data Layer Refinement' (Protocol in workflow.md) [checkpoint: c173024]

## Phase 2: Gameday Dashboard UI
Implement the landing page for managing gamedays.

- [x] **Task: Implement GamedayCard Component (TDD)**
    - [x] Create a presentation component for gameday details (Name, Date, Status, Season).
    - [x] Write tests for status-based styling and data rendering.
- [x] **Task: Create GamedayDashboard View (TDD)**
    - [x] Implement the main container for the list view.
    - [x] Integrate `GamedayService` to fetch and display cards.
    - [x] Implement the "Create New Gameday" trigger.
- [~] **Task: Update Routing Logic**
    - [ ] Refactor `App.tsx` or `main.tsx` to handle `/` (Dashboard) and `/designer/:id` (Editor) routes.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Gameday Dashboard UI' (Protocol in workflow.md) [checkpoint: 480bcb8]

## Phase 3: Advanced Search & Filtering
Implement the wildcard and "dork" style search logic.

- [ ] **Task: Implement Search Engine Utility (TDD)**
    - [ ] Write a utility function that parses strings for dorks (e.g., `key:value`) and performs wildcard matching.
    - [ ] Write comprehensive unit tests for various search patterns.
- [ ] **Task: Integrate Search with Dashboard (TDD)**
    - [ ] Add the search input component to the Dashboard.
    - [ ] Connect the search utility to the displayed gameday list.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Advanced Search & Filtering' (Protocol in workflow.md)

## Phase 4: Editor Metadata Integration
Add gameday-level property management to the existing Editor.

- [ ] **Task: Create GamedayMetadataAccordion Component (TDD)**
    - [ ] Implement the accordion-style header with form fields (Name, Date, Season, Venue).
    - [ ] Write tests for form state and validation.
- [ ] **Task: Integrate Metadata with Flow State (TDD)**
    - [ ] Ensure metadata is part of the global state and correctly persisted via the service layer.
    - [ ] Open the accordion automatically for newly created gamedays.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Editor Metadata Integration' (Protocol in workflow.md)

## Phase 5: Final Polish & Verification
- [ ] **Task: Ensure Responsive Card Layout**
    - [ ] Audit dashboard responsiveness for mobile/tablet.
- [ ] **Task: Final TDD Verification**
    - [ ] Run the full Vitest suite to ensure no regressions in existing Designer logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish & Verification' (Protocol in workflow.md)
