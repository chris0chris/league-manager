import datetime
from datetime import date

from django.db import models
from django.db.models import QuerySet, ExpressionWrapper, Case, When, F, FloatField, Value, Sum

from gamedays.models import Association, Team, Gameday


class Official(models.Model):
    OHNE_TEAM_ID = 213
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    team: Team = models.ForeignKey(Team, on_delete=models.SET(OHNE_TEAM_ID))
    external_id = models.CharField(max_length=100, null=True, default=None, unique=True)
    association = models.ForeignKey(Association, on_delete=models.SET_NULL, null=True)

    objects: QuerySet = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=['id', 'team']),
            models.Index(fields=['id', 'association']),
        ]

    def __str__(self):
        return (f'{self.pk} - {self.team.description}__{self.last_name}, {self.first_name} - ('
                f'{"NONE" if self.association is None else self.association.name})')


class OfficialGamedaySignup(models.Model):
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    official = models.ForeignKey(Official, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.gameday.name} - {self.official.first_name} {self.official.last_name}'

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['gameday', 'official'], name='unique_gameday_and_official_id'),
        ]


class OfficialLicense(models.Model):
    name = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.name}'


class EmptyLicense:
    pk = 4
    name = 'Keine Lizenz vorhanden'


class EmptyOfficialLicenseHistory:
    license = EmptyLicense()

    # noinspection PyMethodMayBeStatic
    def valid_until(self):
        return datetime.date(1, 1, 1)


class OfficialLicenseHistory(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    license = models.ForeignKey(OfficialLicense, on_delete=models.CASCADE)
    created_at = models.DateField(default=date.today)
    result = models.PositiveSmallIntegerField(null=False, default=0)

    objects: QuerySet = models.Manager()

    def valid_until(self):
        # noinspection PyUnresolvedReferences
        return datetime.date(self.created_at.year + 1, self.created_at.month, self.created_at.day)

    def __str__(self):
        return f'{self.created_at}__{self.license} - {self.official.last_name} # {self.result}'


class OfficialExternalGames(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    number_games: int = models.PositiveSmallIntegerField()
    date = models.DateField()
    notification_date = models.DateField()
    reporter_name: str = models.CharField(max_length=100, default=None, blank=True)
    position: str = models.CharField(max_length=100)
    association: str = models.CharField(max_length=100)
    halftime_duration: int = models.PositiveSmallIntegerField()
    has_clockcontrol: bool = models.BooleanField(default=False)
    is_international: bool = models.BooleanField(default=False)
    comment: str = models.CharField(max_length=100, default=None, blank=True)

    objects: QuerySet = models.Manager()

    @staticmethod
    def calculated_games_expression(field_prefix=''):
        """
        Returns an ExpressionWrapper that calculates the adjusted number of games.
        """
        return ExpressionWrapper(
            Case(
                When(
                    **{f"{field_prefix}has_clockcontrol": True, f"{field_prefix}halftime_duration__gte": 15},
                    then=F(f"{field_prefix}number_games")
                ),
                When(
                    **{f"{field_prefix}has_clockcontrol": True, f"{field_prefix}halftime_duration__lt": 15},
                    then=F(f"{field_prefix}number_games") * 0.5
                ),
                When(
                    **{f"{field_prefix}has_clockcontrol": False, f"{field_prefix}halftime_duration__gte": 23},
                    then=F(f"{field_prefix}number_games")
                ),
                When(
                    **{f"{field_prefix}has_clockcontrol": False, f"{field_prefix}halftime_duration__lt": 23},
                    then=F(f"{field_prefix}number_games") * 0.5
                ),
                default=Value(0),
                output_field=FloatField()
            ),
            output_field=FloatField()
        )

    @property
    def calculated_number_games(self):
        return OfficialExternalGames.objects.filter(pk=self.pk).annotate(
            adjusted_number_games=OfficialExternalGames.calculated_games_expression()
        ).aggregate(
            total_calculated_number_games=Sum('adjusted_number_games')
        )['total_calculated_number_games']

    def __str__(self):
        return f'{self.official.last_name}__{self.date}: {self.number_games}'
