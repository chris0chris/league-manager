from datetime import date, time

from django.test import TestCase

from gamedays.forms import (
    GameinfoForm,
    get_gameday_format_formset,
    GamedayFormatForm,
    GamedayForm,
    GamedayFormContext,
)
from gamedays.models import Gameday
from gamedays.tests.setup_factories.factories import (
    TeamFactory,
    GameinfoFactory,
    GameresultFactory,
    SeasonFactory,
    LeagueFactory,
    UserFactory,
)


class TestGamedayForm(TestCase):
    def test_gameday_form_has_expected_fields(self):
        form = GamedayForm()
        expected = ["name", "season", "league", "date", "start", "address"]
        assert list(form.fields.keys()) == expected

        assert form.fields["league"].empty_label == "Bitte auswählen"
        assert form.fields["address"].widget.attrs["class"] == "form-control"

    def test_gameday_form_sets_last_season_initial(self):
        SeasonFactory(name="2023")
        last = SeasonFactory(name="2024")
        form = GamedayForm()
        assert form.fields["season"].initial == last.id

    def test_gameday_form_sets_default_format_if_none(self):
        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Premier League")
        user = UserFactory(username="LeagueOrgA")

        data = {
            "name": "Gameday 1",
            "season": season.id,
            "league": league.id,
            "date": date.today(),
            "start": time(10, 0),
            "address": "Some address",
        }

        form = GamedayForm(
            data=data, context=GamedayFormContext(user, init_format=True)
        )
        assert form.is_valid(), form.errors

        gameday = form.save()
        assert gameday.name == "Gameday 1"
        assert gameday.season == season
        assert gameday.league == league
        assert gameday.date == date.today()
        assert gameday.start == time(10, 0)
        assert gameday.address == "Some address"
        assert gameday.format == "INITIAL_EMPTY"
        assert gameday.author == user
        assert Gameday.objects.count() == 1

    def test_gameday_form_respects_existing_format(self):
        season = SeasonFactory(name="2025")
        league = LeagueFactory(name="League B")
        user = UserFactory(username="LeagueOrgB")

        data = {
            "name": "Gameday with Format",
            "season": season.id,
            "league": league.id,
            "date": date.today(),
            "start": time(9, 30),
            "address": "Arena",
        }

        form = GamedayForm(
            data=data, context=GamedayFormContext(user, init_format=False)
        )
        form.author = user
        assert form.is_valid()
        gameday = form.save()
        assert gameday.author == user
        assert gameday.format == "6_2"


class TestGamedayFormatForm(TestCase):
    def test_gameday_format_form_renders_correctly(self):
        TeamFactory(name="Team A")
        form = GamedayFormatForm()

        assert "group" in form.fields
        field = form.fields["group"]
        assert field.required
        assert "required" in field.widget.attrs
        assert field.widget.attrs["required"] is True

    def test_gameday_format_form_accepts_valid_group(self):
        team = TeamFactory(name="Team A")
        data = {"group": [team.pk]}
        form = GamedayFormatForm(data=data, needed_teams=1)

        assert form.is_valid(), form.errors


class TestGameinfoForm(TestCase):
    def test_gameinfo_form_renders_required_fields(self):
        form = GameinfoForm()
        assert "home" in form.fields
        assert form.fields["home"].required is True
        assert form.fields["away"].required is True
        assert form.fields["officials"].required is True

    def test_gameinfo_form_sets_placeholder_choices_for_multiple_entries(self):
        form = GameinfoForm(
            group_choices=[("A", "Group A")],
            field_choices=[("1", "Field 1"), ("2", "Field 2")],
        )
        assert form.fields["field"].choices[0] == ("", "Bitte auswählen")
        assert ("2", "Field 2") in form.fields["field"].choices

    def test_gameinfo_form_sets_placeholder_choices_for_one_entry(self):
        form = GameinfoForm(
            group_choices=[("A", "Group A")], field_choices=[("1", "Field 1")]
        )
        assert form.fields["standing"].choices[0] == ("A", "Group A")

    def test_gameinfo_form_initializes_from_instance(self):
        home_team = TeamFactory(name="Team A")
        away_team = TeamFactory(name="Team B")
        gameinfo = GameinfoFactory(scheduled="10:00", field=1, standing="A")
        GameresultFactory(gameinfo=gameinfo, team=home_team, isHome=True, fh=6, sh=12)
        GameresultFactory(gameinfo=gameinfo, team=away_team, isHome=False, fh=0, sh=6)

        form = GameinfoForm(instance=gameinfo)

        assert form.fields["home"].initial == home_team
        assert form.fields["fh_home"].initial == 6
        assert form.fields["sh_home"].initial == 12
        assert form.fields["away"].initial == away_team
        assert form.fields["fh_away"].initial == 0
        assert form.fields["sh_away"].initial == 6

    def test_gameinfo_form_valid_submission(self):
        team_a = TeamFactory(name="A")
        team_b = TeamFactory(name="B")
        data = {
            "home": team_a.pk,
            "away": team_b.pk,
            "field": "1",
            "standing": "A",
            "stage": "Hauptrunde",
            "officials": team_a.pk,
            "scheduled": "10:00",
            "status": "Geplant",
            "gameStarted": "10:00",
            "gameHalftime": "10:15",
            "gameFinished": "10:30",
        }
        form = GameinfoForm(
            data=data,
            group_choices=[("A", "Group A")],
            field_choices=[("1", "Field 1")],
        )
        assert form.is_valid(), form.errors


def test_get_formset_creates_correct_number_of_forms():
    formset = get_gameday_format_formset(
        extra=2,
        needed_teams_list=[0, 0],
    )
    assert len(formset.forms) == 2
