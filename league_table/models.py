from django.db import models

from gamedays.models import League, Season


class LeagueGroup(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="groups_league")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="groups_season")
    name = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.league.name} - {self.name}"


class LeagueRuleset(models.Model):
    name = models.CharField(max_length=50, unique=True)
    win_points = models.PositiveSmallIntegerField(default=2)
    draw_points = models.PositiveSmallIntegerField(default=1)
    loss_points = models.PositiveSmallIntegerField(default=0)
    allow_draws = models.BooleanField(default=True)

    use_direct_comparison = models.BooleanField(default=True)
    use_point_diff_direct = models.BooleanField(default=True)
    use_points_scored_direct = models.BooleanField(default=True)
    use_overall_point_diff = models.BooleanField(default=True)
    use_overall_points_scored = models.BooleanField(default=True)
    use_name_ascending = models.BooleanField(default=True)

    require_complete_round_robin_for_direct = models.BooleanField(default=True)

    def tie_break_order(self):
        """Return the tie-break order as a list of keys."""
        order = []
        if self.use_direct_comparison:
            order.append("direct_wins")
        if self.use_point_diff_direct:
            order.append("direct_point_diff")
        if self.use_points_scored_direct:
            order.append("direct_points_scored")
        if self.use_overall_point_diff:
            order.append("overall_point_diff")
        if self.use_overall_points_scored:
            order.append("overall_points_scored")
        if self.use_name_ascending:
            order.append("name_ascending")
        return order

    def __str__(self):
        return f"{self.name}"


class LeagueSeasonConfig(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="config_league")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="config_season")
    ruleset = models.ForeignKey(LeagueRuleset, on_delete=models.SET_NULL, null=True)