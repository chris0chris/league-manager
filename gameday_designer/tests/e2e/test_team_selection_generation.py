import os
import re

# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
from playwright.sync_api import Page, expect
from django.contrib.auth.models import User

from gamedays.tests.setup_factories.factories import (
    LeagueFactory, 
    SeasonFactory, 
    TeamFactory, 
    SeasonLeagueTeamFactory
)

DESIGNER_BASE_URL = "/gamedays/gameday/design"

def _login(page: Page, live_server_url: str) -> None:
    username = "designer_e2e_user"
    password = "password123"
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(
            username=username, password=password, email="designer_e2e@test.com"
        )

    page.goto(f"{live_server_url}/login/")
    page.fill('input[name="username"]', username)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="Login").click()
    page.wait_for_url(lambda url: "/login" not in url, timeout=10000)

@pytest.mark.django_db(transaction=True)
def test_select_existing_teams_during_generation(live_server, page: Page):
    """
    Validate that existing league teams can be selected during the 
    'Generate Tournament' flow and that they maintain their colors.
    """
    # 1. Setup Data
    league = LeagueFactory(name="E2E Selection League")
    season = SeasonFactory(name="2026")
    # Need 6 teams for the 6-team template
    teams = [
        TeamFactory(name=f"Existing Team {c}") for c in "ABCDEF"
    ]
    SeasonLeagueTeamFactory(season=season, league=league, teams=teams)
    
    # 2. Login and Navigate
    _login(page, live_server.url)
    
    # 3. Create Gameday
    page.goto(f"{live_server.url}{DESIGNER_BASE_URL}/")
    page.get_by_role("button", name="Create Gameday").first.click()
    
    # 4. Fill Metadata (to ensure league/season matches)
    expect(page.get_by_test_id("gameday-metadata-accordion")).to_be_visible(timeout=15000)
    page.get_by_test_id("gameday-metadata-toggle").click()
    
    page.fill("#gamedayName", "Team Selection Test")
    
    # Wait for the season option "2026" to appear (async fetch inside accordion)
    expect(page.locator("#gamedaySeason option", has_text="2026")).to_be_attached(timeout=10000)
    page.select_option("#gamedaySeason", label="2026")
    page.select_option("#gamedayLeague", label="E2E Selection League")
    
    # 5. Open Template Library
    page.get_by_test_id("open-template-library-button").click()
    
    # Select the 6-team template (Built-in)
    expect(page.get_by_text("Template Library")).to_be_visible(timeout=5000)
    page.locator('[data-testid^="builtin-template-"]').filter(has_text="6 Teams").first.click()
    
    # 6. Advance to Team Picker
    expect(page.get_by_test_id("apply-template-button")).to_be_visible(timeout=5000)
    page.get_by_test_id("apply-template-button").click()
    
    # 7. Verify and Select Existing Teams
    expect(page.get_by_text("Select Teams")).to_be_visible(timeout=5000)
    
    # Verify that our teams are visible as badges
    for team in teams:
        expect(page.get_by_text(team.name)).to_be_visible()
        
    # Select only the first 3 teams
    for i in range(3):
        page.get_by_text(teams[i].name).click()
        
    # 8. Auto-generate the remaining 3 teams
    page.get_by_role("button", name=re.compile(r"Auto-generate")).click()
    
    # 9. Apply and Verify Pool
    apply_btn = page.get_by_role("button", name=re.compile(r"Apply to Gameday"))
    expect(apply_btn).to_be_enabled(timeout=10000)
    apply_btn.click()
    
    expect(page.get_by_text("Select Teams")).not_to_be_visible(timeout=5000)
    
    # 10. Verify teams in pool have colors assigned (not default grey)
    # Give some time for the state to update
    page.wait_for_timeout(2000)
    
    # Just find all color inputs in the pool area
    color_inputs = page.locator('div[id^="team-"]').locator('input[type="color"]')
    count = color_inputs.count()
    assert count >= 6, f"Expected at least 6 teams in pool, found {count}"
    
    colors = []
    for i in range(count):
        val = color_inputs.nth(i).input_value()
        assert val.lower() != "#6c757d", f"Team color {i} has default grey: {val}"
        colors.append(val)
        
    # 11. Verify we have some distinct colors
    unique_colors = set(colors)
    assert len(unique_colors) > 1, f"Expected multiple distinct colors, but all teams have the same: {colors[0]}"

@pytest.mark.django_db(transaction=True)
def test_auto_generate_teams_has_color_iterator(live_server, page: Page):
    """
    Validate that auto-generated teams during tournament generation
    have different colors assigned (color iterator).
    """
    # Setup league/season so the Create Gameday button works correctly with defaults
    LeagueFactory(name="Default League")
    SeasonFactory(name="2026")

    _login(page, live_server.url)
    page.goto(f"{live_server.url}{DESIGNER_BASE_URL}/")
    
    # Wait for dashboard to be ready
    expect(page.get_by_role("button", name="Create Gameday").first).to_be_visible(timeout=15000)
    page.get_by_role("button", name="Create Gameday").first.click()
    
    # Wait for editor to load
    expect(page.get_by_test_id("gameday-metadata-accordion")).to_be_visible(timeout=15000)
    
    # Open Template Library
    page.get_by_test_id("open-template-library-button").click()
    expect(page.get_by_text("Template Library")).to_be_visible(timeout=5000)
    
    # Select first template
    page.locator('[data-testid^="builtin-template-"]').first.click()
    page.get_by_test_id("apply-template-button").click()
    
    # Click Auto-generate
    expect(page.get_by_text("Select Teams")).to_be_visible(timeout=5000)
    page.get_by_role("button", name=re.compile(r"Auto-generate")).click()
    
    # Apply
    apply_btn = page.get_by_role("button", name=re.compile(r"Apply to Gameday"))
    expect(apply_btn).to_be_enabled(timeout=10000)
    apply_btn.click()
    
    # Wait for apply
    expect(page.get_by_text("Select Teams")).not_to_be_visible(timeout=5000)
    page.wait_for_timeout(2000)
    
    # Check colors of the first two teams
    color_inputs = page.locator('div[id^="team-"]').locator('input[type="color"]')
    assert color_inputs.count() >= 2
    
    color_1 = color_inputs.nth(0).input_value()
    color_2 = color_inputs.nth(1).input_value()
    
    assert color_1.lower() != "#6c757d", f"Team 1 has default grey: {color_1}"
    assert color_2.lower() != "#6c757d", f"Team 2 has default grey: {color_2}"
    assert color_1 != color_2, f"Generated teams should have different colors. Got {color_1} and {color_2}"
