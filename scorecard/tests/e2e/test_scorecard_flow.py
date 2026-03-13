import os
# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
from playwright.sync_api import Page, expect
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.models import Gameday, Gameinfo, Gameresult
from django.contrib.auth.models import User

@pytest.mark.django_db(transaction=True)
def test_scorecard_bracket_resolution_flow(live_server, page: Page):
    # 1. Setup Data the "Old Way"
    db_setup = DBSetup()
    gameday = db_setup.g62_status_empty()
    gameday.status = Gameday.STATUS_PUBLISHED
    gameday.format = "6_2"
    gameday.save()

    # Target the first game
    game = Gameinfo.objects.filter(gameday=gameday, standing="Gruppe 1").first()
    home_name = game.gameresult_set.get(isHome=True).team.name
    away_name = game.gameresult_set.get(isHome=False).team.name

    # Create superuser for login
    username = "testuser"
    password = "password123"
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_superuser(username=username, password=password, email="test@test.com")
    
    # 2. Login to Scorecard
    page.goto(f"{live_server.url}/scorecard/#/login")
    
    page.fill('input[name="username"]', username)
    page.fill('input[name="password"]', password)
    
    with page.expect_response("**/accounts/auth/login/") as response_info:
        page.click('button:has-text("Login")')
    
    token = response_info.value.json().get("token")
    assert token is not None
    
    # Force token into localStorage for app initialization
    page.evaluate(f"token => localStorage.setItem('token', token)", token)
    
    # Global Interception
    page.route("**/*", lambda route: route.continue_(headers={**route.request.headers, "Authorization": f"Token {token}"}) if "/api/" in route.request.url or "/accounts/auth/" in route.request.url else route.continue_())
    
    # Wait for splash screen
    expect(page.get_by_text("Scorecard")).to_be_visible(timeout=15000)
    page.click('button:has-text("Scorecard")')
    
    # 4. Select Gameday
    expect(page.get_by_text(gameday.name)).to_be_visible(timeout=10000)
    page.get_by_role("row", name=gameday.name).get_by_role("button", name="Auswählen").click()
    
    # 5. Select Game
    expect(page.get_by_text("Bitte Spiel auswählen")).to_be_visible(timeout=10000)
    page.click('label:has-text("Zeige alle Spiele")')
    
    page.wait_for_timeout(1000)
    game_text = f"{home_name} vs {away_name}"
    game_row = page.locator("tr").filter(has_text=game_text).first
    if not game_row.is_visible():
        home_desc = game.gameresult_set.get(isHome=True).team.description
        away_desc = game.gameresult_set.get(isHome=False).team.description
        game_text = f"{home_desc} vs {away_desc}"
        game_row = page.locator("tr").filter(has_text=game_text).first
        
    expect(game_row).to_be_visible(timeout=10000)
    game_row.get_by_role("button", name="Start").click()
    
    # 6. Officials Page
    expect(page.get_by_text("Münzwahl hat")).to_be_visible(timeout=15000)
    page.click('label:has-text("Gewonnen")')
    team_label = home_name if home_name in page.content() else game.gameresult_set.get(isHome=True).team.description
    page.click(f'label:has-text("{team_label}")')
    page.click('label[for="directionLeft"]')
    
    page.click('button:has-text("Spiel starten")')
    
    # 7. Details Page - Enter Scores
    # Team label is a RadioButton text
    expect(page.get_by_text(team_label).first).to_be_visible(timeout=20000)
    
    # Wait for the presence of ANY label from AddPoints.js
    # Instead of "Touchdown", let's use its data structure
    # In AddPoints.js: <RadioButton ... text='Touchdown' id='td' ... />
    try:
        # Try finding the Touchdown label by its ID directly
        page.locator('label[for="td"]').click(timeout=5000)
    except Exception:
        # Fallback: look for the text anywhere in the container
        page.locator('label').filter(has_text="Touchdown").click(timeout=5000)
    
    # If successful, the input should be visible
    expect(page.locator('input[placeholder="Trikotnummer TD"]')).to_be_visible(timeout=5000)
    page.fill('input[placeholder="Trikotnummer TD"]', "19")
    page.click('button:has-text("Eintrag speichern")')
    
    # Verify score
    expect(page.locator('.badge.bg-warning').first).to_have_text("6", timeout=10000)
    
    # 8. Halftime & Finalize
    page.click('button[data-testid="halftimeButton"]')
    page.click('button[data-testid="halftime-done"]')
    expect(page.locator('[data-testid="finalizeButton"]')).to_be_visible(timeout=10000)
    page.click('button[data-testid="finalizeButton"]')
    
    # 9. Finalize Page
    page.fill(f'input[placeholder="{team_label}-Captain Name*"]', "Captain Home")
    page.click('button[data-testid="confirmHomeButton"]')

    opp_team = game.gameresult_set.get(isHome=False).team
    opp_label = away_name if away_name in page.content() else opp_team.description
    page.fill(f'input[placeholder="{opp_label}-Captain Name*"]', "Captain Away")
    page.click('button[data-testid="confirmAwayButton"]')

    # Wait for finalization API to complete before doing DB assertions
    with page.expect_response("**/api/game/*/finalize"):
        page.click('button:has-text("Ergebnis abschicken")')

    # 10. Verify Persistence - check DB directly after finalization API completes
    game.refresh_from_db()
    assert game.status == Gameinfo.STATUS_COMPLETED
    assert game.gameresult_set.get(team__name=home_name).fh == 6
