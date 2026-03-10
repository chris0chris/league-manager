# AGENTS.md

Welcome to the LeagueSphere repository! This guide provides technical instructions and project-specific guidelines for autonomous agents operating in this codebase.

## 🏗 Build, Lint & Test Commands

### Python / Django
- **Install Dependencies**: `uv sync --extra test`
- **Run Dev Server**: `league_manager=dev python manage.py runserver --insecure`
- **Database Migrations**: `python manage.py makemigrations` and `python manage.py migrate`
- **Run All Tests**: `pytest` (Requires LXC container `servyy-test` running)
- **Single Test File**: `pytest gamedays/tests/test_views.py`
- **Single Test Method**: `pytest gamedays/tests/test_views.py::TestClassName::test_method_name`
- **Quick Tests**: `pytest --nomigrations --reuse-db`
- **Format Code**: `black .`
- **Lint Code**: `black --check .`

### JavaScript / TypeScript (React)
Each app is located in its own directory: `passcheck/`, `liveticker/`, `scorecard/`, `gameday_designer/`.
- **Install Dependencies**: `npm --prefix <app>/ install`
- **Build**: `npm --prefix <app>/ run build` (Outputs to static/ directories)
- **Dev Server**: `npm --prefix <app>/ run start` (Vite dev server)
- **Run All Tests**: `npm --prefix <app>/ run test:run`
- **Single Test File (Vitest)**: `npm --prefix <app>/ -- vitest run src/components/__tests__/GameCard.test.tsx`
- **Watch Mode**: `npm --prefix <app>/ run test`
- **Lint**: `npm --prefix <app>/ run eslint`

---

## 🎨 Code Style & Guidelines

### Python (Django)
- **Formatting**: Strictly follow `black` conventions.
- **Naming**: 
  - Classes: `PascalCase`
  - Methods/Variables: `snake_case`
  - Constants: `SCREAMING_SNAKE_CASE`
- **Type Hints**: Use `QuerySet` type hints for model managers:
  ```python
  objects: QuerySet["ModelName"] = models.Manager()
  ```
- **Imports**: Organize imports alphabetically within groups:
  1. Standard library imports
  2. Third-party imports (Django, DRF, etc.)
  3. Local application imports
- **Error Handling**: 
  - Use specific exceptions (e.g., `ObjectDoesNotExist`, `ValidationError`).
  - Wrap database operations in `transaction.atomic` when multiple writes occur.
  - Return consistent DRF Response objects with appropriate status codes.
- **Views**: Prefer Class-Based Views (CBVs) and DRF ViewSets for APIs.

### TypeScript / React
- **Formatting**: Enforced by ESLint and Prettier. Always run `npm run eslint` before committing.
- **Naming**:
  - Components: `PascalCase` (e.g., `GameCard.tsx`)
  - Props/Hooks/State: `camelCase`
  - Types/Interfaces: `type Name = { ... }` or `interface Name { ... }`
- **Architecture**:
  - Functional components with Hooks only. No class components.
  - State Management: 
    - `passcheck`: Context API
    - `liveticker`/`scorecard`: Redux Toolkit
  - Use `react-bootstrap` for UI components.
- **Types**: Explicitly type all Props and API responses. Avoid `any` at all costs.
- **Imports**: Group imports:
  1. React and core libraries
  2. Third-party libraries (bootstrap, icons)
  3. Local components
  4. Types and Utils
  5. Styles
- **Testing**: Use `@testing-library/react` and `user-event` for component tests.

### General
- **Comments**: Focus on "Why", not "What". Do not add redundant comments. Use JSDoc for complex functions.
- **Git**: Use non-interactive commands. Set upstream tracking on push: `git push -u origin <branch>`.
- **Commits**: Follow conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `refactor:` for code restructuring
  - `test:` for adding/updating tests
  - `docs:` for documentation changes
  - `ci:` for pipeline changes

---

## 🛠 Technical Architecture Patterns

### API Structure & Authentication
- **Endpoints**: Exposed under `/api/<app_name>/` (e.g., `/api/passcheck/`).
- **Auth**: Uses Django REST Knox for token-based authentication.
- **Permissions**: Default is `IsAuthenticatedOrReadOnly`.

### Frontend Integration
- **Vite Bundling**: React apps are built into Django `static/` directories via Vite.
- **Static Files**: After building JS, run `python manage.py collectstatic` to gather all assets.
- **Templates**: Django templates load the bundled `.js` and `.css` files from static directories.

### Maintenance & Health
- **Health Check**: Endpoint at `/health/` monitors database and service status.
- **Maintenance Mode**: Controlled via `MAINTENANCE_MODE` setting and `MaintenanceModeMiddleware`.

### Versioning & Deployment
- **Management**: Versioning is synced across Python and JS via `bump2version` (configured in `setup.cfg`).
- **CI/CD**: The project has migrated to **CircleCI** as the primary pipeline provider. GitHub Actions workflows are deactivated.
- **Deployment Script**: Use `./container/deploy.sh {stage|patch|minor|major}` to trigger deployments.
- **PR Creation**: Use `gh pr create --repo dachrisch/leaguesphere --base master` for non-interactive PRs.

---

## 🛡 Security & Safety Protocol

- **Secrets**: Never log, print, or commit secrets (API keys, tokens, `SECRET_KEY`).
- **Infrastructure**: **NEVER** edit files directly on production servers. All changes must be made via Ansible playbooks in the infrastructure repository and tested on `servyy-test.lxd` first.
- **Tests First**: Before pushing or creating a PR, ensure all tests pass locally.
- **Database Safety**: Always create a backup or migration plan before schema changes.

## 📁 Project Structure
- `gamedays/`: Core game scheduling logic and management.
- `scorecard/`, `liveticker/`, `passcheck/`, `gameday_designer/`: Specialized apps with React frontends.
- `league_manager/`: Project configuration, settings, and shared middleware.
- `teammanager/`: Team and roster management.
- `container/`: Dockerfiles, deployment scripts, and test DB setup.
- `deployed/`: Docker Compose configurations and environment templates.

## 🧪 Test Infrastructure
- Backend tests require a MySQL/MariaDB instance. 
- Local development uses LXC container `servyy-test` at `10.185.182.207`.
- Run `container/spinup_test_db.sh` to ensure the test database is ready.
  See `container/SPINUP_GUIDE.md` for initialization details and placeholder team requirements.
- Moodle API tests are expected to fail in local dev without credentials.

Refer to `CLAUDE.md` for detailed agent workflow and deployment safety rules.
