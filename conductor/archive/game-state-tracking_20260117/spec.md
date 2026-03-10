# Track: Game State Tracking & Result Management

## 1. Overview
This feature implements the lifecycle management of a Gameday, transforming it from a static schedule into a live, interactive event. It introduces a "Completed" state for the schedule configuration, locking it from casual edits, and enables the entry of game results (halftime and final scores). Crucially, entering results triggers the resolution of indirect team references (e.g., "Winner Game 1" -> "Team A"), displaying the actual team name alongside the placeholder in the Designer UI.

## 2. Functional Requirements

### 2.1 Gameday Lifecycle
- **Draft State:** Default state for new gamedays. Fully editable configuration (fields, times, team assignments).
- **Published/Locked State:**
    - Triggered by a manual "Publish Schedule" (or similar) button in the Designer.
    - Locks the schedule structure (no adding/removing games or changing times without explicit confirmation).
    - Enables result entry for games.
- **In Progress State:** Automatically set when the first game result is recorded.
- **Completed State:** Automatically set when all games have final results.

### 2.2 Result Management (Designer Context)
- **Result Entry Interface:**
    - Admins can enter scores for "Halftime" and "Final".
    - Located within the Gameday Designer UI (likely in the Game Node or a details panel).
- **Confirmation for Edits:** If a gameday is "Published", changing schedule parameters (time, field) requires a "Unlock/Confirm" modal to prevent accidental disruption.

### 2.3 Dynamic Reference Resolution
- **Trigger:** When a game result is entered (and a winner/loser is determined).
- **Behavior:**
    - Identify all games that reference the completed game (e.g., "Winner of Game X").
    - Dynamically display the resolved team name next to the reference (e.g., "Winner Game 1 (Team A)") in the Designer UI.
- **Persistence:** This resolution is *dynamic* (frontend/read-time calculation) based on the current results in the database. It does NOT permanently overwrite the reference structure in the DB (preserving the template logic).

## 3. Non-Functional Requirements
- **Real-time Updates:** Result entries should reflect immediately in the UI.
- **Data Integrity:** Changing a result that affects downstream games (e.g., changing who won Game 1) must update all dependent resolutions (Game 2's home team) immediately.

## 4. Acceptance Criteria
- [ ] User can manually "Publish" a gameday, locking layout edits.
- [ ] User can enter Halftime and Final scores for a game in the Designer.
- [ ] Entering a score updates the game status.
- [ ] When Game A is finished, Game B (which depends on "Winner Game A") displays the actual team name in the UI.
- [ ] The underlying template structure (references) remains intact in the DB.

## 5. Out of Scope
- Integration with Scorecard app (this track focuses on Designer/Admin workflows).
- Liveticker updates (assumed to be covered by existing polling/data fetching).
