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
            # Already on RC version, find next available RC number
            echo "Incrementing RC build number..."
            # Parse current version
            if [[ $CURRENT_VERSION =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-rc\.([0-9]+)$ ]]; then
                MAJOR="${BASH_REMATCH[1]}"
                MINOR="${BASH_REMATCH[2]}"
                PATCH="${BASH_REMATCH[3]}"
                RC_NUM="${BASH_REMATCH[4]}"

                # Find next available RC number
                NEXT_RC=$((RC_NUM + 1))
                while git rev-parse "v${MAJOR}.${MINOR}.${PATCH}-rc.${NEXT_RC}" >/dev/null 2>&1; do
                    echo "Tag v${MAJOR}.${MINOR}.${PATCH}-rc.${NEXT_RC} already exists, trying next..."
                    NEXT_RC=$((NEXT_RC + 1))
                done

                NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-rc.${NEXT_RC}"
            else
                echo "Error: Could not parse RC version"
                exit 1
            fi
        else
            # Stable version - bump patch and create RC.1
            echo "Bumping patch version and creating RC..."
            IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
            NEW_PATCH=$((PATCH + 1))
            NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}-rc.1"
        fi

        echo "Creating version: $NEW_VERSION"

        # Update version files directly
        sed -i "s/__version__ = \".*\"/__version__ = \"$NEW_VERSION\"/" league_manager/__init__.py
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" liveticker/package.json
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" passcheck/package.json
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" scorecard/package.json
        sed -i "s/current_version = \".*\"/current_version = \"$NEW_VERSION\"/" pyproject.toml

        # Commit and tag
        git add league_manager/__init__.py liveticker/package.json passcheck/package.json scorecard/package.json pyproject.toml uv.lock
        git commit -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"
        git tag -a "v$NEW_VERSION" -m "Bump version: $CURRENT_VERSION → $NEW_VERSION"

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
