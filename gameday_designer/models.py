"""
Models for gameday_designer app - Visual schedule template creator.

These models replace JSON-based schedule files with database-backed templates.
Implementation follows the architecture specification and passes comprehensive test suite.
"""

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import QuerySet, CASCADE, Q


class ScheduleTemplate(models.Model):
    """
    Reusable tournament schedule template.

    Templates can be global (association=None) or association-specific.
    Each template defines the structure of a gameday: number of teams, fields, groups, and game slots.
    """

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    num_teams = models.PositiveIntegerField()
    num_fields = models.PositiveIntegerField()
    num_groups = models.PositiveIntegerField(default=1)
    game_duration = models.PositiveIntegerField(default=70)  # minutes

    # Association-specific or global
    association = models.ForeignKey(
        "gamedays.Association",
        on_delete=CASCADE,
        null=True,
        blank=True,
        related_name="schedule_templates",
    )

    # Audit trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates_created",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects: QuerySet["ScheduleTemplate"] = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "association"],
                name="unique_template_name_per_association",
            ),
            models.CheckConstraint(
                condition=Q(num_teams__gt=0), name="positive_num_teams"
            ),
            models.CheckConstraint(
                condition=Q(num_fields__gt=0), name="positive_num_fields"
            ),
            models.CheckConstraint(
                condition=Q(game_duration__gte=30) & Q(game_duration__lte=120),
                name="valid_game_duration",
            ),
        ]
        indexes = [
            models.Index(fields=["association", "name"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        association_name = self.association.abbr if self.association else "Global"
        return f"{association_name}: {self.name} ({self.num_teams} teams, {self.num_fields} fields)"


class TemplateSlot(models.Model):
    """
    Individual game slot within a template.

    Slots define when/where games occur and which teams play.
    Teams can be referenced by:
      - Group/team index (e.g., group=0, team=1 = second team in first group) for preliminary rounds
      - Reference string (e.g., "Gewinner HF1") for final rounds determined by earlier results
    """

    template = models.ForeignKey(
        ScheduleTemplate, on_delete=CASCADE, related_name="slots"
    )
    field = models.PositiveIntegerField()
    slot_order = models.PositiveIntegerField()
    stage = models.CharField(max_length=50)  # "Vorrunde", "Finalrunde"
    standing = models.CharField(max_length=100)  # "Gruppe 1", "HF", "P1", etc.

    # Home team placeholder (either group/team OR reference, not both)
    home_group = models.PositiveIntegerField(null=True, blank=True)
    home_team = models.PositiveIntegerField(null=True, blank=True)
    home_reference = models.CharField(max_length=100, blank=True, default="")

    # Away team placeholder
    away_group = models.PositiveIntegerField(null=True, blank=True)
    away_team = models.PositiveIntegerField(null=True, blank=True)
    away_reference = models.CharField(max_length=100, blank=True, default="")

    # Officials placeholder
    official_group = models.PositiveIntegerField(null=True, blank=True)
    official_team = models.PositiveIntegerField(null=True, blank=True)
    official_reference = models.CharField(max_length=100, blank=True, default="")

    break_after = models.PositiveIntegerField(
        default=0
    )  # Additional break time in minutes

    objects: QuerySet["TemplateSlot"] = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["template", "field", "slot_order"]),
            models.Index(fields=["template", "stage"]),
        ]
        ordering = ["field", "slot_order"]

    def clean(self):
        """Model-level validation for slot integrity."""
        errors = {}

        # Validate no self-play (team cannot play against itself)
        if (
            self.home_group is not None
            and self.away_group is not None
            and self.home_group == self.away_group
            and self.home_team == self.away_team
        ):
            errors["home_team"] = "Team cannot play against itself"

        # Validate no self-referee (home team cannot referee own game)
        if (
            self.home_group is not None
            and self.official_group is not None
            and self.home_group == self.official_group
            and self.home_team == self.official_team
        ):
            errors["official_team"] = "Home team cannot referee their own game"

        # Validate no self-referee (away team cannot referee own game)
        if (
            self.away_group is not None
            and self.official_group is not None
            and self.away_group == self.official_group
            and self.away_team == self.official_team
        ):
            errors["official_team"] = "Away team cannot referee their own game"

        # Validate field number doesn't exceed template's num_fields
        if self.template and self.field > self.template.num_fields:
            errors["field"] = (
                f"Field {self.field} exceeds template's {self.template.num_fields} fields"
            )

        # Validate group indices don't exceed template's num_groups
        if self.template:
            if (
                self.home_group is not None
                and self.home_group >= self.template.num_groups
            ):
                errors["home_group"] = (
                    f"Home group {self.home_group} exceeds template's {self.template.num_groups} groups"
                )

            if (
                self.away_group is not None
                and self.away_group >= self.template.num_groups
            ):
                errors["away_group"] = (
                    f"Away group {self.away_group} exceeds template's {self.template.num_groups} groups"
                )

            if (
                self.official_group is not None
                and self.official_group >= self.template.num_groups
            ):
                errors["official_group"] = (
                    f"Official group {self.official_group} exceeds template's {self.template.num_groups} groups"
                )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        home_desc = (
            f"{self.home_group}_{self.home_team}"
            if self.home_group is not None
            else self.home_reference
        )
        away_desc = (
            f"{self.away_group}_{self.away_team}"
            if self.away_group is not None
            else self.away_reference
        )
        return f"Field {self.field} Slot {self.slot_order}: {home_desc} vs {away_desc} ({self.stage} / {self.standing})"


class TemplateUpdateRule(models.Model):
    """
    Rules for updating final round games based on preliminary results.

    Defines which stage must complete before this slot can be populated with teams.
    Individual team assignment rules are defined in TemplateUpdateRuleTeam.
    """

    template = models.ForeignKey(
        ScheduleTemplate, on_delete=CASCADE, related_name="update_rules"
    )
    slot = models.ForeignKey(
        TemplateSlot, on_delete=CASCADE, related_name="update_rule"
    )
    # Stage that must complete before this slot can be updated
    pre_finished = models.CharField(max_length=100)

    objects: QuerySet["TemplateUpdateRule"] = models.Manager()

    class Meta:
        unique_together = [["slot"]]

    def __str__(self):
        return f"Update rule for {self.slot.standing}: wait for {self.pre_finished}"


class TemplateUpdateRuleTeam(models.Model):
    """
    Team assignment rules within an update rule.

    Defines which team fills a role (home/away/official) based on standings from a completed stage.
    Example: "Home team is 2nd place from Gruppe 2"
    """

    ROLE_CHOICES = [
        ("home", "Home Team"),
        ("away", "Away Team"),
        ("official", "Officials"),
    ]

    update_rule = models.ForeignKey(
        TemplateUpdateRule, on_delete=CASCADE, related_name="team_rules"
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    # Which stage's standings to look at
    standing = models.CharField(max_length=100)

    # Which place in standings (1 = winner, 2 = runner-up, etc.)
    place = models.PositiveIntegerField()

    # Optional: Filter by points (2 = winner, 0 = loser)
    points = models.PositiveIntegerField(null=True, blank=True)

    # Optional: Override pre_finished for this specific role (e.g., officials depend on different stage)
    pre_finished_override = models.CharField(max_length=100, blank=True, null=True)

    objects: QuerySet["TemplateUpdateRuleTeam"] = models.Manager()

    class Meta:
        unique_together = [["update_rule", "role"]]

    def __str__(self):
        points_desc = f" with {self.points} points" if self.points is not None else ""
        return f"{self.role.capitalize()}: Place {self.place} from {self.standing}{points_desc}"


class TemplateApplication(models.Model):
    """
    Audit trail tracking when templates are applied to gamedays.

    Records which template was used, by whom, and how teams were mapped.
    """

    template = models.ForeignKey(
        ScheduleTemplate, on_delete=CASCADE, related_name="applications"
    )
    gameday = models.ForeignKey(
        "gamedays.Gameday", on_delete=CASCADE, related_name="template_applications"
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    applied_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    # Stores mapping of placeholder → actual team ID
    # Example: {"0_0": 123, "0_1": 124, "1_0": 125, ...}
    team_mapping = models.JSONField()

    objects: QuerySet["TemplateApplication"] = models.Manager()

    class Meta:
        ordering = ["-applied_at"]

    def __str__(self):
        return (
            f"{self.template.name} applied to {self.gameday.name} on {self.applied_at}"
        )
