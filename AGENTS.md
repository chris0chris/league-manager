# AGENTS.md (General Agent Guide)

This file provides high-signal technical instructions for **all autonomous agents** (Gemini, Claude Code, and others) operating in this repository. 

For all project-wide standards, technical commands, and deployment safety policies, see the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

## 🤖 Universal Agent Guidelines

### Protocol
- **Research First**: Mapping the codebase and validating assumptions using search/read tools.
- **TDD Requirement**: Implementing features or bugfixes with test-driven development.
- **Safety First**: NEVER making infrastructure changes directly on production servers.

### Commits & Git
- **Commits**: Follow conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
- **Git**: Use non-interactive commands. Set upstream tracking: `git push -u origin <branch>`.

### Documentation Structure
- `docs/arch/`: ADRs and design.
- `docs/features/`: Feature-specific documentation.
- `docs/guides/`: Setup and contributor guides.
- `docs/plans/`: Implementation roadmaps.

## 🛠 Central Resources
Refer to the following for technical details:
- **Build/Test Commands**: `docs/guides/contributor-guide.md#build-lint--test-commands`
- **Deployment Safety**: `docs/guides/contributor-guide.md#-security--deployment-safety`
- **Code Style**: `docs/guides/contributor-guide.md#coding-style`
- **Setup Guide**: `docs/guides/setup-guide.md`

Refer to `CLAUDE.md` or `GEMINI.md` for platform-specific instructions.
