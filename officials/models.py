import datetime
from datetime import date

from django.db import models
from django.utils import timezone
from django.db.models import (
    QuerySet,
    ExpressionWrapper,
    Case,
    When,
    F,
    FloatField,
    Value,
    Sum,
)

from gamedays.models import Association, Team, Gameday, League


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
            models.Index(fields=["team"]),
            models.Index(fields=["association"]),
        ]

    def __str__(self):
        return (
            f"{self.pk} - {self.team.description}__{self.last_name}, {self.first_name} - ("
            f'{"NONE" if self.association is None else self.association.name})'
        )


class MoodleRememberToken(models.Model):
    selector = models.CharField(max_length=64, unique=True, db_index=True)
    validator_hash = models.CharField(max_length=64)
    official = models.ForeignKey(Official, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    objects: QuerySet = models.Manager()

    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()

    def __str__(self):
        return (
            f"MoodleRememberToken({self.selector[:8]}… -> official {self.official_id})"
        )


class OfficialGamedaySignup(models.Model):
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    official = models.ForeignKey(Official, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.gameday.name} - {self.official.first_name} {self.official.last_name}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["gameday", "official"], name="unique_gameday_and_official_id"
            ),
        ]


class OfficialLicense(models.Model):
    name = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.name}"


class EmptyLicense:
    pk = 4
    name = "Keine Lizenz vorhanden"


class EmptyOfficialLicenseHistory:
    license = EmptyLicense()

    # noinspection PyMethodMayBeStatic
    def valid_until(self):
        return datetime.date(1, 1, 1)


class OfficialLicenseHistoryQuerySet(QuerySet):
    def in_year(self, year):
        return self.filter(created_at__year=year)

    def order_by_rank(self, *fields):
        # License names sort alphabetically in rank order (F1 is the
        # highest license, F4 the lowest) - ascending order surfaces the
        # highest-ranked license first. Any fields passed in take priority
        # (e.g. to sort by year before breaking ties on rank).
        return self.order_by(*fields, "license__name")


class OfficialLicenseHistory(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    license = models.ForeignKey(OfficialLicense, on_delete=models.CASCADE)
    created_at = models.DateField(default=date.today)
    result = models.PositiveSmallIntegerField(null=False, default=0)

    objects: QuerySet = OfficialLicenseHistoryQuerySet.as_manager()

    def valid_until(self):
        # noinspection PyUnresolvedReferences
        return datetime.date(
            self.created_at.year + 1, self.created_at.month, self.created_at.day
        )

    def __str__(self):
        return f"{self.created_at}__{self.license} - {self.official.last_name} # {self.result}"


class OfficialExternalGames(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    number_games: int = models.PositiveSmallIntegerField()
    date = models.DateField()
    notification_date = models.DateField()
    reporter_name: str = models.CharField(max_length=100, default=None, blank=True)
    position: str = models.CharField(max_length=100)
    association: Association = models.ForeignKey(Association, on_delete=models.PROTECT)
    halftime_duration: int = models.PositiveSmallIntegerField()
    has_clockcontrol: bool = models.BooleanField(default=False)
    is_international: bool = models.BooleanField(default=False)
    comment: str = models.CharField(max_length=100, default=None, blank=True)

    objects: QuerySet = models.Manager()

    @staticmethod
    def calculated_games_expression(field_prefix=""):
        """
        Returns an ExpressionWrapper that calculates the adjusted number of games.
        """
        return ExpressionWrapper(
            Case(
                When(
                    **{
                        f"{field_prefix}has_clockcontrol": True,
                        f"{field_prefix}halftime_duration__gte": 15,
                    },
                    then=F(f"{field_prefix}number_games"),
                ),
                When(
                    **{
                        f"{field_prefix}has_clockcontrol": True,
                        f"{field_prefix}halftime_duration__lt": 15,
                    },
                    then=F(f"{field_prefix}number_games") * 0.5,
                ),
                When(
                    **{
                        f"{field_prefix}has_clockcontrol": False,
                        f"{field_prefix}halftime_duration__gte": 23,
                    },
                    then=F(f"{field_prefix}number_games"),
                ),
                When(
                    **{
                        f"{field_prefix}has_clockcontrol": False,
                        f"{field_prefix}halftime_duration__lt": 23,
                    },
                    then=F(f"{field_prefix}number_games") * 0.5,
                ),
                default=Value(0),
                output_field=FloatField(),
            ),
            output_field=FloatField(),
        )

    @property
    def calculated_number_games(self):
        return (
            OfficialExternalGames.objects.filter(pk=self.pk)
            .annotate(
                adjusted_number_games=OfficialExternalGames.calculated_games_expression()
            )
            .aggregate(total_calculated_number_games=Sum("adjusted_number_games"))[
                "total_calculated_number_games"
            ]
        )

    def __str__(self):
        return f"{self.official.last_name}__{self.date}: {self.number_games}"


class CrewPosition(models.Model):
    """One crew slot a league's scorecard offers for a game.

    `position` is the **wire value** written into `GameOfficial.position`, not
    a display string: the scorecard upserts a crew row by that exact string, so
    renaming it would leave the stored row untouched and create a second one.
    The operator sees `label`; `order` is the display sequence and `required`
    decides whether an empty slot counts against the completeness counter.

    Rows are **overrides on top of** the built-in defaults
    (`officials.service.crew_positions.DEFAULT_CREW_POSITIONS`), never a
    replacement: a row with a known `position` relabels/reorders it, a row with
    a new `position` adds a slot, and every default nobody touched stays. One
    row therefore cannot make the standard crew disappear. Hiding a default
    position is deliberately not expressible yet (that is the crew template /
    count layer); it would need a flag, i.e. another migration.
    """

    league = models.ForeignKey(
        League,
        on_delete=models.CASCADE,
        related_name="crew_positions",
        help_text="Die Liga, für die diese Position gilt.",
    )
    position = models.CharField(
        max_length=100,
        help_text="Exakt der Wert, der in GameOfficial.position gespeichert wird "
        '(z. B. "Referee"). Nicht übersetzen – ein anderer Wert erzeugt einen '
        "zweiten Eintrag statt den vorhandenen zu ändern.",
    )
    label = models.CharField(
        max_length=100,
        help_text="Anzeigename für die Bedienung (z. B. Schiedsrichter).",
    )
    order = models.PositiveSmallIntegerField(
        default=1,
        help_text="Reihenfolge in der Vorbereitung; kleinste Zahl zuerst.",
    )
    required = models.BooleanField(
        default=True,
        help_text="Zählt dieses Feld für die Vollständigkeit der Crew?",
    )

    objects: QuerySet = models.Manager()

    class Meta:
        ordering = ["league_id", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["league", "position"], name="unique_crewposition_per_league"
            ),
        ]
        verbose_name = "Crew-Position"
        verbose_name_plural = "Crew-Positionen"

    def __str__(self):
        return f"{self.league}: {self.order} {self.label} ({self.position})"
