# Specification: Generation & Data Integrity Fixes

## Overview
This track focuses on fixing logical errors in the tournament generation process and enhancing data protection safeguards. This includes ensuring clean state before generation, correcting group assignment logic for generic plans, and protecting published gamedays from accidental modifications.

## Functional Requirements
- **Ensure Clean Generation (#668):** Update the "Generate Tournament" button logic to automatically clear existing teams and fields/games *before* generating a new structure, preventing data mixing.
- **Fix Generic Plan Grouping (#697):** Correct the logic when generating a tournament from a pool with zero existing teams. Ensure that teams are correctly distributed across two groups/phases as described in the template, rather than being lumped into one.
- **Protect Published Gamedays (#693):** 
    - Hide or disable the "Clear Schedule" and "Delete Gameday" buttons when a gameday is in `PUBLISHED` status.
    - Provide a clear message indicating that the schedule must be "Unlocked" first to perform these actions.
- **Improve Save Error Communication (#696):** Enhance the validation feedback when automatic saving fails due to missing mandatory metadata (Name, Date, Start Time). The validator should explicitly list which fields are missing rather than just showing a generic error.

## Acceptance Criteria
- Repeated clicks on "Generate Tournament" produce a consistent, fresh schedule without duplicates.
- Generic generation correctly creates two groups when specified by the template.
- Destructive actions (Delete/Clear) are inaccessible for published schedules.
- Auto-save failure notifications are informative and specific.

## Out of Scope
- Implementation of new tournament templates.
- Changes to the visual style of the dashboard.
