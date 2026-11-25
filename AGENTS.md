# AGENTS.md (General Agent Guide)

This file provides high-signal technical instructions for **all autonomous agents** (Claude, Gemini, etc.) operating in this repository.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/topics/guides/contributor-guide.md)**.

## 🤖 Universal Agent Guidelines

### Protocol
- **Research First**: Map the codebase and validate assumptions using search/read tools before proposing changes.
- **TDD Requirement**: Features or bugfixes MUST be implemented using test-driven development. Reproduce bugs with a test before fixing.
- **Verification Mandatory**: Run the test suite (the scoped CI shard matching your change, or the full suite for shared/core changes) and linting before reporting completion.
- **Sign-off Mandatory**: Every commit carries a `Signed-off-by` trailer — commit with `git commit -s`. The DCO check (`.github/workflows/dco.yaml`) rejects an unsigned PR; fix it with `git rebase --signoff master` and `git push --force-with-lease`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📖 Documentation Standards

All documentation lives in `/docs/topics/` organized by topic. Before creating or modifying documentation:

1. **Check the [Documentation Guidelines](docs/DOCUMENTATION.md)** — Detailed rules for where each type of doc belongs
2. **Follow the directory structure** — Architecture, Guides, Features, Deployment, Testing, Troubleshooting, Planning
3. **Link from the index** — Update the parent topic README.md when adding a new doc
4. **Remove old versions** — Don't leave outdated docs scattered around

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for the complete guide.

**User-facing behaviour changes also need an in-app help entry** (`/help/`). The
rules - when a topic is required, and what "short" means - are in
`.opencode/skills/add-help-topic/SKILL.md`.

## 🛠 Central Authority

Refer to the specialized guides for detailed protocols:
- **[Architecture Overview](docs/topics/architecture/architecture-overview.md)**: System design and tech stack.
- **[Coding Standards](docs/topics/guides/coding-standards.md)**: Python (Django) and TypeScript (React) conventions. For UI work also follow the **[UI Button Patterns](docs/topics/guides/ui-button-patterns.md)** (primary CTA full width, cancel `btn-outline-danger`).
- **[Infrastructure Policy](docs/topics/deployment/infrastructure-policy.md)**: Deployment safety and Ansible rules.
- **[Scoped CI](docs/topics/deployment/scoped-ci.md)**: Path-scoped CircleCI pipeline. CI changes require updating `.circleci/scope-mapping.txt`/`scope-exclude.txt` (runs `scripts/check_scope_coverage.py` safety net); dependency/build changes may widen the tests a push runs.
- **[Setup Guide](docs/topics/guides/setup-guide.md)**: Local environment configuration.

## 🤖 Platform-Specific Instructions
Refer to these files for instructions specific to your agent platform:
- **Claude Code**: `CLAUDE.md`
- **Gemini CLI**: `GEMINI.md`

## 🗂 Per-Module Guides
Each module directory has an `AGENTS.md` that is a quick index into its authoritative,
kept-up-to-date `CLAUDE.md`. Read the relevant module guide before working in it:
`accounts`, `container`, `dashboard`, `gameday_designer`, `gamedays`, `home`, `journey`,
`journey_dashboard`, `league_manager`, `league_table`, `liveticker`, `matchreport`,
`officials`, `passcheck`, `scorecard`, `teammanager`.
