# Spinup Guide

## Overview
The database initialization process creates essential test data including placeholder teams 
required by schedule formats.

## Key Requirement: Placeholder Teams

Schedule JSON files reference "playoff placeholder" teams that resolve to actual teams 
during schedule creation. These must exist in the database:

- **Playoff Placeholders**: P3 Gruppe 1/2, P2 Gruppe 1/2/3, P1 Gruppe 1/2/3, P4 Gruppe 1/2
- **Match Outcomes**: Gewinner HF1/2, Verlierer HF1/2, Gewinner P3, Verlierer P3, etc.
- **Playoff Rankings**: Bester/Schlechtester P1/P2, Zweitbester P1/P2, etc.

See `DBSetup.create_playoff_placeholder_teams()` in 
`gamedays/tests/setup_factories/db_setup.py` for complete list.

## Setup Process

Run: `./container/start_dev_server.sh`

- **Default**: Reuses existing database, restarts container, builds apps.
- **Fresh Start**: `./container/start_dev_server.sh --fresh` 
  - Removes old database.
  - Creates new MariaDB instance.
  - Runs Django migrations.
  - Imports `test_db_dump.sql` with all required data.
  - Builds React apps and collects static files.

## What's in test_db_dump.sql

- Default Season: "2025"
- Default League: "Test League"
- Test Teams: Team 1, Team 2, Team 3
- Placeholder Teams: All 40+ playoff/match-result teams

## Error: "Team matching query does not exist"

**If you see**: `gamedays.models.Team.DoesNotExist: Team matching query does not exist`

This means placeholder teams are missing. Solutions:

1. Run fresh start: `./container/spinup_test_db.sh --fresh`
2. Or manually import: `mysql test_db < test_db_dump.sql`
