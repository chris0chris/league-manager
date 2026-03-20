# AGENTS.md (General Agent Guide)

This file provides high-signal technical instructions for **all autonomous agents** (Claude, Gemini, etc.) operating in this repository.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

## 🤖 Universal Agent Guidelines

### Protocol
- **Research First**: Map the codebase and validate assumptions using search/read tools before proposing changes.
- **TDD Requirement**: Features or bugfixes MUST be implemented using test-driven development. Reproduce bugs with a test before fixing.
- **Verification Mandatory**: Run the FULL test suite and linting before reporting completion.

## 🛠 Central Authority

Refer to the specialized guides for detailed protocols:
- **[Architecture Overview](docs/arch/architecture-overview.md)**: System design and tech stack.
- **[Coding Standards](docs/guides/coding-standards.md)**: Python (Django) and TypeScript (React) conventions.
- **[Infrastructure Policy](docs/guides/infrastructure-policy.md)**: Deployment safety and Ansible rules.
- **[Setup Guide](docs/guides/setup-guide.md)**: Local environment configuration.

## 🤖 Platform-Specific Instructions
Refer to these files for instructions specific to your agent platform:
- **Claude Code**: `CLAUDE.md`
- **Gemini CLI**: `GEMINI.md`
