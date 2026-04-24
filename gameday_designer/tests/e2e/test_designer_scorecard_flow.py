import datetime
import os

# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
import requests
from playwright.sync_api import Page, expect
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Team, Season, League
from gameday_designer.models import (
    ScheduleTemplate, 
    TemplateSlot, 
    TemplateUpdateRule, 
    TemplateUpdateRuleTeam
)
from gameday_designer.service.template_application_service import TemplateApplicationService


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
    # Show all games
    page.click('label:has-text("Zeige alle Spiele")')
    page.wait_for_timeout(1000)


def _finalize_game_via_api(live_server_url: str, token: str, gameinfo: Gameinfo, home_score: int, away_score: int):
    """
    Finalize a game via the Scorecard API. 
    This hits the actual production API used by the React app, 
    triggering the signals while bypassing UI complexities.
    """
    # 1. Set scores via ORM (API for event-based scoring is very verbose)
    hr = gameinfo.gameresult_set.get(isHome=True)
    ar = gameinfo.gameresult_set.get(isHome=False)
    hr.fh = home_score; hr.sh = 0; hr.pa = away_score; hr.save()
    ar.fh = away_score; ar.sh = 0; ar.pa = home_score; ar.save()
    
    # 2. Call Finalize API
    headers = {"Authorization": f"Token {token}"}
    data = {
        "homeCaptain": "Captain Home",
        "awayCaptain": "Captain Away",
        "note": "Finalized via API in E2E test"
    }
    url = f"{live_server_url}/api/game/{gameinfo.pk}/finalize"
    response = requests.put(url, json=data, headers=headers)
    assert response.status_code == 200, f"Finalize failed: {response.content}"


@pytest.mark.django_db(transaction=True)
def test_designer_progression_resolves_teams_in_scorecard(live_server, page: Page):
    """
    Validate that Scorecard works with Designer-based gamedays and triggers progression.
    """
    # ---- 1. Setup Data --------------------------------------------------
    season = Season.objects.get_or_create(name="2026")[0]
    league = League.objects.get_or_create(name="E2E League")[0]
    if not User.objects.filter(username="admin").exists():
        admin = User.objects.create_superuser(username="admin", password="password123", email="admin@test.com")
    else:
        admin = User.objects.get(username="admin")

    gameday = Gameday.objects.create(
        name="Designer Scorecard E2E",
        season=season,
        league=league,
        date=datetime.date.today(),
        start=datetime.time(10, 0),
        author=admin,
        status=Gameday.STATUS_PUBLISHED
    )

    # Create 6 teams with unique descriptions
    teams = []
    for i in range(6):
        team_name = f"Team {'A' if i < 3 else 'B'}{(i % 3) + 1}"
        team = Team.objects.create(name=team_name, description=f"Desc {team_name}")
        teams.append(team)

    template = ScheduleTemplate.objects.create(
        name="6 Team E2E Template", num_teams=6, num_fields=2, num_groups=2, created_by=admin
    )

    # Vorrunde Stage
    slot_a = TemplateSlot.objects.create(
        template=template, field=1, slot_order=1, stage="Vorrunde", standing="Gruppe A",
        home_group=0, home_team=0, away_group=0, away_team=1, official_group=0, official_team=2
    )
    slot_b = TemplateSlot.objects.create(
        template=template, field=2, slot_order=1, stage="Vorrunde", standing="Gruppe B",
        home_group=1, home_team=0, away_group=1, away_team=1, official_group=1, official_team=2
    )

    # SF1 Slot with references
    slot_sf1 = TemplateSlot.objects.create(
        template=template, field=1, slot_order=2, stage="Final", standing="SF1",
        home_reference="Winner Gruppe A", away_reference="Runner-up Gruppe B",
        official_group=0, official_team=1
    )

    # Update Rule for SF1 (depends on Vorrunde stage completion)
    rule_sf1 = TemplateUpdateRule.objects.create(template=template, slot=slot_sf1, pre_finished="Vorrunde")
    TemplateUpdateRuleTeam.objects.create(update_rule=rule_sf1, role="home", standing="Gruppe A", place=1)
    TemplateUpdateRuleTeam.objects.create(update_rule=rule_sf1, role="away", standing="Gruppe B", place=2)

    # Team mapping
    team_mapping = {
        "0_0": teams[0].pk, "0_1": teams[1].pk, "0_2": teams[2].pk,
        "1_0": teams[3].pk, "1_1": teams[4].pk, "1_2": teams[5].pk,
    }

    # Apply Template
    TemplateApplicationService(template, gameday, team_mapping, applied_by=admin).apply()

    # ---- 2. Login & Navigate --------------------------------------------
    token = _login(page, live_server.url)
    _navigate_to_games_list(page, gameday)

    # ---- 3. Phase 1: Verify Initial State -------------------------------
    expect(page.get_by_text("Winner Gruppe A vs Runner-up Gruppe B")).to_be_visible()

    # ---- 4. Complete Group A game via API (hits production signal path) -
    gi_a = Gameinfo.objects.get(gameday=gameday, standing="Gruppe A")
    _finalize_game_via_api(live_server.url, token, gi_a, home_score=12, away_score=0)

    # Reload page to see partial resolution (UI would normally do this on navigation)
    page.goto(f"{live_server.url}/scorecard/")
    _navigate_to_games_list(page, gameday)

    # SF1 should still be unresolved because Vorrunde stage isn't finished (Gruppe B pending)
    expect(page.get_by_text("Winner Gruppe A vs Runner-up Gruppe B")).to_be_visible()

    # ---- 5. Complete Group B game via API -------------------------------
    gi_b = Gameinfo.objects.get(gameday=gameday, standing="Gruppe B")
    _finalize_game_via_api(live_server.url, token, gi_b, home_score=0, away_score=12) # B2 wins, B1 is 2nd

    # ---- 6. Final Verification: SF1 Resolved in Scorecard UI ------------
    page.goto(f"{live_server.url}/scorecard/")
    _navigate_to_games_list(page, gameday)

    # SF1: Team A1 (1st Gruppe A) vs Team B1 (2nd Gruppe B)
    expect(page.get_by_text("Desc Team A1 vs Desc Team B1")).to_be_visible()
    expect(page.get_by_text("Winner Gruppe A vs Runner-up Gruppe B")).not_to_be_visible()
