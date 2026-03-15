# Canvas Dynamic-Ref Placeholder Resolution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When publishing a canvas gameday, replace `team=None` for dynamic-ref game slots with a meaningful placeholder Team whose name matches the label the designer shows (e.g. "Gewinner SF1", "P1 Gruppe A"), so the Spielplan never shows "TBD".

**Architecture:** The canvas stores all team references as a `TeamReference` union (winner/loser/standing/rank/groupRank/groupTeam/static). The backend currently only handles `winner` and `loser`, silently dropping all others. We port the TypeScript `formatTeamReference` function to Python as a module-level helper and use it to generate placeholder Team names for every dynamic ref type. For `static` refs the name is a literal label which should already resolve via `global_teams`; if not, it creates a team directly. The progression service (resolves winner/loser after game completes) is unchanged — placeholder teams it replaces are just orphaned rows.

**Tech Stack:** Django / Python, pytest, `test_settings`

---

## Key Facts

| Item | Value |
|------|-------|
| Service under fix | `gamedays/service/canvas_publish_service.py` |
| Tests | `gamedays/api/tests/test_publish_creates_gameinfos.py` |
| TypeScript reference | `gameday_designer/src/utils/teamReference.ts` → `formatTeamReference()` |
| TeamReference types | `winner`, `loser`, `standing`, `rank`, `groupRank`, `groupTeam`, `static` |
| Label format (canonical) | winner→`"Gewinner {matchName}"`, loser→`"Verlierer {matchName}"`, standing→`"P{place} {groupName}"`, rank→`"Rank {place} {stageName}"`, groupRank→`"Rank {place} in {groupName} of {stageName}"`, groupTeam→`"{group}_{team}"`, static→resolve via global_teams first |
| Run tests with | `pytest gamedays/api/tests/test_publish_creates_gameinfos.py --ds=test_settings -v` |

---

## Chunk 1: Port `formatTeamReference` + fix `_resolve_dynamic_team`

### Task 1: Add failing tests for all dynamic ref types

**Files:**
- Modify: `gamedays/api/tests/test_publish_creates_gameinfos.py`

The tests use a canvas with a single playoff game whose `homeTeamDynamic` and `awayTeamDynamic` are set to each reference type in turn. After publish, the `Gameresult.team.name` must match the expected label.

- [ ] **Step 1: Add canvas fixtures for each ref type**

Add below `PROGRESSION_CANVAS_STATE` in `test_publish_creates_gameinfos.py`:

```python
def _make_dynamic_canvas(home_dynamic, away_dynamic):
    """Helper: canvas with one prelim game (real teams) + one playoff (dynamic refs)."""
    return {
        "globalTeams": [
            {"id": "t1", "label": "Alpha", "groupId": None, "order": 0},
            {"id": "t2", "label": "Beta",  "groupId": None, "order": 1},
        ],
        "globalTeamGroups": [],
        "nodes": [
            {"id": "field-1", "type": "field", "parentId": None,
             "data": {"type": "field", "name": "Field 1", "order": 0}, "position": {"x": 0, "y": 0}},
            {"id": "stage-1", "type": "stage", "parentId": "field-1",
             "data": {"type": "stage", "name": "Final", "category": "final"}, "position": {"x": 0, "y": 0}},
            {"id": "game-1", "type": "game", "parentId": "stage-1",
             "data": {
                 "type": "game", "stage": "Final", "standing": "FIN",
                 "startTime": "14:00", "homeTeamId": None, "awayTeamId": None,
                 "homeTeamDynamic": home_dynamic,
                 "awayTeamDynamic": away_dynamic,
                 "official": None,
             }, "position": {"x": 0, "y": 0}},
        ],
        "edges": [],
    }
```

- [ ] **Step 2: Add parameterised test for each ref type**

```python
import pytest as _pytest

DYNAMIC_REF_CASES = [
    (
        {"type": "winner", "matchName": "SF1"},
        {"type": "loser",  "matchName": "SF1"},
        "Gewinner SF1",
        "Verlierer SF1",
    ),
    (
        {"type": "standing", "place": 1, "groupName": "Gruppe A"},
        {"type": "standing", "place": 2, "groupName": "Gruppe A"},
        "P1 Gruppe A",
        "P2 Gruppe A",
    ),
    (
        {"type": "rank", "place": 1, "stageName": "Vorrunde", "stageId": ""},
        {"type": "rank", "place": 2, "stageName": "Vorrunde", "stageId": ""},
        "Rank 1 Vorrunde",
        "Rank 2 Vorrunde",
    ),
    (
        {"type": "groupRank", "place": 1, "groupName": "Pool B", "stageName": "Quali", "stageId": ""},
        {"type": "groupRank", "place": 2, "groupName": "Pool B", "stageName": "Quali", "stageId": ""},
        "Rank 1 in Pool B of Quali",
        "Rank 2 in Pool B of Quali",
    ),
    (
        {"type": "groupTeam", "group": 0, "team": 0},
        {"type": "groupTeam", "group": 0, "team": 1},
        "0_0",
        "0_1",
    ),
]


@_pytest.mark.django_db
@_pytest.mark.parametrize("home_ref,away_ref,expected_home,expected_away", DYNAMIC_REF_CASES)
def test_publish_dynamic_ref_creates_placeholder_team(
    home_ref, away_ref, expected_home, expected_away,
    # need a fresh gameday per parameterised run — use function-scoped fixtures via inline setup
):
    from django.contrib.auth.models import User
    from rest_framework.test import APIClient
    from gamedays.models import Season, League, Gameday, Gameinfo, Gameresult, GamedayDesignerState

    user = User.objects.create_superuser("dyn_test", password="pw")
    client = APIClient()
    client.force_authenticate(user)
    season = Season.objects.create(name="2026dyn")
    league = League.objects.create(name="Dyn League")
    gameday = Gameday.objects.create(
        name="Dyn Day", season=season, league=league,
        date="2026-03-15", start="10:00",
        status=Gameday.STATUS_DRAFT, author=user,
    )
    GamedayDesignerState.objects.create(
        gameday=gameday,
        state_data=_make_dynamic_canvas(home_ref, away_ref),
    )
    client.post(f"/api/gamedays/{gameday.id}/publish/")

    gi = Gameinfo.objects.get(gameday=gameday, standing="FIN")
    home = Gameresult.objects.get(gameinfo=gi, isHome=True)
    away = Gameresult.objects.get(gameinfo=gi, isHome=False)
    assert home.team.name == expected_home
    assert away.team.name == expected_away
```

- [ ] **Step 3: Run to confirm RED**

```bash
pytest gamedays/api/tests/test_publish_creates_gameinfos.py::test_publish_dynamic_ref_creates_placeholder_team --ds=test_settings -v
```

Expected: FAIL — `standing`, `rank`, `groupRank`, `groupTeam` cases assert `team.name` but currently get `None` (AttributeError) because `_resolve_dynamic_team` returns `None` for unknown types.

---

### Task 2: Port `formatTeamReference` to Python and fix `_resolve_dynamic_team`

**Files:**
- Modify: `gamedays/service/canvas_publish_service.py`

- [ ] **Step 1: Replace `_resolve_dynamic_team` with the full implementation**

Replace the current `_resolve_dynamic_team` method with:

```python
def _resolve_dynamic_team(self, dynamic_ref):
    """
    Creates a placeholder Team whose name mirrors the TypeScript formatTeamReference()
    label for every supported TeamReference type.

    Types and their labels (mirrors teamReference.ts formatTeamReference):
      winner     → "Gewinner {matchName}"
      loser      → "Verlierer {matchName}"
      standing   → "P{place} {groupName}"
      rank       → "Rank {place} {stageName}"
      groupRank  → "Rank {place} in {groupName} of {stageName}"
      groupTeam  → "{group}_{team}"
      static     → resolved via global_teams (handled in caller); returns None here
    """
    if not dynamic_ref:
        return None
    ref_type = dynamic_ref.get("type")
    label = self._format_dynamic_ref(dynamic_ref)
    if not label:
        return None
    team, _ = Team.objects.get_or_create(
        name=label,
        defaults={"description": label, "location": ""},
    )
    return team

@staticmethod
def _format_dynamic_ref(ref) -> str:
    """Pure function: maps a canvas TeamReference dict to its canonical label string."""
    if not ref:
        return ""
    ref_type = ref.get("type", "")
    if ref_type == "winner":
        return f"Gewinner {ref.get('matchName', '')}"
    if ref_type == "loser":
        return f"Verlierer {ref.get('matchName', '')}"
    if ref_type == "standing":
        return f"P{ref.get('place', '')} {ref.get('groupName', '')}"
    if ref_type == "rank":
        return f"Rank {ref.get('place', '')} {ref.get('stageName', '')}"
    if ref_type == "groupRank":
        return (
            f"Rank {ref.get('place', '')} in "
            f"{ref.get('groupName', '')} of {ref.get('stageName', '')}"
        )
    if ref_type == "groupTeam":
        return f"{ref.get('group', '')}_{ref.get('team', '')}"
    # "static" type: caller should resolve via global_teams; nothing to do here
    return ""
```

**Also update `_resolve_dynamic_team` call in `apply()`** — the `static` type is already handled by `_resolve_team` via `homeTeamId`/`awayTeamId`. But if someone puts a `static` dynamic ref (e.g. from an import), it would fall through with `label=""` and return `None`. That is acceptable (leaves team null).

- [ ] **Step 2: Update `test_publish_playoff_game_has_placeholder_teams` in existing test class**

The fixture uses `winner`/`loser` refs with `matchName: "Game A1"`. The label was previously `"Sieger Game A1"` (wrong), now should be `"Gewinner Game A1"` / `"Verlierer Game A1"`:

```python
def test_publish_playoff_game_has_placeholder_teams(self):
    GamedayDesignerState.objects.create(
        gameday=self.gameday, state_data=PROGRESSION_CANVAS_STATE
    )
    self._publish()
    sf1 = Gameinfo.objects.get(gameday=self.gameday, standing="SF1")
    home = Gameresult.objects.get(gameinfo=sf1, isHome=True)
    away = Gameresult.objects.get(gameinfo=sf1, isHome=False)
    assert home.team.name == "Gewinner Game A1"
    assert away.team.name == "Verlierer Game A1"
```

- [ ] **Step 3: Run all publish tests — must be GREEN**

```bash
pytest gamedays/api/tests/test_publish_creates_gameinfos.py --ds=test_settings -v
```

Expected: all 12 tests PASS (8 original + 5 new parameterised cases).

- [ ] **Step 4: Run regression tests**

```bash
pytest gamedays/api/tests/test_gameday_publish.py --ds=test_settings -v
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gamedays/service/canvas_publish_service.py \
        gamedays/api/tests/test_publish_creates_gameinfos.py
git commit -m "fix(publish): resolve all TeamReference types as placeholder teams on canvas publish"
```

---

## Chunk 2: Verify progression service label consistency

The `CanvasBracketProgressionService` replaces the placeholder team with the real team after a game result is submitted. It looks up `Gameresult` rows by `isHome` flag and sets `.team` — it does **not** care what the old placeholder name was. No changes needed here.

However the progression test `test_progression_resolves_team_after_game_completes` in `TestPublishCreatesGameinfos` asserts the final team names are the real teams, and it will still pass since:
1. Publish creates `"Gewinner Game A1"` / `"Verlierer Game A1"` placeholders
2. Progression replaces them with `Team Alpha` / `Team Beta` after the result

Run it to confirm:

```bash
pytest gamedays/api/tests/test_publish_creates_gameinfos.py::TestPublishCreatesGameinfos::test_progression_resolves_team_after_game_completes --ds=test_settings -v
```

Expected: PASS. No code change needed in `canvas_progression_service.py`.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `gamedays/service/canvas_publish_service.py` | Replace `_resolve_dynamic_team` with full type coverage; extract `_format_dynamic_ref` static helper |
| `gamedays/api/tests/test_publish_creates_gameinfos.py` | Add `_make_dynamic_canvas` helper + parameterised `test_publish_dynamic_ref_creates_placeholder_team`; fix winner/loser label to `"Gewinner"/"Verlierer"` in `test_publish_playoff_game_has_placeholder_teams` |
