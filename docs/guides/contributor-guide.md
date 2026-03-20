# LeagueSphere Contributor Guide

Welcome! This guide is the **central source of truth** for all contributors, developers, and autonomous agents working on LeagueSphere.

## 📁 Essential Documentation

- **[System Architecture](@docs/arch/architecture-overview.md)**: High-level overview of the backend and frontend stack.
- **[Coding Standards](@docs/guides/coding-standards.md)**: Rules for Python, TypeScript, and CSS.
- **[Infrastructure Policy](@docs/guides/infrastructure-policy.md)**: Mandatory deployment and server management protocols.
- **[Setup Guide](@docs/guides/setup-guide.md)**: Instructions for local development environment configuration.

## 📂 Project Structure Overview

- `accounts/`: User authentication and token management.
- `gamedays/`: Core tournament and scheduling logic.
- `gameday_designer/`: Visual scheduling tool (React).
- `passcheck/`: Player eligibility verification (React).
- `liveticker/`: Real-time fan updates (React).
- `scorecard/`: On-field results entry (React).
- `container/`: Infrastructure, Dockerfiles, and deployment scripts.

Refer to the **[Project README](@README.md)** for a full directory list.

## 🏗 Build, Lint & Test Commands

### Backend (Python/Django)
- **Install Dependencies**: `uv sync --extra test`
- **Database Migrations**: `python manage.py migrate`
- **Format/Lint**: `black .`
- **Run All Tests**:
  ```bash
  # Requires LXC test DB
  ./container/spinup_test_db.sh
  export MYSQL_HOST=$(lxc list servyy-test --format json | jq -r '.[0].state.network.eth0.addresses[] | select(.family=="inet") | .address' | head -n 1)
  pytest
  ```

### Frontend (React/TypeScript)
*Commands for any app (e.g., `passcheck/`, `gameday_designer/`)*:
- **Install**: `npm install`
- **Build**: `npm run build`
- **Run Tests**: `npm run test:run`
- **Lint**: `npm run eslint`

## 🎨 Core Development Workflow

### 1. Test-Driven Development (TDD)
We strictly follow the **RED -> GREEN -> REFACTOR** cycle. All code changes MUST be accompanied by relevant tests.

### 2. Git & Branching Protocol
- **No Direct Commits to Master**: Always use a feature branch.
- **Conventional Commits**: Format messages as `feat:`, `fix:`, `refactor:`, etc.
- **Pull Requests (PR)**:
  - Create PRs in **origin** (`dachrisch/leaguesphere`).
  - Use `gh pr create --repo dachrisch/leaguesphere --base master --title "..." --body "..."` for non-interactive creation.
  - At least **90% patch coverage** is required for PRs.

### 3. Verification & Completion
Before reporting a task as finished:
1.  **Run Full Suite**: Ensure ALL tests (backend & frontend) are green.
2.  **Linting**: Resolve all formatting and linting errors.
3.  **Staging Validation**: Verify the fix on [stage.leaguesphere.app](https://stage.leaguesphere.app) and await user confirmation.

## 🛠 Maintenance
- Use `bump2version` (or `bump-my-version`) for version synchronization across backend and package.json files.
- Document progress in `feature-dev/` for significant features.
