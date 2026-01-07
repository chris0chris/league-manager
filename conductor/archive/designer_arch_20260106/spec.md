# Spec: Architectural Optimization of Gameday Designer

## Goal
Improve the maintainability, testability, and reliability of the Gameday Designer by addressing SOLID violations and logic duplication.

## Scope
- **Hook Decomposition:** Split `useFlowState` into `useNodesState`, `useEdgeState`, and `useTeamPoolState`.
- **Logic Harmonization:** Extract time calculation and validation logic into shared utility/service layers to align frontend behavior with `TemplateApplicationService` and `TemplateValidationService`.
- **Component Refactoring:** Extract controller logic from `ListDesignerApp.tsx` into a custom "Gameday" controller hook or specialized sub-components.
- **State Integrity:** Replace reactive `useEffect` synchronization with atomic state updates where possible to prevent race conditions.

## Success Criteria
- `useFlowState` is reduced from ~1000 lines to a slim orchestrator or removed entirely in favor of specialized hooks.
- 100% test coverage for newly created hooks and utilities.
- No divergence in time calculation results between frontend UI and backend application.
- `ListDesignerApp` focuses solely on layout and event delegation.
