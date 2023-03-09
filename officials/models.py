from datetime import date

from django.db import models
from django.db.models import QuerySet

from teammanager.models import Team


class Official(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    team: Team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    external_id = models.CharField(max_length=100, null=True, default=None, unique=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.team.description}__{self.last_name}, {self.first_name}'


class OfficialLicense(models.Model):
    name = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.name}'


class OfficialLicenseHistory(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    license = models.ForeignKey(OfficialLicense, on_delete=models.CASCADE)
    created_at = models.DateField(default=date.today)
    result = models.PositiveSmallIntegerField(null=False, default=0)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.created_at}__{self.license} - {self.official.last_name} # {self.result}'


class OfficialExternalGames(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    number_games = models.PositiveSmallIntegerField()
    date = models.DateField()
    position = models.CharField(max_length=100)
    association = models.CharField(max_length=100)
    is_international = models.BooleanField(default=False)
    comment = models.CharField(max_length=100, default=None, null=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.official.last_name}__{self.date}: {self.number_games}'
