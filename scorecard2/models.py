from django.db import models
from django.db.models import QuerySet

from gamedays.models import League
from officials.models import OfficialPosition


class ScorecardConfig(models.Model):
    name = models.CharField(max_length=100)
    leagues = models.ManyToManyField(League, related_name='scorecard_config_for_leagues')

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class ScorecardOfficial(models.Model):
    scorecard_config = models.ForeignKey(ScorecardConfig, on_delete=models.CASCADE)
    official_position: OfficialPosition = models.ForeignKey(OfficialPosition, on_delete=models.CASCADE)
    is_optional = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.scorecard_config.name} - {self.official_position} {"(❓)" if self.is_optional else ''}'


class ScorecardCategory(models.Model):
    TEAM_CHOICES = [
        ('home', 'Home Team'),
        ('away', 'Away Team'),
        ('none', 'None')
    ]

    scorecard_config = models.ForeignKey(ScorecardConfig, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    team_option = models.CharField(max_length=4, choices=TEAM_CHOICES, default='none',
                                   help_text='Shall there be a team name displayed?')

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.scorecard_config.name} - {self.name}'


class ScorecardCategoryValue(models.Model):
    category = models.ForeignKey(ScorecardCategory, related_name='values', on_delete=models.CASCADE)
    value = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.category.name} - {self.value}'
