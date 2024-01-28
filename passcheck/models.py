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



class EligibilityRule(models.Model):
    league = models.ForeignKey(League, related_name='eligibility_for', on_delete=models.CASCADE)
    eligible_in = models.ManyToManyField(League, related_name='eligible_in')
    max_gamedays = models.IntegerField()
    max_players = models.IntegerField(null=True, default=None, blank=True)
    is_relegation_allowed = models.BooleanField(default=False)
    min_gamedays_for_final = models.IntegerField(default=2)
    ignore_player_age_unitl = models.IntegerField(default=19)
    except_for_women = models.BooleanField(default=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        emoji = "⬆️" if self.is_relegation_allowed else "⛔"
        return f'{self.league} -> {[league.name for league in self.eligible_in.all()]} {emoji}'
