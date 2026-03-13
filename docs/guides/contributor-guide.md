# LeagueSphere Contributor Guide

Welcome to the LeagueSphere repository! This guide provides technical instructions and project-specific guidelines for developers and autonomous agents operating in this codebase.

## 📁 Project Structure

The project has been reorganized to provide a clear separation of concerns in documentation:

- `docs/arch/`: Architectural Decision Records (ADR) and system design documents.
- `docs/features/`: Documentation for specific features.
  - `current/`: Active or recently implemented features.
  - `history/`: Historical documentation for completed features.
- `docs/guides/`: Onboarding, setup, and contribution guides.
- `docs/plans/`: Implementation plans and roadmaps.
- `docs/reports/`: Verification reports, test summaries, and performance analysis.
- `docs/testing/`: Test scenarios, E2E test documentation, and testing strategies.

## 🏗 Build, Lint & Test Commands

### Python / Django
- **Install Dependencies**: `uv sync --extra test`
- **Run Dev Server**: `./container/start_dev_server.sh` (Recommended)
- **Manual Dev Server**: `league_manager=dev python manage.py runserver --insecure`
- **Database Migrations**: `python manage.py makemigrations` and `python manage.py migrate`
- **Run All Tests**: `pytest` (Requires LXC container `servyy-test` running)
- **Single Test File**: `pytest gamedays/tests/test_views.py`
- **Format Code**: `black .`
- **Lint Code**: `black --check .`

### JavaScript / TypeScript (React)
Apps: `passcheck/`, `liveticker/`, `scorecard/`, `gameday_designer/`.
- **Install Dependencies**: `npm --prefix <app>/ install`
- **Build**: `npm --prefix <app>/ run build`
- **Dev Server**: `npm --prefix <app>/ run start`
- **Run All Tests**: `npm --prefix <app>/ run test:run`
- **Lint**: `npm --prefix <app>/ run eslint`

## 🎨 Code Style & Guidelines

See the specialized style guides in `conductor/code_styleguides/` for detailed language-specific rules.

### General Principles
- **Formatting**: Strictly follow `black` for Python and `eslint`/`prettier` for TypeScript.
- **Commits**: Follow conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
- **Comments**: Focus on "Why", not "What".
- **Git**: Use non-interactive commands. Set upstream tracking on push: `git push -u origin <branch>`.

## 🛡 Security & Safety Protocol

- **Secrets**: Never log, print, or commit secrets (API keys, tokens, `SECRET_KEY`).
- **Infrastructure**: **NEVER** edit files directly on production servers. All changes must be made via Ansible playbooks and tested on `servyy-test.lxd` first.
- **Tests First**: Before pushing or creating a PR, ensure all tests pass locally.

## 🧪 Test Infrastructure
- Backend tests require a MySQL/MariaDB instance in the `servyy-test` LXC container.
- Run `container/spinup_test_db.sh` to ensure the test database is ready.
- See `docs/guides/setup-guide.md` for detailed setup and troubleshooting.
