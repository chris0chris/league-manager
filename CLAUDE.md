# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeagueSphere is a Django-based web application for managing American football leagues, including game scheduling, live scoring, player pass checking, and league standings. The project combines a Django backend with multiple React/TypeScript frontends.

**Main branch**: `master`

## Feature Documentation

All features are documented following a standardized structure in `docs/features/`. Each feature has its own directory containing:

1. **01-requirements.md** - Business and technical requirements, user stories, acceptance criteria
2. **02-design.md** - Architecture, database design, API design, UI mockups
3. **03-implementation.md** - Implementation details, file structure, code organization
4. **04-testing.md** - Test plans, test results, coverage reports
5. **05-rollout.md** - Deployment strategy, rollback procedures, monitoring
6. **README.md** - Feature overview with quick links and key information

### Existing Features

#### Manager System (`docs/features/manager-system/`)
**Status:** ✅ Implemented & Tested (v2.12.0)

Three-tier permission hierarchy allowing non-staff users to manage leagues, gamedays, and teams with granular permissions.

- **Models:** `gamedays/models/manager.py`, `teammanager/models/team_manager.py`
- **Views:** `gamedays/views/manager_views.py`
- **Dashboard:** `/managers/dashboard/`
- **API:** `/api/managers/me/`
- **Test Coverage:** 97% (35/36 tests passed)

See [docs/features/manager-system/README.md](docs/features/manager-system/README.md) for details.

### Creating New Feature Documentation

When implementing a new feature, create documentation in this order:

1. **Create feature directory:** `docs/features/feature-name/`
2. **Write requirements:** Define business needs, user stories, acceptance criteria
3. **Design the solution:** Document architecture, database, API, UI decisions
4. **Document implementation:** Track files created, code structure, key decisions
5. **Create test plan:** Define test scenarios, expected results, coverage goals
6. **Plan rollout:** Deployment strategy, monitoring, rollback procedures
7. **Create README:** Feature overview with quick links
8. **Update CLAUDE.md:** Add feature to the list above

This ensures all features have complete documentation for future reference and onboarding.

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

Three React applications are bundled via webpack and served by Django:

1. **passcheck** (`passcheck/src/`) - TypeScript/React app
   - Built with webpack → `passcheck/static/passcheck/js/passcheck.js`
   - Uses TypeScript, React hooks, Context API for state management

2. **liveticker** (`liveticker/src/`) - JavaScript/React app
   - Built with webpack → `liveticker/static/liveticker/js/liveticker.js`
   - Uses Redux for state management

3. **scorecard** (`scorecard/src/`) - JavaScript/React app
   - Built with webpack → `scorecard/static/scorecard/js/scorecard.js`
   - Uses Redux for state management

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

**Complete Development Server Setup Sequence:**

The correct sequence to start the development server (IMPORTANT - follow in order):

```bash
# 1. Check if LXC container servyy-test is running
ssh -o ConnectTimeout=2 servyy-test.lxd echo "LXC server is reachable"
# If not reachable, run:
# cd /home/cda/dev/infrastructure/container/scripts && ./setup_test_container.sh

# 2. Check if database is running on servyy-test
ssh servyy-test.lxd "docker ps | grep mysql"
# If not running, start it:
./container/spinup_test_db.sh

# 3. Run database migrations
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
python manage.py migrate

# 4. Populate test data to database
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
python scripts/populate_manager_test_data.py

# 5. Start development server
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
python manage.py runserver

# With dev environment (alternative)
league_manager=dev python manage.py runserver
```

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
npm --prefix passcheck/ run build
npm --prefix liveticker/ run build
npm --prefix scorecard/ run build
```

**Build for development (with watch mode for liveticker/scorecard):**
```bash
npm --prefix passcheck/ run dev
npm --prefix liveticker/ run dev:watch
npm --prefix scorecard/ run dev:watch
```

**Run Jest tests:**
```bash
# passcheck uses React Testing Library (no jest script in package.json - tests via react-scripts)
npm --prefix passcheck/ test

# liveticker and scorecard
npm --prefix liveticker/ run jest
npm --prefix scorecard/ run jest

# Watch mode
npm --prefix liveticker/ run testj:watch
npm --prefix scorecard/ run testj:watch
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
# Jest with watch mode (interactive)
npm --prefix liveticker/ run testj:watch
# Then press 'p' to filter by filename pattern or 't' to filter by test name

# Run specific test file directly
npm --prefix liveticker/ -- jest src/components/__tests__/LivetickerApp.spec.js
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
