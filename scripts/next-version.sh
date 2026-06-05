#!/usr/bin/env bash
# Computes the next YYYY.M.PATCH version tag.
# Finds the latest tag matching today's YYYY.M prefix and increments PATCH.
# Outputs the new version string to stdout.
set -euo pipefail

TODAY="$(date +%Y.%-m)"
LATEST="$(git tag --list "${TODAY}.*" 2>/dev/null | sort -V | tail -1)"

if [ -z "$LATEST" ]; then
    echo "${TODAY}.0"
else
    PATCH="${LATEST##*.}"
    echo "${TODAY}.$((PATCH + 1))"
fi
