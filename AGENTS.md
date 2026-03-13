# LeagueSphere Agent Guide (AGENTS.md)

This file provides high-signal technical instructions for autonomous agents (Gemini, Claude Code, etc.) operating in this repository. For the full developer documentation, see `docs/guides/contributor-guide.md`.

## 📁 Documentation Structure (NEW)
All detailed documentation has been moved to the `docs/` directory:
- `docs/arch/`: Architecture Decision Records (ADR) and design.
- `docs/features/`: Feature-specific documentation (Current and History).
- `docs/guides/`: Setup, onboarding, and contributor guides.
- `docs/plans/`: Implementation plans and roadmaps.
- `docs/reports/`: Verification reports and performance analysis.
- `docs/testing/`: Test scenarios and strategies.

## 🏗 Essential Commands

### Python / Django
- **Install Dependencies**: `uv sync --extra test`
- **Run Dev Server**: `./container/start_dev_server.sh` (Auto-spins up DB and builds FE)
- **Run All Tests**: `pytest` (Requires LXC container `servyy-test` running)
- **Setup Test DB**: `container/spinup_test_db.sh`
- **Format/Lint**: `black .`

### JavaScript / TypeScript (React)
- **Apps**: `passcheck/`, `liveticker/`, `scorecard/`, `gameday_designer/`
- **Install**: `npm --prefix <app>/ install`
- **Build**: `npm --prefix <app>/ run build`
- **Test**: `npm --prefix <app>/ run test:run`
- **Lint**: `npm --prefix <app>/ run eslint`

## 🎨 Standards & Protocol

- **Commits**: Follow conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
- **Git**: Use non-interactive commands. Set upstream tracking: `git push -u origin <branch>`.
- **Formatting**: Strictly follow `black` for Python and `eslint`/`prettier` for TypeScript.
- **Infrastructure**: **NEVER** edit files directly on production servers. Use Ansible in the infrastructure repo.
- **Tests First**: All tests must pass locally before pushing or creating a PR.

## 🧪 Test Infrastructure
- Backend tests require a MySQL instance in the `servyy-test` LXC container (`10.185.182.207`).
- See `docs/guides/setup-guide.md` for detailed environment configuration.

Refer to `CLAUDE.md` and `GEMINI.md` for agent-specific workflow instructions.
