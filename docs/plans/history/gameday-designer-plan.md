# Gameday Designer - Feature Plan

## Overview
A visual drag-and-drop designer for creating gameday schedules, replacing the existing JSON-based approach. This feature targets league managers (non-technical users) and provides reusable templates.

## MVP Approach: Standalone Visual Editor First

The MVP focuses on a **standalone visual editor** that validates basic design principles and business rules before any backend integration. This allows rapid iteration on UX and rule validation.

### Business Rules to Validate (derived from existing templates & ODS files)

#### Tournament Structures
1. **Groups (Vorrunde)** - Round-robin within groups
   - Each team plays every other team in their group once
   - Teams identified by `groupIndex_teamIndex` (e.g., "0_0", "1_2")

2. **Playoffs (Finalrunde)** - Bracket-style elimination
   - Winners advance: "Gewinner HF1", "Gewinner Spiel 3"
   - Placement matches: "P1" (finals), "P3" (3rd place), "P5", "P7"

3. **Playdowns** - Losers bracket
   - Losers advance: "Verlierer HF1", "Verlierer Spiel 2"
   - Determines lower placements

4. **Standings References**
   - Group standings: "P1 Gruppe 1", "P2 Gruppe 2" (place within group)
   - Match results: "Gewinner/Verlierer {MatchName}"

#### Validation Rules
- Each team plays the correct number of games per stage
- Officials are never playing in the same game they officiate
- No team plays two consecutive games (if possible)
- Fields are balanced (similar number of games per field)
- Time slots don't overlap for the same team

---

## Architecture

### Phase 1: MVP - Standalone React Editor (No Backend)

**Goal**: Validate UX and business rules with local state only

```
gameday_designer/
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── DesignerCanvas.tsx      # Main drag-drop canvas
│   │   ├── FieldColumn.tsx         # Single field with game slots
│   │   ├── GameSlotCard.tsx        # Draggable game card
│   │   ├── TeamSelector.tsx        # Team placeholder picker
│   │   ├── TemplateConfig.tsx      # Template settings panel
│   │   ├── ValidationPanel.tsx     # Shows rule violations
│   │   └── __tests__/
│   ├── hooks/
│   │   ├── useDesigner.ts          # Main state management
│   │   ├── useValidation.ts        # Business rule validation
│   │   └── useDragDrop.ts          # DnD logic
│   ├── validation/
│   │   ├── rules.ts                # All validation rules
│   │   ├── groupRules.ts           # Group stage rules
│   │   └── playoffRules.ts         # Playoff/playdown rules
│   ├── types/
│   │   └── designer.ts             # TypeScript types
│   └── utils/
│       └── exportJson.ts           # Export to JSON format
├── package.json
├── vite.config.mts
└── tsconfig.json
```

#### MVP Features
1. Configure template: num_teams, num_fields, num_groups, game_duration
2. Drag-and-drop game cards between fields
3. Select team placeholders (group_team or result reference)
4. Real-time validation with error highlighting
5. Export to JSON (compatible with existing schedule format)
6. Import existing JSON schedules for editing

#### MVP Tech Stack
- React 19 + TypeScript
- Vite for bundling
- `@dnd-kit/core` for drag-and-drop
- `react-bootstrap` for UI
- Local state only (no API calls)
- Vitest for testing

---

### Phase 2: Backend Integration

**After MVP validation**, add Django backend:

#### Models

```python
class ScheduleTemplate(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    num_teams = models.PositiveIntegerField()
    num_fields = models.PositiveIntegerField()
    num_groups = models.PositiveIntegerField(default=1)
    game_duration = models.PositiveIntegerField(default=70)
    association = models.ForeignKey('gamedays.Association', on_delete=models.CASCADE,
                                     null=True, blank=True)  # NULL = global
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class TemplateSlot(models.Model):
    template = models.ForeignKey(ScheduleTemplate, on_delete=models.CASCADE, related_name='slots')
    field = models.PositiveIntegerField()
    slot_order = models.PositiveIntegerField()
    stage = models.CharField(max_length=50)  # "Vorrunde", "Finalrunde"
    standing = models.CharField(max_length=100)

    # Team references
    home_group = models.PositiveIntegerField(null=True)
    home_team = models.PositiveIntegerField(null=True)
    home_reference = models.CharField(max_length=100, blank=True)

    away_group = models.PositiveIntegerField(null=True)
    away_team = models.PositiveIntegerField(null=True)
    away_reference = models.CharField(max_length=100, blank=True)

    official_group = models.PositiveIntegerField(null=True)
    official_team = models.PositiveIntegerField(null=True)
    official_reference = models.CharField(max_length=100, blank=True)

    break_after = models.PositiveIntegerField(default=0)

class TemplateUpdateRule(models.Model):
    template = models.ForeignKey(ScheduleTemplate, on_delete=models.CASCADE, related_name='update_rules')
    slot = models.ForeignKey(TemplateSlot, on_delete=models.CASCADE)
    pre_finished = models.CharField(max_length=100)

    home_standing = models.CharField(max_length=100)
    home_place = models.PositiveIntegerField()
    home_points = models.PositiveIntegerField(null=True)

    away_standing = models.CharField(max_length=100)
    away_place = models.PositiveIntegerField()
    away_points = models.PositiveIntegerField(null=True)
```

#### API Endpoints
```
GET    /api/designer/templates/              # List templates
POST   /api/designer/templates/              # Create template
GET    /api/designer/templates/{id}/         # Get template with slots
PUT    /api/designer/templates/{id}/         # Update template
DELETE /api/designer/templates/{id}/         # Delete template
POST   /api/designer/templates/{id}/apply/   # Apply to gameday
POST   /api/designer/templates/{id}/clone/   # Clone template
```

---

### Phase 3: Migration & Integration

1. Create `migrate_json_schedules` management command
2. Convert existing `schedule_*.json` and `update_*.json` to database
3. Mark migrated templates as global (association=NULL)
4. Integrate with existing gameday creation workflow

---

## Design Decisions

1. **Template Sharing**: Global + Local
   - Global templates (association=NULL) visible to all
   - Association-specific templates only for that association

2. **Update Rules UI**: Advanced Editor
   - Separate "Advanced" tab for power users
   - Default users don't need to touch this

3. **Preset Templates**: Migrate existing JSON
   - Convert all existing `schedule_*.json` files
   - These become global templates

---

## Reference Files

### Existing Schedule Logic
- `gamedays/management/schedule_manager.py` - Schedule creation
- `gamedays/management/schedule_update.py` - Update rules
- `gamedays/management/schedules/*.json` - ~34 schedule templates

### Business Documentation
- `feature-dev/Leaguesphere - generische Spielpläne.ods`
- `feature-dev/5er DFFL Generische Spielpläne.ods`

### Existing JSON Format Example
```json
[
  {
    "field": "1",
    "games": [
      {
        "stage": "Vorrunde",
        "standing": "Gruppe 1",
        "home": "0_0",
        "away": "0_1",
        "official": "1_3"
      },
      {
        "stage": "Finalrunde",
        "standing": "HF",
        "home": "P2 Gruppe 2",
        "away": "P1 Gruppe 1",
        "official": "P4 Gruppe 2"
      }
    ]
  }
]
```

---

## Implementation Roadmap

### MVP Phase (Standalone Editor)
1. [ ] Initialize React app with Vite
2. [ ] Implement TypeScript types for schedule model
3. [ ] Build DesignerCanvas with FieldColumn layout
4. [ ] Create draggable GameSlotCard component
5. [ ] Add TeamSelector for placeholder selection
6. [ ] Implement validation rules engine
7. [ ] Add ValidationPanel with error display
8. [ ] Export to JSON functionality
9. [ ] Import existing JSON functionality
10. [ ] Write tests for validation rules

### Backend Phase
1. [ ] Create Django app `gameday_designer`
2. [ ] Implement models with migrations
3. [ ] Create DRF serializers and viewsets
4. [ ] Add API endpoints
5. [ ] Connect React app to API
6. [ ] Write backend tests

### Migration Phase
1. [ ] Create `migrate_json_schedules` command
2. [ ] Test migration with all existing templates
3. [ ] Integrate with gameday creation workflow
