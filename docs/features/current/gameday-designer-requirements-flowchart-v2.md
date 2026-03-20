# Requirements Specification: Gameday Designer - Flowchart v2 (Container Model)

## Document Status

| Property | Value |
|----------|-------|
| Version | 2.0.0 |
| Status | Approved |
| Created | 2025-12-02 |
| Paradigm | **Graph/flowchart with Field and Stage containers** |
| Based On | requirements-flowchart.md v1.0.0 |

---

## Executive Summary

This document specifies **version 2** of the Gameday Designer flowchart approach, introducing **Fields and Stages as visual containers**. Building on the node-wiring paradigm from v1, this version adds:

1. **Fields as top-level containers** - Draggable groups that contain all stages and games for a playing field
2. **Stages as nested containers** - Visual groupings within fields (Vorrunde, Finalrunde, etc.)
3. **Strict containment model** - Games must be inside a Stage, which must be inside a Field
4. **Cross-container wiring** - Edges naturally cross container boundaries to connect games across stages and fields
5. **Auto-sizing containers** - Containers expand automatically to fit their children

This approach provides:
- **Visual organization** - Games grouped by field and stage
- **Intuitive drag-drop** - Move a field and all its contents together
- **Clear tournament phases** - Vorrunde vs Finalrunde visually separated
- **Flexible wiring** - Game dependencies cross containers seamlessly

---

## Visual Model (Approved Design)

```
+=================== CANVAS ===================+
|                                              |
|  +-------------- Field 1 ---------------+    |
|  |  +------ Vorrunde ------+            |    |
|  |  | [Team A]--+          |            |    |
|  |  |           +-->[Spiel 1]--winner--+|    |
|  |  | [Team B]--+          |           ||    |
|  |  |                      |           ||    |
|  |  | [Team C]--+          |           ||    |
|  |  |           +-->[Spiel 2]--winner--+|    |
|  |  | [Team D]--+          |           ||    |
|  |  +------------------------+         ||    |
|  |                                     ||    |
|  |  +------ Finalrunde ----+           ||    |
|  |  |                      |           ||    |
|  |  |         [Final: P1] <------------+|    |
|  |  +------------------------+          |    |
|  +---------------------------------------+   |
|                                              |
|  +-------------- Field 2 ---------------+    |
|  |  +------ Vorrunde ------+            |    |
|  |  | ...                  |            |    |
|  |  +------------------------+          |    |
|  +---------------------------------------+   |
|                                              |
+==============================================+
```

**Key Visual Elements:**
- **Canvas** - Infinite workspace containing all elements
- **Field containers** - Top-level groups with distinct borders
- **Stage containers** - Nested within fields, separated by stage type
- **Team nodes** - Can be inside stages or free-floating on canvas
- **Game nodes** - Always inside a stage container
- **Edges** - Connect nodes across container boundaries

---

## Design Decisions (Approved)

### Decision 1: Hierarchy
**Chosen:** Fields contain Stages (nested containers)
- Fields are the top-level organizational unit
- Stages are nested inside fields
- Games are placed inside stages
- Clear visual hierarchy: Canvas > Field > Stage > Game

### Decision 2: Game Placement
**Chosen:** Games stay in one field only (strict containment)
- Each game belongs to exactly one field
- Moving a game between fields requires explicit reassignment
- Prevents confusion about where games are scheduled

### Decision 3: Container Sizing
**Chosen:** Auto-sized based on content
- Containers expand automatically when children are added
- No manual resizing required
- Minimum size ensures empty containers remain visible

### Decision 4: Edge Behavior
**Chosen:** Wires cross container boundaries naturally
- Edges route between nodes regardless of container hierarchy
- Visual representation shows tournament flow across stages
- No special handling needed for cross-container connections

### Decision 5: Stage Representation
**Chosen:** Explicit visual containers within fields
- Stages are visible nested containers with labels
- Games are placed inside stage containers
- Stages can be reordered within a field

---

## Node Types

### 1. FieldNode (Container)

**Purpose:** Top-level container representing a playing field. Contains Stage containers.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (e.g., "field-1") |
| `type` | `'field'` | Node type discriminator |
| `data.name` | string | Display name (e.g., "Feld 1", "Main Field") |
| `data.order` | number | Display order for sorting fields |
| `data.color` | string? | Optional color for visual coding |
| `position` | { x, y } | Canvas position (top-left corner) |
| `style` | { width, height } | Computed dimensions (auto-sized) |

**React Flow Configuration:**
```typescript
{
  type: 'field',
  dragHandle: '.field-drag-handle',  // Specific drag handle
  selectable: true,
  deletable: true,
  // Group node properties
  style: { width: number, height: number },
}
```

**Visual Representation:**
- Distinct border with header showing field name
- Drag handle in header area
- Contains Stage containers as children
- Color-coded border (optional)
- Expand/collapse control (optional, post-MVP)

**Constraints:**
- Field nodes are **parent nodes only** - they contain stages, not edges
- Deleting a field deletes all contained stages and games
- Dragging a field moves all children together

### 2. StageNode (Container)

**Purpose:** Nested container within a Field representing a tournament stage (Vorrunde, Finalrunde, etc.).

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (e.g., "stage-1") |
| `type` | `'stage'` | Node type discriminator |
| `parentId` | string | Parent field node ID (required) |
| `data.name` | string | Display name (e.g., "Vorrunde", "Finalrunde") |
| `data.stageType` | StageType | Stage category for ordering |
| `data.order` | number | Order within parent field |
| `position` | { x, y } | Position relative to parent |
| `style` | { width, height } | Computed dimensions (auto-sized) |
| `extent` | 'parent' | Constrain to parent bounds |

**Stage Types:**
```typescript
type StageType = 'vorrunde' | 'finalrunde' | 'platzierung' | 'custom';
```

**React Flow Configuration:**
```typescript
{
  type: 'stage',
  parentId: 'field-1',           // Required: links to parent field
  extent: 'parent',              // Constrain to parent bounds
  dragHandle: '.stage-drag-handle',
  expandParent: true,            // Auto-expand parent when needed
}
```

**Visual Representation:**
- Lighter border than fields
- Header showing stage name
- Contains Game nodes as children
- Visual indicator for stage type (icon or color)

**Constraints:**
- Stage nodes **must** have a `parentId` pointing to a Field
- Deleting a stage deletes all contained games
- Stages are ordered within their parent field
- Default order: Vorrunde < Platzierung < Finalrunde < Custom

### 3. TeamNode (Source Node)

**Purpose:** Represents a participating team as an input to the tournament structure.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (e.g., "team-1") |
| `type` | `'team'` | Node type discriminator |
| `parentId` | string? | Optional parent stage ID |
| `data.reference` | TeamReference | The team reference (groupTeam, standing, static) |
| `data.label` | string | Display label |
| `position` | { x, y } | Canvas or relative position |
| `extent` | 'parent'? | Constrain to parent if has parentId |

**Visual Representation:**
- Rounded rectangle or pill shape
- Team name/reference displayed
- Single output port (right side)
- Color-coded by group (optional)

**Constraints:**
- Team nodes are **source-only** - they have no inputs
- Team nodes can connect to multiple game inputs
- Teams **can** be inside a Stage or free-floating on canvas
- Free-floating teams can connect to games in any stage/field

### 4. GameNode (Match Node)

**Purpose:** Represents a single match with two team inputs and winner/loser outputs.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (e.g., "game-1") |
| `type` | `'game'` | Node type discriminator |
| `parentId` | string | **Required:** Parent stage ID |
| `data.standing` | string | Match identifier (e.g., "HF1", "P1", "Spiel 3") |
| `data.official` | TeamReference? | Officiating team (optional) |
| `data.breakAfter` | number | Extra break time in minutes |
| `position` | { x, y } | Position relative to parent stage |
| `extent` | 'parent' | Constrain to parent bounds |

**Ports:**
| Port | Direction | Type | Description |
|------|-----------|------|-------------|
| `home` | input | team | Home team connection |
| `away` | input | team | Away team connection |
| `winner` | output | team | Winner of this game |
| `loser` | output | team | Loser of this game |

**React Flow Configuration:**
```typescript
{
  type: 'game',
  parentId: 'stage-1',           // Required: links to parent stage
  extent: 'parent',              // Constrain to parent bounds
  expandParent: true,            // Auto-expand parent when needed
}
```

**Visual Representation:**
- Rectangular card with standing in header
- Two input ports on left (home/away)
- Two output ports on right (winner/loser)
- Official team indicator (if assigned)
- Visual feedback for validation state

**Constraints:**
- Game nodes **must** have a `parentId` pointing to a Stage
- Exactly 2 inputs required (home and away) for valid export
- Outputs are optional (final games may not have connections)
- Self-referential connections not allowed
- Derived field and stage from parent hierarchy

---

## Container Behavior

### Parent-Child Relationships

**Using React Flow `parentId`:**
```typescript
// Field contains Stages
const stageNode = {
  id: 'stage-1',
  type: 'stage',
  parentId: 'field-1',  // Links to parent
  extent: 'parent',     // Constrained to parent bounds
  position: { x: 20, y: 60 },  // Relative to parent
  // ...
};

// Stage contains Games
const gameNode = {
  id: 'game-1',
  type: 'game',
  parentId: 'stage-1',  // Links to parent stage
  extent: 'parent',     // Constrained to parent bounds
  position: { x: 30, y: 40 },  // Relative to parent
  // ...
};
```

### Container Sizing

**Auto-expand behavior:**
```typescript
// When a child is added or moved, parent container auto-expands
{
  expandParent: true,  // React Flow option
}

// Minimum container sizes
const MIN_FIELD_WIDTH = 300;
const MIN_FIELD_HEIGHT = 200;
const MIN_STAGE_WIDTH = 250;
const MIN_STAGE_HEIGHT = 100;

// Container padding for child placement
const CONTAINER_PADDING = 20;
const STAGE_HEADER_HEIGHT = 40;
const FIELD_HEADER_HEIGHT = 50;
```

**Auto-sizing algorithm:**
1. Calculate bounding box of all children
2. Add padding around bounding box
3. Add header height for container label
4. Apply minimum size constraints
5. Update container `style.width` and `style.height`

### Drag Behavior

**Field dragging:**
- Drag handle in field header
- Moving a field moves all contained stages and games
- Child positions remain relative to parent

**Stage dragging:**
- Drag handle in stage header
- Stages can be reordered within their parent field
- Stages cannot be dragged outside their parent field (`extent: 'parent'`)
- Moving a stage moves all contained games

**Game/Team dragging:**
- Direct node dragging (no special handle needed)
- Games cannot be dragged outside their parent stage
- Teams with parentId cannot be dragged outside their parent
- Free-floating teams can be positioned anywhere on canvas

---

## Node Placement Rules

### Hierarchy Requirements

| Node Type | Parent | Constraint |
|-----------|--------|------------|
| FieldNode | None (canvas) | Free placement on canvas |
| StageNode | FieldNode (required) | Must be inside a field |
| GameNode | StageNode (required) | Must be inside a stage |
| TeamNode | StageNode (optional) | Can be inside stage or free-floating |

### Auto-creation Logic

**Creating a game without existing containers:**
```gherkin
Given there are no Field or Stage containers on the canvas
When I click "Add Game" or drag to create a game
Then a new Field container is created at the target position
And a new Stage container (Vorrunde) is created inside the Field
And the Game node is created inside the Stage
And the new containers are selected for easy renaming
```

**Creating a game with existing field but no stage:**
```gherkin
Given there is a Field container but no Stage inside it
When I create a game inside that Field
Then a new Stage container (Vorrunde) is created inside the Field
And the Game node is created inside the new Stage
```

**Creating a game inside an existing stage:**
```gherkin
Given there is a Stage container
When I create a game inside that Stage
Then the Game node is created inside the Stage
And the Stage auto-expands to fit the new game
And the parent Field auto-expands if needed
```

### Placement Validation

**Valid placements:**
- Field on canvas: Always valid
- Stage inside Field: Always valid
- Game inside Stage: Always valid
- Team inside Stage: Valid
- Team on canvas: Valid (free-floating)

**Invalid placements (prevented):**
- Game on canvas (not in a stage)
- Game directly in Field (not in a stage)
- Stage on canvas (not in a field)
- Stage inside another Stage

---

## Edge Types and Behavior

### Edge Type Definitions

#### 1. TeamToGameEdge

**Purpose:** Connects a team node output to a game node input.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | `'teamToGame'` | Edge type discriminator |
| `source` | string | Team node ID |
| `sourceHandle` | `'output'` | Team node output port |
| `target` | string | Game node ID |
| `targetHandle` | `'home'` or `'away'` | Game input port |

**Visual:** Solid line from team to game input port.

#### 2. GameToGameEdge

**Purpose:** Connects a game output (winner/loser) to another game input.

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | `'gameToGame'` | Edge type discriminator |
| `source` | string | Source game node ID |
| `sourceHandle` | `'winner'` or `'loser'` | Output port |
| `target` | string | Target game node ID |
| `targetHandle` | `'home'` or `'away'` | Input port |

**Visual:** Solid line with arrow. Optional: dashed line for loser connections.

### Cross-Container Edge Behavior

**Edges crossing containers:**
```
+-------------- Field 1 ---------------+
|  +------ Vorrunde ------+            |
|  | [Game SF1]---winner--+------------+---+
|  +------------------------+          |   |
|                                      |   |
|  +------ Finalrunde ----+            |   |
|  |                      |            |   |
|  |  [Game Final] <------+------------+---+
|  +------------------------+          |
+---------------------------------------+
```

**Implementation:**
- React Flow handles edge routing automatically
- Edges render above container borders
- No special z-index handling needed
- Edge paths may curve around container boundaries

**Edge validation (unchanged from v1):**
- Cannot create cycles (Game A -> Game B -> Game A)
- Each input port can only have one connection
- Self-referential connections not allowed

---

## Toolbar Updates

### Current Toolbar (v1)
```
[Add Team] [Add Game] [Import] [Export] [Undo] [Redo]
```

### Updated Toolbar (v2)
```
[Add Field] [Add Stage] [Add Team] [Add Game] | [Import] [Export] | [Undo] [Redo]
```

### Toolbar Button Specifications

#### Add Field
- **Icon:** Rectangle with border
- **Behavior:** Creates new Field container at canvas center (or next available position)
- **Default name:** "Feld N" where N is the next available number
- **Keyboard shortcut:** F

#### Add Stage
- **Icon:** Nested rectangle
- **Behavior:**
  - If a Field is selected: Creates Stage inside selected Field
  - If no Field selected: Creates new Field with Stage inside
- **Default name:** "Vorrunde" (first stage), "Finalrunde" (subsequent)
- **Keyboard shortcut:** S

#### Add Team (unchanged)
- **Icon:** Person icon
- **Behavior:** Creates Team node at canvas center or in selected Stage
- **Default label:** "Team N"
- **Keyboard shortcut:** T

#### Add Game (unchanged)
- **Icon:** Game/match icon
- **Behavior:**
  - If a Stage is selected: Creates Game inside selected Stage
  - If a Field is selected: Creates Stage and Game inside Field
  - If nothing selected: Creates Field, Stage, and Game
- **Default standing:** "Spiel N"
- **Keyboard shortcut:** G

---

## Properties Panel Updates

### Field Selected

**Field Properties Panel:**
```
+---------------------------+
| FIELD PROPERTIES          |
+---------------------------+
| Name:                     |
| [Feld 1            ]      |
|                           |
| Color: [#4a90d9  ] [pick] |
|                           |
| Stages: (drag to reorder) |
| [===] Vorrunde            |
| [===] Finalrunde          |
|                           |
| [Delete Field]            |
+---------------------------+
```

**Field Properties:**
| Property | Control | Description |
|----------|---------|-------------|
| Name | Text input | Editable field display name |
| Color | Color picker | Optional border color |
| Stages | Drag-reorder list | Reorder stages within field |

### Stage Selected

**Stage Properties Panel:**
```
+---------------------------+
| STAGE PROPERTIES          |
+---------------------------+
| Name:                     |
| [Vorrunde          ]      |
|                           |
| Type:                     |
| (*) Vorrunde              |
| ( ) Finalrunde            |
| ( ) Platzierung           |
| ( ) Custom                |
|                           |
| Parent Field: Feld 1      |
|                           |
| [Delete Stage]            |
+---------------------------+
```

**Stage Properties:**
| Property | Control | Description |
|----------|---------|-------------|
| Name | Text input | Editable stage display name |
| Type | Radio buttons | Stage category for ordering |
| Parent Field | Read-only | Shows containing field |

### Team Selected (unchanged from v1)

**Team Properties Panel:**
```
+---------------------------+
| TEAM PROPERTIES           |
+---------------------------+
| Reference Type:           |
| [Group/Team       v]      |
|                           |
| Group: [0 v]              |
| Team:  [0 v]              |
|                           |
| Label: 0_0                |
|                           |
| [Delete Team]             |
+---------------------------+
```

### Game Selected (unchanged from v1)

**Game Properties Panel:**
```
+---------------------------+
| GAME PROPERTIES           |
+---------------------------+
| Standing:                 |
| [HF1               ]      |
|                           |
| Official:                 |
| [Type: Static      v]     |
| [Name:             ]      |
|                           |
| Break After: [0   ] min   |
|                           |
| --- Derived Info ---      |
| Field: Feld 1             |
| Stage: Vorrunde           |
|                           |
| [Delete Game]             |
+---------------------------+
```

**Note:** Field and Stage are derived from parent hierarchy, not editable directly on the game. To move a game to a different field/stage, drag the node.

---

## JSON Export

### Export Logic

**Deriving field and stage from parent hierarchy:**
```typescript
function exportToScheduleJson(state: FlowState): ScheduleJson[] {
  // Group games by field (using parentId chain)
  const gamesByField = new Map<string, { field: FieldNode; games: GameNode[] }>();

  for (const node of state.nodes) {
    if (node.type === 'game') {
      // Find parent stage
      const stage = state.nodes.find(n => n.id === node.parentId);
      if (!stage || stage.type !== 'stage') continue;

      // Find parent field
      const field = state.nodes.find(n => n.id === stage.parentId);
      if (!field || field.type !== 'field') continue;

      if (!gamesByField.has(field.id)) {
        gamesByField.set(field.id, { field, games: [] });
      }
      gamesByField.get(field.id)!.games.push(node);
    }
  }

  // Build schedule JSON
  const schedules: ScheduleJson[] = [];

  for (const [fieldId, { field, games }] of gamesByField) {
    // Sort games by stage order, then by position within stage
    const sortedGames = sortGamesByStageAndPosition(games, state.nodes);

    const gameJsons: GameJson[] = sortedGames.map(gameNode => {
      const stage = state.nodes.find(n => n.id === gameNode.parentId);

      // Derive team references from edges
      const homeRef = deriveTeamReference('home', gameNode.id, state);
      const awayRef = deriveTeamReference('away', gameNode.id, state);

      return {
        stage: stage?.data.name ?? 'Unknown',
        standing: gameNode.data.standing,
        home: formatTeamReference(homeRef),
        away: formatTeamReference(awayRef),
        official: gameNode.data.official
          ? formatTeamReference(gameNode.data.official)
          : '',
        ...(gameNode.data.breakAfter > 0 && {
          break_after: gameNode.data.breakAfter
        }),
      };
    });

    schedules.push({
      field: field.data.name,
      games: gameJsons,
    });
  }

  return schedules;
}
```

### Export Format (unchanged)

**Output matches existing schedule_*.json format:**
```json
[
  {
    "field": "Feld 1",
    "games": [
      {
        "stage": "Vorrunde",
        "standing": "Spiel 1",
        "home": "0_0",
        "away": "0_1",
        "official": "0_2"
      },
      {
        "stage": "Vorrunde",
        "standing": "Spiel 2",
        "home": "0_2",
        "away": "0_3",
        "official": "0_0"
      },
      {
        "stage": "Finalrunde",
        "standing": "P1",
        "home": "Gewinner Spiel 1",
        "away": "Gewinner Spiel 2",
        "official": "Verlierer Spiel 1"
      }
    ]
  }
]
```

---

## JSON Import

### Import Logic

**Creating container hierarchy from JSON:**
```typescript
function importFromScheduleJson(json: ScheduleJson[]): FlowState {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Track created nodes for edge creation
  const teamNodeMap = new Map<string, string>();
  const gameNodeMap = new Map<string, string>();

  // Layout positioning
  let fieldX = 50;
  const FIELD_SPACING = 400;

  for (const fieldSchedule of json) {
    // Create Field container
    const fieldId = `field-${nodes.length}`;
    const fieldNode: FieldNode = {
      id: fieldId,
      type: 'field',
      position: { x: fieldX, y: 50 },
      data: {
        name: String(fieldSchedule.field),
        order: nodes.filter(n => n.type === 'field').length,
      },
      style: { width: 350, height: 400 },  // Will be auto-sized
    };
    nodes.push(fieldNode);

    // Group games by stage
    const gamesByStage = groupBy(fieldSchedule.games, g => g.stage);
    let stageY = FIELD_HEADER_HEIGHT + CONTAINER_PADDING;

    for (const [stageName, stageGames] of Object.entries(gamesByStage)) {
      // Create Stage container
      const stageId = `stage-${nodes.length}`;
      const stageNode: StageNode = {
        id: stageId,
        type: 'stage',
        parentId: fieldId,
        position: { x: CONTAINER_PADDING, y: stageY },
        data: {
          name: stageName,
          stageType: inferStageType(stageName),
          order: nodes.filter(n => n.type === 'stage' && n.parentId === fieldId).length,
        },
        style: { width: 300, height: 150 },  // Will be auto-sized
        extent: 'parent',
        expandParent: true,
      };
      nodes.push(stageNode);

      // Create Game nodes
      let gameY = STAGE_HEADER_HEIGHT + CONTAINER_PADDING;
      for (const game of stageGames) {
        const gameId = `game-${nodes.length}`;
        gameNodeMap.set(game.standing, gameId);

        const gameNode: GameNode = {
          id: gameId,
          type: 'game',
          parentId: stageId,
          position: { x: CONTAINER_PADDING, y: gameY },
          data: {
            standing: game.standing,
            official: game.official ? parseTeamReference(game.official) : null,
            breakAfter: game.break_after ?? 0,
          },
          extent: 'parent',
          expandParent: true,
        };
        nodes.push(gameNode);

        // Track team references for team node creation
        createTeamNodesIfNeeded(game.home, teamNodeMap, nodes);
        createTeamNodesIfNeeded(game.away, teamNodeMap, nodes);

        gameY += GAME_NODE_HEIGHT + CONTAINER_PADDING;
      }

      stageY += stageNode.style.height + CONTAINER_PADDING;
    }

    fieldX += FIELD_SPACING;
  }

  // Create edges (second pass)
  for (const fieldSchedule of json) {
    for (const game of fieldSchedule.games) {
      const gameId = gameNodeMap.get(game.standing);
      if (!gameId) continue;

      // Create home edge
      createEdge(game.home, gameId, 'home', teamNodeMap, gameNodeMap, edges);
      // Create away edge
      createEdge(game.away, gameId, 'away', teamNodeMap, gameNodeMap, edges);
    }
  }

  // Apply auto-layout to position nodes nicely
  return applyAutoLayout({ nodes, edges });
}
```

---

## TypeScript Types

### New Container Node Types

```typescript
import { Node, Edge } from '@xyflow/react';

// ============ Container Node Data Types ============

/**
 * Data for Field container nodes
 */
export interface FieldNodeData {
  type: 'field';
  /** Display name (e.g., "Feld 1") */
  name: string;
  /** Order for sorting fields */
  order: number;
  /** Optional color for visual coding */
  color?: string;
}

/**
 * Data for Stage container nodes
 */
export interface StageNodeData {
  type: 'stage';
  /** Display name (e.g., "Vorrunde") */
  name: string;
  /** Stage category for ordering */
  stageType: StageType;
  /** Order within parent field */
  order: number;
}

export type StageType = 'vorrunde' | 'finalrunde' | 'platzierung' | 'custom';

// ============ Existing Node Data Types (unchanged) ============

/**
 * Data for Team nodes
 */
export interface TeamNodeData {
  type: 'team';
  /** The team reference (groupTeam, standing, static, etc.) */
  reference: TeamReference;
  /** Display label */
  label: string;
}

/**
 * Data for Game nodes
 */
export interface GameNodeData {
  type: 'game';
  /** Match identifier (e.g., "HF1", "P1", "Spiel 3") */
  standing: string;
  /** Officiating team reference */
  official: TeamReference | null;
  /** Extra break time in minutes */
  breakAfter: number;
}

// ============ Node Union Type ============

/**
 * Union type for all node types in the designer
 */
export type FlowNode =
  | Node<FieldNodeData, 'field'>
  | Node<StageNodeData, 'stage'>
  | Node<TeamNodeData, 'team'>
  | Node<GameNodeData, 'game'>;

// Type aliases for specific node types
export type FieldNode = Node<FieldNodeData, 'field'>;
export type StageNode = Node<StageNodeData, 'stage'>;
export type TeamNode = Node<TeamNodeData, 'team'>;
export type GameNode = Node<GameNodeData, 'game'>;

// ============ Edge Types (unchanged from v1) ============

export interface TeamToGameEdgeData {
  targetPort: 'home' | 'away';
}

export interface GameToGameEdgeData {
  sourcePort: 'winner' | 'loser';
  targetPort: 'home' | 'away';
}

export interface TeamToGameEdge extends Edge {
  type: 'teamToGame';
  data: TeamToGameEdgeData;
}

export interface GameToGameEdge extends Edge {
  type: 'gameToGame';
  data: GameToGameEdgeData;
}

export type FlowEdge = TeamToGameEdge | GameToGameEdge;

// ============ Flow State ============

/**
 * Complete state for the flow designer
 */
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ============ Type Guards ============

export function isFieldNode(node: FlowNode): node is FieldNode {
  return node.type === 'field';
}

export function isStageNode(node: FlowNode): node is StageNode {
  return node.type === 'stage';
}

export function isTeamNode(node: FlowNode): node is TeamNode {
  return node.type === 'team';
}

export function isGameNode(node: FlowNode): node is GameNode {
  return node.type === 'game';
}

export function isContainerNode(node: FlowNode): node is FieldNode | StageNode {
  return node.type === 'field' || node.type === 'stage';
}

// ============ Factory Functions ============

let nodeIdCounter = 0;

export function createFieldNode(options?: Partial<FieldNodeData>): FieldNode {
  const id = `field-${++nodeIdCounter}`;
  return {
    id,
    type: 'field',
    position: { x: 50, y: 50 },
    data: {
      type: 'field',
      name: options?.name ?? `Feld ${nodeIdCounter}`,
      order: options?.order ?? 0,
      color: options?.color,
    },
    style: { width: 350, height: 300 },
    draggable: true,
    selectable: true,
  };
}

export function createStageNode(
  parentId: string,
  options?: Partial<StageNodeData>
): StageNode {
  const id = `stage-${++nodeIdCounter}`;
  return {
    id,
    type: 'stage',
    parentId,
    position: { x: 20, y: 60 },
    data: {
      type: 'stage',
      name: options?.name ?? 'Vorrunde',
      stageType: options?.stageType ?? 'vorrunde',
      order: options?.order ?? 0,
    },
    style: { width: 300, height: 150 },
    extent: 'parent',
    expandParent: true,
    draggable: true,
    selectable: true,
  };
}

export function createGameNode(
  parentId: string,
  options?: Partial<GameNodeData>
): GameNode {
  const id = `game-${++nodeIdCounter}`;
  return {
    id,
    type: 'game',
    parentId,
    position: { x: 30, y: 50 },
    data: {
      type: 'game',
      standing: options?.standing ?? `Spiel ${nodeIdCounter}`,
      official: options?.official ?? null,
      breakAfter: options?.breakAfter ?? 0,
    },
    extent: 'parent',
    expandParent: true,
    draggable: true,
    selectable: true,
  };
}

export function createTeamNode(
  options?: Partial<TeamNodeData>,
  parentId?: string
): TeamNode {
  const id = `team-${++nodeIdCounter}`;
  return {
    id,
    type: 'team',
    parentId,
    position: { x: 50, y: 50 },
    data: {
      type: 'team',
      reference: options?.reference ?? { type: 'static', name: '' },
      label: options?.label ?? `Team ${nodeIdCounter}`,
    },
    ...(parentId && { extent: 'parent' as const }),
    draggable: true,
    selectable: true,
  };
}
```

---

## Container-Aware State Management

### State Operations

```typescript
import { useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';

export function useFlowState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  // Add field with optional stage
  const addField = useCallback((withStage = true) => {
    const field = createFieldNode();
    const newNodes: FlowNode[] = [field];

    if (withStage) {
      const stage = createStageNode(field.id);
      newNodes.push(stage);
    }

    setNodes(nodes => [...nodes, ...newNodes]);
    return field.id;
  }, [setNodes]);

  // Add stage to field
  const addStage = useCallback((fieldId: string, name?: string) => {
    const field = nodes.find(n => n.id === fieldId && n.type === 'field');
    if (!field) return null;

    const existingStages = nodes.filter(
      n => n.type === 'stage' && n.parentId === fieldId
    );

    const stage = createStageNode(fieldId, {
      name: name ?? (existingStages.length === 0 ? 'Vorrunde' : 'Finalrunde'),
      order: existingStages.length,
    });

    setNodes(nodes => [...nodes, stage]);
    return stage.id;
  }, [nodes, setNodes]);

  // Add game to stage (creates containers if needed)
  const addGame = useCallback((
    targetStageId?: string,
    targetFieldId?: string
  ) => {
    let stageId = targetStageId;
    let fieldId = targetFieldId;

    // If no stage specified, find or create one
    if (!stageId) {
      if (fieldId) {
        // Find first stage in field, or create one
        const stage = nodes.find(
          n => n.type === 'stage' && n.parentId === fieldId
        );
        if (stage) {
          stageId = stage.id;
        } else {
          // Create stage in existing field
          const newStage = createStageNode(fieldId);
          setNodes(nodes => [...nodes, newStage]);
          stageId = newStage.id;
        }
      } else {
        // Create both field and stage
        const newField = createFieldNode();
        const newStage = createStageNode(newField.id);
        setNodes(nodes => [...nodes, newField, newStage]);
        stageId = newStage.id;
        fieldId = newField.id;
      }
    }

    const game = createGameNode(stageId!);
    setNodes(nodes => [...nodes, game]);
    return game.id;
  }, [nodes, setNodes]);

  // Delete node with cascade
  const deleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Collect all nodes to delete (cascade)
    const nodesToDelete = new Set<string>([nodeId]);

    if (node.type === 'field') {
      // Delete all stages and their games
      for (const n of nodes) {
        if (n.type === 'stage' && n.parentId === nodeId) {
          nodesToDelete.add(n.id);
          // And all games in this stage
          for (const g of nodes) {
            if (g.type === 'game' && g.parentId === n.id) {
              nodesToDelete.add(g.id);
            }
          }
        }
      }
    } else if (node.type === 'stage') {
      // Delete all games in this stage
      for (const n of nodes) {
        if (n.type === 'game' && n.parentId === nodeId) {
          nodesToDelete.add(n.id);
        }
      }
    }

    // Remove nodes and connected edges
    setNodes(nodes => nodes.filter(n => !nodesToDelete.has(n.id)));
    setEdges(edges => edges.filter(
      e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)
    ));
  }, [nodes, setNodes, setEdges]);

  // Get derived field for a game
  const getGameField = useCallback((gameId: string): FieldNode | null => {
    const game = nodes.find(n => n.id === gameId);
    if (!game || game.type !== 'game') return null;

    const stage = nodes.find(n => n.id === game.parentId);
    if (!stage || stage.type !== 'stage') return null;

    const field = nodes.find(n => n.id === stage.parentId);
    if (!field || field.type !== 'field') return null;

    return field as FieldNode;
  }, [nodes]);

  // Get derived stage for a game
  const getGameStage = useCallback((gameId: string): StageNode | null => {
    const game = nodes.find(n => n.id === gameId);
    if (!game || game.type !== 'game') return null;

    const stage = nodes.find(n => n.id === game.parentId);
    if (!stage || stage.type !== 'stage') return null;

    return stage as StageNode;
  }, [nodes]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    addField,
    addStage,
    addGame,
    deleteNode,
    getGameField,
    getGameStage,
  };
}
```

---

## Implementation Notes

### React Flow Sub-flows Reference

**Documentation:** https://reactflow.dev/learn/layouting/sub-flows

**Key concepts from React Flow sub-flows:**
1. Child nodes use `parentId` to reference parent
2. Child positions are relative to parent
3. Use `extent: 'parent'` to constrain children
4. Use `expandParent: true` for auto-sizing
5. Parent nodes should have explicit `style.width` and `style.height`

**Example from React Flow:**
```typescript
const nodes = [
  {
    id: 'A',
    type: 'group',
    position: { x: 0, y: 0 },
    style: { width: 170, height: 140 },
  },
  {
    id: 'B',
    parentId: 'A',
    extent: 'parent',
    position: { x: 10, y: 10 },
  },
];
```

### Container Node Component

```tsx
// components/nodes/FieldNode.tsx
import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { FieldNodeData } from '../../types/flow';

const FieldNode = memo(({ data, selected }: NodeProps<FieldNodeData>) => {
  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
      />
      <div
        className="field-node"
        style={{
          borderColor: data.color ?? '#4a90d9',
          width: '100%',
          height: '100%',
        }}
      >
        <div className="field-drag-handle field-header">
          {data.name}
        </div>
        {/* Children are rendered by React Flow automatically */}
      </div>
    </>
  );
});

FieldNode.displayName = 'FieldNode';
export default FieldNode;
```

```tsx
// components/nodes/StageNode.tsx
import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { StageNodeData } from '../../types/flow';

const StageNode = memo(({ data, selected }: NodeProps<StageNodeData>) => {
  return (
    <>
      <NodeResizer
        minWidth={250}
        minHeight={100}
        isVisible={selected}
      />
      <div
        className="stage-node"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <div className="stage-drag-handle stage-header">
          {data.name}
        </div>
        {/* Children are rendered by React Flow automatically */}
      </div>
    </>
  );
});

StageNode.displayName = 'StageNode';
export default StageNode;
```

### Node Type Registry

```typescript
// components/nodes/index.ts
import FieldNode from './FieldNode';
import StageNode from './StageNode';
import TeamNode from './TeamNode';
import GameNode from './GameNode';

export const nodeTypes = {
  field: FieldNode,
  stage: StageNode,
  team: TeamNode,
  game: GameNode,
};
```

### Auto-sizing Implementation

```typescript
// hooks/useAutoSize.ts
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

const PADDING = 20;
const FIELD_HEADER = 50;
const STAGE_HEADER = 40;

export function useAutoSize() {
  const { getNodes, setNodes } = useReactFlow();

  useEffect(() => {
    const nodes = getNodes();
    const updates: { id: string; style: { width: number; height: number } }[] = [];

    // Auto-size stages based on children
    for (const node of nodes) {
      if (node.type === 'stage') {
        const children = nodes.filter(n => n.parentId === node.id);
        if (children.length > 0) {
          const bounds = calculateBounds(children);
          const newWidth = Math.max(250, bounds.maxX + PADDING);
          const newHeight = Math.max(100, bounds.maxY + PADDING + STAGE_HEADER);

          if (node.style?.width !== newWidth || node.style?.height !== newHeight) {
            updates.push({
              id: node.id,
              style: { width: newWidth, height: newHeight },
            });
          }
        }
      }
    }

    // Auto-size fields based on children (stages)
    for (const node of nodes) {
      if (node.type === 'field') {
        const children = nodes.filter(n => n.parentId === node.id);
        if (children.length > 0) {
          const bounds = calculateBounds(children);
          const newWidth = Math.max(300, bounds.maxX + PADDING);
          const newHeight = Math.max(200, bounds.maxY + PADDING + FIELD_HEADER);

          if (node.style?.width !== newWidth || node.style?.height !== newHeight) {
            updates.push({
              id: node.id,
              style: { width: newWidth, height: newHeight },
            });
          }
        }
      }
    }

    if (updates.length > 0) {
      setNodes(nodes =>
        nodes.map(node => {
          const update = updates.find(u => u.id === node.id);
          return update ? { ...node, style: { ...node.style, ...update.style } } : node;
        })
      );
    }
  }, [getNodes, setNodes]);
}

function calculateBounds(nodes: Node[]) {
  let maxX = 0;
  let maxY = 0;

  for (const node of nodes) {
    const nodeWidth = (node.style?.width as number) ?? 150;
    const nodeHeight = (node.style?.height as number) ?? 50;
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  return { maxX, maxY };
}
```

---

## Validation Updates

### Container-Aware Validation Rules

**New validation rules for v2:**

| Rule | Type | Description |
|------|------|-------------|
| V-101 | Error | Game without parent stage |
| V-102 | Error | Stage without parent field |
| V-103 | Warning | Empty field (no stages) |
| V-104 | Warning | Empty stage (no games) |

**Existing rules (unchanged):**

| Rule | Type | Description |
|------|------|-------------|
| V-001 | Error | Game with incomplete inputs (missing home or away) |
| V-002 | Error | Circular dependency in game connections |
| V-003 | Error | Official is playing in the same game |
| V-004 | Warning | No field assigned (now: game not in field hierarchy) |
| V-005 | Warning | Duplicate standing names |
| V-006 | Warning | Orphaned team (no connections) |

```typescript
// validation/rules.ts
export function validateContainerHierarchy(nodes: FlowNode[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check games have parent stage
  for (const node of nodes) {
    if (node.type === 'game') {
      if (!node.parentId) {
        errors.push({
          id: `err-${node.id}-no-parent`,
          type: 'invalid_hierarchy',
          message: `Game "${node.data.standing}" is not inside a stage`,
          affectedNodes: [node.id],
        });
      } else {
        const parent = nodes.find(n => n.id === node.parentId);
        if (!parent || parent.type !== 'stage') {
          errors.push({
            id: `err-${node.id}-wrong-parent`,
            type: 'invalid_hierarchy',
            message: `Game "${node.data.standing}" must be inside a stage, not a ${parent?.type}`,
            affectedNodes: [node.id],
          });
        }
      }
    }
  }

  // Check stages have parent field
  for (const node of nodes) {
    if (node.type === 'stage') {
      if (!node.parentId) {
        errors.push({
          id: `err-${node.id}-no-parent`,
          type: 'invalid_hierarchy',
          message: `Stage "${node.data.name}" is not inside a field`,
          affectedNodes: [node.id],
        });
      } else {
        const parent = nodes.find(n => n.id === node.parentId);
        if (!parent || parent.type !== 'field') {
          errors.push({
            id: `err-${node.id}-wrong-parent`,
            type: 'invalid_hierarchy',
            message: `Stage "${node.data.name}" must be inside a field`,
            affectedNodes: [node.id],
          });
        }
      }
    }
  }

  // Check for empty containers
  for (const node of nodes) {
    if (node.type === 'field') {
      const children = nodes.filter(n => n.parentId === node.id);
      if (children.length === 0) {
        warnings.push({
          id: `warn-${node.id}-empty`,
          type: 'empty_container',
          message: `Field "${node.data.name}" has no stages`,
          affectedNodes: [node.id],
        });
      }
    }

    if (node.type === 'stage') {
      const children = nodes.filter(n => n.parentId === node.id);
      if (children.length === 0) {
        warnings.push({
          id: `warn-${node.id}-empty`,
          type: 'empty_container',
          message: `Stage "${node.data.name}" has no games`,
          affectedNodes: [node.id],
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## Updated File Structure

```
gameday_designer/
src/
  index.tsx                    # Entry point
  App.tsx                      # Main app container

  components/
    FlowCanvas.tsx             # React Flow wrapper with config
    nodes/
      FieldNode.tsx            # Field container component (NEW)
      StageNode.tsx            # Stage container component (NEW)
      TeamNode.tsx             # Team node component
      GameNode.tsx             # Game node component with ports
      index.ts                 # Node type registry
    edges/
      TeamEdge.tsx             # Team-to-game edge style
      ResultEdge.tsx           # Game-to-game edge style
      index.ts                 # Edge type registry
    panels/
      PropertiesPanel.tsx      # Node property editor (updated)
      FieldPropertiesPanel.tsx # Field properties (NEW)
      StagePropertiesPanel.tsx # Stage properties (NEW)
      ValidationPanel.tsx      # Validation errors/warnings
    toolbar/
      CanvasToolbar.tsx        # Updated with Add Field/Stage
      QuickSetup.tsx           # Template selection modal
    __tests__/

  hooks/
    useFlowState.ts            # Graph state management (updated)
    useAutoSize.ts             # Container auto-sizing (NEW)
    useContainerDrag.ts        # Container drag behavior (NEW)
    useValidation.ts           # Graph validation
    useLocalStorage.ts         # Auto-save
    useHistory.ts              # Undo/redo

  types/
    flow.ts                    # React Flow node/edge types (updated)
    designer.ts                # Existing types (reuse)

  utils/
    exportJson.ts              # Graph -> schedule JSON (updated)
    importJson.ts              # Schedule JSON -> graph (updated)
    graphValidation.ts         # Graph validation rules (updated)
    layoutEngine.ts            # Auto-layout algorithms (updated)
    teamReference.ts           # Reference formatting (reuse)
    containerUtils.ts          # Container hierarchy helpers (NEW)

  validation/
    rules.ts                   # Validation rule definitions (updated)
    engine.ts                  # Validation runner
    __tests__/
```

---

## MVP Scope (Updated)

### In Scope (MVP v2)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Field containers** | High | Top-level containers for fields |
| **Stage containers** | High | Nested containers for stages |
| **Container drag** | High | Move containers with all children |
| **Auto-sizing** | High | Containers expand for children |
| **Cross-container edges** | High | Edges cross container boundaries |
| **Add Field/Stage buttons** | High | Toolbar buttons for containers |
| **Field/Stage properties** | High | Properties panel for containers |
| **Container hierarchy validation** | High | Validate parent relationships |
| **Updated export** | High | Derive field/stage from hierarchy |
| **Updated import** | High | Create containers from JSON |
| All v1 features | High | Teams, games, edges, validation |

### Out of Scope (Post-MVP)

| Feature | Reason |
|---------|--------|
| Collapsible containers | Nice-to-have, not essential |
| Container resize handles | Auto-sizing handles most cases |
| Drag games between stages | Complex, manual workaround available |
| Stage color coding | Visual enhancement, not essential |
| Container minimize/maximize | Post-MVP enhancement |

---

## Migration from v1

### Backward Compatibility

**v1 graph state can be migrated to v2:**

```typescript
function migrateV1ToV2(v1State: V1FlowState): FlowState {
  const nodes: FlowNode[] = [];
  const edges = v1State.edges;

  // Create field for each unique fieldId in games
  const fieldIds = new Set<string>();
  for (const node of v1State.nodes) {
    if (node.type === 'game' && node.data.fieldId) {
      fieldIds.add(node.data.fieldId);
    }
  }

  // Create fields and stages
  for (const fieldId of fieldIds) {
    const field = createFieldNode({ name: fieldId });
    nodes.push(field);

    // Group games by stage
    const gamesByStage = new Map<string, V1GameNode[]>();
    for (const node of v1State.nodes) {
      if (node.type === 'game' && node.data.fieldId === fieldId) {
        const stage = node.data.stage ?? 'Vorrunde';
        if (!gamesByStage.has(stage)) {
          gamesByStage.set(stage, []);
        }
        gamesByStage.get(stage)!.push(node);
      }
    }

    // Create stages and migrate games
    let stageOrder = 0;
    for (const [stageName, games] of gamesByStage) {
      const stage = createStageNode(field.id, { name: stageName, order: stageOrder++ });
      nodes.push(stage);

      for (const oldGame of games) {
        const game = createGameNode(stage.id, {
          standing: oldGame.data.standing,
          official: oldGame.data.official,
          breakAfter: oldGame.data.breakAfter,
        });
        // Update edges to use new game ID
        updateEdgeReferences(edges, oldGame.id, game.id);
        nodes.push(game);
      }
    }
  }

  // Migrate team nodes (keep as free-floating)
  for (const node of v1State.nodes) {
    if (node.type === 'team') {
      nodes.push({ ...node });
    }
  }

  return { nodes, edges };
}
```

### JSON Format Compatibility

**No changes to export format:**
- schedule_*.json format remains unchanged
- Field derived from container hierarchy instead of game property
- Stage derived from container hierarchy instead of game property

---

## Success Metrics (Updated)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Container creation time | < 10 sec to create field + stage | User testing |
| Bracket organization | Users understand field/stage grouping | User survey |
| Import success rate | 100% of existing JSON files | Automated testing |
| Export compatibility | 100% compatible with backend | Integration testing |
| Container drag performance | 60 FPS during drag | Performance testing |
| Auto-sizing accuracy | Containers always fit children | Visual testing |

---

## References

### React Flow Documentation

| Resource | URL |
|----------|-----|
| Sub-flows Guide | https://reactflow.dev/learn/layouting/sub-flows |
| Node Groups | https://reactflow.dev/examples/nodes/node-groups |
| Parent/Child Nodes | https://reactflow.dev/docs/examples/nodes/parent-child |
| Node Resizer | https://reactflow.dev/docs/api/nodes/node-resizer |

### Existing Files

| File | Purpose |
|------|---------|
| `/home/cda/dev/leaguesphere/gameday_designer/src/types/designer.ts` | Existing type definitions (reuse) |
| `/home/cda/dev/leaguesphere/gameday_designer/src/utils/teamReference.ts` | Reference formatting (reuse) |
| `/home/cda/dev/leaguesphere/gamedays/management/schedules/*.json` | Existing schedule templates |
| `/home/cda/dev/leaguesphere/feature-dev/gameday_designer/requirements-flowchart.md` | v1 requirements |

---

## Appendix A: Complete Visual Examples

### Example 1: Single Field, Two Stages

```
+============== Field: Feld 1 ==============+
|  +-------- Stage: Vorrunde --------+      |
|  |                                 |      |
|  | [0_0]--+                        |      |
|  |        +-->[Spiel 1]--winner----+------+--+
|  | [0_1]--+       ^                |      |  |
|  |                |                |      |  |
|  | [0_2]--+       |                |      |  |
|  |        +-->[Spiel 2]--winner----+------+--+
|  | [0_3]--+            |           |      |  |
|  |                     +-loser-----+------+--+
|  +-----------------------------------+    |  |
|                                           |  |
|  +-------- Stage: Finalrunde -----+       |  |
|  |                                |       |  |
|  |  [P1: Final] <-----------------+-------+--+
|  |       ^                        |       |
|  |       |                        |       |
|  |  [P3: 3rd Place] <-------------+-------+
|  |                                |
|  +----------------------------------+
+=============================================+
```

### Example 2: Two Fields, Cross-Field Edges

```
+============ Field: Feld 1 ============+   +============ Field: Feld 2 ============+
|  +------ Stage: Vorrunde ------+      |   |  +------ Stage: Vorrunde ------+      |
|  | [0_0]--+                    |      |   |  | [1_0]--+                    |      |
|  |        +-->[HF1]--winner----+------+---+->|        +-->[HF2]--winner----+------+--+
|  | [0_1]--+                    |      |   |  | [1_1]--+                    |      |  |
|  +-------------------------------+    |   |  +-------------------------------+    |  |
|                                       |   |                                       |  |
|  +------ Stage: Finalrunde ---+       |   |  +------ Stage: Finalrunde ---+       |  |
|  |                            |       |   |  |                            |       |  |
|  |  [Final] <-----------------+-------+---+--+-<--------------------------+-------+--+
|  |                            |       |   |  |                            |
|  +------------------------------+     |   |  +------------------------------+
+=========================================+ +=========================================+
```

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F | Add new Field |
| S | Add new Stage (in selected Field) |
| T | Add new Team |
| G | Add new Game (in selected Stage) |
| Delete / Backspace | Delete selected element(s) |
| Ctrl+A | Select all |
| Ctrl+C | Copy selected |
| Ctrl+V | Paste |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+S | Save to localStorage |
| Escape | Deselect all |

---

## Appendix C: CSS Classes

```css
/* Container styling */
.field-node {
  border: 2px solid var(--field-border-color, #4a90d9);
  border-radius: 8px;
  background: var(--field-bg, rgba(74, 144, 217, 0.05));
}

.field-header {
  padding: 8px 12px;
  background: var(--field-header-bg, rgba(74, 144, 217, 0.1));
  border-bottom: 1px solid var(--field-border-color);
  font-weight: bold;
  cursor: grab;
}

.stage-node {
  border: 1px dashed var(--stage-border-color, #888);
  border-radius: 4px;
  background: var(--stage-bg, rgba(255, 255, 255, 0.5));
}

.stage-header {
  padding: 4px 8px;
  background: var(--stage-header-bg, rgba(0, 0, 0, 0.05));
  border-bottom: 1px dashed var(--stage-border-color);
  font-size: 0.9em;
  cursor: grab;
}

/* Selection states */
.field-node.selected {
  border-color: var(--selection-color, #1a73e8);
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3);
}

.stage-node.selected {
  border-color: var(--selection-color, #1a73e8);
  border-style: solid;
}
```

---

*End of Requirements Specification v2.0.0*
