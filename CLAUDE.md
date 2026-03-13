# CLAUDE.md (Claude Code Guide)

This file provides guidance specifically to **Claude Code** (claude.ai/code) when working with code in this repository.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

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
Refer to the following sections in the **[Contributor Guide](docs/guides/contributor-guide.md)** for:
- **Git Operations**: `docs/guides/contributor-guide.md#2-git--branching`
- **Build/Test Commands**: `docs/guides/contributor-guide.md#build-lint--test-commands`
- **Deployment Safety**: `docs/guides/contributor-guide.md#infrastructure-policy-critical`
- **Code Style**: `docs/guides/contributor-guide.md#3-coding-style`
- **Setup Guide**: `docs/guides/setup-guide.md`
