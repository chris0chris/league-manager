# Plan: Architectural Optimization of Gameday Designer

## Phase 1: Hook Decomposition (SRP) [checkpoint: 9559919]
- [x] Task: Create `useNodesState` hook to handle node CRUD and hierarchy. (3897b49)
- [x] Task: Create `useEdgesState` hook to handle edge management and dynamic reference derivation. (3897b49)
- [x] Task: Create `useTeamPoolState` hook to manage global teams and groups. (3897b49)
- [x] Task: Refactor `useFlowState` to orchestrate these specialized hooks. (3897b49)
- [x] Task: Conductor - User Manual Verification 'Phase 1: Hook Decomposition' (Protocol in workflow.md) (3897b49)

## Phase 2: Logic Harmonization & Service Layer
- [x] Task: Align frontend `timeCalculation.ts` with backend `TemplateApplicationService` logic. (5b6f960)
- [x] Task: Create `TemplateValidationService` in Python to mirror `useFlowValidation.ts`. (ec37d3a)
- [x] Task: Implement atomic bulk updates for edges to eliminate `useEffect` sync race conditions. (fd7a45d)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Logic Harmonization' (Protocol in workflow.md)

## Phase 3: Component Decoupling
- [ ] Task: Refactor `ListDesignerApp.tsx` to move event handlers into a dedicated controller hook.
- [ ] Task: Audit and optimize re-renders in `ListCanvas` and its child sections.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Component Decoupling' (Protocol in workflow.md)
