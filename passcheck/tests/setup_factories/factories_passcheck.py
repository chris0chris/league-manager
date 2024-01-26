from factory import post_generation
from factory.django import DjangoModelFactory

from passcheck.models import Playerlist, EligibilityRule


class PlayerlistFactory(DjangoModelFactory):
    class Meta:
        model = Playerlist

    @post_generation
    def gamedays(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of gamedays were passed, use them.
            for gameday in extracted:
                self.gamedays.add(gameday)


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
