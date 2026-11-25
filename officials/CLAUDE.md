# officials/ — CLAUDE.md

> Module guide. For repo-wide commands, testing setup, and deployment policy see the [root CLAUDE.md](../CLAUDE.md).

## Purpose
Manages **referees/officials**: their licenses, gameday signups, and assignment to games, plus
license reporting (including a Moodle integration).

## Role in the system
Owns official-specific data and links officials to games (`GameOfficial` lives in
[gamedays](../gamedays/CLAUDE.md)). Feeds license/duty reporting used for tracking and reimbursement.

## Key models (`models.py`)
`Official`, `OfficialGamedaySignup`, `OfficialLicense`, `OfficialLicenseHistory`,
`OfficialExternalGames` (plus `Empty*` null-object variants), and
`CrewPosition` — the scorecard's crew slots *per league* (`position` is the
exact `GameOfficial.position` wire value, `label` the display name, `order` the
sequence, `required` decides the completeness counter). Rows are **overrides on
top of** the built-in five (`DEFAULT_CREW_POSITIONS`), not a replacement: a row
relabels/reorders an existing position or adds a new one after the defaults, and
one row can never delete a slot — hiding a default is not expressible yet (the
crew-template/count layer). The table therefore only holds overrides; a league
without rows behaves like today.

## Service layer (`service/`)
- `official_service.py`, `officials_repository_service.py` — core logic + data access.
  `official_service.py` also holds `LICENSE_LEVELS` (`["F1","F2","F3","F4"]`, best-to-worst) and
  `license_rank()` (resolves a possibly year-suffixed license name like `"F1 2027"` to its rank
  index) — the canonical level-parsing shared by every consumer below.
- `signup_service.py` — gameday signup handling; already depends on `league_table.LeagueSeasonConfig`
  for per-gameday officiating quotas (precedent for the dependency below).
- `boff_license_calculation.py`, `game_official_entries.py` — license level calculation from duties.
- `officials_compliance_service.py` — checks whether a game's assigned officials meet the
  minimum-officials-per-license-level thresholds configured on `league_table.LeagueSeasonConfig`
  (a *different* concern from `boff_license_calculation.py`: given already-recorded license
  history, does the assigned staff meet a configured minimum). Also exposes `best_valid_rank()`
  (public - shared with `game_official_licenses.py` below). Reads `league_table.models` directly;
  consumed by [matchreport](../matchreport/CLAUDE.md)'s gameday list/detail views, not from within
  this app.
- `crew_positions.py` — the crew slots the scorecard offers for a game
  (`crew_positions_for_game` resolves game → gameday → league;
  `crew_positions_for_league` merges the league's rows onto
  `DEFAULT_CREW_POSITIONS`, sorted by `order` with a stable default-sequence
  tie-break — never an empty list). Edited per league in the Django admin;
  `manage.py seed_crew_positions <liga|--all>` pre-fills a league's labels with
  the defaults once (the defaults are active either way).
- `game_official_licenses.py` — resolves the currently valid license per refereed position
  (Referee/Down Judge/Field Judge/Side Judge) for a batch of games; consumed by matchreport's
  gameday-list CSV export.
- `license_validity.py` — shared license-validity-window logic (a license is valid from
  `created_at` through approximately one year later, `timedelta(days=365)`), used by
  `officials_compliance_service.py` and matchreport's `model_wrapper.py` so the two can't
  independently drift.
- `official_profile.py` — shared official-profile-URL helper, used by both `moodle/moodle_service.py`
  and matchreport's `model_wrapper.py`.
- `association_resolution.py` — `resolve_association()` / `UnknownAssociationError` /
  `ASSOCIATION_ALIASES`: the single source of truth for turning the external-game
  sheet's free-text "Verband" values into `gamedays.Association` rows (used by
  migration `0017`, the import and the self-service forms). 21 production values
  map onto 19 rows; no association is created.
- `moodle/` — external Moodle license-report integration.

## Self-service (`selfservice.py`, `forms_selfservice.py`)

Officials manage their own duties on `/officials/einsaetze/` and in their profile
after logging in with their offd.de account (session key
`MOODLE_LOGGED_IN_USER`, remember-me cookie `officials_remember`, path
`/officials/`). One gate, `SelfServiceWriteMixin`, lets staff or the
Moodle-logged-in official through and sends everyone else to the Moodle login
with a validated `?next=`. A Moodle user is always pinned to their own `Official`
row — a posted `official_id` is ignored — and `can_edit_official()` is re-checked
per row. Views: claim an unassigned (`?`) row
(`UPDATE … WHERE official IS NULL`, so a race has exactly one winner),
add an assignment (gameday → game → position, blocked when the official is
already on the game or the position is occupied), staff-only unassign (keeps the
typed name), edit/delete external games (association dropdown), delete own DFFL
rows, and a multi-row formset for external games.

The Einsätze list is only cached for anonymous visitors; any session, staff user
or remember-me cookie renders uncached so per-visitor banners/buttons never
enter the shared cache. Delegation/authorization details for the module live in
[docs/topics/features/officials-selfservice.md](../docs/topics/features/officials-selfservice.md).

## API & routes
- `api/` (`views.py`, `serializers.py`, `urls.py`) — official data endpoints,
  incl. `GET /api/officials/crew-positions/game/<id>` for the scorecard's
  preparation screen (`[{position, label, order, required}]`, configured or
  default — same shape).
- `urls.py`: `moodle-report/` — license report export.

## Conventions & gotchas
- `Empty*` classes are **null-object** placeholders — return them instead of `None` where the
  existing code expects a license/history object.
- License levels are **calculated** from game entries; change the calculation in
  `boff_license_calculation.py`, not at call sites.

## Tests
```bash
cd leaguesphere && pytest officials
```


## CI scope (scoped CI)

Changes here run: **python-officials (pytest officials/tests/).** Scoping details: [Scoped CI](../docs/topics/deployment/scoped-ci.md).
