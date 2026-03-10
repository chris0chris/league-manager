# Specification: Gameday Management & Dashboard

## Overview
This track introduces a new hierarchical layer to the Gameday Designer: **Gameday Management**. It replaces the current static entry point with a dynamic Dashboard that lists all gamedays and provides tools for creation, filtering, and high-level management.

**Note:** The Gameday Designer is currently operating as a standalone React application. Backend integration with the main Django app is deferred. This track will implement **mock endpoints** that mirror the expected production API structure to facilitate seamless integration later.

## Functional Requirements

### 1. Gameday Dashboard (List View)
- **Route:** Replaces the root route of the Gameday Designer.
- **Display:** Gamedays are rendered as cards in a responsive grid.
- **Card Content:**
    - Gameday Name and Date.
    - Associated Season or League.
    - Status (e.g., Draft, Scheduled, Completed).
- **Sorting:** Default sorting by Gameday Date (descending).
- **Search & Filtering:**
    - A single text input for wildcard searching across Gameday names, team names, and stage names.
    - Support for "Google Dork" style specific filters (e.g., `team:Vikings`, `season:2025`).
- **Creation:** A "Create New Gameday" button that redirects to the Editor in a blank state.

### 2. Gameday Editor Integration
- **Route:** Individual gamedays are edited at `/designer/:id`.
- **Metadata Header:** A new accordion-style section at the top of the Editor for managing gameday-level properties:
    - Gameday Name.
    - Date.
    - Season/League.
    - Venue.
- **Persistence:** Changes to metadata are saved alongside the tournament structure.

### 3. Mock Backend / API Service
- **Mock Implementation:** Extend the current mock service architecture to support Gameday CRUD operations.
- **API Parity:** Mock endpoints must match the expected Django REST Framework signatures.
    - `GET /api/gamedays/`: List gamedays (supports filtering).
    - `POST /api/gamedays/`: Create a new gameday.
    - `GET /api/gamedays/:id/`: Retrieve gameday details + structure.
    - `PUT/PATCH /api/gamedays/:id/`: Update gameday metadata & structure.
- **Search Simulation:** Implement client-side or mock-service logic to simulate the "dork" search functionality.

## Acceptance Criteria
- [ ] Navigating to the Designer root displays the Gameday Dashboard.
- [ ] Gameday list correctly filters based on text input and specific dork patterns (using mock data).
- [ ] Clicking a Gameday card opens the Editor for that specific ID.
- [ ] Creating a new Gameday redirects to the Editor with the Metadata accordion open.
- [ ] Metadata changes (Name, Date, Season, Venue) are persisted to the local mock state.
- [ ] Mock API endpoints are structured to match future real backend requirements.

## Out of Scope
- Actual Django backend integration (deferred to a later track).
- Advanced bulk actions (e.g., deleting multiple gamedays at once).
