# CLAUDE.md (Claude Code Guide)

This file provides guidance specifically to **Claude Code** (claude.ai/code) when working with code in this repository.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

> **TESTING SETUP:** Before running or skipping any backend tests, READ the contributor guide's "Build, Lint & Test Commands" section. Backend tests require an **LXC test DB** — spin it up with `./container/spinup_test_db.sh` and set `MYSQL_HOST` from the LXC instance. Do NOT assume the DB is unavailable without checking. Frontend tests run with `npm run test:run` inside the app directory (e.g., `gameday_designer/`) and need no external DB.

## 🤖 Claude-Specific Workflow

### Agent-Based Development
This project uses specialized Claude Code agents for different tasks. Fulfill the following roles based on your task:
- **requirements-analyst** - Analyzes requirements and creates technical specifications.
- **architecture-designer** - Designs system architecture and technical approaches.
- **implementation-engineer** - Implements features following SOLID principles and clean code.
- **tdd-engineer** - Implements features using test-driven development (TDD).
- **qa-verification-engineer** - Runs comprehensive quality checks (tests, coverage, lint, security).
- **cleanup-coordinator** - Ensures PRs contain only relevant changes and no dead code.
- **git-commit-manager** - Handles git commits and PR creation following conventional commit format.
- **documentation-specialist** - Maintains comprehensive documentation.

### Workflow Mandate
Claude Code should automatically delegate tasks to appropriate specialized agents. Each agent has specific expertise and tools to handle their domain effectively.

## 🛠 Central Authority

Refer to these specialized guides for detailed protocols:
- **[Architecture Overview](docs/arch/architecture-overview.md)**: System design and tech stack.
- **[Coding Standards](docs/guides/coding-standards.md)**: Python (Django) and TypeScript (React) conventions.
- **[Infrastructure Policy](docs/guides/infrastructure-policy.md)**: Deployment safety and Ansible rules.
- **[Setup Guide](docs/guides/setup-guide.md)**: Local environment configuration.
- **[Git Operations](docs/guides/contributor-guide.md#2-git--branching-protocol)**: PR and branching rules.
