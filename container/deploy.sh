#!/bin/bash

show_help() {
    echo "Usage: $0 [major|minor|patch|stage]"
    echo
    echo "Options:"
    echo "  major     Bump the major version (production)"
    echo "  minor     Bump the minor version (production)"
    echo "  patch     Bump the patch version (production)"
    echo "  stage     Create/increment staging RC version"
    echo "  -h, --help  Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $0 stage   # 2.12.16 → 2.12.17-rc.1 (staging only)"
    echo "  $0 stage   # 2.12.17-rc.1 → 2.12.17-rc.2 (staging only)"
    echo "  $0 patch   # 2.12.16 → 2.12.17 (staging + production)"
}

# No arguments provided
if [ $# -eq 0 ]; then
    echo "Error: No option provided."
    show_help
    exit 1
fi

case "$1" in
    major|minor|patch)
        # Production deployment - bump stable version
        (cd ..;bump-my-version bump "$1") && git push && git push --tags
        ;;
    stage)
        # Staging deployment - create/increment RC version
        cd ..

        # Read current version
        CURRENT_VERSION=$(grep "__version__" league_manager/__init__.py | cut -d'"' -f2)
        echo "Current version: $CURRENT_VERSION"

        # Determine bump strategy
        if [[ $CURRENT_VERSION =~ -rc\.([0-9]+)$ ]]; then
            # Already on RC version - bump rc_build (e.g., 2.13.1-rc.1 → 2.13.1-rc.2)
            # Uses bump-my-version which automatically runs post-commit hooks for uv.lock
            echo "Incrementing RC build number..."
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
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" gameday_designer/package.json
            sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" pyproject.toml
            sed -i "s/current_version = \".*\"/current_version = \"$NEW_VERSION\"/" pyproject.toml

            # Regenerate uv.lock to match updated pyproject.toml
            echo "Regenerating uv.lock..."
            uv lock

            # Commit and tag
            git add league_manager/__init__.py liveticker/package.json passcheck/package.json scorecard/package.json gameday_designer/package.json pyproject.toml uv.lock
            git commit -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"
            git tag -a "v$NEW_VERSION" -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"
        fi

        # Push commits and tags
        git push && git push --tags

        # Show new version
        NEW_VERSION=$(grep "__version__" league_manager/__init__.py | cut -d'"' -f2)
        echo "✅ Staging deployment triggered: $NEW_VERSION"
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo "Error: Invalid option '$1'"
        show_help
        exit 1
        ;;
esac
