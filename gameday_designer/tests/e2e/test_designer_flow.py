import os
import re

# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
from playwright.sync_api import Page, expect
from django.contrib.auth.models import User

from gamedays.tests.setup_factories.factories import LeagueFactory, SeasonFactory

DESIGNER_BASE_URL = "/gamedays/gameday/design"


def _login(page: Page, live_server_url: str) -> None:
    """
    Log in via Django's standard session login page (/login/).

    The designer's index view is @login_required, so the browser needs a valid
    Django session cookie — a Knox token alone only covers API calls.
    With SessionAuthentication also configured in DRF, the session cookie covers
    both the initial page load and every subsequent API call from the React app.
    """
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

    # Wait until Django redirects away from the login page
    page.wait_for_url(lambda url: "/login" not in url, timeout=10000)


def _navigate_to_dashboard(page: Page, live_server_url: str) -> None:
    """Navigate to the gameday designer dashboard and wait for it to be ready."""
    page.goto(f"{live_server_url}{DESIGNER_BASE_URL}/")
    # Two "Create Gameday" buttons exist when the list is empty: one in the toolbar
    # and one in the empty-state card. Use .first to avoid a strict-mode violation.
    expect(page.get_by_role("button", name="Create Gameday").first).to_be_visible(
        timeout=15000
    )


@pytest.mark.django_db(transaction=True)
def test_create_gameday_generate_tournament_and_publish(live_server, page: Page):
    """
    Full E2E flow for the Gameday Designer:
      1. Setup — create a League and Season in the database.
      2. Login   — inject Knox auth token into localStorage.
      3. Dashboard — navigate to the designer dashboard.
      4. Create   — click "Create Gameday"; the app creates a DRAFT gameday with
                    the first available season/league and navigates to the editor.
      5. Metadata  — fill in name, date, start time and venue.
      6. Generate  — open the Tournament Generator modal, enable "Generate teams
                    automatically", confirm → the tournament structure is built.
      7. Publish   — click "Publish Schedule" in the accordion header, then confirm
                    in the Publish Confirmation modal.
      8. Dashboard — navigate back and assert the card shows "Published" status.
    """
    # ---- 1. Setup: ensure at least one League and Season exist ---------------
    LeagueFactory(name="E2E Test League")
    SeasonFactory(name="2026")

    # ---- 2. Login via Django session (required by @login_required on index view) ----
    _login(page, live_server.url)

    # ---- 3. Navigate to the dashboard ----------------------------------------
    _navigate_to_dashboard(page, live_server.url)

    # ---- 4. Create a new gameday ---------------------------------------------
    # handleCreateGameday() fetches seasons/leagues, creates the gameday with
    # the first available ones, then navigate('/designer/:id').
    page.get_by_role("button", name="Create Gameday").first.click()

    # Wait for the designer editor to load (metadata accordion is always rendered)
    expect(page.get_by_test_id("gameday-metadata-accordion")).to_be_visible(
        timeout=15000
    )

    # Capture the gameday ID from the URL (/designer/<id>) for later dashboard lookup.
    page.wait_for_url(re.compile(r"/designer/\d+"), timeout=5000)
    gameday_id = re.search(r"/designer/(\d+)", page.url).group(1)

    # The accordion starts expanded (activeKey="0") but a scroll event can collapse it.
    # Explicitly click the toggle to guarantee the body is open, then wait for the
    # name input to be interactive before filling any fields.
    page.get_by_test_id("gameday-metadata-toggle").click()
    expect(page.locator("#gamedayName")).to_be_visible(timeout=10000)

    # ---- 5. Fill in metadata -------------------------------------------------
    # The accordion body is expanded by default (activeKey="0").
    # All fields are identified by the Bootstrap Form.Group controlId → <id>.
    #
    # IMPORTANT: loadData() in the designer only loads the canvas designer-state
    # (JSON blob), not the gameday metadata (name/season/league). For a freshly
    # created gameday there is no saved designer state, so the in-memory
    # flowState metadata starts at {id} with all other fields at defaults (0 /
    # empty).  We must explicitly fill every required field here so validation
    # passes before publishing.

    # Gameday name
    page.fill("#gamedayName", "E2E Testday 2026")

    # Date (YYYY-MM-DD format for HTML date inputs)
    page.fill("#gamedayDate", "2026-06-20")

    # Start time
    page.fill("#gamedayStart", "10:00")

    # Venue
    page.fill("#gamedayVenue", "E2E Stadium, Testville")

    # Season & League — the GamedayMetadataAccordion fetches these options via a
    # separate useEffect on mount. Wait for at least one non-default option to
    # appear before selecting, to avoid acting on an empty <select>.
    # Wait for the season option "2026" to appear (async fetch inside accordion)
    expect(page.locator("#gamedaySeason option", has_text="2026")).to_be_attached(
        timeout=10000
    )
    page.select_option("#gamedaySeason", label="2026")
    page.select_option("#gamedayLeague", label="E2E Test League")

    # ---- 6. Generate tournament ----------------------------------------------
    # The "Generate Tournament" button lives in the AppHeader (data-testid).
    page.get_by_test_id("generate-tournament-button").click()

    # Wait for the Tournament Generator modal to appear
    expect(page.get_by_role("dialog")).to_be_visible(timeout=5000)
    # Confirm it's the right modal by checking the title heading
    expect(page.locator(".modal-title")).to_be_visible(timeout=5000)

    # There are no teams in the pool yet, so "Generate teams automatically"
    # checkbox (id="generate-teams") is enabled. Check it so the confirmation
    # button becomes active (isTeamCountValid requires generateTeams=true when
    # no teams are selected).
    generate_teams_checkbox = page.locator("#generate-teams")
    expect(generate_teams_checkbox).to_be_enabled(timeout=3000)
    if not generate_teams_checkbox.is_checked():
        generate_teams_checkbox.click()

    # Confirm tournament generation
    confirm_btn = page.get_by_test_id("confirm-generate-button")
    expect(confirm_btn).to_be_enabled(timeout=3000)
    confirm_btn.click()

    # Modal should close after confirming
    expect(page.get_by_role("dialog")).not_to_be_visible(timeout=5000)

    # Wait for the canvas to populate — the auto-save debounce is 1.5 s, so we
    # give enough time for the state update to render before we publish.
    page.wait_for_timeout(2000)

    # ---- 7. Publish ----------------------------------------------------------
    # The publish button is rendered in the CustomAccordionHeader of the
    # GamedayMetadataAccordion (only visible for DRAFT status).
    publish_btn = page.get_by_test_id("publish-schedule-button")
    expect(publish_btn).to_be_visible(timeout=5000)
    publish_btn.click()

    # PublishConfirmationModal appears
    expect(page.get_by_role("dialog")).to_be_visible(timeout=5000)

    # If the generated schedule is valid, "Publish Now" is enabled.
    # If not (e.g. no teams assigned), the button is disabled and this assertion
    # will surface the validation error for the developer to investigate.
    # Button reads "Publish Now" (no warnings) or "Publish Anyway" (warnings present).
    publish_now_btn = page.get_by_role("button", name=re.compile(r"^Publish"))
    expect(publish_now_btn).to_be_enabled(timeout=5000)
    publish_now_btn.click()

    # Wait for the success notification — this confirms the publish API call
    # returned 2xx. (The accordion status badge does not update in-editor because
    # loadData() only re-imports the saved canvas JSON, not the gameday status.)
    expect(page.get_by_text("Schedule published and locked")).to_be_visible(
        timeout=10000
    )

    # ---- 8. Navigate back to dashboard and verify Published card ------------
    page.get_by_role("button", name="Back").click()

    # The dashboard re-fetches the gameday list from the API; the specific card
    # for the gameday we just created (identified by its ID) must show "Published".
    gameday_card = page.get_by_test_id(f"gameday-card-{gameday_id}")
    expect(gameday_card).to_be_visible(timeout=10000)
    expect(gameday_card.get_by_text("Published")).to_be_visible()
