from django.db import models

from gamedays.models import League, Season, Gameday, Team


class LeagueGroup(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="groups_league")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="groups_season")
    name = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.league.name} - {self.name}"


class LeagueRuleset(models.Model):
    name = models.CharField(max_length=50, unique=True)
    win_points = models.DecimalField(max_digits=4, decimal_places=2, default=2)
    draw_points = models.DecimalField(max_digits=4, decimal_places=2, default=1)
    loss_points = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    points_win_same_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    points_win_other_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    points_draw_same_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    points_draw_other_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    max_points_same_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    max_points_other_league = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    tie_break_steps = models.ManyToManyField(
        "TieBreakStep",
        through="LeagueRulesetTieBreak",
        related_name="rulesets",
    )

    def tie_break_order(self):
        """Return the tie-break order as a list of keys (used by the engine)."""
        return [
            rel.step.key
            for rel in self.leaguerulesettiebreak_set.all().order_by("order")
        ]

    def __str__(self):
        return self.name


TIE_BREAK_CHOICES = [
    ("points", "Siegpunkte"),
    ("league_points", "Ligapunkte"),
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

    class Meta:
        unique_together = ("ruleset", "step")
        ordering = ["order"]

    def __str__(self):
        return f'{self.ruleset.name}: {self.order} - {self.step}'


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
    addition_team_points = models.ManyToManyField(Team, through='AdditionalTeamLeaguePoints')

    def __str__(self):
        return f"{self.league.name} - {self.season.name} -> {self.ruleset.name if self.ruleset else 'Keine Konfiguration'}"


class AdditionalTeamLeaguePoints(models.Model):
    league_season_config = models.ForeignKey(LeagueSeasonConfig, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    sum_points = models.DecimalField(max_digits=5, decimal_places=2)
    tie_step_for_sum_points = models.ForeignKey(TieBreakStep, on_delete=models.CASCADE)
