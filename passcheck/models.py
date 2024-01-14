from django.db import models
from django.db.models import QuerySet, Q

# import other models
from gamedays.models import Gameday, Team


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
    gamedays = models.ManyToManyField(Gameday)

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
