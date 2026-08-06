from django.contrib.auth.models import User
from django.db import models
from django.db.models import QuerySet, CASCADE
from django.utils import timezone
from django.utils.text import slugify

from gamedays.service.stage_category import StageCategory, derive_legacy_stage_category


class Season(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class League(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Association(models.Model):
    abbr = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)

    objects: QuerySet["Association"] = models.Manager()

    def __str__(self):
        return f"{self.pk}: {self.abbr} - {self.name}"


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=100)
    logo = models.ImageField(
        "Logo", upload_to="teammanager/logos", blank=True, null=True
    )
    association = models.ForeignKey(Association, on_delete=models.DO_NOTHING, null=True)

    objects: QuerySet["Team"] = models.Manager()

    def __str__(self):
        return self.name


class SeasonLeagueTeam(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    teams = models.ManyToManyField(Team)

    def __str__(self):
        return f"{self.season.name} {self.league} -> {self.teams.count()} Teams"


class Gameday(models.Model):
    STATUS_DRAFT = "DRAFT"
    STATUS_PUBLISHED = "PUBLISHED"
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_COMPLETED = "COMPLETED"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
    ]

    name = models.CharField(max_length=100)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    date = models.DateField()
    start = models.TimeField()
    format = models.CharField(max_length=100, default="6_2", blank=True)
    author = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)
    address = models.TextField(default="", blank=True)

    # Lifecycle fields
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects: QuerySet["Gameday"] = models.Manager()

    class Meta:
        ordering = ["date"]
        indexes = [
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"{self.pk}__{self.date} {self.name}"

    def save(self, *args, **kwargs):
        # auto_now only fires for fields Django actually writes: on a full save
        # that's every field, but a partial save() with update_fields=[...] skips
        # any field not listed. Force it in here so callers that pass a narrow
        # update_fields (e.g. syncing just name/date/start/address) still bump
        # updated_at -- generate_gameday_list_etag() depends on it to detect
        # changes to existing rows.
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"updated_at"}
        super().save(*args, **kwargs)

    def has_entered_results(self) -> bool:
        """True if any game holds entered results — a score, a finished game, or a
        team log. These rows are CASCADE-deleted when the schedule is regenerated,
        so they gate the destructive actions (re-publish, unlock)."""
        has_scores = (
            Gameresult.objects.filter(gameinfo__gameday=self)
            .filter(
                models.Q(fh__isnull=False)
                | models.Q(sh__isnull=False)
                | models.Q(pa__isnull=False)
            )
            .exists()
        )
        if has_scores:
            return True
        if Gameinfo.objects.filter(gameday=self, gameFinished__isnull=False).exists():
            return True
        return TeamLog.objects.filter(gameinfo__gameday=self).exists()


class GamedayDesignerState(models.Model):
    """Visual designer state for draft gamedays."""

    gameday = models.OneToOneField(
        Gameday,
        on_delete=models.CASCADE,
        related_name="designer_state",
        primary_key=True,
    )

    state_data = models.JSONField(
        default=dict, help_text="React Flow designer state (nodes, edges, teams)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )

    objects: QuerySet["GamedayDesignerState"] = models.Manager()


class Gameinfo(models.Model):
    STATUS_DRAFT = "DRAFT"
    STATUS_PUBLISHED = "Geplant"
    STATUS_IN_PROGRESS = "Gestartet"
    STATUS_COMPLETED = "beendet"

    # Retaining existing "Geplant" for backward compatibility if needed,
    # but strictly defining new flow constants.

    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    scheduled = models.TimeField()
    field = models.PositiveSmallIntegerField()
    officials = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True)
    status = models.CharField(max_length=100, default="Geplant")
    gameStarted = models.TimeField(null=True, blank=True)
    gameHalftime = models.TimeField(null=True, blank=True)
    gameFinished = models.TimeField(null=True, blank=True)
    stage = models.CharField(max_length=100)
    standing = models.CharField(max_length=100)
    stage_category = models.CharField(
        max_length=20, choices=StageCategory.choices, blank=True, default=""
    )
    league_group = models.ForeignKey(
        "league_table.LeagueGroup", on_delete=CASCADE, null=True, default=None
    )
    in_possession = models.CharField(
        max_length=100, blank=True, null=True, default=None
    )

    objects: QuerySet["Gameinfo"] = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["officials"]),
            models.Index(fields=["gameday"]),
        ]

    def save(self, *args, **kwargs):
        if not self.stage_category:
            self.stage_category = derive_legacy_stage_category(self.stage)
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.gameday.pk}__{self.pk}__{self.field} - {self.scheduled}: {self.stage} / {self.standing} "
            f"- {self.officials} [{self.status}]"
        )


class Gameresult(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True, null=True)
    fh = models.SmallIntegerField(null=True)
    sh = models.SmallIntegerField(null=True)
    pa = models.PositiveSmallIntegerField(null=True)
    isHome = models.BooleanField(default=False)

    objects: QuerySet["Gameresult"] = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["gameinfo", "isHome"]),
            models.Index(fields=["gameinfo"]),
            models.Index(fields=["team"]),
        ]

    def __str__(self):
        if self.fh is None:
            self.fh = ""
        if self.sh is None:
            self.sh = ""

        return f"{self.gameinfo.pk}__{self.gameinfo.field} {self.gameinfo.scheduled}: {self.team} ({"Home" if self.isHome else "Away"}) -> {self.fh + self.sh} / {self.pa}"


class GameOfficial(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    official = models.ForeignKey(
        "officials.Official", on_delete=models.CASCADE, null=True, blank=True
    )
    name = models.CharField(max_length=100, null=True, blank=True)
    position = models.CharField(max_length=100)

    objects: QuerySet["GameOfficial"] = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["gameinfo", "position"]),
        ]

    def __str__(self):
        name_or_official_name = (
            f"{self.official.last_name}, {self.official.first_name}"
            if self.official
            else f"{self.name} *"
        )
        return f"{self.gameinfo.pk}__{name_or_official_name} - {self.position}"


class GameSetup(models.Model):
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    ctResult = models.CharField(max_length=100)
    direction = models.CharField(max_length=100)
    fhPossession = models.CharField(max_length=100)
    homeCaptain = models.CharField(max_length=100, blank=True)
    awayCaptain = models.CharField(max_length=100, blank=True)
    hasFinalScoreChanged = models.BooleanField(default=False)
    note = models.TextField(default=None, blank=True, null=True)

    objects: QuerySet["GameSetup"] = models.Manager()

    def __str__(self):
        return f"{self.gameinfo.pk}"


class TeamLog(models.Model):
    gameinfo: Gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True, null=True)
    sequence = models.PositiveSmallIntegerField()
    player = models.PositiveSmallIntegerField(null=True, blank=True)
    event = models.CharField(max_length=100, blank=False)
    input = models.CharField(max_length=100, default="", null=True)
    value = models.PositiveSmallIntegerField(default=0, blank=True)
    cop = models.BooleanField(default=False)
    half = models.PositiveSmallIntegerField()
    isDeleted = models.BooleanField(default=False)
    created_time = models.TimeField(default=timezone.now)
    author = models.ForeignKey(User, on_delete=models.SET_DEFAULT, default=1)

    objects: QuerySet["TeamLog"] = models.Manager()

    def __str__(self):
        if self.cop:
            return (
                f"{self.gameinfo.pk}__{self.team}#{self.sequence} {self.event} - Half: {self.half}"
                f"{' [DELETED]' if self.isDeleted else ''}"
            )
        return (
            f"{self.gameinfo.pk}__{self.team}#{self.sequence} {self.event} Player: {self.player} "
            f"Value: {self.value} - Half: {self.half}{' [DELETED]' if self.isDeleted else ''}"
        )


class UserProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    avatar = models.ImageField(
        "Avatar", upload_to="media/teammanager/avatars", blank=True, null=True
    )
    team = models.ForeignKey(Team, on_delete=models.PROTECT, null=True)
    firstname = models.CharField(max_length=20, null=True)
    lastname = models.CharField(max_length=20, null=True)
    playernumber = models.IntegerField(null=True)
    position = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)

    objects: QuerySet = models.Manager()

    def get_permisions(self):
        permissions = list(UserPermissions.objects.filter(user=self))
        return permissions

    def check_teammanager(self):
        permisssions = self.get_permisions()
        is_teammanager = False
        for permission in permisssions:
            if permission.permission.name == "Teammanager":
                is_teammanager = True
        return is_teammanager

    def __str__(self):
        return f"{self.team.name}: {self.firstname} {self.lastname}"


class Permissions(models.Model):
    name = models.CharField(max_length=20)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class UserPermissions(models.Model):
    permission = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f"{self.permission.name}: {self.user.firstname} {self.user.lastname}"


class Achievement(models.Model):
    name = models.CharField(max_length=20, blank=False, null=False)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return self.name


class PlayerAchievement(models.Model):
    achievement = models.ForeignKey(
        Achievement, blank=False, null=False, on_delete=models.CASCADE
    )
    player = models.ForeignKey(
        UserProfile, blank=False, null=False, on_delete=models.CASCADE
    )
    value = models.IntegerField(blank=False, null=False)
    game = models.ForeignKey(
        Gameinfo, null=False, blank=False, on_delete=models.CASCADE
    )

    def __str__(self):
        return (
            self.achievement.name
            + " "
            + self.player.lastname
            + " "
            + self.player.firstname
            + " "
            + str(self.value)
        )


class Person(models.Model):
    FEMALE = 1
    MALE = 2

    SEX_CHOICES = [
        (FEMALE, "Weiblich"),
        (MALE, "Männlich"),
    ]

    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    sex = models.IntegerField(choices=SEX_CHOICES, null=True, blank=True, default=None)
    year_of_birth = models.PositiveIntegerField(null=True, blank=True, default=None)

    objects: QuerySet["Person"] = models.Manager()


class ResourceUrl(models.Model):
    gameday = models.ForeignKey(
        Gameday, null=True, blank=True, on_delete=models.CASCADE
    )
    tournament = models.ForeignKey(
        "Tournament", null=True, blank=True, on_delete=models.CASCADE
    )

    url = models.URLField(
        max_length=500, help_text="URL welche auf der Gameday Seite sichtbar sein soll"
    )
    description = models.CharField(max_length=50, help_text="Beschreibung der URL")

    objects: QuerySet["ResourceUrl"] = models.Manager()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(gameday__isnull=False, tournament__isnull=True)
                    | models.Q(gameday__isnull=True, tournament__isnull=False)
                ),
                name="resourceurl_exactly_one_parent",
            ),
        ]

    def __str__(self):
        if self.gameday_id:
            return f"{self.gameday.pk}__{self.pk} - {self.description} -> {self.url}"
        return f"Tournament {self.tournament.pk}__{self.pk} - {self.description} -> {self.url}"


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    title = models.CharField(max_length=200, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")
    show_league_name = models.BooleanField(default=False)
    show_field = models.BooleanField(default=False)

    objects: QuerySet["Tournament"] = models.Manager()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TournamentRow(models.Model):
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="rows"
    )
    title = models.CharField(max_length=200, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    objects: QuerySet["TournamentRow"] = models.Manager()

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return (
            f"{self.tournament.name} - Row {self.order}: {self.title or '(untitled)'}"
        )


class TournamentColumn(models.Model):
    row = models.ForeignKey(
        TournamentRow, on_delete=models.CASCADE, related_name="columns"
    )
    title = models.CharField(max_length=200, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    objects: QuerySet["TournamentColumn"] = models.Manager()

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.row} / Col {self.order}: {self.title or '(untitled)'}"


class TournamentColumnGame(models.Model):
    column = models.ForeignKey(
        TournamentColumn, on_delete=models.CASCADE, related_name="column_games"
    )
    gameinfo = models.ForeignKey(Gameinfo, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    objects: QuerySet["TournamentColumnGame"] = models.Manager()

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["column", "gameinfo"], name="unique_gameinfo_per_column"
            ),
        ]

    def __str__(self):
        return f"{self.column} -> Gameinfo #{self.gameinfo_id} (pos {self.order})"
