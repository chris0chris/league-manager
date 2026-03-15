# Gamedays App

The core Django application responsible for tournament management, gameday scheduling, and the underlying business logic of competitions.

## Key Components
- `models.py`: Definitions for Gameday, Gameinfo, Gameresult, and Team associations.
- `service/`: Critical business logic for scheduling and result calculation.
- `wizard/`: Multi-step forms for creating and configuring new gamedays.
- `api/`: REST endpoints for gameday data.

## Business Rules
This app enforces league-specific rules for game times, field assignments, and tournament progression.
