import random

from factory import SubFactory, LazyAttribute, post_generation
from factory.django import DjangoModelFactory

from gamedays.tests.setup_factories.factories import (
    LeagueFactory,
    SeasonFactory,
    GamedayFactory,
    TeamFactory,
)
from league_table.models import (
    LeagueGroup,
    LeagueRuleset,
    LeagueSeasonConfig,
    TeamPointAdjustments,
    TieBreakStep,
)


class LeagueGroupFactory(DjangoModelFactory):
    class Meta:
        model = LeagueGroup

    league = SubFactory(LeagueFactory)
    season = SubFactory(SeasonFactory)
    name = LazyAttribute(lambda _: f"Group {random.randint(1, 10)}")


class LeagueRulesetFactory(DjangoModelFactory):
    class Meta:
        model = LeagueRuleset

    name = "Default RuleSet"


class TieBreakStepFactory(DjangoModelFactory):
    class Meta:
        model = TieBreakStep
        django_get_or_create = ("key",)

    key = "league_points"
    label = "Siegpunkte"


class TeamPointAdjustmentsFactory(DjangoModelFactory):
    class Meta:
        model = TeamPointAdjustments

    league_seaon_config = SubFactory("league_table.LeagueSeasonConfigFactory")
    team = SubFactory(TeamFactory)
    sum_points = 0.0
    tie_step_for_sum_points = SubFactory(TieBreakStepFactory)


class LeagueSeasonConfigFactory(DjangoModelFactory):
    class Meta:
        model = LeagueSeasonConfig

    league = SubFactory(LeagueFactory)
    season = SubFactory(SeasonFactory)
    ruleset = SubFactory(LeagueRulesetFactory)

    @post_generation
    def exclude_gamedays(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for gameday in extracted:
                GamedayFactory(gameday=gameday, season=self.season, league=self.league)

    @post_generation
    def team_point_adjustments(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for team in extracted:
                TeamPointAdjustmentsFactory(team=team, league_seaon_config=self)

    @post_generation
    def leagues_for_league_points(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for league in extracted:
                LeagueFactory(league=self.league)
