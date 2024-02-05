from django.contrib.auth.models import User
from django.db import models
from django.db.models import QuerySet, Q

# import other models
from gamedays.models import Gameday, Team, League


class Playerlist(models.Model):
    FEMALE = 1
    MALE = 2

    SEX_CHOICES = [
        (FEMALE, 'Weiblich'),
        (MALE, 'Männlich'),
    ]

    team = models.ForeignKey(Team, on_delete=models.DO_NOTHING)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    jersey_number = models.IntegerField()
    pass_number = models.IntegerField()
    sex = models.IntegerField(choices=SEX_CHOICES)
    year_of_birth = models.PositiveIntegerField()
    gamedays = models.ManyToManyField(Gameday, through='PlayerlistGameday')

    objects: QuerySet = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['team', 'jersey_number'], name='unique_team_jersey_number'),
            models.UniqueConstraint(fields=['team', 'pass_number'], name='unique_team_pass_number'),
            models.CheckConstraint(check=Q(jersey_number__gte=0) & Q(jersey_number__lte=99),
                                   name='jersey_number_btw_0_and_99'),
        ]

    def __str__(self):
        def fullname():
            return f"{self.first_name} {self.last_name}"

        return fullname()


class PlayerlistGameday(models.Model):
    playerlist = models.ForeignKey(Playerlist, on_delete=models.CASCADE)
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    gameday_jersey = models.IntegerField()

    class Meta:
        db_table = 'passcheck_playerlist_gamedays'
        constraints = [
            models.CheckConstraint(check=Q(gameday_jersey__gte=0) & Q(gameday_jersey__lte=99),
                                   name='gameday_jersey_number_btw_0_and_99'),
        ]

    objects: QuerySet = models.Manager()


class PasscheckVerification(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)
    official_name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.gameday} # {self.team.description} - {self.official_name} ({self.user})"


class TeamRelationship(models.Model):
    team = models.OneToOneField(Team, related_name='relationship_team', on_delete=models.CASCADE)
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    additional_teams = models.ManyToManyField(Team, related_name='relationship_additional_teams')

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.team} # {self.league.name} - {[team.name for team in self.additional_teams.all()]}"


class EligibilityRule(models.Model):
    league = models.ForeignKey(League, related_name='eligibility_for', on_delete=models.CASCADE)
    eligible_in = models.ManyToManyField(League, related_name='eligible_in')
    max_gamedays = models.IntegerField()
    max_subs_in_other_leagues = models.IntegerField(null=True, default=None, blank=True)
    minimum_player_strength = models.IntegerField()
    maximum_player_strength = models.IntegerField(null=True, default=None, blank=True)
    is_relegation_allowed = models.BooleanField(default=False)
    min_gamedays_for_final = models.IntegerField(default=2)
    ignore_player_age_until = models.IntegerField(default=19)
    except_for_women = models.BooleanField(default=True)

    objects: QuerySet = models.Manager()

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(maximum_player_strength__gte=models.F('minimum_player_strength')),
                                   name='maximum_player_strength_must_be_greater_equal_minimum'),

        ]

    def __str__(self):
        emoji = "⬆️" if self.is_relegation_allowed else "⛔"
        return f'{self.league} -> {[league.name for league in self.eligible_in.all()]} {emoji}'
