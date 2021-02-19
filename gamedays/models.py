from django.contrib.auth.models import User
from django.db import models
from django.db.models import QuerySet


class Gameday(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField()
    start = models.TimeField()
    format = models.CharField(max_length=100, default='6_2', blank=True)
    author = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)

    objects: QuerySet = models.Manager()

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

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.gameday.pk}__{self.pk}__{self.field} - {self.scheduled} - {self.stage} / {self.standing} - {self.officials}'


class Gameresult(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    # ToDo FK für Team
    team = models.CharField(max_length=100)
    fh = models.SmallIntegerField(null=True)
    sh = models.SmallIntegerField(null=True)
    pa = models.PositiveSmallIntegerField(null=True)
    isHome = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        if self.fh is None:
            self.fh = ''
        if self.sh is None:
            self.sh = ''

        return f'{self.gameinfo.pk}__{self.gameinfo.field} {self.gameinfo.scheduled}: {self.team} -  / {self.pa}'


class GameOfficial(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()


class GameSetup(models.Model):
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    ctResult = models.CharField(max_length=100)
    direction = models.CharField(max_length=100)
    fhPossession = models.CharField(max_length=100)
    homeCaptain = models.CharField(max_length=100, blank=True)
    awayCaptain = models.CharField(max_length=100, blank=True)
    hasFinalScoreChanged = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()


class TeamLog(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    team = models.CharField(max_length=100)
    sequence = models.PositiveSmallIntegerField()
    player = models.PositiveSmallIntegerField(null=True, blank=True)
    event = models.CharField(max_length=100, blank=False)
    value = models.PositiveSmallIntegerField(default=0, blank=True)
    cop = models.BooleanField(default=False)
    half = models.PositiveSmallIntegerField()

    objects: QuerySet = models.Manager()

    def __str__(self):
        if self.cop:
            return f'{self.gameinfo.pk}__{self.team}#{self.sequence} CoP: {self.cop} - Half: {self.half}'
        return f'{self.gameinfo.pk}__{self.team}#{self.sequence} Player: {self.player} Value: {self.value} ' \
               f'- Half: {self.half}'
