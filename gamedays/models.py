from django.contrib.auth.models import User
from django.db import models


class Gameday(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField()
    start = models.TimeField()
    author = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)

    def __str__(self):
        return f'{self.date} {self.name}'

    # def get_absolute_url(self):
    #     return reverse('league-gameday-detail', kwargs={'pk': self.pk})


class Gameinfo(models.Model):
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    scheduled = models.TimeField()
    field = models.PositiveSmallIntegerField()
    # ToDo FK für Team
    officials = models.CharField(max_length=100, null=True)
    status = models.CharField(max_length=100, default='', blank=True)
    pin = models.PositiveSmallIntegerField(null=True)
    gameStarted = models.TimeField(null=True)
    gameHalftime = models.TimeField(null=True)
    gameFinished = models.TimeField(null=True)
    stage = models.CharField(max_length=100)
    standing = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.field} - {self.scheduled} - {self.stage} / Gruppe {self.standing} - {self.officials}'


class Gameresult(models.Model):
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    # ToDo FK für Team
    team = models.CharField(max_length=100)
    fh = models.SmallIntegerField(null=True)
    sh = models.SmallIntegerField(null=True)
    pa = models.PositiveSmallIntegerField(null=True)
    isHome = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.gameinfo.field} {self.gameinfo.scheduled}: {self.team} - {self.fh + self.sh} / {self.pa}'
