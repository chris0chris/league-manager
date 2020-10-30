from django.contrib.auth.models import User
from django.db import models


class Gameday(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField()
    start = models.TimeField()
    format = models.CharField(max_length=100, default='6_2', blank=True)
    author = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)


    objects = models.Manager()

    def __str__(self):
        return f'{self.pk}__{self.date} {self.name}'


class Gameinfo(models.Model):
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    scheduled = models.TimeField()
    field = models.PositiveSmallIntegerField()
    # ToDo FK für Team
    officials = models.CharField(max_length=100, default='', blank=True)
    status = models.CharField(max_length=100, default='', blank=True)
    pin = models.PositiveSmallIntegerField(null=True, blank=True)
    gameStarted = models.TimeField(null=True, blank=True)
    gameHalftime = models.TimeField(null=True, blank=True)
    gameFinished = models.TimeField(null=True, blank=True)
    stage = models.CharField(max_length=100)
    standing = models.CharField(max_length=100)

    objects = models.Manager()

    def __str__(self):
        return f'{self.gameday.pk}__{self.field} - {self.scheduled} - {self.stage} / {self.standing} - {self.officials}'


class Gameresult(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    # ToDo FK für Team
    team = models.CharField(max_length=100)
    fh = models.SmallIntegerField(null=True)
    sh = models.SmallIntegerField(null=True)
    pa = models.PositiveSmallIntegerField(null=True)
    isHome = models.BooleanField(default=False)

    objects = models.Manager()

    def __str__(self):
        if self.fh is None:
            self.fh = ''
        if self.sh is None:
            self.sh = ''

        return f'{self.gameinfo.pk}__{self.gameinfo.field} {self.gameinfo.scheduled}: {self.team} - {self.fh + self.sh} / {self.pa}'


class GameOfficial(models.Model):

    name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
