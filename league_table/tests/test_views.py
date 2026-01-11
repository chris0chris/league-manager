from http import HTTPStatus

from django.urls import reverse
from django_webtest import WebTest

from gamedays.constants import LEAGUE_GAMEDAY_GAMEINFOS_WIZARD
from gamedays.forms import (
    GamedayGaminfoFieldsAndGroupsForm,
    GamedayFormatForm,
    GameinfoForm,
    SCHEDULE_CUSTOM_CHOICE_C,
)
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import UserFactory, GamedayFactory
from gamedays.wizard import FIELD_GROUP_STEP
from league_table.tests.setup_factories.factories_leaguetable import LeagueGroupFactory


# class TestLeagueTableView(WebTest):
#     def test_league_table_for_year_is_displayed(self):
#         DBSetup().g72_finished()
#         DBSetup().g62_finished()
#         response = self.app.get(reverse('league-table-overall'))
#         assert 'team__name' in response.context['info']['schedule']
#
#     def test_league_table_for_league_is_displayed(self):
#         DBSetup().g72_finished()
#         DBSetup().g62_finished()
#         season = Season.objects.first()
#         west = League.objects.create(name='west')
#         south = League.objects.create(name='south')
#         teams_A = Team.objects.filter(name__startswith='A')
#         teams_B = Team.objects.filter(name__startswith='B')
#         for team in teams_A:
#             SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
#         for team in teams_B:
#             SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
#         response = self.app.get(reverse('league-table-league', kwargs={'season': season, 'league': south}))
#         assert 'team__name' in response.context['info']['schedule']


class TestGameinfoWizardWithLeagueGroup(WebTest):

    # TODO generischer Spielplan erzeugt Gruppen-Select mit den ausgewählten Gruppen und nicht wie in der JSON Datei hinterlegt ist
    def test_wizard_renders_gameinfo_with_league_group_while_generic_format_selected(
        self,
    ):
        group1 = LeagueGroupFactory(name="Group 1")
        group2 = LeagueGroupFactory(
            name="Group 2", season=group1.season, league=group1.league
        )
        teams = DBSetup().create_teams(name="LeagueGroupTeam", number_teams=3)
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory(season=group1.season, league=group1.league)

        field_group_step = self.app.get(
            reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        )
        assert isinstance(
            field_group_step.context["form"], GamedayGaminfoFieldsAndGroupsForm
        )
        assert field_group_step.context["form"].fields["group_names"].choices == [
            (group1.pk, group1.name),
            (group2.pk, group2.name),
        ]

        field_group_step_form = field_group_step.forms["fields-groups-form"]
        field_group_step_form[f"{FIELD_GROUP_STEP}-format"] = "3_1"
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_fields"] = 1
        field_group_step_form[f"{FIELD_GROUP_STEP}-group_names"] = [group2.pk]

        gameday_format_step = field_group_step_form.submit()
        assert gameday_format_step.status_code == HTTPStatus.OK
        gameday_format_form = gameday_format_step.context["form"][0]
        assert isinstance(gameday_format_form, GamedayFormatForm)
        assert gameday_format_form.fields["group"].label == group2.name

        # gameday_format_step_form = gameday_format_step.forms["gamedays-format-form"]
        # gameday_format_step_form[f"{GAMEDAY_FORMAT_STEP}-0-group"]._forced_values = [
        #     team.pk for team in teams
        # ]
        #
        # gameinfo_update_page = gameday_format_step_form.submit().follow()
        # assert gameinfo_update_page.status_code == HTTPStatus.OK
        # assert gameinfo_update_page.request.path == reverse(
        #     LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk}
        # )
        # assert isinstance(gameinfo_update_page.context["form"][0], GameinfoForm)

    def test_wizard_renders_gameinfo_with_league_group_while_custom_format_selected(
        self,
    ):
        group1 = LeagueGroupFactory(name="Group 1")
        group2 = LeagueGroupFactory(
            name="Group 2", season=group1.season, league=group1.league
        )
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory(season=group1.season, league=group1.league)

        field_group_step = self.app.get(
            reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        )
        assert isinstance(
            field_group_step.context["form"], GamedayGaminfoFieldsAndGroupsForm
        )

        field_group_step_form = field_group_step.forms["fields-groups-form"]
        field_group_step_form[f"{FIELD_GROUP_STEP}-format"] = SCHEDULE_CUSTOM_CHOICE_C
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_fields"] = 1
        field_group_step_form[f"{FIELD_GROUP_STEP}-group_names"] = [group2.pk]

        gameinfo_create_page = field_group_step_form.submit()
        assert gameinfo_create_page.status_code == HTTPStatus.OK
        assert gameinfo_create_page.request.path == reverse(
            LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk}
        )
        gameinfo_form = gameinfo_create_page.context["form"][0]
        assert isinstance(gameinfo_form, GameinfoForm)
        assert gameinfo_form.fields["standing"].choices == [
            (str(group2.pk), group2.name)
        ]
