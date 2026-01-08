from datetime import date

from django.contrib.auth.models import User
from django.core.validators import integer_validator
from django.db import models
from django.db.models import QuerySet, Q

from gamedays.models import Gameday, Team, League, Person

class Player(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    pass_number = models.CharField(max_length=20, validators=[integer_validator])

    objects: QuerySet = models.Manager()


class Playerlist(models.Model):
    team = models.ForeignKey(Team, on_delete=models.DO_NOTHING)
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    jersey_number = models.IntegerField(null=True)
    joined_on = models.DateField(default=date.today)
    left_on = models.DateField(null=True, blank=True, default=None)
    gamedays = models.ManyToManyField(Gameday, through='PlayerlistGameday')

    objects: QuerySet = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['team', 'jersey_number'],
                name='unique_team_jersey_number',
                condition=models.Q(left_on=None) & ~models.Q(jersey_number=None)
            ),
            models.CheckConstraint(condition=Q(jersey_number__gte=0) & Q(jersey_number__lte=99),
                                   name='jersey_number_btw_0_and_99'),
        ]

    def __str__(self):
        return (f'{self.team.description}: {self.player.person.first_name} '
                f'{self.player.person.last_name} ({self.player.pass_number}) #{self.jersey_number}')


class PlayerlistGameday(models.Model):
    playerlist = models.ForeignKey(Playerlist, on_delete=models.CASCADE)
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    gameday_jersey = models.IntegerField()

    class Meta:
        db_table = 'passcheck_playerlist_gamedays'
        constraints = [
            models.CheckConstraint(condition=Q(gameday_jersey__gte=0) & Q(gameday_jersey__lte=99),
                                   name='gameday_jersey_number_btw_0_and_99'),
        ]

    objects: QuerySet = models.Manager()


class PlayerlistTransfer(models.Model):
    TRANSFER_STATUS = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    current_team = models.ForeignKey(Playerlist, on_delete=models.CASCADE)
    new_team = models.ForeignKey(Team, on_delete=models.CASCADE)
    approved_by = models.ForeignKey(User, on_delete=models.DO_NOTHING, null=True, blank=True, default=None)
    approval_date = models.DateTimeField(default=None, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TRANSFER_STATUS,
        default='pending'
    )
    note = models.TextField(default=None, blank=True, null=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.current_team} -> {self.new_team} ({self.status})"


class EmptyPasscheckVerification:
    official_name = ''
    note = ''


class PasscheckVerification(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)
    official_name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    note = models.TextField(default=None, blank=True, null=True)

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
            models.CheckConstraint(condition=(Q(maximum_player_strength=-1) | models.Q(
                maximum_player_strength__gte=models.F('minimum_player_strength'))),
                                   name='maximum_player_strength_must_be_greater_equal_minimum'),

        ]

    def __str__(self):
        emoji = "⬆️" if self.is_relegation_allowed else "⛔"
        return f'{self.league} -> {[league.name for league in self.eligible_in.all()]} {emoji}'
