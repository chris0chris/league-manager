# LeagueSphere Contributor Guide

Welcome to the LeagueSphere repository! This guide is the **central source of truth** for technical standards, commands, and workflows. All agents and developers should refer to this file for shared information.

## 📁 Project Overview
**LeagueSphere** is a sophisticated flag football league management system.
- **Backend**: Django 5.2, DRF, Knox Token Auth.
- **Frontend**: Multiple React apps (Gameday Designer, Passcheck, Liveticker, Scorecard) via Vite.
- **Infrastructure**: Managed via Ansible; Dockerized deployment (Gunicorn/Nginx).

## 📂 Project Structure
- `docs/arch/`: Architectural Decision Records (ADR) and system design.
- `docs/features/`: Feature documentation (Current and History).
- `docs/guides/`: Setup and contribution guides.
- `docs/plans/`: Implementation roadmaps (Current and History).
- `docs/reports/`: Verification and test reports.
- `docs/testing/`: Test scenarios and strategies.

## 🏗 Build, Lint & Test Commands

### Python / Django
- **Install Dependencies**: `uv sync --extra test`
- **Run Dev Server**: `./container/start_dev_server.sh`
- **Database Migrations**: `python manage.py makemigrations` and `python manage.py migrate`
- **Format/Lint**: `black .`
- **Run All Tests**:
  ```bash
  MYSQL_HOST=<container_ip> MYSQL_DB_NAME=test_db MYSQL_USER=user MYSQL_PWD=user SECRET_KEY=test-secret-key pytest
  ```

### JavaScript / TypeScript (React)
Apps: `passcheck/`, `liveticker/`, `scorecard/`, `gameday_designer/`.
- **Install**: `npm --prefix <app>/ install`
- **Build**: `npm --prefix <app>/ run build`
- **Run Tests**: `npm --prefix <app>/ run test:run`
- **Lint**: `npm --prefix <app>/ run eslint`

## 🎨 Development Workflow & Standards

### 1. Test-Driven Development (TDD)
We strictly follow the TDD cycle: **RED -> GREEN -> REFACTOR**.
**Mandatory QA**: Run the full suite and lint before reporting completion.

### 2. Git & Branching
- **Branching**: No direct commits to `master`. Use feature branches.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`.
- **Non-Interactive Commands**:
  - **Upstream**: `git push -u origin <branch_name>`
  - **PR Creation**: `gh pr create --repo dachrisch/leaguesphere --base master --title "..." --body "..."`
  - **PR Merging**: `gh pr merge <pr_number> --merge --delete-branch`

### 3. Coding Style
- **Python**: Strict Django patterns.
- **TypeScript**: Functional Components and Hooks. No `any`.
- **Comments**: Focus on "Why", not "What".

## 🛡 Security & Deployment Safety

### Infrastructure Policy (CRITICAL)
**NEVER edit files directly on production servers.**
1. **Develop Fix**: Modify Ansible playbooks in `infrastructure/container`.
2. **Test First**: Deploy to `servyy-test.lxd` (`10.185.182.207`).
3. **Validate**: Verify on the test host.
4. **Production**: Only deploy to `lehel.xyz` AFTER verification.

### Staging
- **Validation**: All changes MUST be validated on `stage.leaguesphere.app`.
- **Verification**: Provide staging URL/version and await user confirmation.

## 🧪 Test Infrastructure
- **LXC Container**: `servyy-test` (MariaDB instance).
- **Setup**: `container/spinup_test_db.sh`.
- **Guide**: `docs/guides/setup-guide.md`.
