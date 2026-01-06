# Plan: Architectural Optimization of Gameday Designer

## Phase 1: Hook Decomposition (SRP)
- [ ] Task: Create `useNodesState` hook to handle node CRUD and hierarchy.
- [ ] Task: Create `useEdgesState` hook to handle edge management and dynamic reference derivation.
- [ ] Task: Create `useTeamPoolState` hook to manage global teams and groups.
- [ ] Task: Refactor `useFlowState` to orchestrate these specialized hooks.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Hook Decomposition' (Protocol in workflow.md)

## Phase 2: Logic Harmonization & Service Layer
- [ ] Task: Align frontend `timeCalculation.ts` with backend `TemplateApplicationService` logic.
- [ ] Task: Harmonize frontend `useFlowValidation` with backend `TemplateValidationService` rules.
- [ ] Task: Implement atomic bulk updates for edges to eliminate `useEffect` sync race conditions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Logic Harmonization' (Protocol in workflow.md)

## Phase 3: Component Decoupling
- [ ] Task: Refactor `ListDesignerApp.tsx` to move event handlers into a dedicated controller hook.
- [ ] Task: Audit and optimize re-renders in `ListCanvas` and its child sections.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Component Decoupling' (Protocol in workflow.md)
