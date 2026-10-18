#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

install_dependencies=true
if [[ "${1:-}" == "--skip-install" ]]; then
    install_dependencies=false
elif [[ $# -gt 0 ]]; then
    echo "Usage: $0 [--skip-install]" >&2
    exit 2
fi

run_step() {
    echo
    echo "==> $*"
    "$@"
}

if [[ "$install_dependencies" == true ]]; then
    run_step npm install
fi

run_step npm run lint
run_step npm run lint --prefix src/renderer
run_step npm run test
run_step npm run test --prefix src/renderer
run_step npm run test:coverage
run_step npm run test:coverage --prefix src/renderer

echo
echo "==> Build PR package"
ENABLE_MAC_SIGNING=false npm run package

echo
echo "==> Build main release artifacts"
ENABLE_MAC_SIGNING=false npm run make

echo
echo "All build_pr.yml and build_main.yml local checks passed."
