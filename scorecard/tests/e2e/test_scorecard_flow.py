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
      Vorrunde: Spiel 1 (A1 home vs A2 away), Spiel 2 (A3 home vs A4 away)
      Finalrunde: initially shows placeholder names in officials and team columns

    The games list table shows each row as:
      | scheduled | field | officials / home vs away | Start button |

    Phase 1 – assert placeholders visible before Vorrunde completes:
      - "A1 vs A2" visible (Vorrunde Spiel 1)
      - "A3 vs A4" visible (Vorrunde Spiel 2)
      - "Gewinner Spiel 1 vs Gewinner Spiel 2" visible (Finalrunde Spiel 4, unresolved)

    Phase 2 – complete both Vorrunde games (A1 and A3 win), then re-navigate:
      - "A2 vs A4" visible (Finalrunde Spiel 3 — losers bracket resolved)
      - "A1 vs A3" visible (Finalrunde Spiel 4 — winners bracket resolved)
      - "Gewinner Spiel 1 vs Gewinner Spiel 2" no longer visible
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

    # ---- 4. Phase 1: verify Vorrunde shows real team names --------------
    expect(page.get_by_text("A1 vs A2")).to_be_visible(timeout=5000)
    expect(page.get_by_text("A3 vs A4")).to_be_visible(timeout=5000)

    # ---- 5. Phase 1: verify Finalrunde shows placeholder team names -----
    # Spiel 4 row: "Gewinner Spiel 1 vs Gewinner Spiel 2" (winners bracket, unresolved)
    expect(page.get_by_text("Gewinner Spiel 1 vs Gewinner Spiel 2")).to_be_visible(timeout=5000)
    # Spiel 3 row: "Verlierer Spiel 1 vs Verlierer Spiel 2" (losers bracket, unresolved)
    expect(page.get_by_text("Verlierer Spiel 1 vs Verlierer Spiel 2")).to_be_visible(timeout=5000)

    # ---- 6. Complete Vorrunde games via ORM (A1 and A3 win) -------------
    _complete_vorrunde_game(spiel1, home_score=6, away_score=0)  # A1 wins Spiel 1
    _complete_vorrunde_game(spiel2, home_score=6, away_score=0)  # A3 wins Spiel 2

    # ---- 7. Re-navigate to games list (full navigation for SPA) ---------
    # page.reload() does not work reliably for React SPAs after ORM mutations,
    # so we navigate back to the root and re-select the gameday instead.
    page.goto(f"{live_server.url}/scorecard/")
    _navigate_to_games_list(page, gameday)

    # ---- 8. Phase 2: verify Finalrunde now shows resolved team names ----
    # Spiel 3 (losers bracket): A2 (loser Spiel 1) vs A4 (loser Spiel 2)
    expect(page.get_by_text("A2 vs A4")).to_be_visible(timeout=5000)
    # Spiel 4 (winners bracket): A1 (winner Spiel 1) vs A3 (winner Spiel 2)
    expect(page.get_by_text("A1 vs A3")).to_be_visible(timeout=5000)

    # Placeholder matchup text must be gone from Finalrunde rows
    expect(page.get_by_text("Gewinner Spiel 1 vs Gewinner Spiel 2")).not_to_be_visible(
        timeout=5000
    )
    expect(page.get_by_text("Verlierer Spiel 1 vs Verlierer Spiel 2")).not_to_be_visible(
        timeout=5000
    )
