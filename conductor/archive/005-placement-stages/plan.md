# Plan: Dedicated Placement Stages (#671)

## Phase 1: Data Model and Backend Integration
- [x] **Task 1: Update Django Models**
  - Add `stage_type` to `TemplateSlot` or create a new `TemplateStage` model if hierarchy needs refactoring.
  - Run and verify migrations.
- [x] **Task 2: Update Serializers**
  - Modify `ScheduleTemplateDetailSerializer` and `TemplateSlotSerializer` to include `stageType`.
  - Write tests for version compatibility.
- [x] **Task 3: Conductor - User Manual Verification 'Data Model' (Protocol in workflow.md)**

## Phase 2: Frontend Infrastructure and Ranking Logic
- [x] **Task 1: Extend TypeScript Types**
  - Update `Stage` and `Game` interfaces in `flowchart.ts` and `tournament.ts` to include `stageType`.
- [x] **Task 1.1: Rename StageCategory values to English**
  - Rename 'vorrunde' -> 'preliminary', 'finalrunde' -> 'final', 'platzierung' -> 'placement'.
  - Update all logic and tests relying on these values.
- [x] **Task 2: Implement Ranking Calculation Engine**
  - Write utility logic to calculate standings for a collection of games within a single stage.
  - Implement TDD tests for Points, GD, Head-to-Head logic.
- [x] **Task 3: Conductor - User Manual Verification 'Ranking Logic' (Protocol in workflow.md)**

## Phase 3: UI Components and Property Editing
- [x] **Task 1: Update Stage Property Panel**
  - Add a toggle/select for `stageType` (Standard vs Ranking).
- [x] **Task 2: Enhance Team Assignment UI**
  - Update the team selection dropdown to support "Stage Rank" references.
- [x] **Task 3: Automated UI Verification via Chrome MCP**
  - Perform smoke test: Toggle stage type and verify property persistence.
  - Audit console for React/State warnings.
- [x] **Task 4: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md)**

## Phase 4: Validation and Visualization
- [x] **Task 1: Implement Validation Rules**
  - Add checks for cyclic references and chronological stage ordering.
- [x] **Task 2: Bracket Edge Generation**
  - Update `bracketEdgeGenerator.ts` to draw connections from Ranking Stages to subsequent games.
- [x] **Task 3: Automated Visualization Verification via Chrome MCP**
  - Verify that edges are rendered correctly in the flowchart after selecting a Ranking Stage source.
  - Audit console for React Flow edge-loop warnings.
- [x] **Task 4: Conductor - User Manual Verification 'Validation & Visualization' (Protocol in workflow.md)**

## Phase 5: Template Application Service [checkpoint: b960a3d]
- [x] **Task 1: Resolve Ranking References**
  - Update `TemplateApplicationService.apply()` to resolve dynamic ranks from Ranking Stages into concrete Team IDs.
- [x] **Task 2: End-to-End Integration Test**
  - Create a full tournament template using a Ranking Stage and verify application results.
- [x] **Task 3: Conductor - User Manual Verification 'Service Integration' (Protocol in workflow.md)**