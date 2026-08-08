from django.db import migrations
from django.utils import timezone


def publish_legacy_gamedays(apps_module, schema_editor):
    if apps_module is not None:
        Gameday = apps_module.get_model("gamedays", "Gameday")
    else:
        # Allows direct unit testing against the current models (see
        # gamedays/tests/migrations/test_publish_legacy_gamedays.py).
        from gamedays.models import Gameday

    # Legacy (non-Designer) gamedays have no draft/design phase, so a
    # DRAFT/blank status here only ever means "created before the
    # publish-on-create fix" rather than "still being designed". Designer
    # gamedays (identified by a linked GamedayDesignerState) legitimately
    # stay DRAFT while mid-design, so they're excluded.
    Gameday.objects.filter(
        designer_state__isnull=True,
        status__in=["DRAFT", ""],
    ).update(status="PUBLISHED", published_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [
        ("gamedays", "0041_backfill_stage_category"),
    ]

    operations = [
        migrations.RunPython(
            publish_legacy_gamedays,
            # No reverse: once merged with genuinely-published rows, the
            # backfilled rows can no longer be distinguished, so there is no
            # safe way to revert only the rows this migration touched.
            reverse_code=migrations.RunPython.noop,
        ),
    ]
