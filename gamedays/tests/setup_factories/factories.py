from datetime import datetime

import factory
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from factory.django import DjangoModelFactory

from gamedays.models import Season, League, Association, Team, SeasonLeagueTeam, Gameday, Gameinfo, Gameresult, \
    GameOfficial, GameSetup, TeamLog


class LeagueFactory(DjangoModelFactory):
    class Meta:
        model = League
        django_get_or_create = ('name',)

    name = 'some_division'


class SeasonFactory(DjangoModelFactory):
    class Meta:
        model = Season
        django_get_or_create = ('name',)

    name = 'some_season'


class TeamFactory(DjangoModelFactory):
    class Meta:
        model = Team
        django_get_or_create = ('name',)

    name = 'teamName'
    description = factory.Sequence(lambda n: f'team description {n}')
    location = 'team location'


class SeasonLeagueTeamFactory(DjangoModelFactory):
    class Meta:
        model = SeasonLeagueTeam

    season = factory.SubFactory(SeasonFactory)
    league = factory.SubFactory(LeagueFactory)
    team = factory.SubFactory(TeamFactory)


class GameOfficialFactory(DjangoModelFactory):
    class Meta:
        model = GameOfficial

    name = 'official'
    position = 'position'


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)

    username = 'test_admin'
    is_staff = True


class AssociationFactory(DjangoModelFactory):
    class Meta:
        model = Association
        django_get_or_create = ('abbr',)

    abbr = 'ABBR Factory'
    name = 'Assoc name Factory'


class GamedayFactory(DjangoModelFactory):
    class Meta:
        model = Gameday

    date = datetime.today().strftime('%Y-%m-%d')
    start = '10:00'
    name = 'Test Spieltag'
    season = factory.SubFactory(SeasonFactory)
    league = factory.SubFactory(LeagueFactory)
    author = factory.SubFactory(UserFactory)


@factory.django.mute_signals(post_save)
class GameinfoFactory(DjangoModelFactory):
    class Meta:
        model = Gameinfo

    gameday = factory.SubFactory(GamedayFactory)
    scheduled = '10:00'
    officials = factory.SubFactory(TeamFactory)
    field = 1
    in_possession = ''


class GameresultFactory(DjangoModelFactory):
    class Meta:
        model = Gameresult

    gameinfo = factory.SubFactory(GameinfoFactory)
    team = factory.SubFactory(TeamFactory)


class TeamLogFactory(DjangoModelFactory):
    class Meta:
        model = TeamLog

    gameinfo = factory.SubFactory(GameinfoFactory)
    input = ''


class GameSetupFactory(DjangoModelFactory):
    class Meta:
        model = GameSetup

    gameinfo = factory.SubFactory(GameinfoFactory)
