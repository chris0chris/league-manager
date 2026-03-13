# AGENTS.md (General Agent Guide)

This file provides high-signal technical instructions for **all autonomous agents** operating in this repository.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

## 🤖 Universal Agent Guidelines

### Protocol
- **Research First**: Mapping the codebase and validating assumptions using search/read tools.
- **TDD Requirement**: Implementing features or bugfixes with test-driven development.
- **Safety First**: NEVER making infrastructure changes directly on production servers.

### Git & Branching
- **Commits**: Follow conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
- **Git**: Use non-interactive commands. Set upstream tracking: `git push -u origin <branch>`.

## 🛠 Central Authority
Refer to the following sections in the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)** for:
- **Build/Test Commands**: `docs/guides/contributor-guide.md#build-lint--test-commands`
- **Deployment Safety**: `docs/guides/contributor-guide.md#infrastructure-policy-critical`
- **Code Style**: `docs/guides/contributor-guide.md#3-coding-style`
- **Setup Guide**: `docs/guides/setup-guide.md`

Refer to `CLAUDE.md` or `GEMINI.md` for platform-specific instructions.
