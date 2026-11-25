# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Quick Reference: Essential Commands

### Backend (Python/Django)
```bash
# Install dependencies
uv sync --extra test

# Run migrations
python manage.py migrate

# Format code (REQUIRED before pushing)
black .

# Run all tests (requires LXC test DB — see Testing section)
pytest

# Run a single test file
pytest accounts/tests/test_views.py -v

# Run tests in parallel
pytest -n auto
```

### Frontend (React/Vite — run from app directory like `gameday_designer/`, `passcheck/`, etc.)
```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test:run

# Lint (REQUIRED before pushing — CI blocks merge on errors)
npm run eslint

# Run dev server
npm run dev
```

### Database & Infrastructure
```bash
# Spin up fresh LXC test database
./container/spinup_test_db.sh --fresh

# Set up test DB environment variable (REQUIRED for running tests)
export MYSQL_HOST=$(lxc list servyy-test --format json | jq -r '.[0].state.network.eth0.addresses[] | select(.family=="inet") | .address' | head -n 1)
```

### Load Testing & Monitoring
```bash
# Run k6 load test (ramping 1→10 virtual users over 10 minutes)
k6 run load-test-k6.js

# Monitor results in production Grafana dashboard
# https://monitor.lehel.xyz/ → k6 Load Testing dashboard
```

See **[Infrastructure Performance Policy](docs/topics/deployment/performance-policy.md)** for performance standards and automated checking. See **[Infrastructure Policy](docs/topics/deployment/infrastructure-policy.md)** and **[Contributor Guide § Version Management](docs/topics/guides/contributor-guide.md#-version-management-automated-via-release-please)** for deployment and release workflows. CI is path-scoped (runs only affected tests) — see **[Scoped CI](docs/topics/deployment/scoped-ci.md)**.

### First-Time Frontend Setup (Any React App)
```bash
# From app directory (e.g., gameday_designer/, passcheck/, liveticker/, etc.)
cd gameday_designer

# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev

# In another terminal, run tests
npm run test:run

# Verify linting (CI blocks merge on errors)
npm run eslint
```

---

## 🏗 Architecture Overview

### System Design
LeagueSphere is a **hybrid Django + React** application for tournament management:

- **Backend (Django 5.2)**: REST API serving as the central hub. Manages data persistence, authentication (Knox tokens), complex scheduling logic, and player eligibility validation. Key modules: `gamedays` (core scheduling), `accounts` (auth), `league_table` (standings), `teammanager` (rosters).

- **Frontend (Multiple React Apps via Vite)**: Specialized applications built independently and integrated into Django's `static/` directory:
  - `gameday_designer`: Flowchart-based schedule builder
  - `passcheck`: Player eligibility verification interface
  - `liveticker`: Real-time fan updates
  - `scorecard`: On-field scoring entry
  - `journey_dashboard`: Game progress dashboard (shows gameday schedule and live score updates)
  - `dashboard`: Legacy dashboard (being phased out)
  
- **Database (MariaDB/MySQL)**: Central persistence layer. Test environment uses dedicated LXC container (`servyy-test`).

### Game Progress Dashboard Feature
A dedicated feature for viewing live game progress across a 21-day window (7 days past, 14 days future):
- **View**: `GameProgressPageView` in `journey/progress_view.py` — authentication-required template view
- **API**: `GameProgressViewSet` in `journey/api/progress_views.py` — read-only API returning denormalized gameday + games + scores
- **Frontend**: `journey_dashboard/` React app displays paginated gameday schedule with live score updates
- **Query Optimization**: Uses `select_related()` for league/season and `prefetch_related()` for gameinfo/gameresult sets
- **Filters**: By league and season via query parameters

### Integration Pattern
All frontend apps communicate with Django via REST API (endpoints use `/api/` prefix). Frontend apps use Vite's `base` configuration to align with Django's static URL structure. The `collectstatic` command aggregates all built frontend assets for production delivery.

---

## 🗺 Module Guides (READ THE RELEVANT ONE FIRST)

Each module has its own `CLAUDE.md` describing **that module's function, key files, models,
API/routes, and gotchas**. Before working inside a module, open its guide — it will save you from
getting lost or missing cross-module dependencies.

**Core backend**
- [gamedays/](gamedays/CLAUDE.md) — **core domain**: Season/League/Team/Gameday/Gameresult + scheduling & results logic (most apps depend on it)
- [league_manager/](league_manager/CLAUDE.md) — Django **project config**: settings, root URLs, middleware, shared utils
- [accounts/](accounts/CLAUDE.md) — authentication; issues the **Knox tokens** all API clients use
- [league_table/](league_table/CLAUDE.md) — standings, rankings, tie-break rulesets
- [officials/](officials/CLAUDE.md) — referees: licensing, signups, assignments (+ Moodle report)
- [teammanager/](teammanager/CLAUDE.md) — team/club/roster CRUD (uses gamedays models)
- [matchreport/](matchreport/CLAUDE.md) — per-game match report generation (service-only)
- [journey/](journey/CLAUDE.md) — Game Progress dashboard **backend** (read-only progress API)
- [home/](home/CLAUDE.md) — personal home page (`/home/`): next gameday, checks, staff readiness/nudge
- [dashboard/](dashboard/CLAUDE.md) — ⚠️ **legacy**, being phased out (prefer `journey`)

**Hybrid (Django app + co-located React app in the same folder)**
- [passcheck/](passcheck/CLAUDE.md) — player eligibility verification (TS, Context/hooks)
- [gameday_designer/](gameday_designer/CLAUDE.md) — flowchart schedule-template builder (TS, React Flow)
- [liveticker/](liveticker/CLAUDE.md) — real-time score display (JS, Redux)
- [scorecard/](scorecard/CLAUDE.md) — on-field scoring entry (JS, Redux; thin backend)

**Frontend-only**
- [journey_dashboard/](journey_dashboard/CLAUDE.md) — React app for the `journey` progress dashboard (TS)

> Note: `liveticker` and `scorecard` use **JavaScript + Redux**, while `passcheck`,
> `gameday_designer`, and `journey_dashboard` use **TypeScript + Context/hooks** — check the
> module guide before assuming a state pattern.

---

## ⚡ Query Optimization & Caching Patterns

**See [Performance Guide](docs/topics/deployment/performance-guide.md) for comprehensive standards and automated checking.**

### HTTP-Level ETag Caching
The `gamedays/api/views.py` implements ETag-based caching to reduce redundant data transfers:
- **Gameday List**: Uses `@condition(etag_func=generate_gameday_list_etag)` decorator with query parameters + row count + `Max(updated_at)` across all gamedays
- **Gameday Games**: Uses `generate_gameday_games_etag()` based on latest gameresult pk
- Returns HTTP 304 (Not Modified) when ETags match, preventing unnecessary response payload transfers

**When to use:** Always use ETags for read-heavy endpoints that serve large data structures. Include relevant query parameters, plus enough of the underlying state to change whenever the response would: a `Max(pk)`/count alone only detects rows being added or removed, not a field edit on an *existing* row (status flip, rename, etc.) — that silently served stale 304s for a gameday's Draft/Published badge after publishing (see `Gameday.updated_at`, `Gameday.save()`, and `gamedays/api/tests/test_gameday_list_etag_freshness.py`). Prefer a `Max(updated_at)` over an editable model, and make sure `save(update_fields=[...])` call sites don't quietly exclude it.

### Query Optimization with Prefetch & Select
The `GameProgressViewSet` demonstrates the optimization pattern:
```python
queryset = queryset.select_related(
    'league',
    'season',
).prefetch_related(
    'gameinfo_set',
    'gameinfo_set__gameresult_set',
)
```
- `select_related()`: Joins related objects (league, season) in a single query
- `prefetch_related()`: Batch-fetches related sets (gameinfos and their results) in separate queries
- **Critical for performance:** Every API endpoint returning gameday data should use these patterns

**When to use:** 
- `select_related()`: Foreign keys / one-to-one relationships (use when relationships are mandatory)
- `prefetch_related()`: Reverse foreign keys / many-to-many (use to avoid N+1 queries)

### Mandatory Query Assertions in Tests
Every test touching the database **MUST** verify query count:
```python
with self.assertNumQueries(1):  # Exactly 1 query expected
    response = self.client.get('/api/gamedays/')
```
Query count must NOT increase with result set size (e.g., 10 gamedays = same query count as 1000).

---

## 🧪 Testing & Verification (MANDATORY)

**All code MUST pass verification before pushing to remote.**

### Backend Testing
```bash
# Set up test database (one-time or when fresh start needed)
./container/spinup_test_db.sh --fresh
export MYSQL_HOST=$(lxc list servyy-test --format json | jq -r '.[0].state.network.eth0.addresses[] | select(.family=="inet") | .address' | head -n 1)

# Run full test suite
pytest

# Run with coverage report
pytest --cov=. --cov-report=html

# Run specific tests
pytest gamedays/tests/test_models.py::TestSchedule -v
```

**Critical Note:** Backend tests require a MariaDB instance in LXC. Do NOT assume it's unavailable without checking with `./container/spinup_test_db.sh`.

### Frontend Testing
Frontend tests run independently with **no external database required**:
```bash
# From app directory (e.g., gameday_designer/)
npm run test:run
```

### Code Quality (CI Blocks Merge on Violations)
- **Backend**: `black .` (code formatting) — no linting errors
- **Frontend**: `npm run eslint` (ZERO errors) — critical rules enforced:
  - ❌ No `as any` type assertions (use `ReturnType<typeof fn>` or explicit types)
  - ❌ No deprecated methods (`.substr()` → `.slice()`)
  - ❌ No `Math.random()` for security-sensitive values (use `crypto.getRandomValues()`)
  - ❌ No unused imports or variables

### Verification Checklist
Before marking a task complete:
1. ✅ Write tests first (TDD: RED → GREEN → REFACTOR)
2. ✅ All backend tests pass: `pytest`
3. ✅ All frontend tests pass: `npm run test:run` (in each app)
4. ✅ Format backend code: `black .`
5. ✅ Lint frontend: `npm run eslint` (ZERO errors)
6. ✅ Scoped CI coverage passes: `python3 scripts/check_scope_coverage.py` (update `.circleci/scope-mapping.txt`/`scope-exclude.txt` when adding files or CI rules — see [Scoped CI](docs/topics/deployment/scoped-ci.md))
7. ✅ Verify on staging: `./container/deploy.sh stage`, then test at [stage.leaguesphere.app](https://stage.leaguesphere.app)

---

## 🚀 Development Workflow

### 1. Test-Driven Development (Mandatory)
All features and bugfixes MUST follow the RED → GREEN → REFACTOR cycle:
1. Write failing test that captures the requirement
2. Implement code to pass the test
3. Refactor for clarity and maintainability
4. Verify full test suite passes

### 2. Git & Branching Protocol
- Create a feature branch; never commit directly to `master`
- Use conventional commits: `feat:`, `fix:`, `refactor:`, etc.
- **Sign every commit** with `git commit -s`: the DCO workflow
  (`.github/workflows/dco.yaml`) rejects a PR whose commits carry no
  `Signed-off-by` trailer. Forgot it? `git rebase --signoff master`, then
  `git push --force-with-lease` — no re-review needed. The rule is
  [CONTRIBUTING.md](CONTRIBUTING.md)'s.
- Create PR via: `gh pr create --repo dachrisch/leaguesphere --base master --title "..." --body "..."`
- Require ≥90% patch coverage
- See **[Contributor Guide § Git & Branching](docs/topics/guides/contributor-guide.md#-core-development-workflow)** for release and versioning details

### 3. Staging Validation
All changes MUST be tested on [stage.leaguesphere.app](https://stage.leaguesphere.app) before merging to master.

---

## ⚠️ Deployment Safety (Mandatory Policy)

**CRITICAL: ZERO TOLERANCE FOR MANUAL PRODUCTION EDITS**

❌ FORBIDDEN:
- Manual file edits on production servers (SSH + vi/nano)
- Direct configuration changes without Ansible automation
- Hotfixes bypassing proper automation workflow
- Skipping test environment validation

✅ REQUIRED WORKFLOW:
1. Develop via Ansible playbooks/scripts (never manual edits)
2. Test on test server (`servyy-test.lxd`) first
3. Only after successful test deployment, deploy to production
4. Verify results and document changes

Refer to **[Infrastructure Policy](docs/topics/deployment/infrastructure-policy.md)** for complete deployment protocols.

---

## 📖 Documentation Standards

All documentation lives in `/docs/topics/` organized by topic. Before creating or modifying documentation:

1. **Check the [Documentation Guidelines](docs/DOCUMENTATION.md)** — Detailed rules for where each type of doc belongs
2. **Follow the directory structure** — Architecture, Guides, Features, Deployment, Testing, Troubleshooting, Planning
3. **Link from the index** — Update the parent topic README.md when adding a new doc
4. **Remove old versions** — Don't leave outdated docs scattered around

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for the complete guide.

---

## 🔑 Special Configuration Requirements

### Database Initialization: Placeholder Teams (Critical)
The test database MUST include specific placeholder teams referenced by schedule JSON files. These are created automatically during `spinup_test_db.sh --fresh`:

- **Playoff Placeholders**: P3 Gruppe 1/2, P2 Gruppe 1/2/3, P1 Gruppe 1/2/3, P4 Gruppe 1/2
- **Match Outcomes**: Gewinner HF1/2, Verlierer HF1/2, Gewinner P3, Verlierer P3, etc.
- **Playoff Rankings**: Bester/Schlechtester P1/P2, Zweitbester P1/P2, etc.

If you see `Team.DoesNotExist: Team matching query does not exist`, run: `./container/spinup_test_db.sh --fresh`

See `gamedays/tests/setup_factories/db_setup.py::DBSetup.create_playoff_placeholder_teams()` for the complete list.

---

## 📚 Central Authority

For detailed protocols and standards, refer to:
- **[Contributor Guide](docs/topics/guides/contributor-guide.md)**: Build, test, code style, and safety guidelines (primary reference)
- **[Architecture Overview](docs/topics/architecture/architecture-overview.md)**: System design and tech stack decisions
- **[Coding Standards](docs/topics/guides/coding-standards.md)**: Python, TypeScript, and CSS conventions
- **[UI Button Patterns](docs/topics/guides/ui-button-patterns.md)**: Mandatory primary-CTA / cancel-button layout for self-service forms (agents must follow this for UI work)
- **[Infrastructure Policy](docs/topics/deployment/infrastructure-policy.md)**: Deployment safety and Ansible rules
- **[Setup Guide](docs/topics/guides/setup-guide.md)**: Local environment configuration
- **[AGENTS.md](AGENTS.md)**: Universal guidelines for all autonomous agents
- **[GEMINI.md](GEMINI.md)**: Gemini CLI-specific instructions

**Deployment Environments:**
- **[Prod / Stage / Demo / Test reference](../container/docs/leaguesphere-environments.md)** (in the `container` infra repo) — environment matrix, per-env setup commands, log/metric locations, and the "investigate-on-prod / reproduce-with-prod-data" (`ls_db_sync`) workflows. `ls_db_sync` clones prod into the **stage stack**, which can run on `lehel.xyz` (`./servyy.sh`) *or* on `servyy-test.lxd` (`./servyy-test.sh`) for an isolated copy. `spinup_test_db.sh` is the separate synthetic-fixture DB for the pytest suite.

**Recent Implementation Work:**
- **[Load Testing Infrastructure](history/2026-05-31_load-testing-infrastructure.md)** — k6 load tests, Prometheus metrics pipeline, Grafana dashboard setup

**Documentation Structure (`docs/` directory):**
- `docs/topics/architecture/`: Architectural Decision Records and system design
- `docs/features/`: Feature documentation (current and historical)
- `docs/guides/`: Setup, contributor, and coding standards
- `docs/plans/`: Historical and current implementation plans
- `docs/reports/`: Performance analysis, verification reports, and summaries
- `docs/topics/testing/`: Test scenarios and testing strategies

---

## 🤖 Claude Code Workflow

### When Delegating to Agents
This project defines specialized agents for different tasks. Use them when appropriate:
- **TDD Engineer**: For test-driven feature development
- **Architecture Designer**: For system design and technical approaches
- **QA Verification Engineer**: For comprehensive quality checks before merging
- **Git Commit Manager**: For commits and PR creation with proper formatting
- **Documentation Specialist**: For creating/updating technical documentation

### Default Behavior
1. **Research First**: Map the codebase and validate assumptions before proposing changes
2. **Test-Driven**: Write tests before implementation code
3. **Verify Thoroughly**: Run full test suite and linting before reporting completion
4. **No Hotfixes**: Always use proper automation workflows — no manual production edits
