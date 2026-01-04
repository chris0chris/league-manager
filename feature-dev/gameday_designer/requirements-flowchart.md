# Requirements Specification: Gameday Designer - Flowchart Approach

## Document Status

| Property | Value |
|----------|-------|
| Version | 1.0.0 |
| Status | Draft |
| Created | 2025-12-01 |
| Paradigm | **PIVOT** from slot-based grid to graph/flowchart approach |

---

## Executive Summary

This document specifies a **complete redesign** of the Gameday Designer from a slot-based grid approach to a **visual flowchart/node-wiring paradigm**. Instead of creating game slots in field columns and manually selecting team references, users will:

1. **Start with teams** as entry point nodes
2. **Wire teams together** to create game nodes (matchups)
3. **Wire game outputs** (winner/loser) to subsequent games
4. **Assign fields separately** as metadata on game nodes

The tournament structure is derived from the visual graph, making the relationship between games explicit and intuitive. This approach is particularly well-suited for:

- Tournament brackets (single/double elimination)
- Playoff progressions
- Any schedule where games depend on prior results

---

## Comparison: Slot-Based vs Flowchart Approach

### Previous Approach (Slot-Based Grid)

```
+------------------+    +------------------+
|     Field 1      |    |     Field 2      |
+------------------+    +------------------+
| Game Slot 1      |    | Game Slot 1      |
| [HF1]            |    | [HF2]            |
| Home: 0_0        |    | Home: 0_2        |
| Away: 0_1        |    | Away: 0_3        |
+------------------+    +------------------+
| Game Slot 2      |    | Game Slot 2      |
| [P1]             |    | [P3]             |
| Home: Gewinner   |    | Home: Verlierer  |
|       HF1        |    |       HF1        |
| Away: Gewinner   |    | Away: Verlierer  |
|       HF2        |    |       HF2        |
+------------------+    +------------------+
```

**Problems:**
- Team references are manually typed or selected from dropdowns
- Dependencies between games are implicit (text strings)
- Easy to create invalid references (typos, non-existent matches)
- Tournament flow is not visually apparent
- No visual feedback on game dependencies

### New Approach (Flowchart/Wiring)

```
                           +-----------+
[Team A] ----+             |           |
             |-----> [Game: HF1] ----winner----+
[Team B] ----+             |                   |
                    loser--+                   |
                           |                   |
                           v                   v
                    [Game: P3] <---loser  [Game: P1]
                           ^                   ^
                           |                   |
                    loser--+                   |
                           |                   |
[Team C] ----+             |           +-------+
             |-----> [Game: HF2] ----winner----+
[Team D] ----+             |
                           +-----------+

Fields are assigned as metadata:
- HF1 -> Field 1
- HF2 -> Field 2
- P1 -> Field 1
- P3 -> Field 2
```

**Benefits:**
- Visual representation of tournament flow
- Dependencies are explicit connections (edges)
- Cannot create invalid references (connections are validated)
- Intuitive for bracket-style tournaments
- Team references generated automatically from connections

---

## Core Concepts

### Node Types

#### 1. Team Node (Entry Point)

**Purpose:** Represents a participating team as an input to the tournament structure.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | `'team'` | Node type discriminator |
| `reference` | TeamReference | The team reference (groupTeam, standing, static) |
| `position` | { x, y } | Canvas position |
| `label` | string | Display label |

**Visual Representation:**
- Circular or rounded rectangle node
- Team name/reference displayed
- Single output port (to connect to game inputs)
- Color-coded by group (optional)

**Constraints:**
- Team nodes are **source-only** - they have no inputs
- Team nodes can connect to multiple game inputs (same team in multiple games)

#### 2. Game Node (Match Container)

**Purpose:** Represents a single match with two team inputs and winner/loser outputs.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | `'game'` | Node type discriminator |
| `stage` | string | "Vorrunde", "Finalrunde", or custom |
| `standing` | string | Match identifier (e.g., "HF1", "P1", "Spiel 3") |
| `fieldId` | string? | Assigned field (null if unassigned) |
| `official` | TeamReference? | Officiating team (can be wired or manual) |
| `breakAfter` | number | Extra break time in minutes |
| `position` | { x, y } | Canvas position |

**Ports:**
| Port | Direction | Type | Description |
|------|-----------|------|-------------|
| `home` | input | team | Home team connection |
| `away` | input | team | Away team connection |
| `winner` | output | team | Winner of this game |
| `loser` | output | team | Loser of this game |

**Visual Representation:**
- Rectangular card with header showing standing/stage
- Two input ports on left (home/away)
- Two output ports on right (winner/loser)
- Field assignment badge
- Official team indicator

**Constraints:**
- Exactly 2 inputs required (home and away)
- Outputs are optional (not all games need to feed into subsequent games)
- Self-referential connections not allowed

#### 3. Field Node (Optional Global Element)

**Purpose:** Visual representation of a playing field for drag-drop field assignment.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | `'field'` | Node type discriminator |
| `name` | string | Field display name |
| `color` | string | Color for visual coding |

**Behavior:**
- Fields exist in a separate panel (not on main canvas)
- Games are assigned to fields via property panel, not wiring
- Field assignment shown as badge/indicator on game nodes

---

### Edge Types

#### 1. Team-to-Game Edge

**Purpose:** Connects a team node output to a game node input.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `source` | string | Team node ID |
| `sourceHandle` | `'output'` | Team node output port |
| `target` | string | Game node ID |
| `targetHandle` | `'home'` or `'away'` | Game input port |

**Visual:** Solid line from team to game input port.

#### 2. Game-to-Game Edge (Result Connection)

**Purpose:** Connects a game output (winner/loser) to another game input.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `source` | string | Source game node ID |
| `sourceHandle` | `'winner'` or `'loser'` | Output port |
| `target` | string | Target game node ID |
| `targetHandle` | `'home'` or `'away'` | Input port |

**Visual:** Solid or dashed line (based on winner/loser) with arrow indicating direction.

---

## User Stories

### US-001: Initialize Tournament with Teams

> **As a** league manager,
> **I want to** start by adding the participating teams,
> **So that** I can wire them into the tournament structure.

**Acceptance Criteria:**
```gherkin
Given I am on an empty designer canvas
When I click "Add Team"
Then a new team node appears on the canvas
And the node has a default label "Team X" (where X is sequential)
And I can configure the team reference type (groupTeam, standing, static)

Given I have added a team node
When I configure it as groupTeam with group=0, team=0
Then the node label updates to show "0_0"
And the node is ready to connect to game inputs
```

### US-002: Create a Game by Wiring Teams

> **As a** league manager,
> **I want to** connect two teams to create a game,
> **So that** the matchup is visually represented.

**Acceptance Criteria:**
```gherkin
Given I have two team nodes on the canvas
When I drag from Team A's output to a new game node's "home" input
And I drag from Team B's output to the same game node's "away" input
Then a game node is created with both inputs connected
And the game shows "Home: Team A" and "Away: Team B"

Given I drag from a team to an empty area of the canvas
When I release the drag
Then a new game node is created at that position
And the team is connected as the "home" team
And the "away" input remains empty (pending connection)
```

### US-003: Wire Game Outputs to Next Round

> **As a** league manager,
> **I want to** connect the winner of one game to another game,
> **So that** I can build tournament progression.

**Acceptance Criteria:**
```gherkin
Given I have Game 1 (HF1) with both team inputs connected
And I have created an empty Game 2 (P1)
When I drag from Game 1's "winner" output port
And I drop on Game 2's "home" input port
Then an edge is created connecting "Winner HF1" to P1's home team
And Game 2 displays "Home: Winner HF1"

Given Game 2 already has "home" connected
When I try to connect another output to "home"
Then the connection is rejected
And a visual indicator shows the port is occupied
```

### US-004: Create Loser Bracket Connections

> **As a** league manager,
> **I want to** wire losers of games to placement matches,
> **So that** I can create complete tournament brackets with 3rd place games.

**Acceptance Criteria:**
```gherkin
Given I have two semifinal games (HF1 and HF2)
And I have created a 3rd place game (P3)
When I connect HF1's "loser" output to P3's "home" input
And I connect HF2's "loser" output to P3's "away" input
Then P3 shows "Home: Loser HF1" and "Away: Loser HF2"
And the visual flow clearly shows losers going to P3
```

### US-005: Assign Fields to Games

> **As a** league manager,
> **I want to** assign games to playing fields,
> **So that** the schedule includes field information.

**Acceptance Criteria:**
```gherkin
Given I have created multiple game nodes
And I have added fields (Feld 1, Feld 2)
When I click on a game node to select it
Then a properties panel shows field assignment options
When I select "Feld 1" from the field dropdown
Then the game node displays a "Feld 1" badge
And the JSON export includes field=1 for this game

Given I have not assigned a field to a game
When I run validation
Then a warning is shown: "Game [standing] has no field assigned"
```

### US-006: Configure Game Properties

> **As a** league manager,
> **I want to** configure game details (stage, standing, official),
> **So that** the schedule has complete information.

**Acceptance Criteria:**
```gherkin
Given I have a game node selected
When I open the properties panel
Then I can edit:
  - Stage (dropdown: Vorrunde, Finalrunde, custom)
  - Standing (text input with auto-complete from existing)
  - Official (team reference selector)
  - Break after (number input)

Given I change the standing to "HF1"
When I save the properties
Then the game node header updates to show "HF1"
And any connections referencing this game show "Winner/Loser HF1"
```

### US-007: Validate Graph Structure

> **As a** league manager,
> **I want to** see validation errors in real-time,
> **So that** I can fix issues before exporting.

**Acceptance Criteria:**
```gherkin
Given I have a game with only one team input connected
When validation runs
Then an error is shown: "Game [standing] requires both home and away teams"
And the incomplete game node is highlighted with an error indicator

Given I have created a circular dependency (Game A winner -> Game B -> Game A)
When validation runs
Then an error is shown: "Circular dependency detected involving [list of games]"
And all involved nodes are highlighted

Given I have a game where the official is also playing
When validation runs
Then an error is shown: "Team X cannot officiate a game they are playing in"
```

### US-008: Export Schedule to JSON

> **As a** league manager,
> **I want to** export the graph as schedule JSON,
> **So that** it can be used by the existing backend.

**Acceptance Criteria:**
```gherkin
Given I have a complete tournament graph with:
  - All games have both teams connected
  - All games have fields assigned
  - No validation errors
When I click "Export"
Then a JSON file is downloaded
And the JSON matches the existing schedule_*.json format
And team references are generated from the graph connections

Given a game has "home" connected from "Team A node (group 0, team 0)"
When exported
Then the JSON home field is "0_0"

Given a game has "home" connected from "Game HF1's winner output"
When exported
Then the JSON home field is "Gewinner HF1"
```

### US-009: Import Existing Schedule JSON

> **As a** league manager,
> **I want to** import existing schedule JSON files,
> **So that** I can visualize and edit them as flowcharts.

**Acceptance Criteria:**
```gherkin
Given I have a schedule_4_final4_1.json file
When I import it
Then the designer creates:
  - Team nodes for all direct team references (0_0, 0_1, 0_2, 0_3)
  - Game nodes for each game entry
  - Edges connecting teams to their games
  - Edges connecting game winners/losers to subsequent games
And the layout is automatically arranged
And all properties (stage, standing, field, official) are preserved

Given the JSON contains invalid references
When I import it
Then warnings are shown for any unresolved references
And the import continues with best-effort parsing
```

### US-010: Quick Tournament Template

> **As a** league manager,
> **I want to** quickly generate a tournament structure,
> **So that** I don't have to wire everything manually.

**Acceptance Criteria:**
```gherkin
Given I click "Quick Setup"
When I select "4-Team Single Elimination"
Then the designer generates:
  - 4 team nodes
  - 2 semifinal game nodes (SF1, SF2)
  - 1 final game node (Final)
  - 1 third-place game node (3rd Place)
  - All appropriate connections
And I can modify the generated structure

Given I select "8-Team Double Elimination"
Then a full double-elimination bracket is generated
With winners bracket and losers bracket properly wired
```

---

## Functional Requirements

### FR-100: Canvas and Navigation

**[FR-101]** Infinite canvas with pan and zoom
- **Acceptance Criteria:** Canvas supports panning (drag background) and zooming (mouse wheel)
- **UI Behavior:** Zoom level indicator, mini-map for large graphs
- **Priority:** High

**[FR-102]** Node selection and multi-select
- **Acceptance Criteria:** Click to select single node, Ctrl+Click or drag-box for multi-select
- **UI Behavior:** Selected nodes have highlight border, properties panel shows common properties
- **Priority:** High

**[FR-103]** Keyboard shortcuts
- **Acceptance Criteria:** Delete selected nodes, Ctrl+C/V for copy/paste, Ctrl+Z/Y for undo/redo
- **Priority:** Medium

**[FR-104]** Canvas controls toolbar
- **Acceptance Criteria:** Zoom in/out buttons, fit-to-view button, reset view button
- **Priority:** Medium

### FR-200: Team Node Management

**[FR-201]** Add team nodes from toolbar
- **Acceptance Criteria:** "Add Team" button creates new team node at center or next available position
- **UI Behavior:** Node appears with default label, selection for editing
- **Priority:** High

**[FR-202]** Configure team reference
- **Acceptance Criteria:** Team nodes support all reference types: groupTeam, standing, static
- **UI Behavior:** Reference type selector in properties panel
- **Priority:** High

**[FR-203]** Bulk add teams
- **Acceptance Criteria:** "Add Teams" dialog to add multiple teams at once (e.g., "4 teams in Group 1")
- **UI Behavior:** Modal with team count and group selection
- **Priority:** Medium

**[FR-204]** Delete team nodes
- **Acceptance Criteria:** Deleting a team node removes all edges from that node
- **UI Behavior:** Confirmation if node has connections
- **Priority:** High

### FR-300: Game Node Management

**[FR-301]** Add game nodes from toolbar
- **Acceptance Criteria:** "Add Game" button creates new game node with empty inputs
- **UI Behavior:** Node appears with default standing, ready for connections
- **Priority:** High

**[FR-302]** Create game by dropping on canvas
- **Acceptance Criteria:** Dragging from a team/game output and dropping on empty canvas creates new game
- **UI Behavior:** New game created at drop position, connection established
- **Priority:** High

**[FR-303]** Configure game properties
- **Acceptance Criteria:** Stage, standing, field, official, breakAfter editable in properties panel
- **UI Behavior:** Properties panel updates on node selection
- **Priority:** High

**[FR-304]** Delete game nodes
- **Acceptance Criteria:** Deleting a game removes all edges to/from that game
- **UI Behavior:** Confirmation dialog showing affected connections
- **Priority:** High

**[FR-305]** Duplicate game nodes
- **Acceptance Criteria:** Duplicate creates new game with same properties but no connections
- **Priority:** Medium

### FR-400: Edge Management

**[FR-401]** Create edges by dragging
- **Acceptance Criteria:** Drag from output port to input port creates edge
- **UI Behavior:** Line follows cursor during drag, valid targets highlight
- **Priority:** High

**[FR-402]** Create edges to new nodes
- **Acceptance Criteria:** Drag to empty canvas creates new game node with connection
- **Priority:** High

**[FR-403]** Delete edges
- **Acceptance Criteria:** Click edge to select, Delete key or context menu to remove
- **UI Behavior:** Selected edge highlights, deletion is immediate
- **Priority:** High

**[FR-404]** Edge validation during drag
- **Acceptance Criteria:** Invalid targets (occupied ports, self-connection) are visually disabled
- **UI Behavior:** Invalid ports show red highlight, cursor indicates invalid drop
- **Priority:** High

**[FR-405]** Reconnect edges
- **Acceptance Criteria:** Drag edge endpoint to new target to reconnect
- **Priority:** Medium

### FR-500: Field Management

**[FR-501]** Add/remove fields globally
- **Acceptance Criteria:** Field panel allows adding/removing fields independent of games
- **UI Behavior:** Sidebar or header panel with field list
- **Priority:** High

**[FR-502]** Assign field to game
- **Acceptance Criteria:** Game properties panel has field dropdown
- **UI Behavior:** Field badge appears on game node when assigned
- **Priority:** High

**[FR-503]** Color-code by field
- **Acceptance Criteria:** Option to color game node borders by assigned field
- **UI Behavior:** Toggle in view options
- **Priority:** Low

**[FR-504]** Bulk assign fields
- **Acceptance Criteria:** Multi-select games and assign field to all
- **Priority:** Medium

### FR-600: Validation

**[FR-601]** Real-time validation
- **Acceptance Criteria:** Validation runs on every graph change
- **UI Behavior:** Error/warning count in status bar, validation panel shows details
- **Priority:** High

**[FR-602]** Incomplete game inputs
- **Acceptance Criteria:** Error if game has fewer than 2 team inputs connected
- **Priority:** High

**[FR-603]** Circular dependency detection
- **Acceptance Criteria:** Error if game output connects (directly or indirectly) back to its own input
- **Priority:** High

**[FR-604]** Official playing validation
- **Acceptance Criteria:** Error if official reference matches either team in the game
- **Priority:** High

**[FR-605]** Unassigned field warning
- **Acceptance Criteria:** Warning if game has no field assigned
- **Priority:** Medium

**[FR-606]** Duplicate standing warning
- **Acceptance Criteria:** Warning if multiple games have same standing name
- **Priority:** Medium

**[FR-607]** Orphaned team warning
- **Acceptance Criteria:** Warning if team node has no outgoing connections
- **Priority:** Low

### FR-700: Import/Export

**[FR-701]** Export to schedule JSON
- **Acceptance Criteria:** Generates JSON compatible with existing schedule_*.json format
- **UI Behavior:** Download button, filename suggestion
- **Priority:** High

**[FR-702]** Import from schedule JSON
- **Acceptance Criteria:** Parses JSON and creates corresponding graph structure
- **UI Behavior:** File picker, progress indicator, import warnings
- **Priority:** High

**[FR-703]** Export graph state
- **Acceptance Criteria:** Save complete graph state (nodes, edges, positions) for later editing
- **UI Behavior:** Separate from schedule JSON export
- **Priority:** Medium

**[FR-704]** Auto-layout on import
- **Acceptance Criteria:** Imported schedules are auto-arranged in a logical flow
- **Priority:** Medium

### FR-800: State Persistence

**[FR-801]** Auto-save to localStorage
- **Acceptance Criteria:** Graph state saved on every change
- **Priority:** Medium

**[FR-802]** Undo/Redo
- **Acceptance Criteria:** Full undo/redo history for all operations
- **Priority:** Medium

**[FR-803]** Clear workspace
- **Acceptance Criteria:** "Clear All" button with confirmation
- **Priority:** Medium

---

## Non-Functional Requirements

### NFR-100: Performance

**[NFR-101]** Canvas responsiveness
- **Metric:** Frame rate during pan/zoom and drag operations
- **Target:** 60 FPS with up to 100 nodes

**[NFR-102]** Edge rendering
- **Metric:** Edge drawing performance
- **Target:** Smooth rendering with up to 200 edges

**[NFR-103]** Validation speed
- **Metric:** Time to validate graph after change
- **Target:** < 50ms for graphs with 50+ nodes

### NFR-200: Usability

**[NFR-201]** Learning curve
- **Metric:** Time for new user to create 4-team bracket
- **Target:** < 5 minutes without training

**[NFR-202]** Visual clarity
- **Metric:** User can trace tournament flow visually
- **Target:** Clear path from teams to final game

**[NFR-203]** Mobile support (view-only)
- **Metric:** Read-only viewing on mobile devices
- **Target:** Pan/zoom works on touch, editing on desktop only

### NFR-300: Accessibility

**[NFR-301]** Keyboard navigation
- **Metric:** All operations achievable via keyboard
- **Target:** Tab navigation between nodes, keyboard shortcuts for actions

**[NFR-302]** Screen reader support
- **Metric:** Graph structure describable by screen reader
- **Target:** Node labels and connections announced

---

## Technical Specifications

### Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Canvas Library | **React Flow (xyflow)** | 12.x | Industry-standard node-based canvas |
| Frontend Framework | React | 19.x | Match existing project |
| Language | TypeScript | 5.x | Type safety |
| Build Tool | Vite | 7.x | Match existing project |
| State Management | Zustand or React Flow internal | - | Simple, performant |
| Testing | Vitest | 4.x | Match existing project |
| UI Components | react-bootstrap | 2.x | Match existing project |

### Why React Flow?

React Flow (xyflow) is the recommended library because:

1. **Mature and well-maintained** - Active development, large community
2. **Built for this use case** - Designed for node-based editors
3. **Performance optimized** - Handles hundreds of nodes smoothly
4. **Customizable nodes** - Full control over node appearance
5. **Edge handling** - Built-in edge routing, selection, reconnection
6. **TypeScript support** - First-class TypeScript definitions
7. **MIT License** - Compatible with project licensing

### Frontend Architecture

```
gameday_designer/
src/
  index.tsx                    # Entry point
  App.tsx                      # Main app container

  components/
    FlowCanvas.tsx             # React Flow wrapper with config
    nodes/
      TeamNode.tsx             # Team node component
      GameNode.tsx             # Game node component with ports
      index.ts                 # Node type registry
    edges/
      TeamEdge.tsx             # Team-to-game edge style
      ResultEdge.tsx           # Game-to-game edge style (winner/loser)
      index.ts                 # Edge type registry
    panels/
      PropertiesPanel.tsx      # Node property editor
      FieldsPanel.tsx          # Field management sidebar
      ValidationPanel.tsx      # Validation errors/warnings
    toolbar/
      CanvasToolbar.tsx        # Zoom, add nodes, import/export
      QuickSetup.tsx           # Template selection modal
    __tests__/

  hooks/
    useFlowState.ts            # Graph state management
    useValidation.ts           # Graph validation
    useLocalStorage.ts         # Auto-save
    useHistory.ts              # Undo/redo

  types/
    flow.ts                    # React Flow node/edge types
    designer.ts                # Existing types (enhanced)

  utils/
    exportJson.ts              # Graph -> schedule JSON
    importJson.ts              # Schedule JSON -> graph
    graphValidation.ts         # Graph validation rules
    layoutEngine.ts            # Auto-layout algorithms
    teamReference.ts           # Reference formatting (reuse existing)

  validation/
    rules.ts                   # Validation rule definitions
    engine.ts                  # Validation runner
    __tests__/
```

### TypeScript Types

```typescript
import { Node, Edge } from '@xyflow/react';

// Custom node data types

export interface TeamNodeData {
  type: 'team';
  reference: TeamReference;  // Reuse existing type
  label: string;
}

export interface GameNodeData {
  type: 'game';
  stage: string;
  standing: string;
  fieldId: string | null;
  official: TeamReference | null;
  breakAfter: number;
}

// Node union type for React Flow
export type FlowNode =
  | Node<TeamNodeData, 'team'>
  | Node<GameNodeData, 'game'>;

// Edge types
export interface TeamToGameEdge extends Edge {
  type: 'teamToGame';
  data: {
    targetPort: 'home' | 'away';
  };
}

export interface GameToGameEdge extends Edge {
  type: 'gameToGame';
  data: {
    sourcePort: 'winner' | 'loser';
    targetPort: 'home' | 'away';
  };
}

export type FlowEdge = TeamToGameEdge | GameToGameEdge;

// Flow state
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  fields: Field[];  // Reuse existing Field type (without gameSlots)
}

// Derived team reference from edge connection
export function deriveTeamReference(
  edge: FlowEdge,
  nodes: FlowNode[]
): TeamReference {
  const sourceNode = nodes.find(n => n.id === edge.source);

  if (!sourceNode) {
    return { type: 'static', name: 'INVALID' };
  }

  if (sourceNode.data.type === 'team') {
    // Direct team reference
    return sourceNode.data.reference;
  }

  if (sourceNode.data.type === 'game') {
    // Winner or loser reference
    const gameEdge = edge as GameToGameEdge;
    const matchName = sourceNode.data.standing;

    if (gameEdge.data.sourcePort === 'winner') {
      return { type: 'winner', matchName };
    } else {
      return { type: 'loser', matchName };
    }
  }

  return { type: 'static', name: 'UNKNOWN' };
}
```

### Graph to JSON Export

```typescript
import { FlowState, FlowNode, FlowEdge } from './types/flow';
import { ScheduleJson, GameJson } from './types/designer';
import { formatTeamReference } from './utils/teamReference';

export function exportToScheduleJson(state: FlowState): ScheduleJson[] {
  // Group games by field
  const gamesByField = new Map<string, FlowNode[]>();

  for (const node of state.nodes) {
    if (node.data.type === 'game') {
      const fieldId = node.data.fieldId ?? 'unassigned';
      if (!gamesByField.has(fieldId)) {
        gamesByField.set(fieldId, []);
      }
      gamesByField.get(fieldId)!.push(node);
    }
  }

  // Build schedule JSON
  const schedules: ScheduleJson[] = [];

  for (const [fieldId, games] of gamesByField) {
    if (fieldId === 'unassigned') continue;

    const field = state.fields.find(f => f.id === fieldId);
    const gameJsons: GameJson[] = [];

    for (const gameNode of games) {
      // Find edges connecting to this game's inputs
      const homeEdge = state.edges.find(
        e => e.target === gameNode.id &&
             (e.data as any).targetPort === 'home'
      );
      const awayEdge = state.edges.find(
        e => e.target === gameNode.id &&
             (e.data as any).targetPort === 'away'
      );

      const homeRef = homeEdge
        ? deriveTeamReference(homeEdge, state.nodes)
        : { type: 'static', name: 'TBD' } as TeamReference;
      const awayRef = awayEdge
        ? deriveTeamReference(awayEdge, state.nodes)
        : { type: 'static', name: 'TBD' } as TeamReference;

      gameJsons.push({
        stage: gameNode.data.stage,
        standing: gameNode.data.standing,
        home: formatTeamReference(homeRef),
        away: formatTeamReference(awayRef),
        official: gameNode.data.official
          ? formatTeamReference(gameNode.data.official)
          : '',
        ...(gameNode.data.breakAfter > 0 && {
          break_after: gameNode.data.breakAfter
        }),
      });
    }

    schedules.push({
      field: field?.name ?? fieldId,
      games: gameJsons,
    });
  }

  return schedules;
}
```

### JSON to Graph Import

```typescript
import { FlowState, FlowNode, FlowEdge } from './types/flow';
import { ScheduleJson } from './types/designer';
import { parseTeamReference } from './utils/teamReference';

export function importFromScheduleJson(
  json: ScheduleJson[]
): FlowState {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const fields: Field[] = [];

  // Track team nodes and game nodes for edge creation
  const teamNodeMap = new Map<string, string>(); // ref string -> node id
  const gameNodeMap = new Map<string, string>(); // standing -> node id

  // First pass: Create fields and game nodes
  for (const fieldSchedule of json) {
    // Create field
    const fieldId = `field-${fields.length}`;
    fields.push({
      id: fieldId,
      name: String(fieldSchedule.field),
      order: fields.length,
      gameSlots: [], // Not used in flowchart approach
    });

    // Create game nodes
    for (const game of fieldSchedule.games) {
      const gameId = `game-${nodes.length}`;
      gameNodeMap.set(game.standing, gameId);

      nodes.push({
        id: gameId,
        type: 'game',
        position: { x: 0, y: 0 }, // Will be auto-layouted
        data: {
          type: 'game',
          stage: game.stage,
          standing: game.standing,
          fieldId: fieldId,
          official: game.official ? parseTeamReference(game.official) : null,
          breakAfter: game.break_after ?? 0,
        },
      });

      // Track direct team references for team node creation
      for (const ref of [game.home, game.away]) {
        const parsed = parseTeamReference(ref);
        if (parsed.type !== 'winner' && parsed.type !== 'loser') {
          if (!teamNodeMap.has(ref)) {
            const teamId = `team-${nodes.length}`;
            teamNodeMap.set(ref, teamId);
            nodes.push({
              id: teamId,
              type: 'team',
              position: { x: 0, y: 0 },
              data: {
                type: 'team',
                reference: parsed,
                label: ref,
              },
            });
          }
        }
      }
    }
  }

  // Second pass: Create edges
  for (const fieldSchedule of json) {
    for (const game of fieldSchedule.games) {
      const gameId = gameNodeMap.get(game.standing)!;

      for (const [refStr, port] of [[game.home, 'home'], [game.away, 'away']] as const) {
        const parsed = parseTeamReference(refStr);

        if (parsed.type === 'winner' || parsed.type === 'loser') {
          // Game-to-game edge
          const sourceGameId = gameNodeMap.get(parsed.matchName);
          if (sourceGameId) {
            edges.push({
              id: `edge-${edges.length}`,
              source: sourceGameId,
              target: gameId,
              type: 'gameToGame',
              sourceHandle: parsed.type,
              targetHandle: port,
              data: {
                sourcePort: parsed.type,
                targetPort: port,
              },
            });
          }
        } else {
          // Team-to-game edge
          const teamNodeId = teamNodeMap.get(refStr);
          if (teamNodeId) {
            edges.push({
              id: `edge-${edges.length}`,
              source: teamNodeId,
              target: gameId,
              type: 'teamToGame',
              sourceHandle: 'output',
              targetHandle: port,
              data: {
                targetPort: port,
              },
            });
          }
        }
      }
    }
  }

  // Apply auto-layout
  const layoutedState = applyAutoLayout({ nodes, edges, fields });

  return layoutedState;
}
```

### Game Node Component

```tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge, Card } from 'react-bootstrap';
import { GameNodeData } from '../../types/flow';

const GameNode = memo(({ data, selected }: NodeProps<GameNodeData>) => {
  const { stage, standing, fieldId, official } = data;

  return (
    <Card
      className={`game-node ${selected ? 'selected' : ''}`}
      style={{ width: 200 }}
    >
      {/* Input handles (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="home"
        style={{ top: '35%' }}
        className="handle-home"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="away"
        style={{ top: '65%' }}
        className="handle-away"
      />

      {/* Card content */}
      <Card.Header className="py-1 px-2 d-flex justify-content-between">
        <span className="fw-bold">{standing || 'New Game'}</span>
        {fieldId && <Badge bg="secondary" className="ms-2">{fieldId}</Badge>}
      </Card.Header>
      <Card.Body className="py-2 px-2">
        <div className="small text-muted">{stage}</div>
        <div className="d-flex justify-content-between mt-1">
          <span className="small">Home</span>
          <span className="small">Away</span>
        </div>
        {official && (
          <div className="small text-muted mt-1">
            Official: {formatTeamReference(official)}
          </div>
        )}
      </Card.Body>

      {/* Output handles (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="winner"
        style={{ top: '35%' }}
        className="handle-winner"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="loser"
        style={{ top: '65%' }}
        className="handle-loser"
      />
    </Card>
  );
});

GameNode.displayName = 'GameNode';
export default GameNode;
```

---

## MVP Scope Definition

### In Scope (MVP)

| Feature | Priority | Description |
|---------|----------|-------------|
| **React Flow canvas** | High | Infinite canvas with pan/zoom |
| **Team nodes** | High | Add, configure, delete team nodes |
| **Game nodes** | High | Add, configure, delete game nodes with ports |
| **Edge creation** | High | Connect teams to games, games to games |
| **Properties panel** | High | Edit selected node properties |
| **Field management** | High | Add/remove fields, assign to games |
| **Real-time validation** | High | Graph validation with error highlighting |
| **JSON export** | High | Export to schedule_*.json format |
| **JSON import** | High | Import existing schedule JSON |
| **Auto-layout** | Medium | Basic auto-arrangement of imported graphs |
| **LocalStorage save** | Medium | Preserve work between sessions |
| **Undo/Redo** | Medium | History of graph changes |

### Out of Scope (MVP)

| Feature | Reason |
|---------|--------|
| Quick Setup templates | Post-MVP convenience feature |
| Backend persistence | MVP is client-side only |
| Collaborative editing | Future feature |
| Advanced layout algorithms | Basic layout sufficient for MVP |
| Mobile editing | Desktop-first, view-only on mobile |
| Officials auto-assignment | Complex feature, manual assignment for MVP |

### Estimated MVP Development Time

| Phase | Duration | Description |
|-------|----------|-------------|
| React Flow setup | 2 days | Initialize project, configure React Flow |
| Custom nodes | 3 days | TeamNode, GameNode with handles |
| Edge handling | 2 days | Edge types, connection validation |
| Properties panel | 2 days | Node configuration UI |
| Field management | 1 day | Field panel and assignment |
| Validation engine | 2 days | Graph validation rules |
| Import/Export | 3 days | JSON conversion both directions |
| State management | 1 day | LocalStorage, undo/redo |
| Testing | 3 days | Unit and integration tests |
| Polish | 1 day | UI refinement, edge cases |

**Total: ~3 weeks**

---

## Migration Strategy

### From Slot-Based to Flowchart

The existing slot-based implementation can coexist with the new flowchart approach during transition:

1. **Phase 1:** Build flowchart designer as separate route/view
2. **Phase 2:** Support same JSON format (both can export/import same schedules)
3. **Phase 3:** Deprecate slot-based approach once flowchart is proven
4. **Phase 4:** Remove slot-based code

### Backward Compatibility

Both approaches produce identical JSON output, ensuring:
- Existing schedules can be imported into flowchart designer
- Schedules created in flowchart can be used by existing backend
- No changes required to `schedule_manager.py`

---

## Edge Cases and Error Handling

### Edge Case 1: Disconnected game nodes

**Scenario:** User creates game node but doesn't connect inputs
**Handling:** Validation warning "Game [standing] has no team connections"
**UI:** Warning indicator on node, cannot export with errors

### Edge Case 2: Partial connections

**Scenario:** Game has only home connected, away is empty
**Handling:** Validation error "Game [standing] requires both home and away teams"
**UI:** Error indicator on away handle

### Edge Case 3: Import with unresolvable references

**Scenario:** JSON references "Gewinner HF1" but no HF1 game exists in JSON
**Handling:** Create game node with missing connection, show import warning
**UI:** Warning panel after import showing unresolved references

### Edge Case 4: Circular dependencies in graph

**Scenario:** User connects Game A winner to Game B, then Game B winner to Game A
**Handling:** Connection rejected during drag, or error shown immediately after
**UI:** Invalid drop target, toast message explaining why

### Edge Case 5: Deleting node with connections

**Scenario:** User deletes team node that connects to 3 games
**Handling:** Show confirmation "This will disconnect 3 games. Continue?"
**UI:** Confirmation modal listing affected games

### Edge Case 6: Same standing name on multiple games

**Scenario:** User creates two games both named "HF1"
**Handling:** Validation warning "Duplicate standing: HF1 used by 2 games"
**UI:** Warning on both game nodes

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bracket creation time | < 3 min for 4-team single elimination | User testing |
| Learning curve | < 5 min to understand wiring concept | New user observation |
| Import success rate | 100% of existing JSON files | Automated testing |
| Export compatibility | 100% compatible with backend | Integration testing |
| User preference | 80%+ prefer flowchart over slots | User survey |
| Validation accuracy | 100% of invalid graphs detected | Unit tests |

---

## Appendix A: Example Tournament Flows

### 4-Team Single Elimination

```
[Team A] ----+
             +-----> [SF1] ----winner----+
[Team B] ----+                           |
                              loser----+ |
                                       | |
[Team C] ----+                         | +-----> [Final]
             +-----> [SF2] ----winner--+
[Team D] ----+             |
                    loser--+-----> [3rd Place]
                           |
               <---loser---+
```

### 8-Team Group Stage + Playoffs

```
Group 1:
[0_0] <--+
[0_1] <--+---> [Group 1 Games] ---> Standings (P1, P2, P3, P4)
[0_2] <--+
[0_3] <--+

Group 2:
[1_0] <--+
[1_1] <--+---> [Group 2 Games] ---> Standings (P1, P2, P3, P4)
[1_2] <--+
[1_3] <--+

Playoffs:
[P1 Gruppe 1] ----+
                  +-----> [HF1] ----winner----+
[P2 Gruppe 2] ----+                           |
                                              +-----> [Final]
[P1 Gruppe 2] ----+                           |
                  +-----> [HF2] ----winner----+
[P2 Gruppe 1] ----+
```

---

## Appendix B: Visual Design Mockups

### Canvas Layout

```
+-----------------------------------------------------------------------+
|  [Add Team] [Add Game] [Import] [Export] [Undo] [Redo]   [Zoom: 100%] |
+-----------------------------------------------------------------------+
|                                                      |                |
|     +--------+                                       | PROPERTIES     |
|     | Team A |--+                                    |                |
|     +--------+  |    +----------------+              | Stage: [    ]  |
|                 +--->| HF1            |--winner--+   | Standing: [  ] |
|     +--------+  |    |                |          |   | Field: [    ]  |
|     | Team B |--+    | Home    Winner |-loser-+  |   | Official: [  ] |
|     +--------+       | Away    Loser  |       |  |   |                |
|                 +--->+----------------+       |  |   +----------------+
|     +--------+  |                             |  |   |                |
|     | Team C |--+    +----------------+       |  +-->| P1             |
|     +--------+  |    | HF2            |--win--+      |                |
|                 +--->|                |              +----------------+
|     +--------+  |    | Home    Winner |              |                |
|     | Team D |--+    | Away    Loser  |--loser--+--->| P3             |
|     +--------+       +----------------+         |    |                |
|                                            <----+    +----------------+
|                                                      |                |
+------------------------------------------------------+ VALIDATION    |
|  [Feld 1] [Feld 2] [+ Add Field]                     | 0 Errors      |
+------------------------------------------------------| 1 Warning     |
                                                       +----------------+
```

### Node Appearance

```
Team Node:                    Game Node:
+------------+               +----------------------+
|  [0_0]     |               |  HF1        [Feld 1] |
|  Team A    |--O            O--| Home       Winner |--O
+------------+               |--| Away       Loser  |--O
                             +----------------------+
```

---

## References

### Existing Files

| File | Purpose |
|------|---------|
| `/home/cda/dev/leaguesphere/gameday_designer/src/types/designer.ts` | Existing type definitions (reuse) |
| `/home/cda/dev/leaguesphere/gameday_designer/src/utils/teamReference.ts` | Reference formatting (reuse) |
| `/home/cda/dev/leaguesphere/gamedays/management/schedules/*.json` | Existing schedule templates |
| `/home/cda/dev/leaguesphere/feature-dev/gameday_designer/requirements.md` | Previous slot-based requirements |

### External Resources

| Resource | URL |
|----------|-----|
| React Flow Documentation | https://reactflow.dev/docs |
| React Flow Examples | https://reactflow.dev/examples |
| xyflow GitHub | https://github.com/xyflow/xyflow |
