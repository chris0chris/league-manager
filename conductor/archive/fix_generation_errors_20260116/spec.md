# Specification: Fix Validation Errors on "6 Teams - 2 Groups of 3" Generation

## Overview
Recent updates to the validation logic in the Gameday Designer have caused a regression when generating a tournament using the "6 Teams - 2 Groups of 3" template. Users are encountering 6 "Game overlap" errors and multiple "Standing used by 2 games" warnings immediately after clicking the "Generate" button.

## Problem Statement
The Gameday Designer reports that games like "Game 1" overlap with themselves or other games (e.g., "SF1") on "Feld 1", and that standings derived from these games are being referenced multiple times incorrectly. This prevents users from having a "Green" (valid) schedule after generation.

## Functional Requirements
- **Investigate and Fix Overlap Logic:** Determine why the validation logic perceives "Game 1" as overlapping with itself and other games.
- **Investigate and Fix Standing Reference Logic:** Resolve the warnings stating that a standing (e.g., "Game 1") is used by 2 games.
- **Ensure Template Integrity:** Verify that the "6 Teams - 2 Groups of 3" template generation logic correctly calculates times and field assignments to avoid legitimate overlaps.

## Acceptance Criteria
- Generating a tournament from the "6 Teams - 2 Groups of 3" template produces a gameday with **zero validation errors**.
- Generating the same tournament produces **zero validation warnings** regarding duplicate standing usage.
- All generated games have correct start times and field assignments based on the template definition.
- Existing tests for `TemplateValidationService` and `TemplateApplicationService` pass, and new tests are added to cover this specific regression.

## Out of Scope
- Modifying other tournament templates (unless they share the same underlying bug).
- Changing the UI of the validation panel.
- Implementing new tournament features.
