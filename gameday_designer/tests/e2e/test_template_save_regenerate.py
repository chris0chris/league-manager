import os

# Must be set before any Django imports
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import pytest
from playwright.sync_api import Page, expect

from gamedays.tests.setup_factories.factories import LeagueFactory, SeasonFactory

from .test_designer_flow import _login, _navigate_to_dashboard


@pytest.mark.django_db(transaction=True)
def test_save_custom_template_and_regenerate(live_server, page: Page):
    """
    E2E flow for the template save-and-regenerate lifecycle using the new
    Template Library modal:

    Phase 1 — Create a gameday and fill mandatory metadata.
    Phase 2 — Generate a schedule from a built-in template via Template Library.
    Phase 3 — Save the generated structure as a custom template.
    Phase 4 — Clear the schedule.
    Phase 5 — Regenerate from the saved custom template via Template Library.
    Phase 6 — Assert the schedule was recreated.
    """

    # ---- Setup: ensure League and Season exist in DB -------------------------
    LeagueFactory(name="Template E2E League")
    SeasonFactory(name="2026")

    # ---- Phase 1: Create a gameday and fill metadata -------------------------
    _login(page, live_server.url)
    _navigate_to_dashboard(page, live_server.url)

    page.get_by_role("button", name="Create Gameday").first.click()
    expect(page.get_by_test_id("gameday-metadata-accordion")).to_be_visible(timeout=15000)

    page.get_by_test_id("gameday-metadata-toggle").click()
    expect(page.locator("#gamedayName")).to_be_visible(timeout=10000)

    page.fill("#gamedayName", "Template E2E Testday")
    page.fill("#gamedayDate", "2026-07-15")
    page.fill("#gamedayStart", "09:00")
    page.fill("#gamedayVenue", "Template E2E Stadium")

    expect(page.locator("#gamedaySeason option", has_text="2026")).to_be_attached(timeout=10000)
    page.select_option("#gamedaySeason", label="2026")
    page.select_option("#gamedayLeague", label="Template E2E League")

    # ---- Phase 2: Generate from a built-in template via Template Library -----
    page.get_by_test_id("open-template-library-button").click()
    expect(page.get_by_text("Template Library")).to_be_visible(timeout=5000)

    # Select the F6-2-2 built-in template
    builtin_template = page.get_by_test_id("builtin-template-F6-2-2")
    expect(builtin_template).to_be_visible(timeout=5000)
    builtin_template.click()

    # Apply — advances to the TeamPicker step
    import re as _re
    expect(page.get_by_test_id("apply-template-button")).to_be_visible(timeout=5000)
    page.get_by_test_id("apply-template-button").click()

    # TeamPickerStep dialog appears; no league teams exist so auto-generate placeholder teams
    expect(page.get_by_text("Select Teams")).to_be_visible(timeout=5000)
    page.get_by_role("button", name=_re.compile(r"Auto-generate")).click()

    apply_btn = page.get_by_role("button", name=_re.compile(r"Apply to Gameday"))
    expect(apply_btn).to_be_enabled(timeout=10000)
    apply_btn.click()
    expect(page.get_by_text("Select Teams")).not_to_be_visible(timeout=5000)

    # Wait for auto-save debounce
    page.wait_for_timeout(2000)

    # Snapshot the game, stage, and progression counts (team count is snapshotted
    # after the officials team is added below, since it is saved into the template)
    expect(page.locator('tr[id^="game-"]').first).to_be_visible(timeout=5000)
    expected_game_count = page.locator('tr[id^="game-"]').count()
    expected_stage_count = page.locator('.stage-section[id^="stage-"]').count()
    # Progression slots show winner (⚡) or loser (💔) labels in the react-select value
    expected_progression_count = page.locator('table').filter(
        has_text=_re.compile(r'[⚡💔]')
    ).count()
    assert expected_game_count > 0, "Built-in template should produce at least one game"
    assert expected_stage_count > 0, "Built-in template should produce at least one stage"
    assert expected_progression_count > 0, "Built-in template should produce at least one progression slot"

    # Assign an official to the first game to exercise the save/restore cycle
    page.get_by_test_id("add-officials-button").click()
    page.wait_for_timeout(500)
    # Add a team to the officials group - use the "Add your first team" button (empty group)
    page.locator('#group-group-officials').get_by_title("Add your first team to this group").click()
    page.wait_for_timeout(500)

    # Snapshot team count AFTER adding the officials team — this is the state that
    # will be saved into the custom template, so the regenerated schedule must match it
    expected_team_count = page.locator('.team-group-card [id^="team-"]').count()
    assert expected_team_count > 0, "Built-in template should produce at least one team"
    # Open the official select on the first game and pick the new team (first non-disabled option)
    first_game_row = page.locator('tr[id^="game-"]').first
    first_game_row.locator('.official-select__control').click()
    page.locator('.official-select__option[aria-disabled="false"]').first.click()
    page.wait_for_timeout(1000)

    # Snapshot officials count (games with a selected official shown in the single-value slot)
    expected_official_count = page.locator('tr[id^="game-"] .official-select__single-value').count()
    assert expected_official_count > 0, "Should have at least one game with an official assigned"

    # Snapshot times count (game rows whose time cell shows a real HH:MM time, not '--:--')
    expected_time_count = page.locator('tr[id^="game-"] > td:nth-child(2)').filter(
        has_not_text='--:--'
    ).count()
    assert expected_time_count > 0, "Built-in template should produce games with calculated start times"

    # ---- Phase 3: Save the generated structure as a custom template ----------
    page.get_by_test_id("open-template-library-button").click()
    expect(page.get_by_text("Template Library")).to_be_visible(timeout=5000)

    # Click "Save current as template" in the modal header
    page.get_by_role("button", name="Save current as template").click()

    # SaveTemplateSheet opens — fill in name and submit
    template_name_input = page.get_by_placeholder("Template name...")
    expect(template_name_input).to_be_visible(timeout=5000)
    template_name_input.fill("My E2E Template")

    page.get_by_role("button", name="Save Template").click()

    # Expect success notification
    expect(page.get_by_text("Template saved successfully")).to_be_visible(timeout=10000)

    # Close the Template Library modal via the ✕ button
    page.get_by_role("button", name="✕").click()
    expect(page.get_by_text("Template Library")).not_to_be_visible(timeout=5000)

    # ---- Phase 4: Clear the schedule -----------------------------------------
    # Scroll the content container to the top so that the forceCollapsed behaviour
    # (which activates when scrollTop > 50px) resets before we try to open the
    # metadata accordion. Without this, clicking the toggle has no effect because
    # the accordion's useEffect immediately re-collapses it while forceCollapsed=true.
    page.evaluate(
        "document.querySelector('.list-designer-app__content').scrollTop = 0"
    )
    page.wait_for_timeout(300)

    # Open the metadata accordion only if it is currently collapsed
    toggle = page.get_by_test_id("gameday-metadata-toggle")
    if 'collapsed' in (toggle.get_attribute('class') or ''):
        toggle.click()
        # Wait for Bootstrap accordion animation to finish before clicking children
        expect(toggle).not_to_have_class(_re.compile(r'collapsed'), timeout=5000)
    clear_btn = page.get_by_test_id("clear-all-button")
    expect(clear_btn).to_be_visible(timeout=5000)
    clear_btn.click()

    # Wait for auto-save debounce
    page.wait_for_timeout(2000)

    # ---- Phase 5: Regenerate from the saved custom template -----------------
    page.get_by_test_id("open-template-library-button").click()
    expect(page.get_by_text("Template Library")).to_be_visible(timeout=5000)

    # The saved template should appear in the list
    expect(page.get_by_text("My E2E Template")).to_be_visible(timeout=10000)
    page.get_by_text("My E2E Template").click()

    # Apply the saved template — advances to TeamPicker step
    expect(page.get_by_test_id("apply-template-button")).to_be_visible(timeout=5000)
    page.get_by_test_id("apply-template-button").click()

    # TeamPickerStep: auto-generate placeholder teams and confirm
    expect(page.get_by_text("Select Teams")).to_be_visible(timeout=5000)
    page.get_by_role("button", name=_re.compile(r"Auto-generate")).click()

    apply_btn = page.get_by_role("button", name=_re.compile(r"Apply to Gameday"))
    expect(apply_btn).to_be_enabled(timeout=10000)
    apply_btn.click()

    # Template Library should close after applying
    expect(page.get_by_text("Select Teams")).not_to_be_visible(timeout=5000)

    # No error notification should appear (catches HTTP 400 "Template has no slots defined")
    expect(page.get_by_text("Failed to apply template")).not_to_be_visible(timeout=3000)

    # ---- Phase 6: Assert schedule was recreated ------------------------------
    # Wait for the designer state to fully settle after template apply (time
    # calculations and state refresh happen asynchronously after the API call).
    page.wait_for_timeout(2000)

    # Games must reappear in the designer canvas (catches empty-canvas bug where
    # the apply endpoint succeeds but the designer state is not refreshed)
    expect(page.locator('tr[id^="game-"]').first).to_be_visible(timeout=10000)
    actual_game_count = page.locator('tr[id^="game-"]').count()
    assert actual_game_count == expected_game_count, (
        f"Regenerated schedule should have {expected_game_count} games, got {actual_game_count}"
    )

    # Teams must also reappear (catches partial-restore where games load but team pool is empty)
    actual_team_count = page.locator('.team-group-card [id^="team-"]').count()
    assert actual_team_count == expected_team_count, (
        f"Regenerated schedule should have {expected_team_count} teams, got {actual_team_count}"
    )

    # Stage count must match (catches templates saved/restored without all stages)
    actual_stage_count = page.locator('.stage-section[id^="stage-"]').count()
    assert actual_stage_count == expected_stage_count, (
        f"Regenerated schedule should have {expected_stage_count} stages, got {actual_stage_count}"
    )

    # Progression slots (winner/loser references between stages) must be filled
    # (catches templates where game structure is restored but cross-stage edges are dropped)
    actual_progression_count = page.locator('table').filter(
        has_text=_re.compile(r'[⚡💔]')
    ).count()
    assert actual_progression_count == expected_progression_count, (
        f"Regenerated schedule should have {expected_progression_count} filled progression slots, "
        f"got {actual_progression_count}"
    )

    # Officials must be restored (catches templates saved/restored without officials).
    # Use > 0 rather than an exact count because some game types (e.g. progression/
    # final slots) may not carry officials from the template, making a strict count
    # comparison brittle. The key invariant is that officials are not completely lost.
    actual_official_count = page.locator('tr[id^="game-"] .official-select__single-value').count()
    assert actual_official_count > 0, (
        "Regenerated schedule should have at least one game with an official assigned, got 0"
    )

    # Start times must be preserved (catches templates where startTime is dropped on regeneration)
    actual_time_count = page.locator('tr[id^="game-"] > td:nth-child(2)').filter(
        has_not_text='--:--'
    ).count()
    assert actual_time_count == expected_time_count, (
        f"Regenerated schedule should have {expected_time_count} games with start times, "
        f"got {actual_time_count}"
    )
