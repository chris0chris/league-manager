# Schedule Update E2E Test Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing scorecard e2e test with one that verifies `ScheduleUpdate` correctly resolves placeholder team names in the Finalrunde when Vorrunde games complete.

**Architecture:** The test uses Playwright to verify the scorecard games list shows placeholder names (e.g. "Gewinner Spiel 1") for unresolved Finalrunde slots, then completes Vorrunde games directly via Django ORM to trigger the `post_save` signal which fires `ScheduleUpdate`, then reloads the UI to confirm real team names now appear.

**Tech Stack:** pytest-playwright, Django TransactionTestCase, `ScheduleCreator` + `ScheduleUpdate`, `DBSetup` factory helpers

---

## Chunk 1: Setup Helpers and Test

### Task 1: Add 4_final4_1 DBSetup helpers

**Files:**
- Modify: `gamedays/tests/setup_factories/db_setup.py`

The `4_final4_1` schedule references placeholder team names in the Finalrunde slots (e.g. "Gewinner Spiel 1"). `ScheduleCreator` does `Team.objects.get(name=...)` for every home/away/official value, so these teams must exist before `ScheduleCreator.create()` is called.

Placeholder teams required (derived from `schedule_4_final4_1.json` Finalrunde rows):

| Slot role | Team name |
|-----------|-----------|
| official Spiel 3 / home Spiel 4 | `Gewinner Spiel 1` |
| away Spiel 4 | `Gewinner Spiel 2` |
| home Spiel 3 | `Verlierer Spiel 1` |
| away Spiel 3 | `Verlierer Spiel 2` |
| away Spiel 5 | `Gewinner Spiel 3` |
| official Spiel 4 / official Spiel 5 | `Verlierer Spiel 3` |
| away P1 | `Gewinner Spiel 4` |
| home Spiel 5 | `Verlierer Spiel 4` |
| home P1 | `Gewinner Spiel 5` |
| official P1 | `Verlierer Spiel 5` |

- [ ] **Step 1: Add `create_4_final4_1_placeholder_teams()` to DBSetup**

Open `gamedays/tests/setup_factories/db_setup.py` and add after the existing `create_playoff_placeholder_teams` method:

```python
def create_4_final4_1_placeholder_teams(self):
    for name in [
        "Gewinner Spiel 1",
        "Gewinner Spiel 2",
        "Verlierer Spiel 1",
        "Verlierer Spiel 2",
        "Gewinner Spiel 3",
        "Verlierer Spiel 3",
        "Gewinner Spiel 4",
        "Verlierer Spiel 4",
        "Gewinner Spiel 5",
        "Verlierer Spiel 5",
    ]:
        TeamFactory(name=name)
```

- [ ] **Step 2: Add `g4_final4_1_status_empty()` to DBSetup**

Add this method to DBSetup (imports `ScheduleCreator`, `Schedule`, `GroupSchedule` are already used in the test file so add them to `db_setup.py` imports if missing):

```python
def g4_final4_1_status_empty(self) -> "Gameday":
    from gamedays.management.schedule_manager import ScheduleCreator, Schedule, GroupSchedule

    gameday = self.create_empty_gameday()
    gameday.format = "4_final4_1"
    gameday.save()

    teams = self.create_teams("A", 4)  # A1, A2, A3, A4
    self.create_4_final4_1_placeholder_teams()

    groups = [GroupSchedule(name="", league_group=None, teams=teams)]
    ScheduleCreator(
        gameday=Gameday.objects.get(pk=gameday.pk),
        schedule=Schedule(gameday.format, groups),
    ).create()
    return Gameday.objects.get(pk=gameday.pk)
```

- [ ] **Step 3: Verify imports in db_setup.py**

Ensure `Gameday` is imported at the top of `db_setup.py` (it should already be there). Run:

```bash
cd /home/cda/dev/leaguesphere
MYSQL_HOST=10.185.182.207 MYSQL_DB_NAME=test_db MYSQL_USER=user MYSQL_PWD=user SECRET_KEY=test-secret-key \
python -c "
import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'league_manager.settings'
django.setup()
from gamedays.tests.setup_factories.db_setup import DBSetup
print('DBSetup import OK')
"
```

Expected: `DBSetup import OK`

- [ ] **Step 4: Commit**

```bash
git add gamedays/tests/setup_factories/db_setup.py
git commit -m "test: add DBSetup helpers for 4_final4_1 schedule format"
```

---

### Task 2: Replace e2e test with schedule_update verification test

**Files:**
- Modify: `scorecard/tests/e2e/test_scorecard_flow.py`

The new test verifies the full cycle:
1. Scorecard games list shows placeholder names for Finalrunde before Vorrunde is finished.
2. After completing Vorrunde games (via ORM), the `post_save` signal fires `ScheduleUpdate`, and the games list then shows resolved team names.

**Key facts about the `4_final4_1` update rules** (from `update_4_final4_1.json`):
- `pre_finished: "Vorrunde"` → both Spiel 1 and Spiel 2 must have `status="beendet"` before Spiel 3/4 are resolved.
- Spiel 3 home = team with **0 competition points** in Spiel 1 (the loser = A2).
- Spiel 3 away = team with **0 competition points** in Spiel 2 (the loser = A4).
- Spiel 4 home = team with **2 competition points** in Spiel 1 (the winner = A1).
- Spiel 4 away = team with **2 competition points** in Spiel 2 (the winner = A3).

Competition points: win=2 (`fh+sh > pa`), loss=0 (`fh+sh < pa`).

- [ ] **Step 1: Write the failing test (replace file content)**

Replace `scorecard/tests/e2e/test_scorecard_flow.py` with:

```python
import os
# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
from playwright.sync_api import Page, expect
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.models import Gameday, Gameinfo, Gameresult
from django.contrib.auth.models import User


def _login(page: Page, live_server_url: str) -> str:
    """Login to scorecard, return auth token."""
    username = "testuser"
    password = "password123"
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username=username, password=password, email="test@test.com")

    page.goto(f"{live_server_url}/scorecard/#/login")
    page.fill('input[name="username"]', username)
    page.fill('input[name="password"]', password)

    with page.expect_response("**/accounts/auth/login/") as response_info:
        page.click('button:has-text("Login")')

    token = response_info.value.json().get("token")
    assert token is not None
    page.evaluate("token => localStorage.setItem('token', token)", token)
    page.route(
        "**/*",
        lambda route: route.continue_(
            headers={**route.request.headers, "Authorization": f"Token {token}"}
        )
        if "/api/" in route.request.url or "/accounts/auth/" in route.request.url
        else route.continue_(),
    )
    return token


def _navigate_to_games_list(page: Page, gameday: Gameday):
    """From the splash screen, navigate to the games list for the given gameday."""
    expect(page.get_by_text("Scorecard")).to_be_visible(timeout=15000)
    page.click('button:has-text("Scorecard")')
    expect(page.get_by_text(gameday.name)).to_be_visible(timeout=10000)
    page.get_by_role("row", name=gameday.name).get_by_role("button", name="Auswählen").click()
    expect(page.get_by_text("Bitte Spiel auswählen")).to_be_visible(timeout=10000)
    # Show all games (not just user-officiated games)
    page.click('label:has-text("Zeige alle Spiele")')
    page.wait_for_timeout(1000)


def _complete_vorrunde_game(gameinfo: Gameinfo, home_score: int, away_score: int):
    """Set scores and mark a Vorrunde game as completed, triggering the post_save signal."""
    home_result = gameinfo.gameresult_set.get(isHome=True)
    away_result = gameinfo.gameresult_set.get(isHome=False)

    home_result.fh = home_score
    home_result.sh = 0
    home_result.pa = away_score
    home_result.save()

    away_result.fh = away_score
    away_result.sh = 0
    away_result.pa = home_score
    away_result.save()

    gameinfo.status = Gameinfo.STATUS_COMPLETED
    gameinfo.save()  # triggers post_save → ScheduleUpdate.update()


@pytest.mark.django_db(transaction=True)
def test_schedule_update_resolves_finalrunde_teams(live_server, page: Page):
    """
    Verify that completing Vorrunde games triggers ScheduleUpdate which replaces
    placeholder team names in the Finalrunde with the actual winner/loser team names.

    Setup: 4-team gameday using the 4_final4_1 format.
      Vorrunde: Spiel 1 (A1 vs A2), Spiel 2 (A3 vs A4)
      Finalrunde: Spiel 3–5, P1 (initially show placeholder names)

    Phase 1 – assert placeholders visible before Vorrunde completes:
      - "A1 vs A2" visible in Spiel 1 row
      - "A3 vs A4" visible in Spiel 2 row
      - "Gewinner Spiel 1" visible somewhere in Finalrunde rows

    Phase 2 – complete both Vorrunde games (A1 and A3 win), then reload:
      - Spiel 3 row shows "A2 vs A4" (losers)
      - Spiel 4 row shows "A1 vs A3" (winners)
    """
    # ---- 1. Setup -------------------------------------------------------
    db_setup = DBSetup()
    gameday = db_setup.g4_final4_1_status_empty()
    gameday.status = Gameday.STATUS_PUBLISHED
    gameday.save()

    spiel1 = Gameinfo.objects.get(gameday=gameday, standing="Spiel 1")
    spiel2 = Gameinfo.objects.get(gameday=gameday, standing="Spiel 2")

    # ---- 2. Login -------------------------------------------------------
    _login(page, live_server.url)

    # ---- 3. Navigate to games list --------------------------------------
    _navigate_to_games_list(page, gameday)

    # ---- 4. Phase 1: verify Vorrunde shows real names -------------------
    expect(page.locator("tr").filter(has_text="A1").filter(has_text="A2").first).to_be_visible(
        timeout=5000
    )
    expect(page.locator("tr").filter(has_text="A3").filter(has_text="A4").first).to_be_visible(
        timeout=5000
    )

    # ---- 5. Phase 1: verify Finalrunde shows placeholder names ----------
    expect(page.get_by_text("Gewinner Spiel 1").first).to_be_visible(timeout=5000)
    expect(page.get_by_text("Gewinner Spiel 2").first).to_be_visible(timeout=5000)

    # ---- 6. Complete Vorrunde games via ORM (A1 and A3 win) -------------
    _complete_vorrunde_game(spiel1, home_score=6, away_score=0)  # A1 wins Spiel 1
    _complete_vorrunde_game(spiel2, home_score=6, away_score=0)  # A3 wins Spiel 2

    # ---- 7. Reload games list -------------------------------------------
    page.reload()
    expect(page.get_by_text("Bitte Spiel auswählen")).to_be_visible(timeout=10000)
    page.click('label:has-text("Zeige alle Spiele")')
    page.wait_for_timeout(1000)

    # ---- 8. Phase 2: verify Finalrunde now shows resolved team names ----
    # Spiel 3 = losers bracket: A2 (loser Spiel 1) vs A4 (loser Spiel 2)
    spiel3_row = page.locator("tr").filter(has_text="Spiel 3")
    expect(spiel3_row.get_by_text("A2")).to_be_visible(timeout=5000)
    expect(spiel3_row.get_by_text("A4")).to_be_visible(timeout=5000)

    # Spiel 4 = winners bracket: A1 (winner Spiel 1) vs A3 (winner Spiel 2)
    spiel4_row = page.locator("tr").filter(has_text="Spiel 4")
    expect(spiel4_row.get_by_text("A1")).to_be_visible(timeout=5000)
    expect(spiel4_row.get_by_text("A3")).to_be_visible(timeout=5000)

    # Placeholder names must be gone from Finalrunde rows
    expect(page.get_by_text("Gewinner Spiel 1")).not_to_be_visible(timeout=5000)
    expect(page.get_by_text("Gewinner Spiel 2")).not_to_be_visible(timeout=5000)
```

- [ ] **Step 2: Run the test to see it fail (missing helpers)**

```bash
cd /home/cda/dev/leaguesphere
MYSQL_HOST=10.185.182.207 MYSQL_DB_NAME=test_db MYSQL_USER=user MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest scorecard/tests/e2e/test_scorecard_flow.py -v --no-header 2>&1 | tail -30
```

Expected: FAIL — `AttributeError: 'DBSetup' object has no attribute 'g4_final4_1_status_empty'`

- [ ] **Step 3: Add the DBSetup helpers (Task 1 steps 1–2 above)**

Complete Task 1 steps 1 and 2 now if not yet done.

- [ ] **Step 4: Run test again — expect it to pass**

```bash
cd /home/cda/dev/leaguesphere
MYSQL_HOST=10.185.182.207 MYSQL_DB_NAME=test_db MYSQL_USER=user MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest scorecard/tests/e2e/test_scorecard_flow.py -v --no-header 2>&1 | tail -30
```

Expected: `PASSED scorecard/tests/e2e/test_scorecard_flow.py::test_schedule_update_resolves_finalrunde_teams`

- [ ] **Step 5: Also run the full schedule_update unit tests to confirm no regression**

```bash
cd /home/cda/dev/leaguesphere
MYSQL_HOST=10.185.182.207 MYSQL_DB_NAME=test_db MYSQL_USER=user MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest gamedays/tests/management/test_schedule_update.py -v --no-header 2>&1 | tail -20
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add scorecard/tests/e2e/test_scorecard_flow.py gamedays/tests/setup_factories/db_setup.py
git commit -m "test: replace scorecard e2e test with schedule_update bracket resolution test

Tests that completing Vorrunde games via ScheduleUpdate correctly replaces
placeholder team names (Gewinner/Verlierer Spiel N) with actual winner/loser
team names in the Finalrunde games list, using the 4_final4_1 format."
```

---

## Notes for the implementer

### Why `transaction=True`?
The `post_save` signal fires `ScheduleUpdate` synchronously in the same thread when `gameinfo.save()` is called. With `transaction=True`, DB changes are committed immediately and are visible to the live server's subsequent API requests (which load the updated team names).

### How `ScheduleUpdate` resolves teams
From `update_4_final4_1.json`:
- `{standing: "Spiel 1", place: 1, points: 0}` → calls `get_team_by_points(1, "Spiel 1", 0)` → returns team with 0 competition points (loser, A2 in our test)
- `{standing: "Spiel 1", place: 1, points: 2}` → returns team with 2 competition points (winner, A1)

Competition points come from: `2 if (fh+sh) > pa else 0 if (fh+sh) < pa else 1` (draw).

### Scorecard games list API
`/api/scorecard/games/?gameday_id=X&username=*` — returns `[{id, home, away, officials, scheduled, field, ...}]`. The `home`/`away` fields are `team.name` from `Gameresult`, so they reflect the updated names after `ScheduleUpdate` runs.

### `Zeige alle Spiele` checkbox behaviour
The Games.js component initially loads only games where the logged-in user's team is officiating. Clicking "Zeige alle Spiele" loads all games. The reload in step 7 lands back on the games list (React Router preserves the route), so we just need to re-check the checkbox after reload.
