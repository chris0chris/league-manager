# Specification: Dedicated Placement Stages (#671)

## Overview
Introduce a configurable stage type in the Gameday Designer called a "Ranking Stage". A Ranking Stage aggregates the results of all games played within it to produce a final ranking (1st, 2nd, 3rd, etc.) using mini-league logic. This ranking can then be used as a source for team assignments in subsequent stages, providing more granular control over placement flows and tournament templates.

## Functional Requirements
1. **Configurable Stage Property**:
   - Extend the `Stage` type in `flowchart.ts` and `tournament.ts` to include a `stageType` property.
   - Initial supported types: `STANDARD` (default) and `RANKING`.
2. **UI for Stage Property Editing**:
   - Update the Stage Property Panel to allow users to toggle/select the `stageType`.
   - Ensure the UI reactively updates when the type changes.
3. **Ranking Stage Logic (Frontend)**:
   - Implement logic to calculate standings for all games contained within a stage marked as `RANKING`.
   - Standing calculation follows standard league rules (Points -> Head-to-Head -> Goal Difference -> Goals Scored).
4. **Rank-Based Team Assignment**:
   - Update the Team Assignment UI to support referencing ranks from a specific Ranking Stage.
   - Dropdown selection should allow choosing "Stage X: Rank Y" (e.g., "Placement A: 1st Place").
5. **Validation Rules**:
   - **No Cycles**: Prevent a stage from referencing itself as a source.
   - **Stage Order**: Ensure Ranking Stages occur chronologically before the stages that reference them.
   - **Completeness**: A Ranking Stage must contain games to produce a valid ranking.
6. **Tournament Template Integration (Backend)**:
   - Update the Django `ScheduleTemplate` and `TemplateSlot` models/serializers to store and transmit the `stageType`.
   - Update `TemplateValidationService` to enforce business rules for Ranking Stages.
   - Update `TemplateApplicationService` to correctly resolve rank references from Ranking Stages when applying to a gameday.
7. **Bracket Edge Visualization**:
   - Update `bracketEdgeGenerator.ts` to draw edges from Ranking Stages to the games they feed.

## Acceptance Criteria
- [ ] Users can toggle a stage between "Standard" and "Ranking" types in the property panel.
- [ ] A "Ranking" stage correctly calculates standings for its internal games.
- [ ] Teams in subsequent stages can be assigned based on the final rank of a "Ranking" stage.
- [ ] The UI clearly visualizes the flow from Ranking Stages via bracket edges.
- [ ] Backend services correctly validate and apply templates using the new stage types.

## Out of Scope
- Automatic title generation for placement games (remains manual).
- Aggregating results across multiple different Ranking Stages into one list.
