import random

from factory import SubFactory, LazyAttribute
from factory.django import DjangoModelFactory

from gamedays.tests.setup_factories.factories import LeagueFactory, SeasonFactory
from league_table.models import LeagueGroup, LeagueRuleset


class LeagueGroupFactory(DjangoModelFactory):
    class Meta:
        model = LeagueGroup

    league = SubFactory(LeagueFactory)
    season = SubFactory(SeasonFactory)
    name = LazyAttribute(lambda _: f"Group {random.randint(1, 10)}")


class LeagueRulesetFactory(DjangoModelFactory):
    class Meta:
        model = LeagueRuleset

    name = 'Default RuleSet'