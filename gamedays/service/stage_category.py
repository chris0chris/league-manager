from django.db import models


class StageCategory(models.TextChoices):
    """
    Mirrors the Designer's StageCategory type
    (gameday_designer/src/types/flowchart.ts:160). A stage's *display name*
    (e.g. "Liga", "Vorrunde", "Preliminary") is free text chosen by whoever
    builds the schedule; this is the separate, structured signal for
    "does this stage's games count toward the round-robin standings table".
    """

    PRELIMINARY = "preliminary", "Preliminary"
    FINAL = "final", "Final"
    PLACEMENT = "placement", "Placement"
    CUSTOM = "custom", "Custom"


_LEGACY_STAGE_NAME_TO_CATEGORY = {
    "Vorrunde": StageCategory.PRELIMINARY,
    "Hauptrunde": StageCategory.PRELIMINARY,
    "Finalrunde": StageCategory.FINAL,
    "Zwischenrunde": StageCategory.PLACEMENT,
}


def derive_legacy_stage_category(stage_name: str) -> str:
    """
    Best-effort category for gamedays created outside the Designer, where no
    structured category is available — only a free-text stage name. Mirrors
    the fixed vocabulary used by gamedays/management/schedules/*.json and the
    manual gameinfo-entry form (gamedays/forms.py).
    """
    return _LEGACY_STAGE_NAME_TO_CATEGORY.get(stage_name, StageCategory.CUSTOM)
