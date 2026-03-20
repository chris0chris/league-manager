# ADR-0001: Migrate to uv Package Manager

**Date:** 2025-12-02

**Status:** Completed

**Context:** The LeagueSphere project is migrating from traditional pip-based dependency management (requirements.txt and test_requirements.txt) to the modern uv package manager with pyproject.toml-based configuration.

## Decision

We will complete the migration to uv as the primary Python package manager for the LeagueSphere project, using pyproject.toml for dependency specification and uv.lock for reproducible builds.

## Context

### Current State (Before Migration)

The project previously used:
- `requirements.txt` - Production dependencies
- `test_requirements.txt` - Development/test dependencies
- `setup.cfg` - Bump2version configuration (still used for versioning)

### Migration Progress

The following changes have already been made (uncommitted):

1. **New files added:**
   - `pyproject.toml` - Consolidated dependency specification using PEP 621 format
   - `uv.lock` - Lock file for reproducible dependency resolution

2. **Files deleted:**
   - `requirements.txt` - Replaced by pyproject.toml `[project.dependencies]`
   - `test_requirements.txt` - Replaced by pyproject.toml `[project.optional-dependencies.test]`

3. **Files updated:**
   - `.circleci/config.yml` - Uses uv for dependency installation
   - `.github/workflows/part_build_test.yaml` - Uses uv for dependency installation
   - `container/app.Dockerfile` - Uses uv for Docker builds
   - `container/nginx.Dockerfile` - Uses uv for Docker builds
   - `deploy.sh` - Uses uv for PythonAnywhere deployment
   - `CLAUDE.md` - Updated documentation

## Rationale

### Why uv?

1. **Performance:** uv is significantly faster than pip for dependency resolution and installation (10-100x faster)
2. **Reproducibility:** The uv.lock file ensures exact dependency versions across all environments
3. **Modern Standards:** Uses pyproject.toml (PEP 517, PEP 621) which is the modern Python packaging standard
4. **Integrated Tooling:** uv provides a unified interface for virtual environments, dependency management, and package installation
5. **Growing Ecosystem Support:** Major projects are adopting uv; it's maintained by Astral (same team as Ruff)

### Trade-offs

**Advantages:**
- Faster CI/CD pipelines due to quicker dependency installation
- Single source of truth for dependencies (pyproject.toml)
- Lock file ensures reproducible builds across all environments
- Better dependency resolution algorithm

**Disadvantages:**
- Team needs to learn new tool
- May require updates to developer documentation
- Some older tooling may not support pyproject.toml natively

## Consequences

### What Changes

1. **Developer Workflow:**
   - Install dependencies: `uv sync --extra test` (uses native uv lockfile-based install)
   - Add dependency: Update `pyproject.toml` then run `uv lock`
   - Lock file must be committed with dependency changes

2. **CI/CD Pipelines:**
   - All GitHub Actions workflows use uv
   - CircleCI uses uv
   - Cache key uses `pyproject.toml` checksum instead of `requirements.txt`

3. **Docker Builds:**
   - Dockerfiles install uv and use it for package installation
   - pyproject.toml is copied instead of requirements.txt

4. **Deployment:**
   - deploy.sh uses uv for PythonAnywhere deployment

## Implementation Details

### pyproject.toml Structure

```toml
[build-system]
requires = ["setuptools"]
build-backend = "setuptools.build_meta"

[project]
name = "leaguesphere"
version = "0.1.0"  # NOTE: Needs sync with league_manager/__init__.py
requires-python = ">=3.11"
dependencies = [...]

[project.optional-dependencies]
test = [...]

[tool.setuptools.packages.find]
include = [...]
```

### Version Synchronization Issue

**Problem:** The pyproject.toml has `version = "0.1.0"` but the actual application version in `league_manager/__init__.py` is `2.12.2`.

**Resolution Options:**
1. Update pyproject.toml to use dynamic versioning from `league_manager/__init__.py`
2. Add pyproject.toml to bump2version configuration
3. Manually sync the version in pyproject.toml

**Recommended:** Option 2 - Add pyproject.toml to bump2version configuration for automatic synchronization.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| uv not available in all environments | Install uv at runtime via curl script |
| Lock file conflicts | Use `uv lock --upgrade` to resolve |
| Python version incompatibility | pyproject.toml specifies `requires-python = ">=3.11"` |

## Open Questions

1. Should we add gunicorn to pyproject.toml dependencies? (Currently installed separately in Dockerfile)
2. Should django-debug-toolbar be in optional dependencies instead of test dependencies?
3. Do we need to update the `.python-version` file or similar for uv?

## References

- [uv Documentation](https://docs.astral.sh/uv/)
- [PEP 621 - Storing project metadata in pyproject.toml](https://peps.python.org/pep-0621/)
- [PEP 517 - Build system interface](https://peps.python.org/pep-0517/)
