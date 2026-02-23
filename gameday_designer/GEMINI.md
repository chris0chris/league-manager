# Gameday Designer Component

The **Gameday Designer** is a sophisticated tool within LeagueSphere for creating, managing, and applying tournament schedule templates. It transitioned from a flowchart-based model to a hierarchical list-based UI to improve usability and reliability.

## Architecture & Hierarchy

The component follows a strict container hierarchy:
1.  **Field (Container)**: Represents a physical playing area.
2.  **Stage (Container)**: Represents a tournament phase (e.g., Vorrunde, Playoffs).
3.  **Game (Node)**: Individual matches within a stage.

### Team Management (v2)
- **Global Team Pool**: Teams are managed in a central pool rather than as individual nodes.
- **Team Groups**: Teams are organized into collapsible groups for better management in large tournaments.
- **Assignment**: Games use `homeTeamId`/`awayTeamId` for static assignments or `homeTeamDynamic`/`awayTeamDynamic` for winner/loser progression.
- **Templates**: Supports `splitCount` for multi-group stages and `progressionMapping` for explicit playoff entry wiring.

## Backend Services (`gameday_designer/service/`)

- **`TemplateValidationService`**: Enforces business rules before a template can be used (e.g., team count matches, no scheduling conflicts, valid standing references).
- **`TemplateApplicationService`**: An atomic service that applies a database template to a specific `Gameday` object, creating the necessary `Gameinfo` and `Gameresult` records.

## Key Frontend Logic (`src/`)

- **State Management**: Handled primarily via `useFlowState.ts`.
- **Progression Logic**: `bracketEdgeGenerator.ts` and `teamAssignment.ts` handle the complex logic of wiring winner/loser paths for playoffs.
- **Time Calculation**: `timeCalculation.ts` automatically staggers games based on start times, durations, and breaks, respecting manual overrides.

## Component Standards

- **TDD Highly Preferred**: Both backend (`pytest`) and frontend (`vitest`) have comprehensive suites.
- **Atomic State Updates**: When adding bulk elements (like edges), always use bulk addition functions (e.g., `addBulkGameToGameEdges`) to avoid React state batching race conditions.
- **Translations**: Uses `i18next` with typed namespaces (`ui`, `domain`, `modal`, etc.).

## Common Operations

```bash
# Frontend Testing
npm run test:run

# Backend Migration (Legacy JSON to DB Templates)
python manage.py migrate_json_schedules

# Frontend Build
npm run build
```

## Relevant Implementation Docs
- `PHASE_0_COMPLETION.md`: Database migration details.
- `PHASE_1_COMPLETION.md`: Backend service layer implementation.
- `EDGE_SYNC_FIX.md`: Critical fix for React state batching in bracket generation.
- `IMPLEMENTATION_SUMMARY.md`: Details on automatic playoff progression.
