# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

`container/` is the deployment/infrastructure subdirectory of the **leaguesphere** monorepo (Django backend + several React micro-frontends). In this multi-repo session, only `container/` is checked out — the rest of the monorepo (`league_manager/`, `gamedays/`, `gameday_designer/`, etc.) is not present.

Several scripts here assume they run from inside a full leaguesphere checkout and `cd ..` to reach the repo root for that logic. That root doesn't exist in this session, so `deploy.sh` and the non-`--demo` path of `start_dev_server.sh` will not work end-to-end here — read them before running, and prefer a full checkout (e.g. `/home/cda/dev/leaguesphere`) if you need the app-root behavior.

## What's here

- `app.Dockerfile` — multi-stage build for the Django backend (`uv`-managed venv, runs as non-root `django` user, healthcheck hits `/health/?format=json`).
- `nginx.Dockerfile` — builds static assets for the five React micro-frontends (`liveticker`, `scorecard`, `passcheck`, `gameday_designer`, `journey_dashboard`) plus Django's `collectstatic` output, then serves them via `nginx:stable`.
- `nginx.conf` / `nginx.staging.conf` / `nginx.demo.conf` — per-environment reverse-proxy config in front of the Django app. Identical except for the `upstream django` target (`app` / `staging-app` / `demo-app`), matching each environment's compose service name.
- `entrypoint.sh` — production container entrypoint; runs `manage.py migrate` only when `RUN_MIGRATIONS=true`.
- `entrypoint.demo.sh` — demo-environment entrypoint; resets/seeds the demo DB from a snapshot once per UTC day via the `seed_demo_data` / `reset_demo_database` management commands.
- `healthcheck.sh` — nginx-side healthcheck: treats an HTTP 302 to `/maintenance/` as healthy, otherwise performs a real CSRF-cookie + login POST against `/login/`.
- `deploy.sh` — release automation (see below).
- `spinup_test_db.sh` / `test_db_dump.sql` / `test_user.sql` — provisions the MariaDB test database used by the Django test suite, inside the `servyy-test` LXC container.
- `start_dev_server.sh` — bootstraps a full local dev environment (test DB, env vars, Python deps, optionally hot-reloading builds of the React apps).

## `deploy.sh`

Bumps versions across every sub-project in one commit + tag and pushes: `league_manager/__init__.py`, all five frontend `package.json`s, `pyproject.toml` (regenerating `uv.lock`), and `.release-please-manifest.json`.

- `./deploy.sh major|minor|patch` — production: finalizes an in-progress RC (strips `-rc.N`) or bumps the stable version.
- `./deploy.sh stage [major|minor|patch]` — staging: bumps/creates an `-rc.N` prerelease.
- `./deploy.sh demo` — demo: bumps/creates a `+demo.N` build-metadata suffix.
- `-b <branch>` deploys from a specific branch via a throwaway `git worktree` (auto-cleaned on exit); `-r`/`--pr-remote` control where the release branch and PR land (default `origin` / `upstream`).

Requires a full leaguesphere checkout (it `cd ..`s when `../league_manager` exists) and push access to the target remote — this mutates shared branch/tag state, so confirm intent before running any non-`--help` invocation.

## Test DB & dev server gotchas

- `spinup_test_db.sh` talks to real infrastructure: it runs `~/dev/infrastructure/container/scripts/setup_test_container.sh`, then SSHes into `servyy-test.lxd` to start/recreate a `mysql` (MariaDB) Docker container there. `--fresh` destroys and reseeds it from `test_db_dump.sql`; without it, an existing DB is reused/restarted. This needs the LXC container reachable — don't assume it's unavailable without checking.
- `start_dev_server.sh --demo` skips all of that and uses SQLite instead (`DJANGO_SETTINGS_MODULE=league_manager.settings.demo`).
- `start_dev_server.sh --hot [app]` builds the React micro-frontends in watch mode instead of one-shot (apps: `gameday_designer`, `passcheck`, `liveticker`, `scorecard`, `journey_dashboard`); omit `[app]` to watch all of them.

The global deployment-safety policy (test-first, no manual prod edits, Ansible-only infra changes) applies here — see the user-level CLAUDE.md.
