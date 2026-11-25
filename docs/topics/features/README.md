# Features

Feature specifications, requirements, and documentation.

## Quick Links

Current features:
- [What's New 2026](./whats-new-2026.md) — Major user-facing features shipped since late 2025
- [Gameday Designer](./gameday-designer/) — Flowchart-based game schedule design
- [Gameday Live Updates](./liveticker/) — Real-time game progress updates
- [Scorecard v2](./scorecard-v2/overview.md) — `/scorecard/v2/`: the offline-capable field app (beta); the old `/scorecard/` keeps working
- [League Table](./league-table/) — League standings and team statistics
- [Season Rollover](./season-rollover/overview.md) — Staff flow from a new season to league/team assignment and the first gameday
- [Personal Home](./personal-home/overview.md) — `/home/`: next gameday, checks, season break, official and staff states
- [Share Widget](./share-widget/) — Embeddable scores/fixtures/standings for club sites
- [Public API](./public-api/) — `/api/snapshot/`, the only public, cross-origin readable endpoint
- [Officials Self-Service](./officials-selfservice.md) — officials claim/add their own assignments and manage their external games

## Overview

Each feature is documented in its own subdirectory:
- `overview.md` — What the feature does and why
- `specification.md` — Technical design and implementation details
- `requirements.md` — User-facing requirements and behavior

### Adding a New Feature

1. Create `features/[feature-name]/` subdirectory
2. Add `overview.md`, `specification.md`, `requirements.md`
3. Update this README.md to link the new feature
4. Reference the feature doc from the main `/docs/README.md`
