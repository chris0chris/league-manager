#!/bin/bash

show_help() {
    echo "Usage: $0 [major|minor|patch]"
    echo
    echo "Options:"
    echo "  major     Bump the major version"
    echo "  minor     Bump the minor version"
    echo "  patch     Bump the patch version"
    echo "  -h, --help  Show this help message and exit"
}

# No arguments provided
if [ $# -eq 0 ]; then
    echo "Error: No option provided."
    show_help
    exit 1
fi

case "$1" in
    major|minor|patch)
        (cd ..;bump-my-version bump "$1") && uv lock && git add ../uv.lock && git commit -m"locked uv" && git push && git push --tags
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
