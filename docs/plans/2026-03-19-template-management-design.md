# Design: Gameday Template Management

## Overview
This feature allows users to save their current, validated gameday configurations as reusable templates. These templates can be shared at different levels (Personal, Association, Global) and used to generate new tournaments in the future.

## Architecture

### 1. Backend Data Layer
**Model Enhancement (`ScheduleTemplate`)**:
- Add `sharing` field: `PRIVATE`, `ASSOCIATION`, `GLOBAL`.
- Default value: `ASSOCIATION`.
- API filtering ensures users see their own private templates, all association templates, and all global templates.

**Atomic Creation**:
- New service `TemplateCreationService` to handle the complexity of creating `ScheduleTemplate`, `TemplateSlot`, and `TemplateUpdateRule` in a single transaction.

### 2. Frontend Logic (Generic Mapping)
**`templateMapper.ts`**:
- Converts `FlowState` into a generic `ScheduleTemplate` structure.
- **Static Teams**: Resolved to `(groupIdx, teamIdx)` based on the sorted global team pool.
- **Dynamic References**: Resolved by matching edge sources to reference names (e.g., "Winner Game 1").
- **Officials**: Follows the same group/team index logic.

### 3. User Workflow & UI
**Save Action**:
- Located inside the `TournamentGeneratorModal`.
- Only enabled when `validation.isValid` is true.
- Prompts for Name, Description, and Sharing level.

**Template Application**:
- When a custom template is selected:
    - If the Team Pool is empty: Automatically create the required `GlobalTeamGroup`s (but not the teams).
    - If the Team Pool exists: Validate that it matches the template's requirements (sufficient groups/teams).

## Success Criteria
- [ ] Users can save a valid canvas as a new template.
- [ ] Saved templates appear in the "Generate Tournament" dropdown.
- [ ] Private templates are not visible to other users.
- [ ] Association templates are visible to all members of that association.
- [ ] Applying a template to an empty gameday scaffolds the required groups.
