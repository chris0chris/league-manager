# CLAUDE.md (Claude Code Guide)

This file provides guidance specifically to **Claude Code** (claude.ai/code) when working with code in this repository. 

For all project-wide standards, technical commands, and deployment safety policies, see the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

## 🤖 Claude-Specific Workflow

### Agent-Based Development
This project uses specialized Claude Code agents for different tasks:
- **requirements-analyst** - Analyzes requirements and creates technical specifications.
- **architecture-designer** - Designs system architecture and technical approaches.
- **implementation-engineer** - Implements features following SOLID principles.
- **tdd-engineer** - Implements features using test-driven development (TDD).
- **qa-verification-engineer** - Runs comprehensive quality checks (tests, coverage, lint, security).
- **cleanup-coordinator** - Ensures PRs contain only relevant changes.
- **git-commit-manager** - Handles git commits and PR creation following conventional commit format.
- **documentation-specialist** - Maintains comprehensive documentation.

### Non-Interactive Operations
To avoid interactive prompts that stall agent workflows, always use:
- **Git Push**: `git push -u origin <branch_name>` to set up upstream tracking.
- **PR Creation**: `gh pr create --repo dachrisch/leaguesphere --base master --title "..." --body "..."`.
- **Infrastructure**: Use specialized `@agent-service-master` or `@agent-service-tester` agents for Ansible tasks.

## 🛠 Central Resources
Refer to the following for technical details:
- **Build/Test Commands**: `docs/guides/contributor-guide.md#build-lint--test-commands`
- **Deployment Safety**: `docs/guides/contributor-guide.md#-security--deployment-safety`
- **Code Style**: `docs/guides/contributor-guide.md#coding-style`
- **Setup Guide**: `docs/guides/setup-guide.md`
