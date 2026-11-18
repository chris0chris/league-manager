# MariaDB on a pinned minor, and the `db` watchtower scope (2026-11-18)

## Problem

Nothing in this repo chose when the production database changed version.

- `deployed/docker-compose.yaml:112` said `mariadb:latest`. That is not a
  patch channel: upstream re-points `latest` on every minor release, so 13.0.2
  arrived on prod without a PR, a review or a window.
- The same floating tag was on the staging and demo servers and on both
  `db-access` sidecars (a client that must not drift away from the server it
  administers).
- The prod `db` carried `com.centurylinklabs.watchtower.scope=prod`, whose
  watcher polls every 2 hours. Even a same-line patch could restart the
  production database in the middle of one of the hourly logical dumps
  (`:30`/`:40`/`:50`), the 02:00–04:00 restic run or the 05:00 Firefly import.
- This repo's `renovate.json` had no docker-compose rules at all, and its global
  rules automerge patch, minor **and** major updates — so Renovate would happily
  replace `mariadb:latest` with a concrete `13.0.3`, leaving the server unable
  to receive the next fix.

## Solution

Part of the database-tier work package "fence the versions" (WP-0) of the
infrastructure repo's `docs/plans/2026-11-17_db-tier-topology.md`; decisions D1,
D8 and D15.

- **The tag names the minor and floats the patch**: `mariadb:13.0` for the prod
  `db` service, the staging and demo `mysql` services, and both `db-access`
  clients. No `:latest` remains in `deployed/`.
- **The prod `db` joins the `db` watchtower scope** (one label change, `prod` →
  `db`). Patches are then delivered by the infrastructure repo's
  `portainer.watchtower-db` — one fixed daily window at **06:00**, health-check
  gated with automatic rollback — instead of the 2-hourly prod poll. Everything
  else in the stack keeps `scope=prod` (`www`, `app`).
- **Staging and demo servers get no watchtower label.** That is a decision, not
  an omission: they are disposable, and they move into the `db-nonprod` tier in
  a later package, which brings its own scope and its own patch window.
- **Renovate**: patch updates for `mariadb`/`mongo`/`postgres` are disabled
  (watchtower owns them; Renovate must never turn a floating minor into a patch
  pin), and minor/major updates need `dependencyDashboardApproval` and never
  automerge. Both rules sit **last** in `packageRules` on purpose: later rules
  win, and the repo's global "majors automerge" rule would otherwise override
  them.

**The pin is a version no-op today.** `mariadb:latest` and `mariadb:13.0` are
the same image index, `sha256:54f493ea0d60b621a5bff84e5b20100f8b86b6efa6b79158e04756c5194a5e4d`
(checked on servy 2026-11-18 with `docker image inspect --format
'{{index .RepoDigests 0}}'` for both tags), and that digest is exactly the image
`leaguesphere.db` is running. The change is a fence, not an upgrade.

## Rollout consequences

- **The first deploy after merge recreates `leaguesphere.db`** (`ls_app` runs
  `docker compose up`: both the image tag and the watchtower label changed).
  Near-live expects **~1–2 minutes** of downtime, the same as any `db` restart.
  The datadir is not touched and the image is identical, so no upgrade runs.
- The `db-access` sidecar and the staging/demo `mysql` services are also
  recreated on their next deploy (`db-access` because its image tag changed).
- From then on, a 13.0 patch restart arrives once a day at 06:00 and is rolled
  back automatically if the replacement never reports healthy.
- `MARIADB_AUTO_UPGRADE=1` is set for the prod `db` by the infrastructure repo's
  `ls_app` env template (landed as `97729693`), so the entrypoint runs
  `mariadb-upgrade` on any future restart instead of silently leaving the system
  tables behind.

## Rollback

Revert this commit: the tags go back to `mariadb:latest` (identical digest), the
label back to `scope=prod`, and Renovate automerges database updates again.
Nothing in the datadir is affected in either direction.
