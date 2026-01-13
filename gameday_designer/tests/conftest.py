import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from gamedays.models import Association, Season, League, Gameday, Team
from gameday_designer.models import ScheduleTemplate, TemplateSlot

@pytest.fixture
def api_client():
    """Provide DRF APIClient."""
    return APIClient()

@pytest.fixture
def staff_user(db):
    """Create staff user."""
    return User.objects.create_user(
        username="staff", email="staff@example.com", password="password", is_staff=True
    )

@pytest.fixture
def association_user(db):
    """Create regular user."""
    return User.objects.create_user(
        username="assoc_user",
        email="assoc@example.com",
        password="password",
        is_staff=False,
    )

@pytest.fixture
def association(db):
    """Create test association."""
    return Association.objects.create(name="Test Association", abbr="TEST")

@pytest.fixture
def template(db, association, staff_user):
    """Create test template."""
    return ScheduleTemplate.objects.create(
        name="Test Template",
        description="A test schedule template",
        num_teams=6,
        num_fields=2,
        num_groups=1,
        game_duration=70,
        association=association,
        created_by=staff_user,
        updated_by=staff_user,
    )

@pytest.fixture
def global_template(db, staff_user):
    """Create global template."""
    return ScheduleTemplate.objects.create(
        name="Global Template",
        description="Global template for all",
        num_teams=8,
        num_fields=3,
        num_groups=2,
        game_duration=60,
        association=None,
        created_by=staff_user,
        updated_by=staff_user,
    )

@pytest.fixture
def template_with_slots(db, template):
    """Create template with slots."""
    TemplateSlot.objects.create(
        template=template,
        field=1,
        slot_order=1,
        stage="Vorrunde",
        standing="Gruppe 1",
        home_group=0,
        home_team=0,
        away_group=0,
        away_team=1,
        official_group=0,
        official_team=2,
    )
    TemplateSlot.objects.create(
        template=template,
        field=1,
        slot_order=2,
        stage="Vorrunde",
        standing="Gruppe 1",
        home_group=0,
        home_team=2,
        away_group=0,
        away_team=3,
        official_group=0,
        official_team=4,
    )
    return template

@pytest.fixture
def gameday(db, association, staff_user):
    """Create test gameday."""
    from datetime import date, time
    league = League.objects.create(name="Test League")
    season = Season.objects.create(name="2025")
    return Gameday.objects.create(
        name="Test Gameday",
        date=date(2025, 1, 15),
        start=time(10, 0),
        format="6_2",
        season=season,
        league=league,
        author=staff_user,
    )

@pytest.fixture
def teams(db, association):
    """Create test teams."""
    return [
        Team.objects.create(
            name=f"Team {i}", description=f"Test team {i}", association=association
        )
        for i in range(6)
    ]