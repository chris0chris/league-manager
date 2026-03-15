# Dedicated Placement Stages (Ranking Stages)

## Overview
Introduced a new stage type "Ranking Stage" that aggregates internal game results into a ranked list (1st, 2nd, etc.) which can be referenced by subsequent games.

## Implementation History

### Phase 1: Foundation (Track 005)
- **Data Model**: Added `stage_type` (STANDARD/RANKING) to `TemplateSlot` model and serializers.
- **Backend Service**: Updated `TemplateApplicationService` to resolve dynamic rank references into concrete Team IDs during template application.
- **Frontend Logic**: Implemented `rankingEngine.ts` for participant identification and rank mapping.
- **E2E Testing**: Added `test_ranking_e2e.py` to verify full tournament application with Ranking Stages.

### Phase 2: Refinements & Validation (Track 006)
- **Stricter Validation**:
    - Prevented self-referencing Ranking Stages (a stage cannot pull from its own results).
    - Implemented self-play detection (Team A vs Team A) for both static and dynamic assignments.
- **UI UX Consistency**: Integrated Stage Type into the standard "Edit Mode" (pencil icon) to prevent accidental changes.
- **Responsive Layout**: Fixed wide-screen layout to ensure fields use exactly 50% width on large viewports (>= 2800px).

### Phase 3: UX Polish & Interaction Fixes (Tracks 007, 008)
- **Smart Focus**: Implemented "Smart Blur" in `StageSection.tsx` using `editZoneRef`. This prevents the editor from closing when clicking between the Name input and the Type dropdown.
- **Ergonomics**: Moved Save/Cancel buttons immediately next to the name input.
- **Legibility**: Increased font size of stage type badges and fixed missing translation labels.
- **Testing & Coverage**: Increased unit test count to 1100+, achieving >90% coverage on new logic.

## Status
- **Current Version**: v2.17.3-rc.5
- **PR**: #751
- **Deployment**: Validated on staging environment.
