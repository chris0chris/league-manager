import factory
from factory import post_generation, SubFactory
from factory.django import DjangoModelFactory

from gamedays.tests.setup_factories.factories import TeamFactory, PersonFactory, GamedayFactory
from passcheck.models import Playerlist, EligibilityRule, Player, PlayerlistGameday, PlayerlistTransfer


class PlayerFactory(DjangoModelFactory):
    class Meta:
        model = Player

    person = SubFactory(PersonFactory)
    pass_number = factory.Faker('random_int', min=10000, max=100000)


class PlayerlistFactory(DjangoModelFactory):
    class Meta:
        model = Playerlist

    team = SubFactory(TeamFactory)
    player = SubFactory(PlayerFactory)
    jersey_number = factory.Faker('random_int', min=0, max=99)

    @post_generation
    def gamedays(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for gameday in extracted:
                PlayerlistGamedayFactory(playerlist=self, gameday=gameday)


class PlayerlistGamedayFactory(DjangoModelFactory):
    class Meta:
        model = PlayerlistGameday

    playerlist = SubFactory(PlayerlistFactory)
    gameday = SubFactory(GamedayFactory)
    gameday_jersey = factory.Faker('random_int', min=0, max=99)


class PlayerlistTransferFactory(DjangoModelFactory):
    class Meta:
        model = PlayerlistTransfer

    current_team = SubFactory(PlayerlistFactory)
    new_team = SubFactory(TeamFactory)




class EligibilityRuleFactory(DjangoModelFactory):
    class Meta:
        model = EligibilityRule

    @post_generation
    def eligible_in(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for league in extracted:
                self.eligible_in.add(league)
