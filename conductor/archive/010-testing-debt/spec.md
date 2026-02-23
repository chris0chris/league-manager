# Specification: Gameday Designer Testing Debt (Progression Logic)

## Overview
The automatic tournament progression logic (winner/loser edges) was recently implemented but lacks comprehensive unit and integration tests. This track aims to close the testing gap for these critical business rules.

## Problem Description
- **Target Logic:** `createPlacementEdges` and `assignTeamsToTournament` in `ListDesignerApp.tsx`.
- **Current State:** The logic is implemented and manually verified, but there are no automated tests to prevent regressions in standard bracket patterns.
- **Risk:** Changes to the tournament templates or internal game identification logic could break automatic progression for league managers.

## Functional Requirements
- **Bracket Pattern Validation:** Verify correct edge creation for:
  - 4-team Single Elimination (SF1, SF2, Final, 3rd Place).
  - 8-team Single Elimination (QF1-4, SF1-2, Final, 3rd Place).
  - 4-team Crossover (CO1, CO2, Final, 3rd Place).
- **Edge Case Handling:**
  - Verify behavior when source games are missing.
  - Verify behavior when target games are missing.
  - Verify behavior when progression configuration is invalid.
- **Integration Validation:**
  - Verify the full flow of generating an F6-2-2 tournament and checking that all edges are automatically wired.

## Acceptance Criteria
- [ ] Unit tests for `createPlacementEdges` covering all supported patterns.
- [ ] Unit tests for error handling and missing game scenarios.
- [ ] Integration test for a standard tournament template (e.g., F6-2-2).
- [ ] All tests pass in the `gameday_designer` environment.
