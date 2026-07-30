# Flowchart Import/Export v2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `flowchartImport.ts` to build the v2 container-hierarchy node model (instead of flat `data.fieldId` games), simplify `flowchartExport.ts` to derive fields purely from that hierarchy, and then delete the now-fully-dead `FlowState.fields`/`FlowField` legacy metadata array from the codebase entirely.

**Architecture:** Three sequential, independently-testable changes. Task 1 changes what the legacy JSON *importer* produces. Task 2 changes what the *exporter* consumes (dropping its `FlowField[]` parameter, keeping a narrow "raw id as name" fallback for any game with a bare `data.fieldId` and no container parent — so nothing already-persisted silently disappears from an export). Task 3 is the mechanical payoff: once nothing produces or reads `FlowState.fields` for a real reason, delete it from the type and let the TypeScript compiler point at every remaining reference to clean up.

**Tech Stack:** TypeScript, React, Vitest, `gameday_designer` frontend (part of the `leaguesphere` Django+React monorepo).

## Global Constraints

- Every step that changes behavior must follow the RED→GREEN→commit cycle: write/adjust the test first, run it and confirm it fails for the expected reason, then implement, then confirm green.
- Every commit message MUST use **Conventional Commits** format (`type(scope): summary`, e.g. `refactor(gameday-designer): ...`, `test(gameday-designer): ...`). This was an explicit user instruction — do not skip it on any commit in this plan.
- Run `cd gameday_designer && npx vitest run` (from the `leaguesphere` repo root) after each task to confirm the full suite is green before moving to the next task. The only acceptable pre-existing failure is `ListCanvas.test.tsx > ... > empty state has large icon` (a jsdom CSS unit-conversion quirk, present on `master` independent of this work) — if you see any other failure, stop and fix it before proceeding.
- Also run `npx tsc --noEmit` and `npx eslint ./src` after each task. The only acceptable pre-existing `tsc` errors are the two `vite.config.d.mts`/`vitest.config.d.mts` "not been built from source file" errors — anything else must be fixed.
- Do not touch `types/designer.ts`'s `DesignerState`/`Field`/`ScheduleJson` types or `utils/jsonExport.ts`. Those implement a *different*, older, already-unused designer state model (`DesignerState`, not `FlowState`) — confirmed dead via grep (only barrel-file re-exports, no real call site). Out of scope; do not delete it either without separately confirming with the user, since that's a distinct cleanup from this plan.
- Do not touch `flowchartExport-containers.test.ts`'s "reports error when game has no container field and no legacy field" test — it stays valid and passing throughout, no change needed.

---

### Task 1: Rewrite `flowchartImport.ts` to build v2 container hierarchy

**Files:**
- Modify: `gameday_designer/src/utils/flowchartImport.ts`
- Modify: `gameday_designer/src/utils/__tests__/flowchartImport.test.ts`

**Interfaces:**
- Consumes: `createFieldNode(id, options?, position?)`, `createStageNode(id, parentId, options?, position?)`, `createGameNodeInStage(id, parentId, options?, position?)`, `createGameToGameEdge(id, sourceId, type, targetId, targetHandle)` — all already exported from `gameday_designer/src/types/flowchart.ts`.
- Produces: `importFromScheduleJson(json: unknown): ImportResult` keeps its exact existing signature and `ImportResult`/`ScheduleJson` shapes. Its `result.state.nodes` now contains `FieldNode`/`StageNode`/`GameNode` in a proper parent chain instead of flat `GameNode`s with `data.fieldId` set. `result.state.fields` is still present (required by `FlowState` until Task 3) but is now always `[]`.

- [ ] **Step 1: Update the two existing field-array assertions and add a new hierarchy test in `flowchartImport.test.ts`**

In `gameday_designer/src/utils/__tests__/flowchartImport.test.ts`, change the import line to add `isFieldNode` and `isStageNode`:

```typescript
import { isGameNode, isGameToGameEdge, isFieldNode, isStageNode } from '../../types/flowchart';
```

Replace the `'imports a simple schedule correctly'` test's body (currently destructures `fields` and asserts on it) with:

```typescript
    it('imports a simple schedule correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: 'Team A',
              away: 'Team B',
              official: 'Officials',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.warnings).toHaveLength(0);

      const { nodes, globalTeams } = result.state!;

      // Should have 1 field container node
      const fieldNodes = nodes.filter(isFieldNode);
      expect(fieldNodes).toHaveLength(1);
      expect(fieldNodes[0].data.name).toBe('Feld 1');

      // Should have 2 global teams + 1 game node
      expect(globalTeams).toHaveLength(2);
      expect(nodes.filter(isGameNode)).toHaveLength(1);

      // Game should have team assignments
      const gameNode = nodes.find(isGameNode);
      expect(gameNode?.data.homeTeamId).toBeTruthy();
      expect(gameNode?.data.awayTeamId).toBeTruthy();
    });
```

Replace the `'handles multiple fields'` test's body with:

```typescript
    it('handles multiple fields', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [{ stage: 'Preliminary', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' }],
        },
        {
          field: 'Feld 2',
          games: [{ stage: 'Preliminary', standing: 'Spiel 2', home: '0_2', away: '0_3', official: '' }],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);
      const fieldNodes = result.state!.nodes.filter(isFieldNode);
      expect(fieldNodes).toHaveLength(2);
      expect(fieldNodes[0].data.name).toBe('Feld 1');
      expect(fieldNodes[1].data.name).toBe('Feld 2');
    });
```

Add a brand new test right after `'handles multiple fields'` (before `'reuses team nodes for repeated references'`):

```typescript
    it('builds a field -> stage -> game container hierarchy instead of flat fieldId references', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 'Vorrunde', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' },
            { stage: 'Vorrunde', standing: 'Spiel 2', home: '0_2', away: '0_3', official: '' },
            { stage: 'Finale', standing: 'Spiel 3', home: '0_0', away: '0_2', official: '' },
          ],
        },
      ];

      const result = importFromScheduleJson(json);
      expect(result.success).toBe(true);

      const { nodes } = result.state!;
      const fieldNode = nodes.find(isFieldNode);
      expect(fieldNode).toBeDefined();

      const stageNodes = nodes.filter(isStageNode);
      // Two unique stage names in the source JSON -> two stage nodes, both nested under the field
      expect(stageNodes).toHaveLength(2);
      expect(stageNodes.every((s) => s.parentId === fieldNode!.id)).toBe(true);

      const vorrunde = stageNodes.find((s) => s.data.name === 'Vorrunde');
      const finale = stageNodes.find((s) => s.data.name === 'Finale');
      expect(vorrunde).toBeDefined();
      expect(finale).toBeDefined();

      const gameNodes = nodes.filter(isGameNode);
      expect(gameNodes).toHaveLength(3);
      // Both Vorrunde games share the same stage node; Finale's game is under the other
      expect(gameNodes.filter((g) => g.parentId === vorrunde!.id)).toHaveLength(2);
      expect(gameNodes.filter((g) => g.parentId === finale!.id)).toHaveLength(1);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd gameday_designer && npx vitest run src/utils/__tests__/flowchartImport.test.ts`
Expected: 3 failures — the two rewritten tests fail because `nodes.filter(isFieldNode)` is empty (current importer only produces flat `GameNode`s, no `FieldNode`s), and the new hierarchy test fails the same way.

- [ ] **Step 3: Rewrite `flowchartImport.ts`'s implementation**

Replace the full contents of `gameday_designer/src/utils/flowchartImport.ts` with:

```typescript
/**
 * Flowchart Import Utility
 *
 * Converts schedule JSON format into the flowchart graph state,
 * creating nodes, edges, and auto-layout.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  FlowState,
  FlowNode,
  FlowEdge,
  GameInputHandle,
  GlobalTeam,
} from '../types/flowchart';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createGameToGameEdge,
} from '../types/flowchart';
import type { ScheduleJson } from '../types/designer';
import { parseTeamReference } from './teamReference';
import { getTeamColor } from './tournamentConstants';

/**
 * Result of the import operation.
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** The imported flow state (if successful) */
  state?: FlowState;
  /** Warning messages (non-fatal issues) */
  warnings: string[];
  /** Error messages (fatal issues) */
  errors: string[];
}

// Auto-layout removed - not needed for global team pool approach
// Games are positioned within their container hierarchies (fields/stages)

/**
 * Import schedule JSON into a flow state.
 *
 * Builds the v2 container hierarchy (field -> stage -> game), matching
 * what the designer canvas and hand-built schedules already use, instead
 * of the older flat model (game.data.fieldId + a separate fields array).
 *
 * @param json - The schedule JSON to import
 * @returns Import result with state or errors
 */
export function importFromScheduleJson(json: unknown): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate input
  if (!Array.isArray(json)) {
    return {
      success: false,
      errors: ['Invalid input: expected an array of field schedules'],
      warnings: [],
    };
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const globalTeams: GlobalTeam[] = [];

  // Track global teams and games for assignments
  const teamLabelMap = new Map<string, string>(); // label -> team id
  const gameNodeMap = new Map<string, string>(); // standing -> game id
  let teamOrder = 0;

  // First pass: Create field/stage/game container nodes, collect unique team labels
  for (let fieldIdx = 0; fieldIdx < json.length; fieldIdx++) {
    const fieldSchedule = json[fieldIdx] as ScheduleJson;

    // Validate field entry
    if (!fieldSchedule || typeof fieldSchedule !== 'object') {
      warnings.push(`Field ${fieldIdx + 1}: Invalid entry, skipped`);
      continue;
    }

    // Create field container node
    const fieldId = `field-${uuidv4()}`;
    const fieldName = String(fieldSchedule.field ?? `Field ${fieldIdx + 1}`);
    nodes.push(createFieldNode(fieldId, { name: fieldName, order: fieldIdx }));

    if (!Array.isArray(fieldSchedule.games)) {
      warnings.push(`Field "${fieldName}": No games found`);
      continue;
    }

    // One stage container node per unique stage name within this field
    const stageIdByName = new Map<string, string>();

    for (let gameIdx = 0; gameIdx < fieldSchedule.games.length; gameIdx++) {
      const game = fieldSchedule.games[gameIdx];

      if (!game || typeof game !== 'object') {
        warnings.push(`Field "${fieldName}", Game ${gameIdx + 1}: Invalid entry, skipped`);
        continue;
      }

      const stageName = game.stage || 'Preliminary';
      let stageId = stageIdByName.get(stageName);
      if (!stageId) {
        stageId = `stage-${uuidv4()}`;
        nodes.push(createStageNode(stageId, fieldId, { name: stageName, order: stageIdByName.size }));
        stageIdByName.set(stageName, stageId);
      }

      const gameId = `game-${uuidv4()}`;
      const standing = game.standing || `Game ${gameIdx + 1}`;

      // Track for assignments
      gameNodeMap.set(standing, gameId);

      // Create game node inside its stage (teams will be assigned in second pass)
      const gameNode = createGameNodeInStage(gameId, stageId, {
        stage: stageName,
        standing,
        official: game.official ? parseTeamReference(game.official) : null,
        breakAfter: game.break_after ?? 0,
        homeTeamId: null,
        awayTeamId: null,
        homeTeamDynamic: null,
        awayTeamDynamic: null,
      });

      nodes.push(gameNode);

      // Collect unique team labels for global team pool (static teams only)
      for (const refStr of [game.home, game.away]) {
        if (!refStr) continue;

        const parsed = parseTeamReference(refStr);

        // Only create global teams for static references (not winner/loser)
        if (parsed.type === 'static') {
          const label = parsed.name;
          if (!teamLabelMap.has(label)) {
            const teamId = `team-${uuidv4()}`;
            teamLabelMap.set(label, teamId);

            const currentOrder = teamOrder++;
            const newTeam: GlobalTeam = {
              id: teamId,
              label,
              groupId: null,
              order: currentOrder,
              color: getTeamColor(currentOrder),
            };
            globalTeams.push(newTeam);
          }
        }
      }
    }
  }

  // Second pass: Assign teams to games and create GameToGameEdges
  for (const fieldSchedule of json as ScheduleJson[]) {
    if (!Array.isArray(fieldSchedule.games)) continue;

    for (const game of fieldSchedule.games) {
      if (!game || typeof game !== 'object') continue;

      const gameId = gameNodeMap.get(game.standing);
      if (!gameId) continue;

      // Find the game node
      const gameNode = nodes.find((n) => n.id === gameId);
      if (!gameNode) continue;

      // Process home and away teams
      for (const [refStr, slot] of [
        [game.home, 'home'],
        [game.away, 'away'],
      ] as const) {
        if (!refStr) continue;

        const parsed = parseTeamReference(refStr);

        if (parsed.type === 'winner' || parsed.type === 'loser') {
          // Game-to-game edge (for dynamic team assignment)
          const sourceGameId = gameNodeMap.get(parsed.matchName);
          if (sourceGameId) {
            const edge = createGameToGameEdge(
              `edge-${uuidv4()}`,
              sourceGameId,
              parsed.type,
              gameId,
              slot as GameInputHandle
            );
            edges.push(edge);
          } else {
            warnings.push(
              `Game "${game.standing}": Referenced match "${parsed.matchName}" not found`
            );
          }
        } else if (parsed.type === 'static') {
          // Static team assignment via global team pool
          const teamId = teamLabelMap.get(parsed.name);
          if (teamId) {
            // Update game node with team assignment
            if (slot === 'home') {
              gameNode.data.homeTeamId = teamId;
            } else {
              gameNode.data.awayTeamId = teamId;
            }
          }
        }
        // Note: Other reference types (groupTeam, standing) are not supported in import
        // They would need additional context (group/standing mappings)
      }
    }
  }

  return {
    success: true,
    state: {
      nodes,
      edges,
      fields: [],
      globalTeams,
      globalTeamGroups: [],
    },
    warnings,
    errors,
  };
}

/**
 * Validate that JSON is in the expected schedule format.
 *
 * @param json - The JSON to validate
 * @returns Array of validation error messages
 */
export function validateScheduleJson(json: unknown): string[] {
  const errors: string[] = [];

  if (!Array.isArray(json)) {
    return ['Input must be an array'];
  }

  for (let i = 0; i < json.length; i++) {
    const entry = json[i];
    const prefix = `Field ${i + 1}`;

    if (entry === null || typeof entry !== 'object') {
      errors.push(`${prefix}: Entry must be an object`);
      continue;
    }

    const fieldEntry = entry as Record<string, unknown>;

    if (!('field' in fieldEntry)) {
      errors.push(`${prefix}: Missing 'field' property`);
    }

    if (!('games' in fieldEntry)) {
      errors.push(`${prefix}: Missing 'games' property`);
      continue;
    }

    if (!Array.isArray(fieldEntry.games)) {
      errors.push(`${prefix}: 'games' must be an array`);
      continue;
    }

    for (let j = 0; j < fieldEntry.games.length; j++) {
      const game = fieldEntry.games[j];
      const gamePrefix = `${prefix}, Game ${j + 1}`;

      if (game === null || typeof game !== 'object') {
        errors.push(`${gamePrefix}: Game must be an object`);
        continue;
      }

      const gameObj = game as Record<string, unknown>;
      const required = ['stage', 'standing', 'home', 'away'];

      for (const prop of required) {
        if (!(prop in gameObj)) {
          errors.push(`${gamePrefix}: Missing '${prop}' property`);
        } else if (typeof gameObj[prop] !== 'string') {
          errors.push(`${gamePrefix}: '${prop}' must be a string`);
        }
      }
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd gameday_designer && npx vitest run src/utils/__tests__/flowchartImport.test.ts`
Expected: all tests pass (the 3 from Step 1/2, plus the previously-passing ones — `imports winner/loser references correctly`, `imports loser references correctly`, `imports break_after correctly`, `imports standing references correctly`, `reuses team nodes for repeated references`, `fails for invalid input`, `adds warnings for unresolved match references`, `positions nodes with auto-layout`, and the `validateScheduleJson` describe block — none of those reference `fields`, so they should be unaffected).

- [ ] **Step 5: Run the wider hook/component tests that consume import**

Run: `cd gameday_designer && npx vitest run src/hooks/__tests__/useDesignerController.test.ts`
Expected: all pass (this file mocks `flowchartImport`, so it isn't affected, but confirms nothing else broke).

- [ ] **Step 6: Commit**

```bash
git add gameday_designer/src/utils/flowchartImport.ts gameday_designer/src/utils/__tests__/flowchartImport.test.ts
git commit -m "refactor(gameday-designer): import legacy schedules into v2 container hierarchy

Builds field/stage/game container nodes instead of flat games with a
data.fieldId string, matching the model the designer canvas and every
other schedule-building path already use. Fixes imported schedules not
rendering on the canvas (ListCanvas only understands the container
hierarchy) and not being exportable/valid (canExport/validateForExport
require at least one field container node)."
```

---

### Task 2: Simplify `flowchartExport.ts` to drop the `FlowField[]` parameter

**Files:**
- Modify: `gameday_designer/src/utils/flowchartExport.ts`
- Modify: `gameday_designer/src/utils/__tests__/flowchartExport-containers.test.ts`
- Modify: `gameday_designer/src/utils/__tests__/flowchartExport.test.ts`

**Interfaces:**
- Consumes: `getFieldNodes(nodes: FlowNode[]): FieldNode[]` from `gameday_designer/src/types/flowchart.ts` (already exists, added in PR #1707).
- Produces: `exportToScheduleJson(state: FlowState): ExportResult`, `validateForExport(state: FlowState): string[]`, `downloadFlowchartAsJson(state: FlowState, filename?: string): ExportResult` all keep their exact existing signatures (still take a whole `FlowState`, which still has a `fields` property until Task 3 — these functions simply stop reading it).

**Design decision (documented so a reviewer can sanity-check it):** a game with no container-field parent but a bare `data.fieldId` string (the old flat model) can still be exported — it's just grouped under a field named after the raw id itself (e.g. `"legacy-field-1"`) instead of a nice name looked up from the now-removed `fields` array. Nothing is silently dropped from an export. This is a narrow fallback for any already-persisted flat-model data; it's not expected to ever trigger for anything built after Task 1 ships.

- [ ] **Step 1: Update the "legacy fallback" test in `flowchartExport-containers.test.ts` to expect the new behavior**

In `gameday_designer/src/utils/__tests__/flowchartExport-containers.test.ts`, replace the `'falls back to legacy FlowField when container hierarchy not present'` test with:

```typescript
    it('falls back to the raw fieldId as the field name when no container field matches', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      // Game with fieldId but no container parent (v1 model) and no matching field node
      const gameNode = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 100, y: 100 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          standing: 'VR1',
          fieldId: 'legacy-field-1',
          official: null,
          breakAfter: 0,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const state: FlowState = {
        nodes: [gameNode],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].field).toBe('legacy-field-1');
    });
```

Remove the now-unused `FlowField` import (it was only used by the test you just replaced): change

```typescript
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  type FlowState,
  type FlowField,
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';
```

to

```typescript
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  type FlowState,
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd gameday_designer && npx vitest run src/utils/__tests__/flowchartExport-containers.test.ts`
Expected: FAIL — `expect(result.data![0].field).toBe('legacy-field-1')` receives `'Legacy Field'` instead (current implementation still looks the name up from the `fields` array, which this test no longer supplies a matching entry for... actually it supplies `fields: []`, so check: current `getAllFields` merges `legacyFields` (empty here) with container nodes (empty here) — so `allFields` is empty, meaning `gamesByField` starts with zero entries, and the orphan game's `legacyFieldId = 'legacy-field-1'` fails the current code's `gamesByField.has(legacyFieldId)` check (since nothing was pre-populated for it) — so the game is silently dropped and `result.data` would be an empty array, not length 1. Confirm the actual failure message names either the empty array or the missing field name; either way it's a real failure demonstrating today's silent-drop behavior.

- [ ] **Step 3: Rewrite `flowchartExport.ts`'s field-derivation and grouping logic**

In `gameday_designer/src/utils/flowchartExport.ts`, change the import line to add `getFieldNodes` and drop `FlowField`:

```typescript
import type {
  FlowState,
  FlowNode,
  GameNodeData,
  FieldNodeData,
  StageNodeData,
} from '../types/flowchart';
import {
  isGameNode,
  isFieldNode,
  isStageNode,
  getFieldNodes,
} from '../types/flowchart';
```

Replace the `FieldInfo` interface, `getAllFields`, and `groupGamesByField` (currently just above `exportToScheduleJson`) with:

```typescript
/**
 * Container field info for grouping games.
 */
interface FieldInfo {
  id: string;
  name: string;
  order: number;
}

/**
 * Get all field container nodes for grouping.
 */
function getAllFields(nodes: FlowNode[]): FieldInfo[] {
  return getFieldNodes(nodes).map((node) => ({
    id: node.id,
    name: node.data.name,
    order: node.data.order,
  }));
}

/**
 * Group game nodes by their assigned field.
 *
 * Primarily uses container hierarchy (game -> stage -> field). Falls back to
 * a game's own `data.fieldId` string for any pre-existing data that predates
 * the container-hierarchy model, synthesizing a field entry named after the
 * raw id if no container field node matches it — so such a game still gets
 * exported, just without a friendly display name.
 */
function groupGamesByField(nodes: FlowNode[]): Map<string, { fieldInfo: FieldInfo; games: FlowNode[] }> {
  const allFields = getAllFields(nodes);
  const gamesByField = new Map<string, { fieldInfo: FieldInfo; games: FlowNode[] }>();

  // Initialize with all fields (even empty ones)
  for (const field of allFields) {
    gamesByField.set(field.id, { fieldInfo: field, games: [] });
  }

  // Group games by field
  const gameNodes = nodes.filter(isGameNode);
  for (const node of gameNodes) {
    // Try container hierarchy first
    const containerField = getGameField(node, nodes);
    if (containerField && gamesByField.has(containerField.id)) {
      gamesByField.get(containerField.id)!.games.push(node);
      continue;
    }

    // Fall back to legacy fieldId, synthesizing a field entry if needed
    const legacyFieldId = (node.data as GameNodeData).fieldId;
    if (!legacyFieldId) continue;

    if (!gamesByField.has(legacyFieldId)) {
      gamesByField.set(legacyFieldId, {
        fieldInfo: { id: legacyFieldId, name: legacyFieldId, order: allFields.length + gamesByField.size },
        games: [],
      });
    }
    gamesByField.get(legacyFieldId)!.games.push(node);
  }

  return gamesByField;
}
```

Update `exportToScheduleJson` to stop destructuring `fields` from state and to call `groupGamesByField` with one argument:

```typescript
export function exportToScheduleJson(state: FlowState): ExportResult {
  const { nodes, globalTeams } = state;
```

(only the destructure line changes — drop `fields` from it)

```typescript
  // Group games by field
  const gamesByField = groupGamesByField(nodes);
```

(drop the `fields` argument)

Update `downloadFlowchartAsJson`'s field count:

```typescript
  const gameCount = state.nodes.filter(isGameNode).length;
  const fieldCount = getFieldNodes(state.nodes).length;
```

Update `validateForExport`:

```typescript
export function validateForExport(state: FlowState): string[] {
  const { nodes } = state;
  const errors: string[] = [];

  // Check for at least one field (container nodes or a legacy fieldId on some game)
  const containerFieldNodes = getFieldNodes(nodes);
  const gameNodes = nodes.filter(isGameNode);
  const hasLegacyFieldId = gameNodes.some((n) => (n.data as GameNodeData).fieldId);
  if (containerFieldNodes.length === 0 && !hasLegacyFieldId) {
    errors.push('At least one field is required');
  }

  // Check for at least one game
  if (gameNodes.length === 0) {
    errors.push('At least one game is required');
  }
```

(the rest of `validateForExport`'s per-game loop is unchanged — it already checks `getGameField(node, nodes) !== null || data.fieldId !== null` per game, with no dependency on the `fields` array)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd gameday_designer && npx vitest run src/utils/__tests__/flowchartExport-containers.test.ts`
Expected: all pass, including the rewritten test and the untouched `'reports error when game has no container field and no legacy field'` test.

- [ ] **Step 5: Rewrite `flowchartExport.test.ts`'s fixtures to the v2 container-hierarchy model**

Replace the full contents of `gameday_designer/src/utils/__tests__/flowchartExport.test.ts` with:

```typescript
/**
 * Tests for Flowchart Export Utility
 */

import { describe, it, expect } from 'vitest';
import {
  exportToScheduleJson,
  validateForExport,
} from '../flowchartExport';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createGameToGameEdge,
  type FlowState,
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';

describe('Flowchart Export Utility', () => {
  describe('exportToScheduleJson', () => {
    it('exports a simple 2-team game correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const team1: GlobalTeam = { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 };
      const team2: GlobalTeam = { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 };

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Preliminary' });
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1',
        official: { type: 'static', name: 'Officials' },
        breakAfter: 0,
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: [team1, team2],
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        field: 'Feld 1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: 'Officials',
          },
        ],
      });
    });

    it('exports winner/loser references correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Final' });
      const gameHf1 = createGameNodeInStage('game-hf1', 'stage-1', {
        standing: 'HF1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const gameHf2 = createGameNodeInStage('game-hf2', 'stage-1', {
        standing: 'HF2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });
      const gameFinal = createGameNodeInStage('game-final', 'stage-1', {
        standing: 'P1',
        homeTeamDynamic: { type: 'winner', matchName: 'HF1' },
        awayTeamDynamic: { type: 'winner', matchName: 'HF2' },
      });

      const state: FlowState = {
        nodes: [field, stage, gameHf1, gameHf2, gameFinal],
        edges: [
          createGameToGameEdge('e5', 'game-hf1', 'winner', 'game-final', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'winner', 'game-final', 'away'),
        ],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      const games = result.data![0].games;
      expect(games).toHaveLength(3);

      const finalGame = games.find((g) => g.standing === 'P1');
      expect(finalGame).toBeDefined();
      expect(finalGame!.home).toBe('Gewinner HF1');
      expect(finalGame!.away).toBe('Gewinner HF2');
    });

    it('exports loser references correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Final' });
      const gameHf1 = createGameNodeInStage('game-hf1', 'stage-1', {
        standing: 'HF1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const gameHf2 = createGameNodeInStage('game-hf2', 'stage-1', {
        standing: 'HF2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });
      const gameP3 = createGameNodeInStage('game-p3', 'stage-1', {
        standing: 'P3',
        homeTeamDynamic: { type: 'loser', matchName: 'HF1' },
        awayTeamDynamic: { type: 'loser', matchName: 'HF2' },
      });

      const state: FlowState = {
        nodes: [field, stage, gameHf1, gameHf2, gameP3],
        edges: [
          createGameToGameEdge('e5', 'game-hf1', 'loser', 'game-p3', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'loser', 'game-p3', 'away'),
        ],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);

      const p3Game = result.data![0].games.find((g) => g.standing === 'P3');
      expect(p3Game).toBeDefined();
      expect(p3Game!.home).toBe('Verlierer HF1');
      expect(p3Game!.away).toBe('Verlierer HF2');
    });

    it('exports break_after when non-zero', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', breakAfter: 10, homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBe(10);
    });

    it('does not include break_after when zero', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', breakAfter: 0, homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBeUndefined();
    });

    it('fails when game has no field assigned', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      // Orphan game: no stage parent, no legacy fieldId either
      const orphanGame = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 0, y: 0 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          standing: 'Spiel 1',
          fieldId: null,
          official: null,
          breakAfter: 0,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const state: FlowState = {
        nodes: [orphanGame],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Games without field assignment: Spiel 1');
    });

    it('fails when game has incomplete connections', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: null,
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('incomplete'))).toBe(true);
    });

    it('groups games by field correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field1 = createFieldNode('field-1', { name: 'Feld 1', order: 0 });
      const field2 = createFieldNode('field-2', { name: 'Feld 2', order: 1 });
      const stage1 = createStageNode('stage-1', 'field-1');
      const stage2 = createStageNode('stage-2', 'field-2');
      const game1 = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const game2 = createGameNodeInStage('game-2', 'stage-2', {
        standing: 'Spiel 2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });

      const state: FlowState = {
        nodes: [field1, field2, stage1, stage2, game1, game2],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].field).toBe('Feld 1');
      expect(result.data![0].games).toHaveLength(1);
      expect(result.data![1].field).toBe('Feld 2');
      expect(result.data![1].games).toHaveLength(1);
    });
  });

  describe('validateForExport', () => {
    it('returns empty array for valid state', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);
      expect(errors).toHaveLength(0);
    });

    it('returns error when no fields exist', () => {
      const orphanGame = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 0, y: 0 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          standing: 'Spiel 1',
          fieldId: null,
          official: null,
          breakAfter: 0,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const state: FlowState = {
        nodes: [orphanGame],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one field is required');
    });

    it('returns error when no games exist', () => {
      const field = createFieldNode('field-1', { name: 'Feld 1' });

      const state: FlowState = {
        nodes: [field],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one game is required');
    });

    it('returns error for game without standing', () => {
      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: '' });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('no standing'))).toBe(true);
    });

    it('returns error for game missing home team', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: null, awayTeamId: 'team-1',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('missing home'))).toBe(true);
    });
  });
});
```

- [ ] **Step 6: Run both export test files to confirm everything is green**

Run: `cd gameday_designer && npx vitest run src/utils/__tests__/flowchartExport.test.ts src/utils/__tests__/flowchartExport-containers.test.ts`
Expected: all pass.

- [ ] **Step 7: Run the full suite, tsc, and eslint**

Run: `cd gameday_designer && npx vitest run && npx tsc --noEmit && npx eslint ./src`
Expected: same pass/fail profile as the Global Constraints section describes (only the known pre-existing `ListCanvas.test.tsx` failure and the two known `tsc` config errors).

- [ ] **Step 8: Commit**

```bash
git add gameday_designer/src/utils/flowchartExport.ts gameday_designer/src/utils/__tests__/flowchartExport.test.ts gameday_designer/src/utils/__tests__/flowchartExport-containers.test.ts
git commit -m "refactor(gameday-designer): derive export field grouping from container nodes only

getAllFields/groupGamesByField no longer take a FlowField[] parameter —
they use the shared getFieldNodes() helper. A game with a legacy bare
data.fieldId and no container parent still exports, now grouped under
a field named after the raw id instead of a name looked up from the
(now unused) fields array, so nothing is silently dropped."
```

---

### Task 3: Remove `FlowState.fields`/`FlowField` from the type entirely

**Files:**
- Modify: `gameday_designer/src/types/flowchart.ts`
- Modify: `gameday_designer/src/hooks/useFlowState.ts`
- Modify: `gameday_designer/src/hooks/useDesignerController.ts`
- Modify: `gameday_designer/src/types/api.ts`
- Modify: `gameday_designer/src/api/mockGamedayApi.ts`
- Modify: `gameday_designer/src/utils/flowchartImport.ts`
- Modify: every test file the compiler flags after Step 1 (starting checklist below; treat `tsc --noEmit` as the source of truth for completeness, not this list)

**Interfaces:**
- Produces: `FlowState` no longer has a `fields` property. `FlowField` type and `createFlowField()` factory are deleted from `types/flowchart.ts`.

- [ ] **Step 1: Remove `fields`/`FlowField` from `types/flowchart.ts`**

Remove the `fields: FlowField[];` line (and its doc comment) from the `FlowState` interface:

```typescript
export interface FlowState {
  /** Gameday metadata */
  metadata?: GamedayMetadata;
  /** All nodes in the graph */
  nodes: FlowNode[];
  /** All edges connecting nodes */
  edges: FlowEdge[];
  /** Global team pool (v2) - teams that can be assigned to any game */
  globalTeams: GlobalTeam[];
  /** Global team groups - for organizing teams into sections */
  globalTeamGroups: GlobalTeamGroup[];
}
```

Remove the `createFlowField` function entirely:

```typescript
/**
 * Creates a new field with default values.
 */
export function createFlowField(
  id: string,
  name: string,
  order: number
): FlowField {
  return {
    id,
    name,
    order,
  };
}
```

Remove the `fields: [],` line from `createEmptyFlowState`:

```typescript
export function createEmptyFlowState(): FlowState {
  return {
    metadata: { ... },
    nodes: [],
    edges: [],
    globalTeams: [],
    globalTeamGroups: [],
  };
}
```

Find and remove the `FlowField` interface definition itself (search for `interface FlowField` in the file — it sits near the other small data-shape interfaces; delete the whole interface block, e.g.:

```typescript
export interface FlowField {
  id: string;
  name: string;
  order: number;
}
```

- [ ] **Step 2: Fix the production files that construct or read `FlowState.fields`**

In `gameday_designer/src/hooks/useFlowState.ts`:
- Remove the `FlowField` import.
- Remove the line `const [fields, setFields] = useState<FlowField[]>(initialState?.fields ?? []);`
- In `captureHistory`'s call `captureHistory({ metadata, nodes, edges, fields, globalTeams, globalTeamGroups });`, remove `fields,`.
- In the `useEffect` right after it, remove `fields` from the dependency array.
- In `undo`, remove the line `setFields(prevState.fields);`.
- In `redo`, remove the line `setFields(nextState.fields);`.
- In `importState`, remove the line `setFields(state.fields || []);`.
- In `exportState`, remove `fields,` from the returned object and from its dependency array.
- In `clearAll` and `clearSchedule`, remove `setFields([]);`.
- In the big return object near the end of the hook, remove the `fields,` line.
- In the final dependency array of that same `useMemo`, remove `fields`.

In `gameday_designer/src/hooks/useDesignerController.ts`:
- In the custom-template-apply branch of `handleGenerateTournament` (the `fs.importState({...})` call that currently has `nodes: timedNodes`), remove the `fields: imported.nodes.filter(n => n.type === 'field').map(f => ({...}))` block entirely (just delete those lines; the object no longer needs a `fields` key).
- In the built-in-tournament branch's `fs.importState({...})` call (the one with `nodes: [...structureWithRefs.fields, ...structureWithRefs.stages, ...structureWithRefs.games]`), remove the `fields: structureWithRefs.fields.map(f => ({...}))` block. (Leave the `nodes: [...structureWithRefs.fields, ...]` line alone — that `.fields` is `TournamentStructure.fields: FieldNode[]`, unrelated to `FlowState.fields`.)
- In `memoizedState`, remove the line `fields: flowState?.fields || [],` and remove `flowState?.fields` from that `useMemo`'s dependency array.

In `gameday_designer/src/types/api.ts`:
- Remove `FlowField` from the type import at the top.
- Remove the line `fields?: FlowField[];` from the `Gameday.designer_data` interface.

In `gameday_designer/src/api/mockGamedayApi.ts`:
- Change all three occurrences of `designer_data: { fields: [] }` to `designer_data: {}`, and `designer_data: data.designer_data || { fields: [] }` to `designer_data: data.designer_data || {}`.

In `gameday_designer/src/utils/flowchartImport.ts`:
- Remove the `fields: [],` line from the object returned by `importFromScheduleJson`.

- [ ] **Step 3: Run `tsc --noEmit` and fix every reported error**

Run: `cd gameday_designer && npx tsc --noEmit`

Expected: a batch of errors of the form `Object literal may only specify known properties, and 'fields' does not exist in type 'FlowState'` (or similar `Partial<FlowState>`/`FlowState` variants), each pointing at a `fields: [...]` (or a longer array) property inside a `FlowState`/`Partial<FlowState>`-typed object literal in a test file. As a starting checklist (not exhaustive — trust the compiler over this list), expect to touch:

- `components/__tests__/ListDesignerApp-integration.test.tsx`
- `components/__tests__/ListDesignerApp.test.tsx`
- `components/__tests__/FinalCoveragePolish.test.tsx`
- `components/__tests__/ListDesignerApp-placement.test.tsx`
- `components/__tests__/PR793PatchCoverage.test.tsx`
- `components/__tests__/ListDesignerApp-tour.test.tsx`
- `components/__tests__/PRFixCoverage.test.tsx`
- `components/__tests__/ListDesignerApp-coverage.test.tsx`
- `components/__tests__/ListDesignerApp-e2e.test.tsx`
- `hooks/__tests__/useDesignerController.task2.test.ts`
- `hooks/__tests__/useDesignerController.test.ts`
- `hooks/__tests__/useFlowState-edge-cases.test.ts`
- `hooks/__tests__/useFlowState-containers.test.ts`
- `types/__tests__/flowchart.test.ts`
- `utils/__tests__/templateMapper.test.ts`

For each reported location, delete the `fields: [...]` property from that object literal (whether it's a one-line `fields: [],` or a multi-line array — delete the whole property, keeping the surrounding object's other properties and trailing comma structure intact). If a file's only use of the `FlowField` type or `createFlowField` factory was to build that now-deleted property, also remove that now-unused import.

Re-run `npx tsc --noEmit` after each file (or batch of files) and repeat until it reports only the two known pre-existing `vite.config.d.mts`/`vitest.config.d.mts` errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd gameday_designer && npx vitest run`
Expected: same pass count/profile as before this task started, minus nothing — deleting an unread `fields: []` property from a fixture should never change a test's behavior. If any test's assertions were actually checking `.fields` (beyond what Tasks 1/2 already handled), fix that specific test's expectations rather than re-adding the property.

- [ ] **Step 5: Run eslint and fix any fallout**

Run: `cd gameday_designer && npx eslint ./src`
Expected: clean. Fix any newly-unused imports (e.g. a leftover `FlowField` or `createFlowField` import in a file where Step 3 removed the only usage).

- [ ] **Step 6: Commit**

```bash
git add -A gameday_designer/src
git commit -m "refactor(gameday-designer): remove the legacy fields metadata array from FlowState

Now that flowchartImport.ts builds container-hierarchy nodes and
flowchartExport.ts derives field data from getFieldNodes(), nothing
reads or writes FlowState.fields for a real reason. Deletes the type,
the FlowField interface, and the createFlowField factory, and cleans
up every now-excess fields: [] fixture property the compiler flagged."
```

---

### Task 4: Final verification and PR

**Files:** none (verification + git/gh operations only)

- [ ] **Step 1: Full verification sweep**

Run, from the `leaguesphere` repo root:

```bash
cd gameday_designer && npx vitest run && npx tsc --noEmit && npx eslint ./src
```

Confirm: only the one known pre-existing `ListCanvas.test.tsx` failure and the two known pre-existing `tsc` config errors remain; nothing else.

- [ ] **Step 2: Push and open the PR**

`gh stack submit`'s PR-creation step is known-broken for this fork (see the saved memory: it targets the fork's upstream parent instead of the fork itself). Use plain `gh pr create` instead, same as PRs #1697 and #1707:

```bash
git push -u origin <branch-name>
gh pr create --repo dachrisch/leaguesphere --base master --head <branch-name> \
  --title "Migrate flowchart import/export to the v2 container hierarchy" \
  --body "$(cat <<'EOF'
## Summary
Follow-up to #1707. Rewrites the legacy JSON schedule importer to build
field/stage/game container nodes (matching what the designer canvas and
every other schedule-building path already produce) instead of flat
games with a bare data.fieldId string, and simplifies the exporter to
derive field grouping purely from those container nodes. This also
fixes imported schedules not rendering on the canvas and not being
exportable — both required the container hierarchy that the old
importer never built.

With both sides on the same model, the legacy `FlowState.fields`
metadata array (and the `FlowField` type / `createFlowField` factory)
have no remaining reason to exist and are deleted, along with every
now-excess `fields: []` fixture property the compiler flagged.

A narrow safety net: a game with a legacy bare `data.fieldId` and no
container parent still exports (grouped under a field named after the
raw id) rather than being silently dropped — covers any already-persisted
data from before this change ships.

## Test plan
- [x] New test in flowchartImport.test.ts proves field/stage/game nesting
- [x] Rewrote flowchartExport.test.ts fixtures to the container-hierarchy model
- [x] flowchartExport-containers.test.ts's legacy-fallback test updated and reproduces the old silent-drop bug before the fix
- [x] Full gameday_designer suite green (same pre-existing unrelated ListCanvas failure as prior PRs)
- [x] tsc --noEmit and eslint ./src clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Self-Review Notes (for whoever executes this plan)

- Every task ends with its own file's tests green before starting the next task — Task 2 does not depend on Task 3 having run, and vice versa's assumptions were checked (Task 2's `fields: []` fixture properties are still valid until Task 3 deletes the type).
- `flowchartExport-containers.test.ts`'s "reports error when game has no container field and no legacy field" test was checked against the Task 2 rewrite and needs no change — confirmed by tracing both branches of the new `validateForExport`.
- `useNodesState.ts:341` and the `nodes: [...structureWithRefs.fields, ...]` line in `useDesignerController.ts` reference `TournamentStructure.fields: FieldNode[]` — a different, unrelated `.fields`, and are correctly left untouched.
