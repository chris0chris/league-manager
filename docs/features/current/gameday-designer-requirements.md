# Requirements Specification: Gameday Designer

## Overview

The Gameday Designer is a visual drag-and-drop editor for creating flexible gameday schedules for flag football tournaments. The MVP focuses exclusively on the **visual editor core** - the ability to build ANY schedule structure from a blank canvas without constraints or templates.

The key principle: **Maximum flexibility in the editor, minimal constraints.** Users can create any schedule configuration they need. Templates and pre-built formats are later convenience features built on top of this flexible foundation.

## Flag Football Context

### Tournament Structure in Flag Football

Flag football tournaments typically follow structured formats:

1. **Group Stage (Vorrunde)**: Round-robin play within assigned groups
   - Each team plays every other team in their group once
   - Results determine group standings (P1, P2, P3, P4 = Place 1, 2, 3, 4)

2. **Playoff Stage (Finalrunde)**: Bracket-style elimination or placement matches
   - Winners advance through semifinals (HF) to finals (P1)
   - Losers may play in placement matches (P3, P5, P7)
   - Match results reference prior games: "Gewinner HF1" (Winner of Semifinal 1)

3. **Playdown Stage**: Lower bracket for determining final placements
   - "Verlierer HF1" (Loser of Semifinal 1) competes for 3rd/4th place

### Team Reference Formats

The existing system uses specific formats for team identification:

| Format | Meaning | Example |
|--------|---------|---------|
| `X_Y` | Group X, Team Y (0-indexed) | `0_1` = Group 1, Team 2 |
| `PX Gruppe Y` | Place X in Group Y | `P2 Gruppe 1` = 2nd place in Group 1 |
| `Gewinner MatchName` | Winner of named match | `Gewinner HF1` = Winner of Semifinal 1 |
| `Verlierer MatchName` | Loser of named match | `Verlierer Spiel 3` = Loser of Game 3 |
| Static team name | Fixed team reference | `Team Officials` |

### Officials Assignment

In flag football, teams take turns officiating games they are not playing in:
- A team cannot play and officiate the same game
- Officials are assigned using the same reference formats as players
- Officials for later rounds depend on prior match results

## Platform Requirements

### Web Application (Primary)
**Target Platforms**: Desktop and Tablet browsers

**Browser Support**:
- Chrome: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Edge: Latest 2 versions

**Desktop-Specific Considerations**:
- Drag-and-drop interface optimized for mouse interaction
- Multi-column layout showing fields side by side
- Keyboard shortcuts for power users (copy, paste, undo, redo)
- Print-friendly view for schedule exports

### Tablet/Mobile (Secondary)
**Minimum Requirements**:
- Responsive design down to 768px width (tablet)
- Touch-friendly controls for editing (but full design on desktop)
- Read-only/preview mode functional on mobile

**Responsive Behavior**:
| Breakpoint | Layout | Functionality |
|------------|--------|---------------|
| Desktop (1024px+) | Multi-column fields, full editor | Full drag-and-drop design |
| Tablet (768px-1023px) | Stacked fields, compact toolbar | Simplified editing |
| Mobile (320px-767px) | Single column, preview mode | View only, no editing |

---

## MVP Scope Definition

### Core Principle

The MVP delivers a **pure visual editor** with maximum flexibility:

- **No templates for MVP** - just the drag-and-drop logic
- **Start from blank canvas** - add fields, add game slots, configure freely
- **Build ANY schedule structure** - no constraints on tournament format
- **Templates are a later simplification** - built on top of the flexible editor

### In Scope (MVP)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Blank canvas approach** | High | Start with empty editor, no pre-defined structure |
| **Dynamic field management** | High | Add/remove fields as needed |
| **Dynamic game slot management** | High | Add/remove game slots per field freely |
| **Drag-and-drop between fields** | High | Move game slots between any fields |
| **Drag-and-drop within fields** | High | Reorder games within a field |
| **Game slot configuration** | High | Configure stage, standing, home/away/official |
| **All team reference types** | High | Support group-team, standing, result, static references |
| **Real-time validation** | High | Immediate feedback on schedule validity |
| **JSON export** | High | Generate compatible schedule JSON |
| **JSON import** | High | Load existing schedule JSON for editing |
| **Visual feedback** | Medium | Ghost preview, drop targets, error highlighting |
| **Auto-save to localStorage** | Medium | Preserve work on browser refresh |
| **Undo/Redo** | Medium | Recover from mistakes |

### Explicitly Out of Scope (MVP)

| Feature | Reason |
|---------|--------|
| Template saving/loading | Templates are a later abstraction on the flexible editor |
| Backend API integration | MVP is standalone, client-side only |
| Update rules editor | The `update_*.json` complexity deferred |
| Pre-built tournament formats | No Round Robin wizard, no bracket generators |
| Django model persistence | No database storage in MVP |
| Template sharing/cloning | Requires template concept |
| Gameday application | Requires backend integration |

**Estimated MVP Development Time**: 2-3 weeks

---

## Functional Requirements

### FR-100: Canvas and Field Management

**[FR-101]** Start with blank canvas
- **Acceptance Criteria**: Editor loads with no fields, no game slots - completely empty
- **UI Behavior**: Prominent "Add Field" button to start building
- **Priority**: High

**[FR-102]** Add fields dynamically
- **Acceptance Criteria**: User can add new fields at any time, no maximum limit enforced in MVP
- **UI Behavior**: Click "Add Field" button, new field column appears
- **Priority**: High

**[FR-103]** Remove fields
- **Acceptance Criteria**: User can remove any field; all game slots on that field are also removed
- **UI Behavior**: Delete button on field header, confirmation dialog if field has games
- **Priority**: High

**[FR-104]** Rename fields
- **Acceptance Criteria**: User can give each field a custom name (e.g., "Feld 1", "Main Field")
- **UI Behavior**: Editable field header
- **Priority**: Medium

**[FR-105]** Reorder fields
- **Acceptance Criteria**: User can drag field columns to reorder them
- **Priority**: Low

### FR-200: Game Slot Management

**[FR-201]** Add game slots to any field
- **Acceptance Criteria**: User can add new game slots to the end of any field
- **UI Behavior**: "Add Game" button at bottom of each field column
- **Priority**: High

**[FR-202]** Remove game slots
- **Acceptance Criteria**: User can delete any game slot
- **UI Behavior**: Delete button on game slot card, no confirmation needed
- **Priority**: High

**[FR-203]** Duplicate game slots
- **Acceptance Criteria**: User can duplicate an existing game slot (for building similar games quickly)
- **UI Behavior**: Duplicate button on game slot card
- **Priority**: Medium

**[FR-204]** Insert game slot at position
- **Acceptance Criteria**: User can insert a new game slot at any position (not just end)
- **UI Behavior**: Drag new game to specific position, or insert button between games
- **Priority**: Medium

### FR-300: Drag-and-Drop Operations

**[FR-301]** Drag game slots between fields
- **Acceptance Criteria**: User can drag a game slot from one field to another field
- **UI Behavior**: Game moves to drop position on target field
- **Priority**: High

**[FR-302]** Reorder game slots within a field
- **Acceptance Criteria**: User can drag game slots up/down within a field to change order
- **UI Behavior**: Games reorder, visual indicator shows new position
- **Priority**: High

**[FR-303]** Visual feedback during drag
- **Acceptance Criteria**: Dragged item shows ghost preview at cursor, valid drop targets highlight
- **UI Behavior**: Source position shows placeholder, drop zones indicate valid targets
- **Priority**: High

**[FR-304]** Drop zone indicators
- **Acceptance Criteria**: Clear visual indication of where game will land when dropped
- **UI Behavior**: Horizontal line or gap appears at drop position
- **Priority**: Medium

**[FR-305]** Keyboard accessibility for drag operations
- **Acceptance Criteria**: Users can use keyboard to move items (arrow keys + enter)
- **Priority**: Low

### FR-400: Game Slot Configuration

**[FR-401]** Configure stage name
- **Acceptance Criteria**: Each game slot has a stage field: "Vorrunde", "Finalrunde", or custom text
- **UI Behavior**: Dropdown with common values + custom text option
- **Flag Football Rule**: Stage determines how results affect standings
- **Priority**: High

**[FR-402]** Configure standing/match name
- **Acceptance Criteria**: Each game slot has a standing identifier (e.g., "Gruppe 1", "HF1", "P1", "Spiel 3")
- **UI Behavior**: Text input with suggestions based on existing values
- **Flag Football Rule**: Standing determines tournament progression
- **Priority**: High

**[FR-403]** Configure home team reference
- **Acceptance Criteria**: User can set home team using any reference type (see FR-500)
- **UI Behavior**: TeamSelector component with type selection
- **Priority**: High

**[FR-404]** Configure away team reference
- **Acceptance Criteria**: User can set away team using any reference type (see FR-500)
- **UI Behavior**: TeamSelector component with type selection
- **Priority**: High

**[FR-405]** Configure official team reference
- **Acceptance Criteria**: User can set officiating team using any reference type (see FR-500)
- **UI Behavior**: TeamSelector component with type selection
- **Priority**: High

**[FR-406]** Configure break time after game
- **Acceptance Criteria**: User can add extra break time (in minutes) after any game slot
- **UI Behavior**: Number input for break duration
- **Priority**: Medium

### FR-500: Team Reference System

**[FR-501]** Group-team reference format
- **Acceptance Criteria**: User can select teams by group index format: `X_Y` (e.g., `0_1` = Group 1, Team 2)
- **UI Behavior**: Group dropdown + Team number input
- **Priority**: High

**[FR-502]** Standing reference format
- **Acceptance Criteria**: User can select teams by standing format: `PX Gruppe Y` (e.g., `P1 Gruppe 1`)
- **UI Behavior**: Place number + Group name inputs
- **Priority**: High

**[FR-503]** Winner result reference format
- **Acceptance Criteria**: User can select teams by match result: `Gewinner MatchName` (e.g., `Gewinner HF1`)
- **UI Behavior**: Match name dropdown populated from existing games
- **Priority**: High

**[FR-504]** Loser result reference format
- **Acceptance Criteria**: User can select teams by match result: `Verlierer MatchName` (e.g., `Verlierer Spiel 3`)
- **UI Behavior**: Match name dropdown populated from existing games
- **Priority**: High

**[FR-505]** Static team reference
- **Acceptance Criteria**: User can enter any static team name (e.g., `Team Officials`)
- **UI Behavior**: Free text input option
- **Priority**: High

**[FR-506]** Reference type switching
- **Acceptance Criteria**: User can switch between reference types for any team assignment
- **UI Behavior**: Type selector (group-team, standing, winner, loser, static) then type-specific inputs
- **Priority**: High

### FR-600: Validation

**[FR-601]** Real-time validation
- **Acceptance Criteria**: Validation runs immediately on every change, results displayed instantly
- **UI Behavior**: Validation panel updates as user edits
- **Priority**: High

**[FR-602]** Official not playing validation
- **Acceptance Criteria**: Error if a team is assigned as both player and official in the same game
- **Flag Football Rule**: Teams cannot officiate games they are playing in
- **Priority**: High

**[FR-603]** Invalid match reference validation
- **Acceptance Criteria**: Error if a game references a non-existent prior match
- **UI Behavior**: Highlight the game with invalid reference
- **Priority**: High

**[FR-604]** Circular dependency validation
- **Acceptance Criteria**: Error if match references create a circular dependency
- **Example**: Game A references winner of Game B, Game B references winner of Game A
- **Priority**: High

**[FR-605]** Duplicate standing name validation
- **Acceptance Criteria**: Warning if multiple games have the same standing name (may be intentional)
- **Priority**: Medium

**[FR-606]** Consecutive games warning
- **Acceptance Criteria**: Warning if same team plays in back-to-back time slots
- **Flag Football Rule**: Teams need rest between games
- **Priority**: Medium

**[FR-607]** Validation error navigation
- **Acceptance Criteria**: Clicking on a validation error highlights/scrolls to the affected game
- **UI Behavior**: Visual highlight on game slot card
- **Priority**: Medium

### FR-700: Import/Export

**[FR-701]** Export schedule to JSON
- **Acceptance Criteria**: Generated JSON matches existing schedule_*.json format used by `schedule_manager.py`
- **UI Behavior**: "Export" button downloads JSON file
- **Priority**: High

**[FR-702]** Import existing JSON schedules
- **Acceptance Criteria**: User can load existing schedule_*.json files for editing
- **UI Behavior**: "Import" button with file picker, schedule loads into editor
- **Priority**: High

**[FR-703]** Import validation
- **Acceptance Criteria**: Imported JSON is validated, errors shown if format is invalid
- **UI Behavior**: Error message if import fails, details of what's wrong
- **Priority**: High

**[FR-704]** Export filename suggestion
- **Acceptance Criteria**: Suggested filename based on schedule structure (e.g., `schedule_5_teams_2_fields.json`)
- **Priority**: Low

### FR-800: State Persistence

**[FR-801]** Auto-save to localStorage
- **Acceptance Criteria**: Work saved to localStorage automatically on every change
- **UI Behavior**: Small "Saved" indicator, no manual save needed
- **Priority**: Medium

**[FR-802]** Restore from localStorage
- **Acceptance Criteria**: On page load, restore previous work from localStorage
- **UI Behavior**: Editor loads with previous state, or blank if no saved state
- **Priority**: Medium

**[FR-803]** Clear workspace
- **Acceptance Criteria**: User can clear all work and start fresh
- **UI Behavior**: "Clear All" button with confirmation dialog
- **Priority**: Medium

**[FR-804]** Undo/Redo operations
- **Acceptance Criteria**: User can undo (Ctrl+Z) and redo (Ctrl+Y) design changes
- **UI Behavior**: Undo/Redo buttons + keyboard shortcuts
- **Priority**: Medium

---

## Non-Functional Requirements

### NFR-100: Performance

**[NFR-101]** Initial load time
- **Metric**: Time to interactive
- **Target**: < 2 seconds on broadband connection

**[NFR-102]** Drag-and-drop responsiveness
- **Metric**: Frame rate during drag operations
- **Target**: 60 FPS, no perceptible lag

**[NFR-103]** Validation response time
- **Metric**: Time to display validation results after change
- **Target**: < 100ms for incremental validation

**[NFR-104]** Large schedule handling
- **Metric**: Editor performance with 50+ game slots
- **Target**: No noticeable degradation

### NFR-200: Usability

**[NFR-201]** No prior JSON knowledge required
- **Metric**: New user can create valid schedule without training
- **Target**: Complete 8-game schedule in < 15 minutes

**[NFR-202]** Clear error messages
- **Metric**: Users understand validation errors
- **Target**: Error messages explain what's wrong and how to fix it

**[NFR-203]** Keyboard accessibility
- **Metric**: All actions achievable via keyboard
- **Target**: Tab navigation, keyboard shortcuts documented

**[NFR-204]** Visual clarity
- **Metric**: Game slot information readable at a glance
- **Target**: Key info (teams, stage) visible without clicking

### NFR-300: Reliability

**[NFR-301]** Auto-save state
- **Metric**: Work preserved on browser refresh/crash
- **Target**: State saved to localStorage on every change

**[NFR-302]** Compatible JSON output
- **Metric**: Generated JSON works with existing `schedule_manager.py`
- **Target**: 100% compatibility with existing format

**[NFR-303]** Import robustness
- **Metric**: All existing schedule_*.json files import correctly
- **Target**: 100% of ~34 existing templates importable

---

## Technical Specifications

### Architecture Overview

The MVP is a **standalone React application** with no backend dependency:

```
MVP Architecture:
- React frontend with TypeScript
- Vite for bundling
- Context API for state management
- localStorage for persistence
- No backend API calls
```

### Frontend Architecture (MVP)

```
gameday_designer/
├── src/
│   ├── index.tsx                    # Entry point
│   ├── App.tsx                      # Main app
│   ├── components/
│   │   ├── DesignerCanvas.tsx       # Main layout container
│   │   ├── FieldColumn.tsx          # Single field with game slots
│   │   ├── GameSlotCard.tsx         # Draggable game card
│   │   ├── GameSlotEditor.tsx       # Modal for editing game details
│   │   ├── TeamSelector.tsx         # Team reference picker
│   │   ├── ValidationPanel.tsx      # Error/warning display
│   │   ├── Toolbar.tsx              # Add field, import/export, undo/redo
│   │   └── __tests__/               # Component tests
│   ├── hooks/
│   │   ├── useDesigner.ts           # Main state management
│   │   ├── useValidation.ts         # Validation hook
│   │   ├── useDragDrop.ts           # DnD state management
│   │   ├── useLocalStorage.ts       # Auto-save hook
│   │   └── useHistory.ts            # Undo/redo hook
│   ├── validation/
│   │   ├── rules.ts                 # All validation rules
│   │   ├── ValidationEngine.ts      # Runs all rules
│   │   └── __tests__/               # Validation tests
│   ├── types/
│   │   └── designer.ts              # TypeScript types
│   ├── utils/
│   │   ├── exportJson.ts            # JSON export logic
│   │   ├── importJson.ts            # JSON import/parse
│   │   └── teamReference.ts         # Reference formatting utilities
│   └── context/
│       └── DesignerContext.tsx      # Global state context
├── package.json
├── vite.config.mts
├── tsconfig.json
└── vitest.config.ts
```

### TypeScript Types

```typescript
// Core types for the designer

interface DesignerState {
  fields: Field[];              // All fields in the schedule
  selectedGameSlot: string | null;  // Currently selected for editing
  validationResult: ValidationResult;
}

interface Field {
  id: string;                   // Unique identifier
  name: string;                 // Display name (e.g., "Feld 1")
  order: number;                // Display order
  gameSlots: GameSlot[];        // Games on this field, in order
}

interface GameSlot {
  id: string;                   // Unique identifier
  stage: string;                // "Vorrunde", "Finalrunde", or custom
  standing: string;             // e.g., "Gruppe 1", "HF1", "P1"
  home: TeamReference;          // Home team
  away: TeamReference;          // Away team
  official: TeamReference;      // Officiating team
  breakAfter: number;           // Extra break in minutes (default 0)
}

// Team reference types - supporting ALL formats
type TeamReference =
  | { type: 'groupTeam'; group: number; team: number }           // "0_1"
  | { type: 'standing'; place: number; groupName: string }       // "P2 Gruppe 1"
  | { type: 'winner'; matchName: string }                        // "Gewinner HF1"
  | { type: 'loser'; matchName: string }                         // "Verlierer Spiel 3"
  | { type: 'static'; name: string };                            // "Team Officials"

// Validation types
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  id: string;
  type: 'official_playing' | 'invalid_reference' | 'circular_dependency';
  message: string;
  affectedSlots: string[];    // GameSlot IDs
}

interface ValidationWarning {
  id: string;
  type: 'consecutive_games' | 'duplicate_standing';
  message: string;
  affectedSlots: string[];
}

// JSON output format (matches existing schedule_*.json)
interface ScheduleJson {
  field: string | number;
  games: GameJson[];
}

interface GameJson {
  stage: string;
  standing: string;
  home: string;
  away: string;
  official: string;
  break_after?: number;
}
```

### Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Frontend Framework | React | 19.x | Match passcheck |
| Language | TypeScript | 5.x | Type safety |
| Build Tool | Vite | 7.x | Match passcheck |
| Drag-and-Drop | @dnd-kit/core | Latest | Modern, accessible DnD |
| UI Components | react-bootstrap | 2.x | Match passcheck |
| State Management | Context API | - | Simple, sufficient for MVP |
| Testing | Vitest | 4.x | Match passcheck |

### Component Architecture

**DesignerCanvas** (Main container)
- Renders toolbar and field columns
- Manages DnD context provider
- Handles responsive layout

**Toolbar** (Action bar)
- Add Field button
- Import/Export buttons
- Undo/Redo buttons
- Clear All button

**FieldColumn** (Per-field container)
- Editable field name header
- Delete field button
- Contains sorted GameSlotCards
- "Add Game" button at bottom
- Drop zone for DnD

**GameSlotCard** (Draggable game unit)
- Displays: stage, standing, home, away, official
- Drag handle for moving
- Click to open editor modal
- Visual error indicator if validation fails
- Delete and duplicate buttons

**GameSlotEditor** (Modal for editing)
- Stage input (dropdown + custom)
- Standing input (text with suggestions)
- Three TeamSelector components (home, away, official)
- Break time input
- Save/Cancel buttons

**TeamSelector** (Team reference input)
- Reference type selector (tabs or dropdown)
- Type-specific inputs:
  - Group-Team: Group dropdown + Team number
  - Standing: Place number + Group name
  - Winner: Match name dropdown
  - Loser: Match name dropdown
  - Static: Free text

**ValidationPanel** (Sidebar or bottom panel)
- Lists all errors (red)
- Lists all warnings (yellow)
- Click to navigate to affected game
- Collapsible sections

---

## Implementation Considerations

### Existing System Compatibility

The generated JSON must be 100% compatible with:
- `gamedays/management/schedule_manager.py` - `ScheduleEntry`, `FieldSchedule`, `Schedule` classes

**Key Compatibility Points**:
1. Field can be string or number (both accepted)
2. Team references use exact formats: `0_0`, `P2 Gruppe 1`, `Gewinner HF1`
3. Standing names can be any string
4. Stage values: typically "Vorrunde", "Finalrunde" but any string accepted

### Team Reference Formatting

```typescript
// Format TeamReference to JSON string
function formatTeamReference(ref: TeamReference): string {
  switch (ref.type) {
    case 'groupTeam':
      return `${ref.group}_${ref.team}`;
    case 'standing':
      return `P${ref.place} ${ref.groupName}`;
    case 'winner':
      return `Gewinner ${ref.matchName}`;
    case 'loser':
      return `Verlierer ${ref.matchName}`;
    case 'static':
      return ref.name;
  }
}

// Parse JSON string to TeamReference
function parseTeamReference(str: string): TeamReference {
  // Match patterns in order
  const groupTeamMatch = str.match(/^(\d+)_(\d+)$/);
  if (groupTeamMatch) {
    return { type: 'groupTeam', group: parseInt(groupTeamMatch[1]), team: parseInt(groupTeamMatch[2]) };
  }

  const standingMatch = str.match(/^P(\d+)\s+(.+)$/);
  if (standingMatch) {
    return { type: 'standing', place: parseInt(standingMatch[1]), groupName: standingMatch[2] };
  }

  const winnerMatch = str.match(/^Gewinner\s+(.+)$/);
  if (winnerMatch) {
    return { type: 'winner', matchName: winnerMatch[1] };
  }

  const loserMatch = str.match(/^Verlierer\s+(.+)$/);
  if (loserMatch) {
    return { type: 'loser', matchName: loserMatch[1] };
  }

  // Default to static
  return { type: 'static', name: str };
}
```

### Validation Rules Engine

```typescript
interface ValidationRule {
  id: string;
  name: string;
  severity: 'error' | 'warning';
  validate: (fields: Field[]) => ValidationIssue[];
}

// Example: Official not playing in same game
const officialNotPlayingRule: ValidationRule = {
  id: 'official_not_playing',
  name: 'Official cannot play in same game',
  severity: 'error',
  validate: (fields) => {
    const errors: ValidationIssue[] = [];

    for (const field of fields) {
      for (const slot of field.gameSlots) {
        const official = formatTeamReference(slot.official);
        const home = formatTeamReference(slot.home);
        const away = formatTeamReference(slot.away);

        if (official === home || official === away) {
          errors.push({
            id: `${slot.id}_official_playing`,
            type: 'official_playing',
            message: `Game "${slot.standing}": Team "${official}" cannot officiate a game they are playing in`,
            affectedSlots: [slot.id],
          });
        }
      }
    }

    return errors;
  },
};

// Example: Invalid match reference
const invalidReferenceRule: ValidationRule = {
  id: 'invalid_reference',
  name: 'Match references must exist',
  severity: 'error',
  validate: (fields) => {
    const errors: ValidationIssue[] = [];

    // Collect all standing names
    const allStandings = new Set<string>();
    for (const field of fields) {
      for (const slot of field.gameSlots) {
        allStandings.add(slot.standing);
      }
    }

    // Check all winner/loser references
    for (const field of fields) {
      for (const slot of field.gameSlots) {
        for (const ref of [slot.home, slot.away, slot.official]) {
          if (ref.type === 'winner' || ref.type === 'loser') {
            if (!allStandings.has(ref.matchName)) {
              errors.push({
                id: `${slot.id}_invalid_ref_${ref.matchName}`,
                type: 'invalid_reference',
                message: `Game "${slot.standing}": Referenced match "${ref.matchName}" does not exist`,
                affectedSlots: [slot.id],
              });
            }
          }
        }
      }
    }

    return errors;
  },
};
```

### SOLID Principles Application

**Single Responsibility**:
- Each component handles one concern (display, drag, validate, edit)
- Validation rules are separate from UI components
- Export/import logic isolated in utility functions

**Open/Closed**:
- New validation rules can be added without modifying existing ones
- Team reference types can be extended via discriminated union

**Liskov Substitution**:
- All validation rules implement `ValidationRule` interface
- All team references satisfy `TeamReference` union type

**Interface Segregation**:
- Separate interfaces for display vs. editing
- Validation results separate from validation logic

**Dependency Inversion**:
- Components depend on abstract types, not concrete implementations
- Validation engine accepts rule array, not hardcoded rules

### Testing Strategy

**Frontend Testing**:

| Test Type | Target | Tools | Coverage Target |
|-----------|--------|-------|-----------------|
| Unit Tests | Validation rules | Vitest | 95% |
| Unit Tests | Utility functions (export, import, formatting) | Vitest | 90% |
| Component Tests | React components | React Testing Library | 80% |
| Integration Tests | DnD workflows | React Testing Library | 70% |

**Key Test Scenarios**:

1. **Validation Rules**:
   - Official playing in same game detected
   - Invalid match references detected
   - Circular dependencies detected
   - Duplicate standing warning triggered
   - Consecutive games warning triggered

2. **JSON Export**:
   - Output matches expected format exactly
   - All team reference types export correctly
   - Empty fields handled correctly
   - Break times included when non-zero

3. **JSON Import**:
   - Existing schedule files parse correctly
   - Invalid JSON rejected with clear error
   - All ~34 existing templates import successfully

4. **Drag-and-Drop**:
   - Game slots reorder within field
   - Game slots move between fields
   - Correct position on drop
   - Visual feedback during drag

5. **State Management**:
   - Undo/redo works correctly
   - localStorage persistence works
   - State updates propagate correctly

---

## Edge Cases & Error Handling

### Edge Case 1: Empty schedule export
- **Scenario**: User exports with no fields or games
- **Handling**: Export empty array, no error

### Edge Case 2: Match reference before match exists
- **Scenario**: "Gewinner HF1" referenced but HF1 not yet defined
- **Handling**: Validation error with clear message
- **UI**: Show error, but don't prevent saving (user may add HF1 later)

### Edge Case 3: Circular dependencies
- **Scenario**: Game A references winner of Game B, Game B references winner of Game A
- **Handling**: Validation detects cycle, shows error with both games

### Edge Case 4: Browser crash during editing
- **Handling**: Auto-save to localStorage on every change
- **Recovery**: Automatic restore on next load

### Edge Case 5: Import file with unknown format
- **Handling**: Show error with details about what's invalid
- **UI**: Don't partially import, show full error message

### Edge Case 6: Very long standing names
- **Handling**: Truncate in display, show full on hover
- **No length limit enforced** (user flexibility)

---

## Assumptions

### Technical Assumptions
1. Users have modern browsers with JavaScript enabled
2. localStorage is available (not in private/incognito mode on some browsers)
3. Existing JSON schedule format will not change during development
4. No backend needed for MVP - purely client-side application

### Business Assumptions
1. League managers are the primary users (non-technical)
2. Users understand flag football tournament structure
3. German language for stage/standing names (Vorrunde, Finalrunde, etc.)
4. Users will create schedules that follow logical tournament flow (not enforced)

### Flag Football Assumptions
1. Teams officiate games they are not playing in
2. Any tournament format is valid - no constraints on structure
3. Team references can be any of the five supported formats
4. Stage and standing names are user-defined, not system-enforced

---

## Open Questions

### Technical Questions
1. Should we limit undo history size (e.g., last 50 actions)?
2. Should import replace current work or merge with it?
3. How should we handle browser tab close with unsaved changes?

### UX Questions
1. Should validation errors prevent export, or just warn?
2. Should we show a "quick add" mode for rapidly creating multiple games?
3. Should field ordering be persistent or just visual?

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Schedule creation time | < 10 min for 8-game schedule | User testing |
| Validation accuracy | 100% of invalid schedules detected | Unit tests |
| JSON compatibility | 100% of existing templates import/export | Integration tests |
| User satisfaction | Users prefer editor over JSON editing | Qualitative feedback |
| Error rate | 0 crashes during normal operation | Error logging |

---

## Implementation Roadmap

### Phase 1: MVP - Visual Editor Core (2-3 weeks)

**Week 1**: Foundation and Core Components
- [ ] Initialize React app with Vite and TypeScript
- [ ] Implement TypeScript types for schedule model
- [ ] Build DesignerCanvas container component
- [ ] Build FieldColumn component with add/remove
- [ ] Build GameSlotCard component (display only)
- [ ] Implement team reference parsing/formatting utilities
- [ ] Write tests for types and utilities

**Week 2**: Editing and Drag-and-Drop
- [ ] Build GameSlotEditor modal
- [ ] Build TeamSelector component with all reference types
- [ ] Add @dnd-kit for drag-and-drop
- [ ] Implement drag between fields
- [ ] Implement drag within fields
- [ ] Add visual feedback during drag
- [ ] Write component tests

**Week 3**: Validation, Import/Export, Polish
- [ ] Implement validation rules engine
- [ ] Build ValidationPanel component
- [ ] Implement JSON export
- [ ] Implement JSON import with validation
- [ ] Add localStorage auto-save
- [ ] Add undo/redo with useHistory hook
- [ ] End-to-end testing with existing templates
- [ ] Responsive design adjustments

### Future Phases (Not MVP)

**Phase 2: Template Management**
- Save/load templates to backend
- Template naming and organization
- Clone and share templates
- Requires Django backend integration

**Phase 3: Advanced Features**
- Update rules editor (update_*.json)
- Pre-built tournament format wizards
- Apply template to gameday workflow
- Advanced validation (time calculations, team counts)

---

## References

### Existing Code Files

| File | Purpose |
|------|---------|
| `/home/cda/dev/leaguesphere/gamedays/management/schedule_manager.py` | Schedule creation logic |
| `/home/cda/dev/leaguesphere/gamedays/management/schedule_update.py` | Update rules processing |
| `/home/cda/dev/leaguesphere/gamedays/management/schedules/*.json` | ~34 existing templates |
| `/home/cda/dev/leaguesphere/passcheck/` | Reference React/TypeScript patterns |
| `/home/cda/dev/leaguesphere/gamedays/models.py` | Gameday, Gameinfo, Gameresult models |

### Documentation

| Document | Location |
|----------|----------|
| Feature description | `/home/cda/dev/leaguesphere/feature-dev/gameday_designer.md` |
| Implementation plan | `/home/cda/dev/leaguesphere/feature-dev/gameday_designer_plan.md` |
| Business schedules | Google Sheets (see feature-dev/gameday_designer.md) |
