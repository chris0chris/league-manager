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

## Development Workflow & Protocol

### 1. Test-Driven Development (TDD)
We strictly follow the TDD cycle:
1.  **RED**: Write a test for the desired functionality and verify that it fails.
2.  **GREEN**: Implement the minimum code necessary to make the test pass.
3.  **REFACTOR**: Clean up the code while ensuring the tests remain GREEN.

Targeted modifications can be verified using isolated test runs (e.g., only the test file corresponding to the changed code). More complex tasks or significant changes require running the full test suite to prevent regressions.

### 2. Branching & Pull Requests
- **NO Commits to Master**: Direct commits to the `master` branch are strictly forbidden.
- **Feature Branches**: All work must be performed on a dedicated branch created for the specific task or feature.
- **Mandatory Local QA**: Before pushing anything to remote, all QA checks must pass locally (Tests, Lint, and Security).
- **Pull Requests**: Every change must receive a Pull Request (PR).
- **Merging**: Branches are only merged into `master` after explicit user approval.

### 3. Documentation & Progress Tracking
- **`feature-dev/` Directory**: Progress documentation for all features must be maintained in this directory.
- **Tracking**: All features (excluding minor bugs and quick fixes) must track their progress here.
- **History Entry**: Once a feature is finished, it must contain a history entry summarizing the implementation.
- **Coverage Requirements**: Patch coverage for each PR must be at least **90%** to maintain an overall project coverage of above **80%**.

---

## Testing Strategy

### 1. Execution
- **Targeted Runs**: For targeted modifications, tests can be run in isolation (e.g., only the test file corresponding to the changed code) to ensure fast feedback.
- **Full Suite**: Complex tasks or significant changes require running the full test suite to prevent regressions.

### 2. Backend Testing (pytest)
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

### 3. Frontend Testing (vitest)
All modern frontend apps use Vitest.
```bash
npm --prefix gameday_designer/ run test:run
```

---

## Deployment & Staging

### 1. Staging Deployments
- **Requirement**: Only create deployments (staging or production) if the underlying Pull Request or branch CI checks are successful (**GREEN**).
- **Trigger**: When a feature is "almost ready" and CI is green, it should be deployed to the staging environment.
- **Process**: Use the `./container/deploy.sh stage` script to trigger the deployment.
- **Validation**: All changes MUST be validated on the staging environment before the PR is merged or a production deployment is initiated.

### 2. Production Safety Policies (Ansible)
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

### Versioning
Managed via `bump2version` (or `bump-my-version`). Synchronized across:
- `league_manager/__init__.py`
- Frontend `package.json` files
- `uv.lock`
- `pyproject.toml`

### Key Files for Context
- `CLAUDE.md`: Detailed agent workflows and deployment safety policies.
- `feature-dev/`: Contains ADRs, tournament play mode docs, and implementation progress.
- `pytest.ini`: Configures test discovery and DB reuse.
- `pyproject.toml`: Defines dependencies and versioning logic.