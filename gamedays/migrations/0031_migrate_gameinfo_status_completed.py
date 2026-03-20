from django.db import migrations


def migrate_status_completed(apps, schema_editor):
    """Rename legacy STATUS_COMPLETED value 'Beendet' → 'beendet'."""
    Gameinfo = apps.get_model("gamedays", "Gameinfo")
    updated = Gameinfo.objects.filter(status="Beendet").update(status="beendet")
    if updated:
        print(f"  Migrated {updated} Gameinfo rows from 'Beendet' to 'beendet'.")


def reverse_migrate_status_completed(apps, schema_editor):
    """Reverse: rename 'beendet' back to 'Beendet'."""
    Gameinfo = apps.get_model("gamedays", "Gameinfo")
    Gameinfo.objects.filter(status="beendet").update(status="Beendet")


class Migration(migrations.Migration):
    dependencies = [
        ("gamedays", "0030_gamedaydesignerstate"),
    ]

    operations = [
        migrations.RunPython(
            migrate_status_completed,
            reverse_code=reverse_migrate_status_completed,
        ),
    ]
