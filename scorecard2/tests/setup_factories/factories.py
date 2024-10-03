import factory
from factory import post_generation
from factory.django import DjangoModelFactory

from gamedays.tests.setup_factories.factories import LeagueFactory
from officials.tests.setup_factories.factories_officials import OfficialPositionFactory
from scorecard2.models import ScorecardConfig, ScorecardOfficial, ScorecardCategory, ScorecardCategoryValue


class ScorecardConfigFactory(DjangoModelFactory):
    class Meta:
        model = ScorecardConfig

    name = factory.Sequence(lambda n: f'Scorecard config {n}')

    @post_generation
    def leagues(self, create, extracted, **kwargs):
        if create and extracted:
            self.leagues.set(extracted)
        elif create and not extracted:
            for _ in range(3):
                self.leagues.add(LeagueFactory(name=factory.Sequence(lambda n: f'League {n}')))

    @post_generation
    def scorecard_officials(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for _ in range(extracted):
                ScorecardOfficialFactory(scorecard_config=self)
        else:
            ScorecardOfficialFactory(scorecard_config=self,
                                     official_position=OfficialPositionFactory(
                                         name='SCJ',
                                         is_position_counted_as_entry=False
                                     ),
                                     is_optional=True)
            ScorecardOfficialFactory(scorecard_config=self,
                                     official_position=OfficialPositionFactory(
                                         name='R',
                                         is_position_counted_as_entry=True
                                     ),
                                     is_optional=False)
            ScorecardOfficialFactory(scorecard_config=self,
                                     official_position=OfficialPositionFactory(
                                         name='DJ',
                                         is_position_counted_as_entry=True
                                     ),
                                     is_optional=False)
            ScorecardOfficialFactory(scorecard_config=self,
                                     official_position=OfficialPositionFactory(
                                         name='FJ',
                                         is_position_counted_as_entry=True
                                     ),
                                     is_optional=False)
            ScorecardOfficialFactory(scorecard_config=self,
                                     official_position=OfficialPositionFactory(
                                         name='SJ',
                                         is_position_counted_as_entry=True
                                     ),
                                     is_optional=False)

    @post_generation
    def scorecard_categories(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for _ in range(extracted):
                ScorecardCategoryFactory(scorecard_config=self)
        else:
            category1 = ScorecardCategoryFactory(scorecard_config=self, name='Cointoss', team_option='away')
            category2 = ScorecardCategoryFactory(scorecard_config=self,
                                                 name='Team with ball possession in the first half',
                                                 team_option='none')
            ScorecardCategoryValueFactory(value='Won', category=category1),
            ScorecardCategoryValueFactory(value='Lost', category=category1),
            ScorecardCategoryValueFactory(value='Home', category=category2),
            ScorecardCategoryValueFactory(value='Away', category=category2),


class ScorecardOfficialFactory(DjangoModelFactory):
    class Meta:
        model = ScorecardOfficial

    scorecard_config = factory.SubFactory(ScorecardConfigFactory)
    official_position = factory.SubFactory(OfficialPositionFactory)
    is_optional = factory.Faker('boolean')


class ScorecardCategoryFactory(DjangoModelFactory):
    class Meta:
        model = ScorecardCategory

    scorecard_config = factory.SubFactory(ScorecardConfigFactory)
    name = factory.Sequence(lambda n: f'Category {n}')
    team_option = factory.Faker('random_element', elements=[choice[0] for choice in ScorecardCategory.TEAM_CHOICES])


class ScorecardCategoryValueFactory(DjangoModelFactory):
    class Meta:
        model = ScorecardCategoryValue

    category = factory.SubFactory(ScorecardCategoryFactory)
    value = factory.Sequence(lambda n: f'Value {n}')
