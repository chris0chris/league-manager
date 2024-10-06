from django.db import models
from django.db.models import QuerySet

from gamedays.models import League, Gameinfo
from officials.models import OfficialPosition


class ScorecardConfig(models.Model):
    name = models.CharField(max_length=100)
    leagues = models.ManyToManyField(League, related_name='scorecard_config_for_leagues')

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class ScorecardOfficial(models.Model):
    scorecard_config = models.ForeignKey(ScorecardConfig, on_delete=models.CASCADE)
    official_position: OfficialPosition = models.ForeignKey('officials.OfficialPosition', on_delete=models.CASCADE,
                                                            null=True, blank=True)
    position_name = models.CharField(max_length=100, null=True, blank=True)
    is_optional = models.BooleanField(default=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.scorecard_config.name} - {self.official_position if self.official_position else "No official"} {"(❓)" if self.is_optional else ''}'


class ScorecardCategory(models.Model):
    TEAM_CHOICES = [
        ('home', 'Home Team'),
        ('away', 'Away Team'),
        ('none', 'None')
    ]

    scorecard_config = models.ForeignKey(ScorecardConfig, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    is_required = models.BooleanField(default=False)
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


class GameSetupCategoryValue(models.Model):
    game_setup = models.ForeignKey('ScorecardGameSetup', on_delete=models.CASCADE,
                                   related_name='game_setup_category_values')
    category = models.ForeignKey(ScorecardCategory, on_delete=models.CASCADE)
    category_value = models.ForeignKey(ScorecardCategoryValue, on_delete=models.CASCADE)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'GameSetup {self.game_setup.id} - {self.category.name}: {self.category_value.value}'


class ScorecardGameSetup(models.Model):
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE, related_name='scorecard_gamesetup')
    category_values = models.ManyToManyField(ScorecardCategory, through='GameSetupCategoryValue')
    homeCaptain = models.CharField(max_length=100, blank=True)
    awayCaptain = models.CharField(max_length=100, blank=True)
    hasFinalScoreChanged = models.BooleanField(default=False)
    note = models.TextField(default=None, blank=True, null=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.gameinfo.pk}'
