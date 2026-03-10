# Specification - Update jquery to v4

## Overview
This track involves upgrading the `jquery` dependency to version 4.0.0 (based on PR #759). jQuery 4 is a major release that removes support for older browsers and many long-deprecated internal shims. The goal is to ensure all LeagueSphere frontends (particularly `scorecard` and the shared templates) are compatible with this new version.

## Functional Requirements
- Checkout the feature branch `renovate/jquery-4.x` from origin.
- Update explicit `jquery` dependencies in `scorecard/package.json` and `fe_template/package.json` to `^4.0.0`.
- Perform a comprehensive `npm update` in all frontend directories (`gameday_designer`, `passcheck`, `liveticker`, `scorecard`, `fe_template`) to address transitive dependencies.
- Execute the full `vitest` suite for all apps to identify regressions.
- Resolve any breaking changes or test failures related to the jQuery v4 upgrade.

## Non-Functional Requirements
- Ensure no degradation in UI performance or responsiveness across React apps.
- Verify that legacy Django templates still render and function correctly with the new jQuery version.

## Acceptance Criteria
- `jquery` version `^4.0.0` is active in `scorecard` and `fe_template`.
- All frontend `vitest` suites pass successfully.
- Basic manual smoke test of the Scorecard and Gameday Designer shows no obvious UI breakages.

## Out of Scope
- Rewriting legacy jQuery-based code to modern React unless absolutely necessary for compatibility.
- Upgrading other major frontend dependencies unless required by jQuery v4.
