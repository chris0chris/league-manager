from django.db import models
from django.contrib.auth.models import User
from django.db.models import QuerySet


class Association(models.Model):
    class AssociationType(models.TextChoices):
        INTERNATIONAL = "INTERNATIONAL", "International Federation"
        NATIONAL = "NATIONAL", "National Federation"
        REGIONAL = "REGIONAL", "Regional Association"

    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    abbr = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=AssociationType.choices)

    def __str__(self):
        parent_abbr = self.parent.abbr if self.parent else 'ROOT'
        return f'{self.pk}: {parent_abbr} association {self.abbr} - {self.name}'

class LeagueAdminAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    league = models.ForeignKey("gamedays.league", on_delete=models.CASCADE)

    objects: QuerySet["LeagueAdminAssignment"] = models.Manager()

    def __str__(self):
        return (f'{self.pk} - {self.user.last_name}, {self.user.first_name} - {self.league.name}')

class TeamAdminAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    team = models.ForeignKey("gamedays.team", on_delete=models.CASCADE)

    objects: QuerySet["TeamAdminAssignment"] = models.Manager()

    def __str__(self):
        return (f'{self.pk} - {self.user.last_name}, {self.user.first_name} - {self.team.description}')

class LeagueAssociationAssignment(models.Model):
    league = models.ForeignKey("gamedays.league", on_delete=models.CASCADE)
    association = models.ForeignKey(Association, on_delete=models.CASCADE)

    objects: QuerySet["LeagueAssociationAssignment"] = models.Manager()

class AssociationAdminAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    association = models.ForeignKey(Association, on_delete=models.CASCADE)

    objects: QuerySet["AssociationAdminAssignment"] = models.Manager()
