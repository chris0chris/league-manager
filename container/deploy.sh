#!/bin/bash

show_help() {
    echo "Usage: $0 [-b <branch>] [-r <remote>] [major|minor|patch|stage]"
    echo
    echo "Flags:"
    echo "  -b, --branch <branch>   Deploy from specified branch via worktree"
    echo "  -r, --remote <remote>   Push to specified remote (default: origin)"
    echo
    echo "Options:"
    echo "  major     Bump the major version (production)"
    echo "  minor     Bump the minor version (production)"
    echo "  patch     Bump the patch version (production)"
    echo "  stage     Create/increment staging RC version"
    echo "  -h, --help  Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $0 stage                      # Current branch (existing)"
    echo "  $0 -b upstream/master patch   # Worktree from upstream/master"
    echo "  $0 -b origin/master stage     # RC version via worktree"
    echo "  $0 -r upstream major          # Push to upstream remote"
    echo "  $0 -b upstream/master -r upstream patch  # Combined flags"
}

# Validate that a branch exists
validate_branch() {
    local branch="$1"

    # Check if it's a local branch
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        return 0
    fi

    # Check if it's a remote-tracking branch
    if git show-ref --verify --quiet "refs/remotes/$branch"; then
        return 0
    fi

    # Try to parse as remote/branch format and fetch
    if [[ "$branch" =~ ^([^/]+)/(.+)$ ]]; then
        local remote="${BASH_REMATCH[1]}"
        local branch_name="${BASH_REMATCH[2]}"

        echo "Fetching from remote '$remote'..."
        if git fetch "$remote" 2>/dev/null; then
            # Check again after fetch
            if git show-ref --verify --quiet "refs/remotes/$branch"; then
                return 0
            fi
        fi
    fi

    echo "Error: Branch '$branch' not found"
    echo "Checked:"
    echo "  - Local branch: refs/heads/$branch"
    echo "  - Remote-tracking branch: refs/remotes/$branch"
    exit 1
}

# Create a temporary worktree
create_worktree() {
    local branch="$1"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local random=$(head -c 4 /dev/urandom | xxd -p)
    local worktree_path="/tmp/leaguesphere-deploy-${timestamp}-${random}"

    echo "Creating worktree at: $worktree_path"
    echo "From branch: $branch"

    if ! git worktree add "$worktree_path" "$branch"; then
        echo "Error: Failed to create worktree"
        exit 1
    fi

    echo "$worktree_path"
}

# Cleanup worktree
cleanup_worktree() {
    local worktree_path="$1"

    if [ -z "$worktree_path" ]; then
        return 0
    fi

    echo "Cleaning up worktree: $worktree_path"

    # Try to remove worktree using git
    if git worktree remove "$worktree_path" --force 2>/dev/null; then
        echo "Worktree removed successfully"
        return 0
    fi

    # Fallback: manual cleanup
    echo "Attempting manual cleanup..."
    rm -rf "$worktree_path" 2>/dev/null || true
    git worktree prune 2>/dev/null || true

    echo "Cleanup complete"
}

# Parse flags
BRANCH_MODE="current"
TARGET_BRANCH=""
REMOTE="origin"
WORKTREE_PATH=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--branch)
            if [ -z "$2" ]; then
                echo "Error: -b flag requires a branch name"
                show_help
                exit 1
            fi
            BRANCH_MODE="worktree"
            TARGET_BRANCH="$2"
            shift 2
            ;;
        -r|--remote)
            if [ -z "$2" ]; then
                echo "Error: -r flag requires a remote name"
                show_help
                exit 1
            fi
            REMOTE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        major|minor|patch|stage)
            VERSION_ARG="$1"
            shift
            break
            ;;
        *)
            echo "Error: Unknown option '$1'"
            show_help
            exit 1
            ;;
    esac
done

# No version argument provided
if [ -z "$VERSION_ARG" ]; then
    echo "Error: No version option provided."
    show_help
    exit 1
fi

# Worktree mode setup
if [ "$BRANCH_MODE" = "worktree" ]; then
    echo "=== Worktree Mode ==="
    validate_branch "$TARGET_BRANCH"

    WORKTREE_PATH=$(create_worktree "$TARGET_BRANCH")
    trap "cleanup_worktree '$WORKTREE_PATH'" EXIT INT TERM

    echo "Changing to worktree directory..."
    cd "$WORKTREE_PATH"
    echo "Current directory: $(pwd)"
    echo
fi

# Main deployment logic
case "$VERSION_ARG" in
    major|minor|patch)
        # Production deployment - bump stable version
        # If running from container/ directory, go to root
        if [ -d "../league_manager" ]; then
            cd ..
        fi
        bump-my-version bump "$VERSION_ARG" && git push $REMOTE && git push $REMOTE --tags
        ;;
    stage)
        # Staging deployment - create/increment RC version
        # If running from container/ directory, go to root
        if [ -d "../league_manager" ]; then
            cd ..
        fi

        # Read current version
        CURRENT_VERSION=$(grep "__version__" league_manager/__init__.py | cut -d'"' -f2)
        echo "Current version: $CURRENT_VERSION"

        # Determine bump strategy
        if [[ $CURRENT_VERSION =~ -rc\.([0-9]+)$ ]]; then
            # Already on RC version - bump rc_build (e.g., 2.13.1-rc.1 → 2.13.1-rc.2)
            # Uses bump-my-version which automatically runs post-commit hooks for uv.lock
            echo "Incrementing RC build number..."
            # Ensure uv.lock is updated and staged if the hook is used,
            # or handle it here for robustness
            bump-my-version bump rc_build
        else
            # Stable version - bump patch and create RC.1 (e.g., 2.13.0 → 2.13.1-rc.1)
            # Manual approach needed because bump-my-version cannot create RC from stable
            echo "Bumping patch version and creating RC.1..."
            IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
            NEW_PATCH=$((PATCH + 1))
            NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}-rc.1"

            echo "Creating version: $NEW_VERSION"

            # Update version files directly
            sed -i "s/__version__ = \".*\"/__version__ = \"$NEW_VERSION\"/" league_manager/__init__.py
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" liveticker/package.json
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" passcheck/package.json
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" scorecard/package.json
            sed -i "s/current_version = \".*\"/current_version = \"$NEW_VERSION\"/" pyproject.toml

            # Regenerate uv.lock to match updated pyproject.toml
            echo "Regenerating uv.lock..."
            uv lock

            # Commit and tag
            git add league_manager/__init__.py liveticker/package.json passcheck/package.json scorecard/package.json pyproject.toml uv.lock
            git commit -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"
            git tag -a "v$NEW_VERSION" -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"
        fi

        # Push commits and tags
        git push $REMOTE && git push $REMOTE --tags

        # Show new version
        NEW_VERSION=$(grep "__version__" league_manager/__init__.py | cut -d'"' -f2)
        echo "✅ Staging deployment triggered: $NEW_VERSION"
        ;;
    *)
        echo "Error: Invalid option '$VERSION_ARG'"
        show_help
        exit 1
        ;;
esac
