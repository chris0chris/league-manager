from django.db import migrations

_LEGACY_STAGE_NAME_TO_CATEGORY = {
    "Vorrunde": "preliminary",
    "Hauptrunde": "preliminary",
    "Finalrunde": "final",
    "Zwischenrunde": "placement",
}


def _category_map_from_designer_state(state_data) -> dict:
    nodes = (state_data or {}).get("nodes", [])
    return {
        node["data"]["name"]: node["data"]["category"]
        for node in nodes
        if node.get("type") == "stage"
        and (node.get("data") or {}).get("name")
        and (node.get("data") or {}).get("category")
    }


def backfill_stage_category(apps_module, schema_editor):
    if apps_module is not None:
        Gameinfo = apps_module.get_model("gamedays", "Gameinfo")
        GamedayDesignerState = apps_module.get_model("gamedays", "GamedayDesignerState")
    else:
        # Allows direct unit testing against the current models (see
        # gamedays/tests/migrations/test_backfill_stage_category.py).
        from gamedays.models import Gameinfo, GamedayDesignerState

    for state in GamedayDesignerState.objects.all():
        name_to_category = _category_map_from_designer_state(state.state_data)
        if not name_to_category:
            continue
        rows = list(
            Gameinfo.objects.filter(gameday_id=state.gameday_id, stage_category="")
        )
        if not rows:
            continue
        to_update = []
        for row in rows:
            category = name_to_category.get(row.stage)
            if category:
                row.stage_category = category
                to_update.append(row)
        if to_update:
            Gameinfo.objects.bulk_update(to_update, ["stage_category"])

    remaining = list(Gameinfo.objects.filter(stage_category=""))
    for row in remaining:
        row.stage_category = _LEGACY_STAGE_NAME_TO_CATEGORY.get(row.stage, "custom")
    if remaining:
        Gameinfo.objects.bulk_update(remaining, ["stage_category"], batch_size=500)


def reverse_backfill_stage_category(apps_module, schema_editor):
    if apps_module is not None:
        Gameinfo = apps_module.get_model("gamedays", "Gameinfo")
    else:
        # Allows direct unit testing against the current models (see
        # gamedays/tests/migrations/test_backfill_stage_category.py).
        from gamedays.models import Gameinfo
    Gameinfo.objects.update(stage_category="")


class Migration(migrations.Migration):
    dependencies = [
        ("gamedays", "0040_gameinfo_stage_category"),
    ]

    operations = [
        migrations.RunPython(
            backfill_stage_category,
            reverse_code=reverse_backfill_stage_category,
        ),
    ]
