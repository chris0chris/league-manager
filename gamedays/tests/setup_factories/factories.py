import factory
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from factory.django import DjangoModelFactory

from gamedays.models import Gameday, Gameinfo, Gameresult


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)

    username = 'test_admin'

class GamedayFactory(DjangoModelFactory):
    class Meta:
        model = Gameday

    date = '2020-10-10'
    start = '10:00'
    author = factory.SubFactory(UserFactory)


@factory.django.mute_signals(post_save)
class GameinfoFactory(DjangoModelFactory):
    class Meta:
        model = Gameinfo

    gameday = factory.SubFactory(GamedayFactory)
    scheduled = '10:00'
    field = 1


class GameresultFactory(DjangoModelFactory):
    class Meta:
        model = Gameresult

    gameinfo = factory.SubFactory(GameinfoFactory)
