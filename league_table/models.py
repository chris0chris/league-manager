from django.db import models

from gamedays.models import League, Season, Gameday, Team


class LeagueGroup(models.Model):
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="groups_league"
    )
    season = models.ForeignKey(
        Season, on_delete=models.CASCADE, related_name="groups_season"
    )
    name = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.league.name} - {self.name}"


class LeagueRuleset(models.Model):
    LEAGUE_POINT_FIELDS = [
        "points_win_same_league",
        "points_win_other_league",
        "points_draw_same_league",
        "points_draw_other_league",
        "max_points_same_league",
        "max_points_other_league",
    ]

    name = models.CharField(max_length=50, unique=True)
    league_quotient_precision = models.PositiveSmallIntegerField(default=3)

    points_win_same_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=1
    )
    points_win_other_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=1
    )
    points_loss_same_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=0
    )
    points_loss_other_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=0
    )
    points_draw_same_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.5
    )
    points_draw_other_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.5
    )
    max_points_same_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=1
    )
    max_points_other_league = models.DecimalField(
        max_digits=4, decimal_places=2, default=1
    )

    tie_break_steps = models.ManyToManyField(
        "TieBreakStep",
        through="LeagueRulesetTieBreak",
        related_name="rulesets",
    )

    def league_points_map(self):
        return {
            field: float(getattr(self, field))
            for field in self.LEAGUE_POINT_FIELDS
            if getattr(self, field) is not None
        }

    def tie_break_order(self):
        """Return the tie-break order as a list of keys (used by the engine)."""
        return [
            {
                "key": league_ruleset_tiebreak.step.key,
                "is_ascending": league_ruleset_tiebreak.sort_order == "ascending",
            }
            for league_ruleset_tiebreak in self.leaguerulesettiebreak_set.all().order_by(
                "order"
            )
        ]

    def __str__(self):
        return self.name


TIE_BREAK_CHOICES = [
    ("league_points", "Siegpunkte"),
    ("direct_wins", "Direkte Siegpunkte"),
    ("direct_point_diff", "Direkte Punktedifferenz"),
    ("direct_points_scored", "Direkt erzielte Punkte"),
    ("overall_point_diff", "Gesamte Punktedifferenz"),
    ("overall_points_scored", "Gesamt erzielte Punkte"),
    ("name_ascending", "Teamname (A–>Z)"),
]


class TieBreakStep(models.Model):
    key = models.CharField(
        max_length=50,
        choices=TIE_BREAK_CHOICES,
        unique=True,
    )
    label = models.CharField(max_length=100)

    def __str__(self):
        return self.label


class LeagueRulesetTieBreak(models.Model):
    ruleset = models.ForeignKey(LeagueRuleset, on_delete=models.CASCADE)
    step = models.ForeignKey(TieBreakStep, on_delete=models.CASCADE)
    order = models.PositiveIntegerField()
    sort_order = models.CharField(
        max_length=50,
        choices=[("ascending", "Aufsteigend"), ("descending", "Absteigend")],
        default="descending",
    )

    class Meta:
        unique_together = ("ruleset", "step")
        ordering = ["order"]

    def __str__(self):
        return f"{self.ruleset.name}: {self.order} - {self.step.label} ({self.get_sort_order_display()})"


class LeagueSeasonConfig(models.Model):
    league = models.ForeignKey(
        League, on_delete=models.CASCADE, related_name="config_league"
    )
    season = models.ForeignKey(
        Season, on_delete=models.CASCADE, related_name="config_season"
    )
    ruleset = models.ForeignKey(LeagueRuleset, on_delete=models.SET_NULL, null=True)
    exclude_gamedays = models.ManyToManyField(
        Gameday,
        related_name="excluded_in_configs",
        blank=True,
    )
    team_point_adjustments = models.ManyToManyField(
        Team, through="TeamPointAdjustments"
    )

    leagues_for_league_points = models.ManyToManyField(
        League,
        null=True,
        blank=True,
        default=None,
    )

    def get_team_point_adjustment_map(self):
        adjustments = TeamPointAdjustments.objects.filter(
            league_season_config=self
        ).select_related("team", "tie_step_for_sum_points")

        return [
            {
                "id": current_adjustment.team.pk,
                "name": current_adjustment.team.description,
                "points": current_adjustment.sum_points,
                "field": current_adjustment.tie_step_for_sum_points.key,
            }
            for current_adjustment in adjustments
        ]

    def get_excluded_gameday_ids(self):
        return list(self.exclude_gamedays.values_list("id", flat=True))

    def __str__(self):
        return f"{self.league.name} - {self.season.name} -> {self.ruleset.name if self.ruleset else 'Keine Konfiguration'}"


class TeamPointAdjustments(models.Model):
    league_season_config = models.ForeignKey(
        LeagueSeasonConfig, on_delete=models.CASCADE
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    sum_points = models.DecimalField(max_digits=5, decimal_places=2)
    tie_step_for_sum_points = models.ForeignKey(TieBreakStep, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.team.description}: {self.sum_points} -> {self.tie_step_for_sum_points} ### {self.league_season_config}"
