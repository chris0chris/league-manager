# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeagueSphere is a Django-based web application for managing flag football leagues, including game scheduling, live scoring, player pass checking, and league standings. The project combines a Django backend with multiple React/TypeScript frontends.

**Main branch**: `master`

## Working with Claude Code

### Agent-Based Development

This project uses specialized Claude Code agents for different development tasks:
- **requirements-analyst** - Analyzes requirements and creates technical specifications
- **architecture-designer** - Designs system architecture and technical approaches
- **implementation-engineer** - Implements features following SOLID principles and clean code practices
- **tdd-engineer** - Implements features using test-driven development (TDD)
- **qa-verification-engineer** - Runs comprehensive quality checks including tests, coverage, linting, and security scans
- **cleanup-coordinator** - Ensures PRs contain only relevant changes and no dead code
- **git-commit-manager** - Handles git commits and PR creation following conventional commit format
- **documentation-specialist** - Creates and maintains comprehensive documentation

**Workflow:** Claude Code will automatically delegate tasks to appropriate specialized agents. Each agent has specific expertise and tools to handle their domain effectively.

### Testing Strategy

**During Feature Development:**
- Individual tests can be run to verify specific functionality
- Use focused test runs for quick feedback during implementation
- Run specific test files or test methods related to the feature being developed

**Before Any Push/PR:**
- **MANDATORY**: Run the full test suite before pushing to any branch
- All tests must pass (expect 7 Moodle API tests to fail without credentials - this is normal)
- Ensure code formatting is applied (`black .`)
- Verify linting passes for any modified frontend code

**Full Test Command:**
```bash
# Backend tests (must pass before push)
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest

# Frontend tests (must pass for modified apps)
npm --prefix passcheck/ run test:run
npm --prefix liveticker/ run test:run
npm --prefix scorecard/ run test:run
```

**Important:** Never push code with failing tests. The CI/CD pipeline will catch failures, but local verification prevents wasted CI time and maintains code quality.

## Architecture

### Backend (Django)

The backend uses Django 5.2+ with Django REST Framework and Knox for token authentication. Settings are split by environment:
- `league_manager/settings/base.py` - shared settings
- `league_manager/settings/dev.py` - development settings
- `league_manager/settings/prod.py` - production settings

Set `DJANGO_SETTINGS_MODULE=league_manager.settings` (defaults to base) or use `league_manager=dev` environment variable for development.

### Django Apps Structure

- **gamedays** - Core app for game scheduling and management
- **scorecard** - Live game scoring interface (Django backend + React frontend)
- **liveticker** - Real-time game ticker (Django backend + React frontend)
- **passcheck** - Player eligibility verification (Django backend + TypeScript/React frontend)
- **league_table** - League standings and statistics
- **officials** - Game officials management
- **teammanager** - Team and roster management
- **accounts** - User authentication and profiles

### Frontend Architecture

Three React applications are bundled and served by Django:

1. **passcheck** (`passcheck/src/`) - TypeScript/React app
   - Built with Vite → `passcheck/static/passcheck/js/passcheck.js`
   - Uses TypeScript, React hooks, Context API for state management
   - Tests use Vitest

2. **liveticker** (`liveticker/src/`) - JavaScript/React app
   - Built with Vite → `liveticker/static/liveticker/js/liveticker.js`
   - Uses Redux for state management
   - Tests use Vitest

3. **scorecard** (`scorecard/src/`) - JavaScript/React app
   - Built with Vite → `scorecard/static/scorecard/js/scorecard.js`
   - Uses Redux for state management
   - Tests use Vitest

All React apps proxy to Django backend (`http://localhost:8000` or `http://127.0.0.1:8000`) for API calls.

### Database

MySQL database configured via environment variables:
- `MYSQL_DB_NAME` (default: test_db)
- `MYSQL_USER` (default: user)
- `MYSQL_PWD` (default: user)
- `MYSQL_HOST` (default: 127.0.0.1)
- `MYSQL_PORT` (default: 3306)

Environment variables are loaded from `.env` file (use `.env_template` as reference).

## Development Commands

### Python/Django

**Install dependencies:**
```bash
pip install -r requirements.txt
pip install -r test_requirements.txt
```

**Run development server:**
```bash
# Use --insecure to serve static files during development
python manage.py runserver --insecure

# With dev environment
league_manager=dev python manage.py runserver --insecure

# With test database
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
python manage.py runserver --insecure
```

**Note:** The `--insecure` flag forces Django to serve static files even with `DEBUG=False`. This is necessary for development when testing production-like settings but should never be used in actual production.

**Database migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Collect static files:**
```bash
python manage.py collectstatic
```

**Run Python tests:**

Tests require a MySQL/MariaDB database running in an LXC container. The test infrastructure uses LXC container `servyy-test` which runs a Docker MariaDB instance.

```bash
# 1. Check if LXC container is running
lxc list

# 2. Start LXC container if stopped
lxc start servyy-test

# 3. Setup test database (starts MySQL in Docker on LXC container)
cd container && ./spinup_test_db.sh

# 4. Run tests with proper environment variables
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest

# Run with coverage
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --junitxml=test-reports/test-results.xml --cov=. --cov-report=xml --cov-report=html

# Quick tests (no coverage, reuse DB)
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --nomigrations --reuse-db
```

**Note:** If LXC server is not reachable (cannot resolve `servyy-test.lxd`), run the setup script:
```bash
cd /home/cda/dev/infrastructure/container/scripts && ./setup_test_container.sh
```

**Expected test results:** ~302 tests should pass. 7 Moodle API tests will fail without `MOODLE_URL` and `MOODLE_WSTOKEN` environment variables - this is expected for local development.

**Code formatting:**
```bash
black .
```

### JavaScript/TypeScript

Each React app has its own `package.json` and must be built separately.

**Install dependencies (per app):**
```bash
npm --prefix passcheck/ install
npm --prefix liveticker/ install
npm --prefix scorecard/ install
```

**Build for production:**
```bash
npm --prefix passcheck/ run build    # Uses Vite
npm --prefix liveticker/ run build   # Uses Vite
npm --prefix scorecard/ run build    # Uses Vite
```

**Development server:**
```bash
npm --prefix passcheck/ run start    # Vite dev server on port 3000
npm --prefix liveticker/ run start   # Vite dev server on port 3000
npm --prefix scorecard/ run start    # Vite dev server
```

**Run tests:**
```bash
# All frontend apps use Vitest
npm --prefix passcheck/ run test         # Watch mode
npm --prefix passcheck/ run test:run     # Single run
npm --prefix passcheck/ run test:coverage  # With coverage

npm --prefix liveticker/ run test        # Watch mode
npm --prefix liveticker/ run test:run    # Single run
npm --prefix liveticker/ run test:coverage  # With coverage

npm --prefix scorecard/ run test         # Watch mode
npm --prefix scorecard/ run test:run     # Single run
npm --prefix scorecard/ run test:coverage  # With coverage
```

**Linting:**
```bash
npm --prefix passcheck/ run eslint
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint
```

### Running Single Tests

**Python tests:**
```bash
# Run specific test file
pytest gamedays/tests/test_views.py

# Run specific test class or function
pytest gamedays/tests/test_views.py::TestClassName
pytest gamedays/tests/test_views.py::TestClassName::test_method_name
```

**JavaScript tests:**
```bash
# All frontend apps use Vitest (interactive watch mode)
npm --prefix passcheck/ run test
npm --prefix liveticker/ run test
npm --prefix scorecard/ run test
# Then press 'p' to filter by filename pattern or 't' to filter by test name

# Run specific test file with Vitest
npm --prefix passcheck/ -- vitest run src/components/__tests__/GameCard.test.tsx
npm --prefix liveticker/ -- vitest run src/components/__tests__/LivetickerApp.spec.js
npm --prefix scorecard/ -- vitest run src/components/scorecard/__tests__/Details.spec.js
```

## Versioning

Version is managed via `bump2version` and synchronized across:
- `league_manager/__init__.py`
- `liveticker/package.json`
- `passcheck/package.json`
- `scorecard/package.json`

Configuration in `setup.cfg`.

## CI/CD

### GitHub Actions Workflows

The project uses GitHub Actions with an optimized artifact-based Docker build strategy to minimize redundant builds and reduce CI/CD costs.

**Main Workflows:**
- **`ci.yaml`** - Triggered on tags: runs tests, builds Docker images once, runs checks, and deploys to Docker Hub
- **`ci_pr.yaml`** - Triggered on PRs: runs tests, builds Docker images once, and runs checks (no deployment)
- **`ci_branch.yaml`** - Triggered on branch pushes: runs tests only

**Workflow Execution Pattern (ci.yaml):**
```
1. Tests (parallel):
   ├─ Python/Django tests (pytest)
   ├─ Scorecard tests (Jest)
   ├─ Liveticker tests (Jest)
   └─ Passcheck build

2. Build Docker Images (parallel, after tests pass):
   ├─ Backend image → saved as artifact
   └─ Frontend image → saved as artifact

3. Checks (parallel, using artifacts):
   ├─ Test backend health
   └─ Check Django migrations

4. Deploy (parallel, using artifacts):
   ├─ Push backend to docker.io/leaguesphere/backend
   └─ Push frontend to docker.io/leaguesphere/frontend
```

**Reusable Workflow Parts** (`.github/workflows/part_*.yaml`):
- `part_build_test.yaml` - Python/Django tests with pytest + coverage
- `part_node_test.yaml` - Node.js tests with Jest + ESLint
- `part_node_build.yaml` - Node.js build only (for passcheck)
- `part_docker_build.yaml` - Build Docker image and export as artifact
- `part_docker_test.yaml` - Test Docker image health from artifact
- `part_check_migrations.yaml` - Run Django migration checks from artifact
- `part_docker_push_artifact.yaml` - Push Docker image from artifact to registry

**Key Optimization:** Docker images are built once and shared between jobs via GitHub Actions artifacts, eliminating duplicate builds and reducing workflow execution time.

### Legacy CI (CircleCI)

CircleCI configuration exists in `.circleci/config.yml` but GitHub Actions is the primary CI/CD system.

### Docker Deployment

**Docker Images:**
- **Backend** (`container/app.Dockerfile`) - Django application with Gunicorn
- **Frontend** (`container/nginx.Dockerfile`) - Nginx serving static React builds

**Registry:** Docker Hub at `docker.io/leaguesphere/`
- `leaguesphere/backend:latest` and `leaguesphere/backend:<version>`
- `leaguesphere/frontend:latest` and `leaguesphere/frontend:<version>`

**Health Checks:** Backend container includes health check endpoint at `/health/`

### Test Infrastructure

The project uses LXC containers for isolated test database environments.

**LXC Container Setup:**
- Container name: `servyy-test`
- IP address: `10.185.182.207`
- Runs Docker MariaDB instance for tests
- Accessible via SSH as `servyy-test.lxd`

**Test Database Configuration:**
- MariaDB container inside LXC container
- Port: 3306 (exposed on LXC container)
- Database: `test_db`
- Credentials: `user/user` (root password: `user`)
- Test user created with full privileges

**Setup Scripts:**
- `container/spinup_test_db.sh` - Creates/restarts MySQL container in LXC
- `/home/cda/dev/infrastructure/container/scripts/setup_test_container.sh` - Configures LXC container and SSH access

**pytest Configuration** (`pytest.ini`):
- Django settings: `league_manager.settings`
- Options: `--nomigrations --reuse-db --capture=no`
- Test discovery: `test_*.py` and `*_test.py`

## Key Technical Details

### Django REST Framework API Structure

Each app exposes its API under `/api/<app_name>/`:
- `/api/` - gamedays API
- `/api/liveticker/` - liveticker API
- `/api/officials/` - officials API
- `/api/passcheck/` - passcheck API

Authentication uses Knox tokens. Default permissions: `IsAuthenticatedOrReadOnly`.

### Maintenance Mode

Maintenance mode can be enabled via `MAINTENANCE_MODE` setting. Specific pages are blocked via `MAINTENANCE_PAGES` list (regex patterns supported). Middleware: `league_manager.middleware.maintenance.MaintenanceModeMiddleware`.

### Static Files Integration

React apps are built into their respective Django app `static/` directories:
- `passcheck/static/passcheck/js/passcheck.js`
- `liveticker/static/liveticker/js/liveticker.js`
- `scorecard/static/scorecard/js/scorecard.js`

Django templates load these bundled JavaScript files. After building JavaScript, run `python manage.py collectstatic` to gather all static files.

### Template Context Processors

Custom context processors in `league_manager/context_processors.py`:
- `global_menu` - navigation menu items
- `version_number` - current app version
- `pages_links` - external links (e.g., Google Sheets schedule template)

### External Integrations

Environment variables for external services:
- `GOOGLE_CLIENT_ID` - Google OAuth
- `MOODLE_URL`, `MOODLE_WSTOKEN` - Moodle integration
- `EQUIPMENT_APPROVAL_ENDPOINT`, `EQUIPMENT_APPROVAL_TOKEN` - Equipment approval service
