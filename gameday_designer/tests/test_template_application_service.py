"""
Test suite for TemplateApplicationService.

Following TDD methodology: These tests are written FIRST (RED phase).
Service implementation comes after tests are defined.

Application Process:
1. Validate compatibility (team mapping complete, teams exist, gameday has enough fields)
2. Clear existing gameday schedule (within transaction)
3. Create Gameinfo objects from slots
4. Create Gameresult objects (home/away teams)
5. Create TemplateApplication audit record
"""

import datetime
import pytest
from django.contrib.auth.models import User
from django.db import transaction

from gamedays.models import (
    Association,
    Gameday,
    Season,
    League,
    Team,
    Gameinfo,
    Gameresult,
)
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateApplication,
)
from gameday_designer.service.template_application_service import (
    TemplateApplicationService,
    ApplicationResult,
    ApplicationError,
)


@pytest.mark.django_db
class TestTemplateApplicationServiceCompatibility:
    """Test compatibility validation before application."""

    def test_validate_compatibility_success(self):
        """Test that compatible template and gameday pass validation."""
        # Create template
        template = ScheduleTemplate.objects.create(
            name="6 Team Format",
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create gameday with sufficient fields
        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="6_2",
            author=user,
        )

        # Create teams
        teams = []
        for i in range(6):
            team = Team.objects.create(
                name=f"Team {i}",
                description=f"Description for team {i}",
                location="Test City",
            )
            teams.append(team)

        # Create team mapping (2 groups × 3 teams)
        team_mapping = {
            "0_0": teams[0].pk,
            "0_1": teams[1].pk,
            "0_2": teams[2].pk,
            "1_0": teams[3].pk,
            "1_1": teams[4].pk,
            "1_2": teams[5].pk,
        }

        # Should not raise exception
        service = TemplateApplicationService(template, gameday, team_mapping)
        # Validation happens during apply()

    def test_validate_compatibility_insufficient_fields(self):
        """Test that gameday with insufficient fields fails validation."""
        template = ScheduleTemplate.objects.create(
            name="3 Field Format",
            num_teams=6,
            num_fields=3,  # Requires 3 fields
            num_groups=2,
        )

        # Create slot requiring field 3
        TemplateSlot.objects.create(
            template=template,
            field=3,
            slot_order=0,
            stage="Vorrunde",
            standing="Gruppe 1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Create gameday with only 2 fields
        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="6_2",  # Only 2 fields
            author=user,
        )

        team_mapping = {"0_0": 1, "0_1": 2, "1_0": 3}

        service = TemplateApplicationService(template, gameday, team_mapping)

        with pytest.raises(ApplicationError, match="field"):
            service.apply()

    def test_validate_compatibility_incomplete_team_mapping(self):
        """Test that incomplete team mapping fails validation."""
        template = ScheduleTemplate.objects.create(
            name="6 Team Format",
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create slots that require 6 teams
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Gruppe 1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="6_2",
            author=user,
        )

        # Incomplete mapping (only 2 teams instead of 6)
        team_mapping = {
            "0_0": 1,
            "0_1": 2,
        }

        service = TemplateApplicationService(template, gameday, team_mapping)

        with pytest.raises(ApplicationError, match="team mapping"):
            service.apply()

    def test_validate_compatibility_team_does_not_exist(self):
        """Test that mapping to non-existent team fails validation."""
        template = ScheduleTemplate.objects.create(
            name="4 Team Format",
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        # Mapping references team IDs that don't exist
        team_mapping = {
            "0_0": 999,  # Does not exist
            "0_1": 998,
            "0_2": 997,
            "0_3": 996,
        }

        service = TemplateApplicationService(template, gameday, team_mapping)

        with pytest.raises(ApplicationError, match="does not exist"):
            service.apply()


@pytest.mark.django_db
class TestTemplateApplicationServiceGameinfoCreation:
    """Test creation of Gameinfo and Gameresult objects."""

    def test_apply_creates_gameinfos(self):
        """Test that applying template creates Gameinfo objects."""
        template = ScheduleTemplate.objects.create(
            name="Simple Format",
            num_teams=4,
            num_fields=1,
            num_groups=1,
            game_duration=70,
        )

        # Create 2 slots
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
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
            slot_order=1,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=2,
            away_group=0,
            away_team=3,
            official_group=0,
            official_team=0,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        # Create teams
        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]

        team_mapping = {
            "0_0": teams[0].pk,
            "0_1": teams[1].pk,
            "0_2": teams[2].pk,
            "0_3": teams[3].pk,
        }

        service = TemplateApplicationService(template, gameday, team_mapping)
        result = service.apply()

        assert result.success is True
        assert result.gameinfos_created == 2

        # Verify Gameinfo objects were created
        gameinfos = Gameinfo.objects.filter(gameday=gameday).order_by(
            "field", "scheduled"
        )
        assert gameinfos.count() == 2

        # Check first gameinfo
        gi1 = gameinfos[0]
        assert gi1.field == 1
        assert gi1.stage == "Vorrunde"
        assert gi1.standing == "Round Robin"
        assert gi1.officials.pk == teams[2].pk

    def test_apply_creates_gameresults(self):
        """Test that applying template creates Gameresult objects for home/away teams."""
        template = ScheduleTemplate.objects.create(
            name="Simple Format",
            num_teams=4,
            num_fields=1,
            num_groups=1,
            game_duration=70,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]

        team_mapping = {
            "0_0": teams[0].pk,
            "0_1": teams[1].pk,
            "0_2": teams[2].pk,
            "0_3": teams[3].pk,
        }

        service = TemplateApplicationService(template, gameday, team_mapping)
        result = service.apply()

        # Verify Gameresult objects created
        gameinfo = Gameinfo.objects.get(gameday=gameday)
        gameresults = Gameresult.objects.filter(gameinfo=gameinfo)
        assert gameresults.count() == 2

        # Check home team
        home_result = gameresults.get(isHome=True)
        assert home_result.team.pk == teams[0].pk

        # Check away team
        away_result = gameresults.get(isHome=False)
        assert away_result.team.pk == teams[1].pk

    def test_apply_calculates_scheduled_times(self):
        """Test that scheduled times are calculated based on game duration."""
        template = ScheduleTemplate.objects.create(
            name="Timing Test",
            num_teams=4,
            num_fields=1,
            num_groups=1,
            game_duration=70,  # 70 minutes per game
        )

        # Create 3 sequential slots
        for i in range(3):
            TemplateSlot.objects.create(
                template=template,
                field=1,
                slot_order=i,
                stage="Vorrunde",
                standing="Round Robin",
                home_group=0,
                home_team=(i * 2) % 4,
                away_group=0,
                away_team=(i * 2 + 1) % 4,
                official_group=0,
                official_team=(i + 2) % 4,
                break_after=10 if i == 0 else 0,  # 10 min break after first game
            )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),  # Starts at 10:00
            format="4_1",
            author=user,
        )

        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]
        team_mapping = {f"0_{i}": teams[i].pk for i in range(4)}

        service = TemplateApplicationService(template, gameday, team_mapping)
        result = service.apply()

        gameinfos = Gameinfo.objects.filter(gameday=gameday).order_by("scheduled")

        # First game: 10:00
        assert gameinfos[0].scheduled == datetime.time(10, 0)

        # Second game: 10:00 + 70min + 10min break = 11:20
        assert gameinfos[1].scheduled == datetime.time(11, 20)

        # Third game: 11:20 + 70min = 12:30
        assert gameinfos[2].scheduled == datetime.time(12, 30)


@pytest.mark.django_db
class TestTemplateApplicationServiceClearExisting:
    """Test clearing existing gameday schedule."""

    def test_apply_clears_existing_gameinfos(self):
        """Test that applying template clears existing Gameinfo objects."""
        template = ScheduleTemplate.objects.create(
            name="New Format",
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]
        team_mapping = {f"0_{i}": teams[i].pk for i in range(4)}

        # Create official team for existing gameinfo
        official_team = Team.objects.create(
            name="Official Team", description="Official desc", location="City"
        )

        # Create existing gameinfo
        old_gameinfo = Gameinfo.objects.create(
            gameday=gameday,
            scheduled=datetime.time(14, 0),
            field=1,
            stage="Old Stage",
            standing="Old Standing",
            officials=official_team,
        )
        old_gameinfo_id = old_gameinfo.pk

        service = TemplateApplicationService(template, gameday, team_mapping)
        result = service.apply()

        # Old gameinfo should be deleted
        assert not Gameinfo.objects.filter(pk=old_gameinfo_id).exists()

        # New gameinfo should exist
        assert Gameinfo.objects.filter(gameday=gameday).count() == 1
        new_gameinfo = Gameinfo.objects.get(gameday=gameday)
        assert new_gameinfo.stage == "Vorrunde"


@pytest.mark.django_db
class TestTemplateApplicationServiceAuditTrail:
    """Test creation of TemplateApplication audit records."""

    def test_apply_creates_audit_record(self):
        """Test that applying template creates TemplateApplication audit record."""
        template = ScheduleTemplate.objects.create(
            name="Audit Test",
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]
        team_mapping = {f"0_{i}": teams[i].pk for i in range(4)}

        service = TemplateApplicationService(
            template, gameday, team_mapping, applied_by=user
        )
        result = service.apply()

        # Check audit record created
        assert TemplateApplication.objects.filter(
            template=template, gameday=gameday
        ).exists()

        application = TemplateApplication.objects.get(
            template=template, gameday=gameday
        )
        assert application.applied_by == user
        assert application.team_mapping == team_mapping
        assert application.applied_at is not None


@pytest.mark.django_db
class TestTemplateApplicationServiceTransactions:
    """Test transactional integrity of template application."""

    def test_apply_is_atomic(self):
        """Test that application is atomic - all or nothing."""
        template = ScheduleTemplate.objects.create(
            name="Transaction Test",
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        # Team 999 does not exist - should cause failure
        team_mapping = {
            "0_0": 999,  # Invalid
            "0_1": 998,
            "0_2": 997,
            "0_3": 996,
        }

        service = TemplateApplicationService(template, gameday, team_mapping)

        with pytest.raises(ApplicationError):
            service.apply()

        # No gameinfos should be created (transaction rolled back)
        assert Gameinfo.objects.filter(gameday=gameday).count() == 0
        assert TemplateApplication.objects.filter(template=template).count() == 0


@pytest.mark.django_db
class TestTemplateApplicationServiceResult:
    """Test ApplicationResult structure."""

    def test_application_result_success(self):
        """Test successful application returns proper result."""
        template = ScheduleTemplate.objects.create(
            name="Result Test",
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage="Vorrunde",
            standing="Round Robin",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        season = Season.objects.create(name="2025")
        league = League.objects.create(name="Test League")
        user = User.objects.create(username="test_user")
        gameday = Gameday.objects.create(
            name="Test Gameday",
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format="4_1",
            author=user,
        )

        teams = [
            Team.objects.create(
                name=f"Team {i}", description=f"Desc {i}", location="City"
            )
            for i in range(4)
        ]
        team_mapping = {f"0_{i}": teams[i].pk for i in range(4)}

        service = TemplateApplicationService(template, gameday, team_mapping)
        result = service.apply()

        # Check result structure
        assert hasattr(result, "success")
        assert hasattr(result, "gameinfos_created")
        assert hasattr(result, "message")
        assert result.success is True
        assert result.gameinfos_created == 1
        assert isinstance(result.message, str)
