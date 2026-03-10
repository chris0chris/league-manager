# Specification: Feature Completeness

## Overview
This track brings the Gameday Designer to full feature parity with the project requirements by implementing missing metadata fields, default configuration values, and advanced team selection capabilities (including group-based playoff seeding and on-the-fly team swapping).

## Functional Requirements
- **Expand Gameday Metadata (#694, #666):**
    - Add `Season` and `League` fields to the metadata form, linking to the corresponding backend models (`Season` and `League`).
    - Enforce mandatory checks for Name, Date, and Venue. These fields should be empty by default to force user input.
    - Implement a validation rule requiring the gameday date to be in the future.
    - Set default values: Language = German, Start Time = 10:00 (for generic plans), Default Game Duration = 70 minutes.
- **Enhance Tournament Generation UI (#678):**
    - Enable manual team selection within the generation modal.
    - Update the "Insufficient teams" message to be less intrusive when the user intends to auto-generate teams.
- **Advanced Selection & Assignment (#671, #679):**
    - **Group-based Seeding (#671):** Update the `TeamSelector` to allow selecting participants based on their rank within a specific group (e.g., "1st Place Group A") for Playoff stages.
    - **Team Swapping (#679):** Implement the ability to swap teams in an already generated schedule (e.g., for last-minute cancellations).
    - **Officials Pool (#679):** Expand the selection pool for officials to include both gameday teams and external officials.

## Acceptance Criteria
- All metadata fields are present and correctly validated.
- Generation modal allows both auto-generation and manual team selection.
- Playoff games can be wired to specific group ranks.
- Teams and officials can be swapped or assigned flexibly post-generation.

## Out of Scope
- Major architectural changes to the hierarchical state model.
- Implementation of the actual template structure export (covered in Track 4).
