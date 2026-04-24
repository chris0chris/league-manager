# Design: League Team Selection for Tournament Generation

## Goal
Allow users to select existing league teams when generating a tournament from a template (both built-in and saved), ensuring these teams are correctly integrated into the tournament structure.

## Architecture
- **UI:** Enhance `TemplateLibraryModal` to pass full `GlobalTeam` objects.
- **Controller:** Update `useDesignerController` to handle incoming selected teams and assign them to template groups.
- **State:** Ensure teams are added to `flowState` before template application.

## Data Flow
1. User selects teams in `TemplateLibraryModal`.
2. Modal maps IDs to full team objects and passes them to the apply callback.
3. `ListDesignerApp` forwards these to `handleGenerateTournament`.
4. `handleGenerateTournament` adds teams to the pool and distributes them into template groups.
5. Tournament is generated using the real team IDs.

## Verification
- Unit tests for team-to-group assignment logic.
- E2E tests for generating a tournament with selected league teams.
