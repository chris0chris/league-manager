# GEMINI.md (Gemini CLI Guide)

This file provides comprehensive instructional context specifically for the **Gemini CLI** (google-gemini-cli) and its specialized tools.

> **CRITICAL:** For project-wide standards, build/test commands, and deployment safety policies, you MUST refer to the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)**.

## 🤖 Gemini-Specific Workflow

### Development Lifecycle
Operate using a **Research -> Strategy -> Execution** lifecycle. For the Execution phase, resolve each sub-task through an iterative **Plan -> Act -> Validate** cycle.

### Memory Management (MCP)
- **Persistence**: Use the `save_memory` tool to persist critical session facts, user-specific preferences, or significant architectural insights.
- **Conciseness**: Ensure each saved fact is clear, self-contained, and brief.
- **Proactivity**: Proactively save information that will streamline future development (e.g., "User prefers SQLite for local backend testing due to LXC connectivity issues").

### Testing Protocol
- **Empirical Reproduction**: Prioritize empirical reproduction of reported issues to confirm the failure state.
- **Verification**: Run tests and workspace standards before committing or finishing a task.

## 🛠 Central Authority
Refer to the following sections in the **[LeagueSphere Contributor Guide](docs/guides/contributor-guide.md)** for:
- **Git Operations**: `docs/guides/contributor-guide.md#2-git--branching`
- **Build/Test Commands**: `docs/guides/contributor-guide.md#build-lint--test-commands`
- **Deployment Safety**: `docs/guides/contributor-guide.md#infrastructure-policy-critical`
- **Code Style**: `docs/guides/contributor-guide.md#3-coding-style`
- **Setup Guide**: `docs/guides/setup-guide.md`
