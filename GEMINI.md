# GEMINI.md

This file provides a comprehensive instructional context for Gemini (and other AI agents) working in the LeagueSphere repository.

## Project Overview

**LeagueSphere** is a sophisticated flag football league management system built with Django 5.2+ and multiple React frontends. It handles complex tournament scheduling, player eligibility (passcheck), live scoring, and league standings.

### Key Architectural Pillars
- **Backend**: Django 5.2 with Django REST Framework (DRF) and Knox Token Auth.
- **Frontend Architecture**: Multiple independent React apps bundled via Vite and served as Django static files.
  - **Gameday Designer**: Advanced flowchart-based scheduling tool (Vite/TypeScript/React Flow).
  - **Passcheck**: Player eligibility verification (Vite/TypeScript).
  - **Liveticker & Scorecard**: Real-time game monitoring and scoring (Vite/React/Redux).
- **Database**: MySQL/MariaDB (MariaDB preferred for local/test environments).
- **Infrastructure**: Managed via Ansible; Dockerized deployment (Backend: Gunicorn; Frontend: Nginx).

---

## Development & Environment Setup

### Python Environment
The project utilizes `uv` for high-performance dependency management.

```bash
# Sync environment with test dependencies
uv sync --extra test

# Run Django with development settings
league_manager=dev python manage.py runserver --insecure
```
*Note: `--insecure` is required to serve static files locally when `DEBUG=False`.*

### 2. Branching & Pull Requests
- **NO Commits to Master**: Direct commits to the `master` branch are strictly forbidden.
- **Feature Branches**: All work must be performed on a dedicated branch created for the specific task or feature.
- **Mandatory Local QA**: Before pushing anything to remote, all QA checks must pass locally (Tests, Lint, and Security).
- **Pull Requests**: Every change must receive a Pull Request (PR). PRs must always be created in **origin** (`dachrisch/leaguesphere`). Use `gh pr create --repo dachrisch/leaguesphere` to avoid interactive prompts.
- **Issues**: Task tracking and issue management are performed on **upstream github**.
- **Merging**: Branches are only merged into `master` after explicit user approval.

### Frontend Environment
Each React application resides in its own directory with its own `package.json`.

```bash
# Typical frontend commands (e.g., in gameday_designer/)
npm install
npm run start    # Vite dev server
npm run build    # Production build to static/ directory
```

---

## Testing Strategy

### 1. Backend Testing (pytest)
Backend tests require a MariaDB instance. The project infrastructure uses an LXC container (`servyy-test`) running a Docker MariaDB.

**Mandatory Environment Variables:**
```bash
export MYSQL_HOST=10.185.182.207
export MYSQL_DB_NAME=test_db
export MYSQL_USER=user
export MYSQL_PWD=user
export SECRET_KEY=test-secret-key
```

**Execution:**
```bash
# Reset/Start test DB (in container/ directory)
./spinup_test_db.sh

# Run tests
pytest
```

### 2. Frontend Testing (vitest)
All modern frontend apps use Vitest.
```bash
npm --prefix gameday_designer/ run test:run
```

---

## Deployment & Safety Policies

**CRITICAL: Mandatory Deployment Process**
1. **Develop Fix**: Modify Ansible playbooks in `infrastructure/container`.
2. **Test First**: Deploy to `servyy-test.lxd` (`10.185.182.207`) using the Ansible test inventory.
3. **Validate**: Verify all configurations and services on the test host.
4. **Production**: Only deploy to `lehel.xyz` AFTER successful verification on `servyy-test`.

**Forbidden Actions:**
- Direct manual edits on production servers (SSH + vi/nano).
- Hotfixes without Ansible automation.
- Deploying to production without prior test environment validation.

---

## Feature-Specific Context

### Gameday Designer
- **Paradigm**: Uses a **Flowchart/Node-Wiring** model (React Flow) rather than a grid.
- **Hierarchy**: `Field (Container) > Stage (Container) > Game (Node)`.
- **Progression**: Supports automatic winner/loser progression patterns (e.g., SF1 winner -> Final).
- **Services**: `TemplateValidationService` (business rule validation) and `TemplateApplicationService` (atomic application of templates to gamedays).

### Passcheck
- **Verification**: Enforces complex eligibility rules across leagues (e.g., max gamedays, relegation rules).
- **Integration**: Links `Player` records to `Gameday` events via `PlayerlistGameday`.

---

## Conventions & Standards

### Coding Style
- **Python**: Strict Django patterns. Format with `black .`.
- **TypeScript**: Prefer Functional Components and Hooks. Use `Context API` for new state management (Redux exists in legacy apps).
- **TDD**: Highly preferred. See `gameday_designer/tests/` for high-quality service-level test examples.

### Versioning
Managed via `bump2version`. Synchronized across:
- `league_manager/__init__.py`
- Frontend `package.json` files
- `uv.lock`

### Key Files for Context
- `CLAUDE.md`: Detailed agent workflows and deployment safety policies.
- `feature-dev/`: Contains ADRs, tournament play mode docs, and original requirements.
- `pytest.ini`: Configures test discovery and DB reuse.
- `pyproject.toml`: Defines dependencies and `bump2version` logic.