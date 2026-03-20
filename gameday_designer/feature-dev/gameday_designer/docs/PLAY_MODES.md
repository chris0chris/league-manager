# Tournament Play Modes Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Tournament Structure Overview](#tournament-structure-overview)
3. [Supported Tournament Formats](#supported-tournament-formats)
4. [Group Stage Configurations](#group-stage-configurations)
5. [Playoff Structures](#playoff-structures)
6. [Game Reference System](#game-reference-system)
7. [Scheduling and Field Management](#scheduling-and-field-management)
8. [Referee Assignment](#referee-assignment)
9. [Placement Games](#placement-games)
10. [Format Examples](#format-examples)
11. [Developer Reference](#developer-reference)

---

## Introduction

The Gameday Designer tournament system supports flexible flag football tournament configurations ranging from simple 3-team round robins to complex 9-team multi-group tournaments with playoff brackets. This documentation explains the various tournament modes, their structures, and how they operate.

### Key Features

- **Multiple tournament formats** supporting 3-9+ teams
- **Group stage play** with single or double round robin
- **Playoff brackets** with various elimination formats
- **Parallel field scheduling** for efficient time usage
- **Automatic referee assignment** from non-playing teams
- **Dynamic team progression** based on game results
- **Placement games** to determine final standings

---

## Tournament Structure Overview

### Hierarchy

Every tournament consists of the following hierarchical components:

```
Tournament
├── Groups (1 or more divisions)
│   └── Teams (3-4 per group typically)
├── Phases (sequential stages)
│   ├── Group Stage (Round Robin)
│   ├── Playoffs (Elimination brackets)
│   └── Placement Rounds (Final position determination)
└── Fields (1-3 concurrent playing areas)
```

### Core Components

| Component | Description |
|-----------|-------------|
| **Tournament** | The overall competition event container |
| **Group** | A subdivision of teams that play round robin against each other |
| **Team** | A participating unit, assigned to exactly one group |
| **Game/Match** | A single contest between two teams |
| **Timeslot** | A scheduled time window for games across all fields |
| **Field** | A physical playing location; multiple games can run in parallel |
| **Phase** | A stage of the tournament (group stage, playoffs, placement) |

### Tournament Phases

Tournaments progress through distinct phases:

1. **Group Stage**: Teams within each group play against each other (round robin)
2. **Playoffs**: Top teams from groups compete in elimination brackets
3. **Placement**: Remaining teams play to determine final standings (5th/6th, 7th/8th, etc.)

---

## Supported Tournament Formats

### Format Overview

The system supports 12 different tournament formats, classified by complexity:

| Format Code | Teams | Groups | Fields | Structure | Complexity |
|-------------|-------|--------|--------|-----------|------------|
| **F3-1-1-DR** | 3 | 1 | 1 | Double Round Robin | Simple |
| **F3-1-1-SR** | 3 | 1 | 1 | Single Round Robin | Simple |
| **F4-1-1-RR** | 4 | 1 | 1 | Round Robin | Simple |
| **F4-1-1-DE** | 4 | 1 | 1 | Double Elimination | Medium |
| **F5-1-2-RR** | 5 | 1 | 2 | Round Robin (2 fields) | Medium |
| **F6-2-2** | 6 | 2 | 2 | Groups → Playoffs | Medium |
| **F7-2-2** | 7 | 2 | 2 | Unbalanced Groups → Playoffs | Complex |
| **F8-1-2-DV** | 8 | 1 | 2 | Double Victory | Complex |
| **F8-2-2** | 8 | 2 | 2 | Groups → Playoffs | Medium |
| **F8-2-3** | 8 | 2 | 3 | Groups → Playoffs (3 fields) | Complex |
| **F9-3-2** | 9 | 3 | 2 | 3 Groups → Playoffs | Complex |
| **F9-3-3** | 9 | 3 | 3 | 3 Groups → Playoffs (3 fields) | Complex |

### Format Naming Convention

Format codes follow the pattern: **F{teams}-{groups}-{fields}-{type}**

- **F** = Format identifier
- **{teams}** = Total number of teams
- **{groups}** = Number of groups in group stage
- **{fields}** = Number of concurrent playing fields
- **{type}** = Special structure (DR=Double Round Robin, SR=Single, DE=Double Elimination, DV=Double Victory)

---

## Group Stage Configurations

### Team Distribution Patterns

Different tournament sizes use different group configurations:

| Total Teams | Number of Groups | Distribution | Balance |
|-------------|------------------|--------------|---------|
| 3-5 | 1 | All teams in one group | N/A |
| 6 | 2 | 3 + 3 | Balanced |
| 7 | 2 | 4 + 3 | Unbalanced |
| 8 | 2 | 4 + 4 | Balanced |
| 9 | 3 | 3 + 3 + 3 | Balanced |

### Round Robin Variants

#### Single Round Robin

- Each team plays every other team **once**
- **Use cases**: Quick tournaments, time-constrained events, odd team counts
- **Example**: 3 teams (A, B, C) = 3 games (A-B, A-C, B-C)

#### Double Round Robin

- Each team plays every other team **twice** (home and away)
- **Use cases**: More comprehensive results, fairer standings determination
- **Example**: 3 teams (A, B, C) = 6 games (A-B, B-A, A-C, C-A, B-C, C-B)

#### Partial Round Robin

- Subset of all possible matchups
- **Use cases**: Extremely time-constrained events

### Group Stage Example

**6-Team Tournament (2 Groups)**

```
Group A          Group B
--------         --------
Team A1          Team B1
Team A2          Team B2
Team A3          Team B3

Group A Games:   Group B Games:
A1 vs A2        B1 vs B2
A1 vs A3        B1 vs B3
A2 vs A3        B2 vs B3
```

After round robin, standings determine playoff seeding:
- P1 Group A (1st place in Group A)
- P2 Group A (2nd place in Group A)
- P3 Group A (3rd place in Group A)
- etc.

---

## Playoff Structures

### Elimination Types

The system supports several elimination formats:

| Type | Rule | Description |
|------|------|-------------|
| **Single Elimination** | 1 loss = out | Winners advance to next round, losers go to placement games |
| **Double Elimination** | 2 losses = out | Winners bracket + Losers bracket; second chance for teams |
| **Double Victory** | 2 wins = advance | Modified format focusing on advancement; requires 2 wins to progress |

### Standard Playoff Bracket

**Example: 8 Teams, 2 Groups**

```
                    SEMIFINALS
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
P1 Group A ──┐                            ┌── P1 Group B
             ├── Semifinal 1              │
P2 Group B ──┘                            └── P2 Group A
                                               │
                                               ├── Semifinal 2
                                               │
                    FINALS
                       │
        ┌──────────────┴──────────────┐
        │                             │
    Winner SF1 ──────┬──── FINAL      │
                     │                │
    Winner SF2 ──────┘                │
                                      │
                                3RD PLACE
                                      │
                    ┌─────────────────┘
                    │
    Loser SF1 ──────┬──── 3rd Place Game
                    │
    Loser SF2 ──────┘
```

### Cross-Bracket Seeding Rule

To ensure competitive balance and prevent early matchups of teams from the same group:

- **1st place of Group A** plays **2nd place of Group B**
- **1st place of Group B** plays **2nd place of Group A**

This prevents teams from the same group from meeting until the final.

### Playoff Progression Examples

#### 6-Team Tournament (2 Groups of 3)

```
Group Stage Results:
Group A: A1 (1st), A2 (2nd), A3 (3rd)
Group B: B1 (1st), B2 (2nd), B3 (3rd)

Playoff Bracket:
Semifinal 1: A1 vs B2
Semifinal 2: B1 vs A2

Final: Winner(SF1) vs Winner(SF2)
3rd Place: Loser(SF1) vs Loser(SF2)
5th Place: A3 vs B3
```

#### 9-Team Tournament (3 Groups of 3)

```
Group Stage Results:
Group A: A1, A2, A3
Group B: B1, B2, B3
Group C: C1, C2, C3

Playoff Seeding:
- 2 best P1 teams → Direct to semifinals (bye)
- Worst P1 team → Playoff qualifier round
- All P2 teams → Playoff qualifier round

Playoff Qualifier:
Game 1: Best P2 vs Worst P1
Game 2: 2nd Best P2 vs 3rd Best P2

Semifinals:
SF1: Best P1 vs Winner(Game 1)
SF2: 2nd Best P1 vs Winner(Game 2)

Final: Winner(SF1) vs Winner(SF2)
```

---

## Game Reference System

### Overview

In playoff and placement phases, teams are not fixed at tournament creation. Instead, games use **references** that are resolved based on previous results.

### Reference Types

| Reference Type | German Notation | English | Example | Description |
|----------------|-----------------|---------|---------|-------------|
| **Winner Reference** | G Spiel X | W Game X | W Game 1 | Winner of a specific game |
| **Loser Reference** | V Spiel X | L Game X | L Game 3 | Loser of a specific game |
| **Group Position** | P# Gruppe | P# Group | P1 A | Specific position in a group (1st place in Group A) |
| **Best of Position** | Bester P# | Best P# | Best P1 | Best team of a position across multiple groups |
| **Worst of Position** | Schlechtester P# | Worst P# | Worst P2 | Worst team of a position across groups |

### Dynamic Team Assignment

Games transition through states as references are resolved:

```
SCHEDULED → TEAMS_ASSIGNED → IN_PROGRESS → COMPLETED
```

#### Example: Semifinal Game

```
Game: Semifinal 1 (SCHEDULED)
├── Home Team: TeamReference(type=position, group=A, position=1)
├── Away Team: TeamReference(type=position, group=B, position=2)
└── Referee: TeamReference(type=position, group=B, position=4)

After Group Stage Completes → (TEAMS_ASSIGNED)
├── Home Team: Lightning FC (finished 1st in Group A)
├── Away Team: Thunder United (finished 2nd in Group B)
└── Referee: Storm SC (finished 4th in Group B)
```

#### Example: Final Game

```
Game: Final (SCHEDULED)
├── Home Team: TeamReference(type=winner, source_game=Semifinal 1)
├── Away Team: TeamReference(type=winner, source_game=Semifinal 2)
└── Referee: TeamReference(type=winner, source_game=3rd Place Game)

After Semifinals Complete → (TEAMS_ASSIGNED)
├── Home Team: Lightning FC (won Semifinal 1)
├── Away Team: Phoenix FC (won Semifinal 2)
└── Referee: Thunder United (won 3rd Place Game)
```

### Cross-Group Comparisons

When comparing teams across groups (e.g., "Best P1"), the system uses tiebreaker criteria:

1. **Total Points** (wins/losses)
2. **Point Differential** (points scored - points allowed)
3. **Points Scored**
4. **Points Allowed**
5. **Head-to-Head** (if applicable)

#### Example: 9-Team Tournament P1 Comparison

```
Group A: P1 = Team A1 (3-0, +45 point diff)
Group B: P1 = Team B1 (3-0, +52 point diff)
Group C: P1 = Team C1 (2-1, +38 point diff)

Ranking:
1. Best P1: Team B1 (3-0, +52) → Semifinal bye
2. 2nd Best P1: Team A1 (3-0, +45) → Semifinal bye
3. Worst P1: Team C1 (2-1, +38) → Playoff qualifier
```

---

## Scheduling and Field Management

### Timeslot Structure

Each timeslot represents a scheduled window when games occur:

| Component | Standard | Extended |
|-----------|----------|----------|
| **Game Duration** | 50 minutes | 50 minutes |
| **Break Between Games** | 10-20 minutes | 30-50 minutes |
| **Total Timeslot** | 60-70 minutes | 80-100 minutes |

### Parallel Field Scheduling

Multiple fields allow simultaneous games:

```
Timeslot 10:00 (70 minutes)
├── Field 1: Team A1 vs A2 (Referee: B3)
├── Field 2: Team B1 vs B2 (Referee: A3)
└── Field 3: Team C1 vs C2 (Referee: A4)

Timeslot 11:10 (70 minutes)
├── Field 1: Team A3 vs A4 (Referee: B1)
├── Field 2: Team B3 vs B4 (Referee: C1)
└── Field 3: Team C3 vs C4 (Referee: A1)
```

### Scheduling Constraints

The scheduling system enforces several rules:

| Priority | Constraint | Description |
|----------|------------|-------------|
| **Hard** | No double-booking | A team cannot play on multiple fields simultaneously |
| **Hard** | No dual duty | A team cannot play and referee in the same timeslot |
| **Hard** | Referee availability | Only non-playing teams can be assigned as referees |
| **Soft** | Rest periods | Minimum time between consecutive games for same team |
| **Soft** | Back-to-back limit | Avoid teams playing in consecutive timeslots |
| **Soft** | Field balance | Distribute games evenly across all fields |

### Known Scheduling Challenges

Some configurations have inherent limitations:

| Configuration | Issue | Recommendation |
|---------------|-------|----------------|
| **5 teams, 2 fields** | No rest; teams must referee both fields | Accept limitation or use 1 field |
| **6 teams in playoffs** | Unequal game counts | 3rd place teams referee multiple games |
| **7 teams (4+3 split)** | Unbalanced groups | Some teams may play back-to-back |

---

## Referee Assignment

### Assignment Principles

1. **Non-playing teams referee**: Teams not scheduled in a timeslot are assigned referee duty
2. **Fair rotation**: Referee assignments distributed evenly across all teams
3. **Multi-field coverage**: In some cases, one team may need to cover multiple fields (undesirable but sometimes necessary)

### Assignment Patterns

| Scenario | Fields | Playing Teams | Available Referees | Assignment |
|----------|--------|---------------|-------------------|------------|
| 4 teams, 1 field | 1 | 2 | 2 | 2 teams ref (1 primary, 1 backup) |
| 6 teams, 2 fields | 2 | 4 | 2 | 2 teams ref (1 per field) |
| 8 teams, 3 fields | 3 | 6 | 2 | 2 teams ref (must cover 3 fields) |

### Referee Assignment Example

**6-Team Tournament, 2 Fields**

```
Timeslot 1:
├── Field 1: A1 vs A2 → Referee: B1
└── Field 2: B2 vs B3 → Referee: A3

Timeslot 2:
├── Field 1: A1 vs A3 → Referee: B2
└── Field 2: B1 vs B3 → Referee: A2

Timeslot 3:
├── Field 1: A2 vs A3 → Referee: B3
└── Field 2: B1 vs B2 → Referee: A1
```

Each team referees exactly once during the group stage.

### Referee Tracking

The system tracks:
- Which team referees which game
- Total referee assignments per team
- Simultaneous referee obligations (flagged as problematic)
- Referee availability based on game schedule

---

## Placement Games

### Purpose

Placement games determine final standings for all positions, not just the winner. This ensures every team finishes with a defined rank.

### Standard Placement Structure

**8-Team Tournament Example**

| Game | Participants | Determines |
|------|--------------|------------|
| **Final** | W(SF1) vs W(SF2) | 1st / 2nd place |
| **3rd Place** | L(SF1) vs L(SF2) | 3rd / 4th place |
| **5th Place** | P3 Group A vs P3 Group B | 5th / 6th place |
| **7th Place** | P4 Group A vs P4 Group B | 7th / 8th place |

### Complete Bracket Visualization

```
                        FINALS
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
    Winner SF1                            Winner SF2
        │                                     │
        └──────────┬────────────────┬─────────┘
                   │                │
               1st Place        2nd Place


                    3RD PLACE
                        │
        ┌───────────────┴───────────────┐
        │                               │
    Loser SF1                       Loser SF2
        │                               │
        └────────┬──────────────┬───────┘
                 │              │
             3rd Place      4th Place


                    5TH PLACE
                        │
        ┌───────────────┴───────────────┐
        │                               │
    P3 Group A                      P3 Group B
        │                               │
        └────────┬──────────────┬───────┘
                 │              │
             5th Place      6th Place


                    7TH PLACE
                        │
        ┌───────────────┴───────────────┐
        │                               │
    P4 Group A                      P4 Group B
        │                               │
        └────────┬──────────────┬───────┘
                 │              │
             7th Place      8th Place
```

### Complex Placement

**9-Team Tournament**

For tournaments with 3 groups, placement is more complex:

```
Places 1-4: Determined by playoff bracket (similar to 8-team)

Places 5-6: Based on playoff round losers

Places 7-9: Round robin among all 3rd-place finishers
  - P3 Group A vs P3 Group B
  - P3 Group A vs P3 Group C
  - P3 Group B vs P3 Group C
  - Rankings determine 7th, 8th, 9th
```

---

## Format Examples

### Example 1: Simple 4-Team Round Robin (F4-1-1-RR)

**Configuration**
- Teams: 4 (Alpha, Beta, Gamma, Delta)
- Groups: 1
- Fields: 1
- Structure: Single round robin

**Schedule**

```
Timeslot 1 (10:00-11:10)
  Field 1: Alpha vs Beta (Ref: Gamma)

Timeslot 2 (11:10-12:20)
  Field 1: Gamma vs Delta (Ref: Alpha)

Timeslot 3 (12:20-13:30)
  Field 1: Alpha vs Gamma (Ref: Beta)

Timeslot 4 (13:30-14:40)
  Field 1: Beta vs Delta (Ref: Alpha)

Timeslot 5 (14:40-15:50)
  Field 1: Alpha vs Delta (Ref: Gamma)

Timeslot 6 (15:50-17:00)
  Field 1: Beta vs Gamma (Ref: Delta)
```

**Results**: Final standings based on wins/losses and point differential.

---

### Example 2: 6-Team Groups with Playoffs (F6-2-2)

**Configuration**
- Teams: 6 (A1, A2, A3, B1, B2, B3)
- Groups: 2 (Group A, Group B)
- Fields: 2
- Structure: Group stage → Playoffs

**Phase 1: Group Stage**

```
Timeslot 1 (10:00-11:10)
  Field 1: A1 vs A2 (Ref: B3)
  Field 2: B1 vs B2 (Ref: A3)

Timeslot 2 (11:10-12:20)
  Field 1: A1 vs A3 (Ref: B2)
  Field 2: B1 vs B3 (Ref: A2)

Timeslot 3 (12:20-13:30)
  Field 1: A2 vs A3 (Ref: B1)
  Field 2: B2 vs B3 (Ref: A1)
```

**Standings After Group Stage**

```
Group A          Points    Group B          Points
-------          ------    -------          ------
A1 (P1)           6        B1 (P1)           6
A2 (P2)           3        B2 (P2)           3
A3 (P3)           0        B3 (P3)           0
```

**Phase 2: Playoffs**

```
Timeslot 4 (13:30-14:40) - Semifinals
  Field 1: A1 vs B2 [SF1] (Ref: A3)
  Field 2: B1 vs A2 [SF2] (Ref: B3)

Timeslot 5 (14:40-15:50) - Finals
  Field 1: W(SF1) vs W(SF2) [Final] (Ref: W(5th Place))
  Field 2: A3 vs B3 [5th Place] (Ref: L(SF2))

Timeslot 6 (15:50-17:00) - Championship
  Field 1: L(SF1) vs L(SF2) [3rd Place] (Ref: L(5th Place))
```

**Final Standings**: 1st through 6th determined by playoff results.

---

### Example 3: 9-Team Multi-Group Tournament (F9-3-3)

**Configuration**
- Teams: 9 (A1-A3, B1-B3, C1-C3)
- Groups: 3 (Group A, B, C)
- Fields: 3
- Structure: Group stage → Playoff qualifiers → Playoffs → Placement

**Phase 1: Group Stage** (3 timeslots, all groups play simultaneously)

```
Timeslot 1 (10:00-11:10)
  Field 1: A1 vs A2 (Ref: C3)
  Field 2: B1 vs B2 (Ref: A3)
  Field 3: C1 vs C2 (Ref: B3)

Timeslot 2 (11:10-12:20)
  Field 1: A1 vs A3 (Ref: C2)
  Field 2: B1 vs B3 (Ref: A2)
  Field 3: C1 vs C3 (Ref: B2)

Timeslot 3 (12:20-13:30)
  Field 1: A2 vs A3 (Ref: C1)
  Field 2: B2 vs B3 (Ref: A1)
  Field 3: C2 vs C3 (Ref: B1)
```

**Standings After Group Stage**

```
Group A    Pts    Group B    Pts    Group C    Pts
A1         6      B1         6      C1         4
A2         3      B2         3      C2         3
A3         0      B3         0      C3         0

Cross-Group P1 Ranking (by point differential):
1. Best P1: B1 (+52 diff) → Semifinal bye
2. 2nd Best P1: A1 (+45 diff) → Semifinal bye
3. Worst P1: C1 (+38 diff) → Playoff qualifier

P2 Ranking:
1. Best P2: A2 (+12 diff)
2. 2nd Best P2: B2 (+8 diff)
3. Worst P2: C2 (+5 diff)
```

**Phase 2: Playoff Qualifiers**

```
Timeslot 4 (13:30-14:40)
  Field 1: Best P2 (A2) vs Worst P1 (C1) [PQ1]
  Field 2: 2nd Best P2 (B2) vs Worst P2 (C2) [PQ2]
  Field 3: (Rest/Setup)
```

**Phase 3: Semifinals**

```
Timeslot 5 (14:40-15:50)
  Field 1: Best P1 (B1) vs W(PQ1) [SF1]
  Field 2: 2nd Best P1 (A1) vs W(PQ2) [SF2]
  Field 3: (Rest/Setup)
```

**Phase 4: Finals and Placement**

```
Timeslot 6 (15:50-17:00)
  Field 1: W(SF1) vs W(SF2) [Final - 1st/2nd]
  Field 2: L(SF1) vs L(SF2) [3rd Place - 3rd/4th]
  Field 3: L(PQ1) vs L(PQ2) [5th Place - 5th/6th]

Timeslot 7 (17:00-18:10) - Places 7-9 Round Robin Start
  Field 1: A3 vs B3
  Field 2: A3 vs C3
  Field 3: (Setup)

Timeslot 8 (18:10-19:20) - Places 7-9 Round Robin End
  Field 1: B3 vs C3
```

**Final Standings**: 1st through 9th fully determined.

---

## Developer Reference

### Database Schema Overview

The tournament system uses the following key entities:

#### Core Entities

**Tournament**
- `id`, `name`, `date`, `format_id`, `status`
- Contains overall tournament configuration

**TournamentFormat**
- `id`, `name`, `team_count`, `group_count`, `field_count`, `structure_type`
- Template defining tournament structure

**Group**
- `id`, `tournament_id`, `name`, `team_count`
- Subdivision for round robin play

**Team**
- `id`, `name`, `group_id`, `seed`
- Participating teams

**Phase**
- `id`, `tournament_id`, `type` (group/playoff/placement), `sequence`
- Tournament stages

**Game**
- `id`, `phase_id`, `field_id`, `timeslot_id`, `home_team_ref`, `away_team_ref`, `referee_team_ref`, `status`
- Individual matches

**TeamReference**
- `id`, `type` (fixed/winner/loser/position), `source_game_id`, `source_group_id`, `position`
- Dynamic team assignment system

**Timeslot**
- `id`, `tournament_id`, `start_time`, `end_time`, `sequence`
- Scheduled time windows

**Field**
- `id`, `tournament_id`, `name`
- Playing locations

**GameResult**
- `game_id`, `home_score`, `away_score`, `winner_team_id`
- Game outcomes

**Standing**
- `team_id`, `group_id`, `phase_id`, `position`, `points`, `wins`, `losses`, `point_diff`
- Team standings

### Team Reference Resolution

The TeamReference system is critical for playoff scheduling:

```python
# Example: Resolving a playoff game's teams

game = Game.objects.get(id=15)  # Semifinal 1

# Home team reference
home_ref = game.home_team_ref
if home_ref.type == 'position':
    # Get 1st place team from Group A
    home_team = Standing.objects.filter(
        group_id=home_ref.source_group_id,
        position=home_ref.position
    ).first().team
elif home_ref.type == 'winner':
    # Get winner of previous game
    home_team = GameResult.objects.get(
        game_id=home_ref.source_game_id
    ).winner_team

# Transition game state
game.home_team = home_team
game.away_team = resolve_reference(game.away_team_ref)
game.status = 'TEAMS_ASSIGNED'
game.save()
```

### Game State Machine

```
SCHEDULED
    ↓
TEAMS_ASSIGNED (when all TeamReferences resolved)
    ↓
IN_PROGRESS (game started)
    ↓
COMPLETED (final score recorded)

(CANCELLED can happen from any state)
```

### Validation Rules

**Schedule Validation**
- No team plays on multiple fields simultaneously
- No team referees and plays in same timeslot
- All teams have roughly equal rest periods
- Referee assignments are balanced

**Progression Validation**
- All TeamReferences can be resolved when source games complete
- No circular dependencies in game references
- All positions are determined by tournament end

**Format Validation**
- Team count matches format requirements
- Sufficient fields for parallel games
- Total duration fits venue availability

### Tiebreaker Algorithm

```python
def compare_teams_across_groups(teams):
    """
    Compare teams from different groups for playoff seeding.

    Returns: Ordered list of teams
    """
    # Sort by:
    # 1. Total points (descending)
    # 2. Point differential (descending)
    # 3. Points scored (descending)
    # 4. Points allowed (ascending)
    # 5. Head-to-head if applicable

    return sorted(teams, key=lambda t: (
        -t.points,
        -t.point_differential,
        -t.points_scored,
        t.points_allowed
    ))
```

### Template System

Tournament formats are stored as reusable templates:

```python
# Example: Creating tournament from template

template = TournamentFormat.objects.get(code='F6-2-2')

tournament = Tournament.objects.create(
    name="Summer Championship",
    format=template,
    start_time="2025-06-15 10:00:00"
)

# Template includes:
# - Group definitions (2 groups of 3)
# - Game schedule structure
# - Timeslot templates
# - Progression rules (P1 vs P2 of other group)

# Instantiation process:
# 1. Create groups from template
# 2. Assign teams to groups
# 3. Generate timeslots based on start time
# 4. Create games with TeamReferences
# 5. As games complete, resolve references
```

### API Endpoints

**Key endpoints for tournament management:**

```
GET    /api/gameday_designer/tournaments/           - List tournaments
POST   /api/gameday_designer/tournaments/           - Create tournament
GET    /api/gameday_designer/tournaments/{id}/      - Tournament details
PUT    /api/gameday_designer/tournaments/{id}/      - Update tournament
DELETE /api/gameday_designer/tournaments/{id}/      - Delete tournament

GET    /api/gameday_designer/tournaments/{id}/schedule/  - Get full schedule
GET    /api/gameday_designer/tournaments/{id}/standings/ - Get current standings
POST   /api/gameday_designer/games/{id}/result/          - Submit game result
GET    /api/gameday_designer/games/{id}/                 - Game details

GET    /api/gameday_designer/formats/                    - List available formats
```

---

## Appendix: Quick Reference

### Format Selection Guide

**Choose F3-1-1-SR** (3 teams, single round robin):
- Quick tournament
- Very limited time
- Each team plays 2 games

**Choose F4-1-1-RR** (4 teams, round robin):
- Simple format
- Each team plays 3 games
- No playoffs needed

**Choose F6-2-2** (6 teams, 2 groups, 2 fields):
- Medium tournament
- Balanced groups
- Playoffs determine winner

**Choose F8-2-2** or **F8-2-3** (8 teams):
- Standard tournament size
- Full playoff bracket
- 2 or 3 fields based on time constraints

**Choose F9-3-3** (9 teams, 3 groups, 3 fields):
- Large tournament
- Multiple groups
- Complex playoff seeding

### Common Scheduling Scenarios

| Teams | Recommended Format | Fields | Estimated Duration |
|-------|-------------------|--------|-------------------|
| 3 | F3-1-1-SR | 1 | 3.5 hours |
| 4 | F4-1-1-RR | 1 | 5 hours |
| 5 | F5-1-2-RR | 2 | 4 hours |
| 6 | F6-2-2 | 2 | 6 hours |
| 8 | F8-2-3 | 3 | 7 hours |
| 9 | F9-3-3 | 3 | 8 hours |

### Glossary

| Term | Definition |
|------|------------|
| **Cross-bracket seeding** | P1 of Group A plays P2 of Group B (and vice versa) |
| **Double elimination** | Team must lose twice to be eliminated |
| **Double round robin** | Each team plays every other team twice |
| **Dynamic assignment** | Teams assigned to games based on previous results |
| **Phase** | Stage of tournament (group/playoff/placement) |
| **Placement game** | Game determining final position (e.g., 5th/6th) |
| **Point differential** | Points scored minus points allowed |
| **Round robin** | Every team plays every other team |
| **Team reference** | Placeholder for team (winner/loser/position) |
| **Tiebreaker** | Rules for ranking teams with equal records |
| **Timeslot** | Scheduled time window for games |

---

## Support and Contributing

For questions, issues, or suggestions regarding tournament play modes:

- **GitHub Issues**: [LeagueSphere Issues](https://github.com/dachrisch/leaguesphere/issues)
- **Documentation**: `/home/cda/dev/leaguesphere/gameday_designer/feature-dev/gameday_designer/docs/`
- **Developer Guide**: See CLAUDE.md in project root

**Version**: 1.0.0
**Last Updated**: 2025-12-21
