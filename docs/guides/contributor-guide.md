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

## ✅ Code Quality Requirements (MANDATORY)

**All code MUST meet these requirements before pushing to remote:**

| Requirement | Backend | Frontend | Enforcement |
|---|---|---|---|
| **Tests** | ✅ pytest | ✅ vitest | CI blocks merge without tests |
| **Code Format** | ✅ `black .` | ⚠️ Optional | Manual review |
| **Linting** | ⚠️ Optional | ✅ `npm run eslint` (ZERO errors) | **CI BLOCKS MERGE** on any error |
| **Type Safety** | Type hints | No `any` types | **CI BLOCKS MERGE** on violations |
| **Security** | Input validation | Secure randomness | Code review enforcement |

**🚨 LINTING IS NOT OPTIONAL:** Frontend code with ESLint errors will be automatically rejected by CI and cannot be merged. Run `npm run eslint` before every push.

See **[Coding Standards](coding-standards.md)** for detailed rules and examples.

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

### 3. Verification & Completion — MANDATORY CHECKS
Before reporting a task as finished, you MUST pass all of the following:

1.  **Run Full Test Suite**: Ensure ALL tests (backend & frontend) are green.
    ```bash
    # Backend
    pytest
    
    # Frontend (in each app directory)
    npm run test:run
    ```

2.  **MANDATORY Linting** — NO EXCEPTIONS:
    - **Backend**: `black .` — Code MUST be black-formatted. No linting errors allowed.
    - **Frontend**: `npm run eslint` — Code MUST pass ESLint with ZERO errors.
    - See **[Coding Standards: Linting](coding-standards.md#-linting-standards)** for enforced rules.
    - Common violations that BLOCK PRs:
      - ❌ `as any` type assertions (use proper types)
      - ❌ Deprecated methods (`.substr()` instead of `.slice()`)
      - ❌ `Math.random()` for security-sensitive values (use `crypto.getRandomValues()`)
      - ❌ Unused imports or variables

3.  **Staging Validation**: Verify the fix on [stage.leaguesphere.app](https://stage.leaguesphere.app).

4.  **Production Approval**: For version tags, manually approve the `hold_production` job in the CircleCI dashboard to complete the deployment.

**⚠️ WARNING**: PRs with linting errors will be rejected by CI/CD. Fix linting errors before pushing.

## 🛠 Maintenance
- Use `bump2version` (or `bump-my-version`) for version synchronization across backend and package.json files.
- Document progress in `feature-dev/` for significant features.
