from django.contrib.auth.models import User
from django.db import models
from django.db.models import QuerySet


class Division(models.Model):
    region = models.CharField(max_length=20)
    name = models.CharField(max_length=20)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=20)
    division = models.ForeignKey(Division, on_delete=models.CASCADE)
    description = models.CharField(max_length=1000)
    place = models.CharField(max_length=20)
    logo = models.ImageField('Logo', upload_to="teammanager/logos", blank=True, null=True)

    object: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.name} - {self.division.name}'


class UserProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    avatar = models.ImageField('Avatar', upload_to="media/teammanager/avatars", blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True)
    firstname = models.CharField(max_length=20, null=True)
    lastname = models.CharField(max_length=20, null=True)
    playernumber = models.IntegerField(null=True)
    position = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)

    objects: QuerySet = models.Manager()

    def get_permisions(self):
        permissions = list(UserPermissions.objects.filter(user=self))
        return permissions

    def check_teammanager(self):
        permisssions = self.get_permisions()
        is_teammanager = False
        for permission in permisssions:
            if permission.permission.name == 'Teammanager':
                is_teammanager = True
        return is_teammanager

    def __str__(self):
        return f'{self.team.name}: {self.firstname} {self.lastname}'


class Permissions(models.Model):
    name = models.CharField(max_length=20)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class UserPermissions(models.Model):
    permission = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.permission.name}: {self.user.firstname} {self.user.lastname}'


class Achievement(models.Model):
    name = models.CharField(max_length=20, blank=False, null=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


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
    officials = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True)
    status = models.CharField(max_length=100, default='', blank=True)
    pin = models.PositiveSmallIntegerField(null=True, blank=True)
    gameStarted = models.TimeField(null=True, blank=True)
    gameHalftime = models.TimeField(null=True, blank=True)
    gameFinished = models.TimeField(null=True, blank=True)
    stage = models.CharField(max_length=100)
    standing = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.gameday.pk}__{self.pk}__{self.field} - {self.scheduled}: {self.stage} / {self.standing} ' \
               f'- {self.officials} [{self.status}]'


class Gameresult(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True)
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

    def __str__(self):
        return f'{self.gameinfo.pk}__{self.name} - {self.position}'


class GameSetup(models.Model):
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    ctResult = models.CharField(max_length=100)
    direction = models.CharField(max_length=100)
    fhPossession = models.CharField(max_length=100)
    homeCaptain = models.CharField(max_length=100, blank=True)
    awayCaptain = models.CharField(max_length=100, blank=True)
    hasFinalScoreChanged = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.gameinfo.pk}'


class TeamLog(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True)
    sequence = models.PositiveSmallIntegerField()
    player = models.PositiveSmallIntegerField(null=True, blank=True)
    event = models.CharField(max_length=100, blank=False)
    value = models.PositiveSmallIntegerField(default=0, blank=True)
    cop = models.BooleanField(default=False)
    half = models.PositiveSmallIntegerField()
    isDeleted = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        if self.cop:
            return f'{self.gameinfo.pk}__{self.team}#{self.sequence} CoP: {self.cop} - Half: {self.half}' \
                   f'{" [DELETED]" if self.isDeleted else ""}'
        return f'{self.gameinfo.pk}__{self.team}#{self.sequence} Player: {self.player} Value: {self.value} ' \
               f'- Half: {self.half}{" [DELETED]" if self.isDeleted else ""}'


class PlayerAchievement(models.Model):
    achievement = models.ForeignKey(Achievement, blank=False, null=False, on_delete=models.CASCADE)
    player = models.ForeignKey(UserProfile, blank=False, null=False, on_delete=models.CASCADE)
    value = models.IntegerField(blank=False, null=False)
    game = models.ForeignKey(Gameinfo, null=False, blank=False, on_delete=models.CASCADE)

    def __str__(self):
        return self.achievement.name + ' ' + self.player.lastname + ' ' + self.player.firstname + ' ' + str(self.value)
