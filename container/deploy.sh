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
        if [[ $CURRENT_VERSION =~ -rc\. ]]; then
            # Already on RC version, increment RC build number
            echo "Incrementing RC build number..."
            bump-my-version bump rc_build
        else
            # Stable version - bump patch and start RC
            echo "Bumping patch version and creating RC..."
            # First bump patch: 2.12.16 → 2.12.17
            bump-my-version bump patch --no-commit --no-tag
            # Then set release to RC: 2.12.17 → 2.12.17-rc.1
            bump-my-version bump release --commit --tag
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
