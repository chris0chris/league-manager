import datetime
from datetime import date

from django.db import models
from django.db.models import QuerySet, ExpressionWrapper, Case, When, F, FloatField, Value, Sum

from gamedays.models import Association, Team


class Official(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    team: Team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    external_id = models.CharField(max_length=100, null=True, default=None, unique=True)
    association = models.ForeignKey(Association, on_delete=models.SET_NULL, null=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return (f'{self.team.description}__{self.last_name}, {self.first_name} - ('
                f'{"NONE" if self.association is None else self.association.name})')


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
        return datetime.date(self.created_at.year + 1, 3, 31)

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

    @property
    def calculated_number_games(self):
        return OfficialExternalGames.objects.filter(pk=self.pk).annotate(
            adjusted_number_games=ExpressionWrapper(
                Case(
                    When(
                        has_clockcontrol=True,
                        halftime_duration__gte=15,
                        then=F('number_games')
                    ),
                    When(
                        has_clockcontrol=True,
                        halftime_duration__lt=15,
                        then=F('number_games') * 0.5
                    ),
                    When(
                        has_clockcontrol=False,
                        halftime_duration__gte=23,
                        then=F('number_games')
                    ),
                    When(
                        has_clockcontrol=False,
                        halftime_duration__lt=23,
                        then=F('number_games') * 0.5
                    ),
                    default=Value(0),  # Default case if none of the conditions match
                    output_field=FloatField()
                ),
                output_field=FloatField()
            )
        ).aggregate(
            total_calculated_number_games=Sum('adjusted_number_games')
        )['total_calculated_number_games']

    def __str__(self):
        return f'{self.official.last_name}__{self.date}: {self.number_games}'
