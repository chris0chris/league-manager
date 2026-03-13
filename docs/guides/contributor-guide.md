# LeagueSphere Contributor Guide

Welcome to the LeagueSphere repository! This guide provides technical instructions and project-specific guidelines for developers and autonomous agents.

## 📁 Project Overview
**LeagueSphere** is a sophisticated flag football league management system built with Django 5.2+ and multiple React frontends.
- **Backend**: Django 5.2, DRF, Knox Token Auth.
- **Frontend**: Multiple independent React apps (Gameday Designer, Passcheck, Liveticker, Scorecard) bundled via Vite.
- **Infrastructure**: Managed via Ansible; Dockerized deployment (Gunicorn/Nginx).

## 📂 Project Structure
- `docs/arch/`: Architectural Decision Records (ADR) and system design documents.
- `docs/features/`: Feature documentation (Current and History).
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

## 🎨 Development Workflow & Standards

### 1. Test-Driven Development (TDD)
We follow the TDD cycle:
1. **RED**: Write a failing test.
2. **GREEN**: Implement minimum code to pass.
3. **REFACTOR**: Clean up while remaining green.
**Mandatory QA**: Run the full suite and lint before reporting completion.

### 2. Git & Branching
- **Branching**: No direct commits to `master`. Use feature branches.
- **Commits**: Use conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
- **Non-Interactive PRs**: Use `gh pr create --repo dachrisch/leaguesphere --base master --title "..." --body "..."`.

### 3. Coding Style
- **Python**: Strict Django patterns. Format with `black .`.
- **TypeScript**: Prefer Functional Components and Hooks. Use `Context API` or `Redux` as per app convention.
- **Comments**: Focus on "Why", not "What".

## 🛡 Security & Deployment Safety

### Infrastructure Policy (CRITICAL)
**NEVER edit files directly on production servers.**
1. **Develop Fix**: Modify Ansible playbooks in `infrastructure/container`.
2. **Test First**: Deploy to `servyy-test.lxd` (`10.185.182.207`).
3. **Validate**: Verify on the test host.
4. **Production**: Only deploy to `lehel.xyz` AFTER successful verification.

### Staging
- **Validation**: All changes MUST be validated on the staging environment (`stage.leaguesphere.app`) before merging.
- **Verification**: Provide the staging URL and await user confirmation before closing tasks.

## 🧪 Test Infrastructure
- **LXC Container**: `servyy-test` (IP varies, check `lxc list`).
- **Setup**: Run `container/spinup_test_db.sh` to initialize the test environment.
- **Detailed Setup**: See `docs/guides/setup-guide.md`.
