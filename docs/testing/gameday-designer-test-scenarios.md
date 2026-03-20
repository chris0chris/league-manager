# Test Scenarios: Gameday Designer

This document outlines all test scenarios for the Gameday Designer feature, organized by component and functionality.

## Table of Contents

1. [Validation Rules Tests](#validation-rules-tests)
2. [JSON Export Tests](#json-export-tests)
3. [JSON Import Tests](#json-import-tests)
4. [Component Tests](#component-tests)
5. [Drag-and-Drop Tests](#drag-and-drop-tests)
6. [Integration Tests](#integration-tests)
7. [Backend Tests (Phase 2)](#backend-tests-phase-2)

---

## Validation Rules Tests

### VR-001: Official Not Playing Rule

**Description**: Validate that a team cannot officiate a game they are playing in.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-001-1 | Official is home team | home: "0_0", official: "0_0" | Error: "Team 0_0 cannot officiate a game they are playing in" |
| VR-001-2 | Official is away team | away: "1_2", official: "1_2" | Error: "Team 1_2 cannot officiate a game they are playing in" |
| VR-001-3 | Official is neither team | home: "0_0", away: "0_1", official: "0_2" | No error |
| VR-001-4 | Standing reference official is player | home: "P1 Gruppe 1", official: "P1 Gruppe 1" | Error detected |
| VR-001-5 | Match result reference | home: "Gewinner HF1", official: "Gewinner HF1" | Error detected |

**Acceptance Criteria**:
- FR-501: Officials are never playing in the same game they officiate

---

### VR-002: Round-Robin Completeness Rule

**Description**: Validate that each team plays the correct number of games in group stage.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-002-1 | 4 teams, all 6 games present | 4-team group, 6 Vorrunde games | No error |
| VR-002-2 | 4 teams, missing 1 game | 4-team group, 5 Vorrunde games | Error: "Team 0_X plays Y games, expected 3" |
| VR-002-3 | 4 teams, duplicate game | Same matchup appears twice | Warning: "Duplicate matchup" |
| VR-002-4 | 2 groups of 4 | 12 group games total | Validate per-group |
| VR-002-5 | 3 teams in group | 3 games expected | No error if all present |

**Acceptance Criteria**:
- FR-502: Validate all teams play correct number of games

---

### VR-003: Consecutive Games Warning

**Description**: Warn if a team plays back-to-back games without rest.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-003-1 | Team plays slot 1, slot 2 | Same team in consecutive global slots | Warning issued |
| VR-003-2 | Team plays slot 1, slot 3 | One slot gap | No warning |
| VR-003-3 | Team plays on different fields same time | Parallel slots | No warning (physically impossible anyway) |
| VR-003-4 | Officials consecutive | Team officiates, then plays | Warning issued |
| VR-003-5 | Across stage boundary | Last Vorrunde, first Finalrunde | Consider break, may not warn |

**Acceptance Criteria**:
- FR-503: Validate no team plays consecutive games

---

### VR-004: Valid Match Reference Rule

**Description**: Validate that match result references point to existing matches.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-004-1 | Valid reference | "Gewinner HF1" when HF1 exists | No error |
| VR-004-2 | Invalid reference | "Gewinner HF3" when no HF3 | Error: "Match HF3 does not exist" |
| VR-004-3 | Typo in reference | "Gewiner HF1" (typo) | Error: "Unknown reference format" |
| VR-004-4 | Reference to future match | Game A refs "Gewinner A" | Error: "Circular reference" |
| VR-004-5 | Valid group standing | "P2 Gruppe 1" with group 1 | No error |
| VR-004-6 | Invalid group | "P2 Gruppe 3" with only 2 groups | Error: "Gruppe 3 does not exist" |
| VR-004-7 | Invalid place | "P5 Gruppe 1" with 4-team group | Error: "Only 4 places in Gruppe 1" |

**Acceptance Criteria**:
- FR-504: Validate match references are valid

---

### VR-005: Circular Dependency Rule

**Description**: Prevent match references that create cycles.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-005-1 | Self-reference | Game A home: "Gewinner A" | Error: "Circular dependency" |
| VR-005-2 | Two-node cycle | A refs B, B refs A | Error: "Circular dependency: A -> B -> A" |
| VR-005-3 | Three-node cycle | A refs B, B refs C, C refs A | Error detected |
| VR-005-4 | Valid chain | HF refs Vorrunde, P1 refs HF | No error |
| VR-005-5 | Diamond dependency | P1 refs HF1 and HF2 | No error (valid) |

**Acceptance Criteria**:
- FR-505: Validate circular dependencies

---

### VR-006: Field Balance Warning

**Description**: Warn if fields have significantly different game counts.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| VR-006-1 | Balanced (6, 6) | 2 fields, 6 games each | No warning |
| VR-006-2 | Slightly unbalanced (7, 5) | 2 field difference | No warning |
| VR-006-3 | Very unbalanced (10, 2) | Large difference | Warning issued |
| VR-006-4 | Single field | All games on field 1 | No warning (only option) |

---

## JSON Export Tests

### JE-001: Schedule JSON Format

**Description**: Verify exported JSON matches existing schedule_*.json format.

**Test Cases**:

| ID | Scenario | Expected Output |
|----|----------|-----------------|
| JE-001-1 | Simple 4-team schedule | Matches schedule_4_final4_1.json structure |
| JE-001-2 | Field as string vs number | Both "1" and 1 accepted |
| JE-001-3 | Group index format | "0_1" format correct |
| JE-001-4 | Standing reference format | "P2 Gruppe 1" correct |
| JE-001-5 | Match result format | "Gewinner HF1" correct |
| JE-001-6 | Break after included | break_after: 30 in output |
| JE-001-7 | Stage values | "Vorrunde" and "Finalrunde" |
| JE-001-8 | Empty slots | {} or omitted correctly |

**Acceptance Criteria**:
- FR-601: Export template to JSON format
- NFR-302: Compatible JSON output

---

### JE-002: Update Rules JSON Format

**Description**: Verify exported update rules match update_*.json format.

**Test Cases**:

| ID | Scenario | Expected Output |
|----|----------|-----------------|
| JE-002-1 | Simple update rule | Matches update_4_final4_1.json structure |
| JE-002-2 | Pre-finished field | "pre_finished": "Vorrunde" |
| JE-002-3 | Standing place points | place, standing, points fields |
| JE-002-4 | Officials pre_finished | Nested pre_finished for officials |
| JE-002-5 | Multiple games per rule | games array with multiple entries |

**Acceptance Criteria**:
- FR-602: Export update rules to JSON format

---

## JSON Import Tests

### JI-001: Schedule Import

**Description**: Verify all existing schedule templates can be imported.

**Test Cases**:

| ID | File | Expected Result |
|----|------|-----------------|
| JI-001-1 | schedule_4_final4_1.json | Imports successfully, 6 games on 1 field |
| JI-001-2 | schedule_8_3.json | Imports successfully, 2 groups, 3 fields |
| JI-001-3 | schedule_2_1.json | Minimal schedule, 2 teams |
| JI-001-4 | schedule_11_3.json | Large schedule, 11 teams |
| JI-001-5 | All 34 schedule files | Each imports without error |

**Acceptance Criteria**:
- FR-603: Import existing JSON schedules

---

### JI-002: Import Error Handling

**Description**: Verify proper error handling for invalid imports.

**Test Cases**:

| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| JI-002-1 | Invalid JSON syntax | { missing bracket | Error: "Invalid JSON" |
| JI-002-2 | Missing required field | No "stage" field | Error: "Missing field: stage" |
| JI-002-3 | Invalid stage value | "stage": "Unknown" | Error: "Invalid stage" |
| JI-002-4 | Empty file | {} | Warning: "Empty schedule" |
| JI-002-5 | Not an array | { "games": [] } | Error or auto-convert |

---

### JI-003: Round-Trip Consistency

**Description**: Import then export should produce identical output.

**Test Cases**:

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| JI-003-1 | Import schedule_4_final4_1.json | Export matches original |
| JI-003-2 | Import schedule_8_3.json | Export matches original |
| JI-003-3 | Import, edit, revert, export | Matches original |

---

## Component Tests

### CT-001: TemplateConfig Component

**Description**: Test template configuration component.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| CT-001-1 | Initial render | Load component | Default values shown |
| CT-001-2 | Change num teams | Set to 8 | Value updates, groups recalculate |
| CT-001-3 | Invalid num teams | Set to 0 | Input rejected or error shown |
| CT-001-4 | Change num fields | Set to 3 | 3 field columns appear |
| CT-001-5 | Change num groups | Set to 2 | 2 group containers appear |
| CT-001-6 | Game duration | Set to 60 | Duration updates in state |

---

### CT-002: GameSlotCard Component

**Description**: Test game slot card display and editing.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| CT-002-1 | Display game info | Render with data | Home, away, official shown |
| CT-002-2 | Show validation error | Card with error | Red border/indicator |
| CT-002-3 | Click to edit | Click card | Edit modal opens |
| CT-002-4 | Show stage | Render | "Vorrunde" or "Finalrunde" badge |
| CT-002-5 | Show standing | Render | Standing text visible |
| CT-002-6 | Drag handle visible | Render | Drag icon shown |

---

### CT-003: TeamSelector Component

**Description**: Test team selection modal/popover.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| CT-003-1 | Open selector | Click team field | Selector appears |
| CT-003-2 | Show group options | Stage = Vorrunde | Group index options shown |
| CT-003-3 | Show standing options | Stage = Finalrunde | Standing options shown |
| CT-003-4 | Show match options | Stage = Finalrunde | Match result options shown |
| CT-003-5 | Filter options | Type in search | Options filtered |
| CT-003-6 | Select option | Click option | Value updates, selector closes |
| CT-003-7 | Cancel | Click outside | No change, closes |

---

### CT-004: FieldColumn Component

**Description**: Test field column container.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| CT-004-1 | Render games | 5 games on field | 5 GameSlotCards shown |
| CT-004-2 | Show field number | Render | "Field 1" header |
| CT-004-3 | Show times | Render | Calculated times for each slot |
| CT-004-4 | Empty field | No games | Empty state shown |
| CT-004-5 | Add game button | Click add | New game slot created |
| CT-004-6 | Drop zone active | During drag | Visual drop indicator |

---

### CT-005: ValidationPanel Component

**Description**: Test validation error/warning display.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| CT-005-1 | No errors | Valid template | "No issues" message |
| CT-005-2 | Show errors | Invalid template | Error list displayed |
| CT-005-3 | Show warnings | Minor issues | Warning list displayed |
| CT-005-4 | Click error | Click item | Affected game highlighted |
| CT-005-5 | Toggle warnings | Click toggle | Warnings hidden/shown |
| CT-005-6 | Error count | Multiple errors | Count badge shown |

---

## Drag-and-Drop Tests

### DD-001: Reorder Within Field

**Description**: Test dragging game slots to reorder within same field.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| DD-001-1 | Move up | Drag slot 3 to slot 1 | Order: 3, 1, 2 |
| DD-001-2 | Move down | Drag slot 1 to slot 3 | Order: 2, 3, 1 |
| DD-001-3 | Times recalculate | After reorder | Times update correctly |
| DD-001-4 | Visual feedback | During drag | Ghost preview shown |
| DD-001-5 | Cancel drag | Press Escape | No change |
| DD-001-6 | Drop on self | Drag back to same position | No change |

---

### DD-002: Move Between Fields

**Description**: Test dragging game slots between different fields.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| DD-002-1 | Field 1 to Field 2 | Drag across | Game moves to Field 2 |
| DD-002-2 | Insert position | Drop between games | Inserts at position |
| DD-002-3 | Times update | After move | Both fields recalculate |
| DD-002-4 | Field balance | After move | Warning if unbalanced |
| DD-002-5 | Source field empty | Move last game | Empty state shown |

---

### DD-003: Drag Constraints

**Description**: Test that invalid drag operations are prevented.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| DD-003-1 | Drop outside fields | Release outside | Returns to original |
| DD-003-2 | During validation | Drag with errors | Allowed (don't block editing) |
| DD-003-3 | Touch device | Touch and drag | Works on tablet |
| DD-003-4 | Keyboard drag | Tab + Enter | Accessible alternative |

---

## Integration Tests

### IT-001: End-to-End Template Creation

**Description**: Complete workflow of creating a new template.

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| IT-001-1 | 4-team single field | 1. Set 4 teams, 1 field<br>2. Add 6 group games<br>3. Add finals<br>4. Export | Valid JSON matching format |
| IT-001-2 | 8-team two groups | 1. Set 8 teams, 2 groups, 2 fields<br>2. Add round-robin per group<br>3. Add crossover playoffs<br>4. Export | Valid schedule and update JSON |
| IT-001-3 | Import, modify, export | 1. Import existing<br>2. Change one game<br>3. Export | Modified version correct |

---

### IT-002: LocalStorage Persistence

**Description**: Test auto-save and recovery.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| IT-002-1 | Auto-save | Make changes | Saved within 30s |
| IT-002-2 | Refresh recovery | F5 after save | Prompt to restore |
| IT-002-3 | Clear and start fresh | Click "New" | Old state cleared |
| IT-002-4 | Multiple tabs | Open in two tabs | Warning about conflicts |

---

### IT-003: Undo/Redo

**Description**: Test undo/redo functionality.

**Test Cases**:

| ID | Scenario | Action | Expected Result |
|----|----------|--------|-----------------|
| IT-003-1 | Undo add game | Ctrl+Z after add | Game removed |
| IT-003-2 | Redo add game | Ctrl+Y after undo | Game restored |
| IT-003-3 | Undo move | Ctrl+Z after drag | Reverts position |
| IT-003-4 | Multiple undos | 5x Ctrl+Z | All 5 reverted |
| IT-003-5 | Undo limit | 21x undo | Max 20 (oldest lost) |
| IT-003-6 | Undo after save | Save, undo | Still works |

---

## Backend Tests (Phase 2)

### BT-001: Model Tests

**Description**: Test Django model behavior.

**Test Cases**:

| ID | Model | Test | Expected Result |
|----|-------|------|-----------------|
| BT-001-1 | ScheduleTemplate | Create valid | Saved with timestamps |
| BT-001-2 | ScheduleTemplate | Null association | Global template |
| BT-001-3 | TemplateSlot | Unique constraint | No duplicate field/order |
| BT-001-4 | TemplateSlot | to_schedule_json() | Correct format |
| BT-001-5 | TemplateUpdateRule | Foreign keys | Cascade delete works |

---

### BT-002: API Tests

**Description**: Test REST API endpoints.

**Test Cases**:

| ID | Endpoint | Method | Test | Expected Result |
|----|----------|--------|------|-----------------|
| BT-002-1 | /api/designer/templates/ | GET | List templates | 200, paginated list |
| BT-002-2 | /api/designer/templates/ | GET | Filter by association | Only matching templates |
| BT-002-3 | /api/designer/templates/ | POST | Create template | 201, template created |
| BT-002-4 | /api/designer/templates/ | POST | Invalid data | 400, validation errors |
| BT-002-5 | /api/designer/templates/{id}/ | GET | Retrieve with slots | 200, nested slots |
| BT-002-6 | /api/designer/templates/{id}/ | PUT | Update template | 200, updated |
| BT-002-7 | /api/designer/templates/{id}/ | DELETE | Delete template | 204, deleted |
| BT-002-8 | /api/designer/templates/{id}/clone/ | POST | Clone template | 201, new template |
| BT-002-9 | /api/designer/templates/{id}/export/ | POST | Export JSON | 200, file download |
| BT-002-10 | /api/designer/templates/import/ | POST | Import JSON | 201, template created |

---

### BT-003: Permission Tests

**Description**: Test API permission enforcement.

**Test Cases**:

| ID | Scenario | User | Expected Result |
|----|----------|------|-----------------|
| BT-003-1 | List templates | Anonymous | 401 Unauthorized |
| BT-003-2 | List templates | Authenticated | 200, own association |
| BT-003-3 | Create template | Staff | 201 Created |
| BT-003-4 | Delete other's template | Non-owner | 403 Forbidden |
| BT-003-5 | View global template | Any authenticated | 200 OK |
| BT-003-6 | Delete global template | Non-admin | 403 Forbidden |

---

## Test Data Fixtures

### Fixture: Basic 4-Team Template

```json
{
  "numTeams": 4,
  "numFields": 1,
  "numGroups": 1,
  "gameDuration": 70,
  "slots": [
    {"field": 1, "order": 1, "stage": "Vorrunde", "standing": "Spiel 1", "home": "0_0", "away": "0_1", "official": "0_2"},
    {"field": 1, "order": 2, "stage": "Vorrunde", "standing": "Spiel 2", "home": "0_2", "away": "0_3", "official": "0_0"},
    {"field": 1, "order": 3, "stage": "Finalrunde", "standing": "Spiel 3", "home": "Verlierer Spiel 1", "away": "Verlierer Spiel 2", "official": "Gewinner Spiel 1"},
    {"field": 1, "order": 4, "stage": "Finalrunde", "standing": "Spiel 4", "home": "Gewinner Spiel 1", "away": "Gewinner Spiel 2", "official": "Verlierer Spiel 3"},
    {"field": 1, "order": 5, "stage": "Finalrunde", "standing": "Spiel 5", "home": "Verlierer Spiel 4", "away": "Gewinner Spiel 3", "official": "Verlierer Spiel 3"},
    {"field": 1, "order": 6, "stage": "Finalrunde", "standing": "P1", "home": "Gewinner Spiel 5", "away": "Gewinner Spiel 4", "official": "Verlierer Spiel 5"}
  ]
}
```

### Fixture: 8-Team Two-Group Template

```json
{
  "numTeams": 8,
  "numFields": 3,
  "numGroups": 2,
  "gameDuration": 70,
  "groups": [
    {"index": 0, "name": "Gruppe 1", "teamCount": 4},
    {"index": 1, "name": "Gruppe 2", "teamCount": 4}
  ]
}
```

### Fixture: Validation Error Cases

```json
{
  "officialPlaying": {
    "home": "0_0",
    "away": "0_1",
    "official": "0_0"
  },
  "missingGames": {
    "numTeams": 4,
    "slots": [
      {"home": "0_0", "away": "0_1"},
      {"home": "0_2", "away": "0_3"}
    ]
  },
  "invalidReference": {
    "home": "Gewinner HF3"
  },
  "circularDependency": [
    {"standing": "A", "home": "Gewinner B"},
    {"standing": "B", "home": "Gewinner A"}
  ]
}
```

---

## Coverage Targets

| Component | Target Coverage | Priority |
|-----------|-----------------|----------|
| Validation Rules | 95% | High |
| JSON Export | 90% | High |
| JSON Import | 90% | High |
| React Components | 80% | Medium |
| Drag-and-Drop | 70% | Medium |
| Integration Tests | N/A (E2E) | High |
| Django Models | 90% | Medium (Phase 2) |
| DRF APIs | 85% | Medium (Phase 2) |

---

## Test Environment Setup

### Frontend (Vitest)

```bash
# Install dependencies
npm --prefix gameday_designer/ install

# Run tests
npm --prefix gameday_designer/ run test

# Run with coverage
npm --prefix gameday_designer/ run test:coverage
```

### Backend (pytest - Phase 2)

```bash
# Run tests
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest gameday_designer/

# Run with coverage
pytest gameday_designer/ --cov=gameday_designer --cov-report=html
```
