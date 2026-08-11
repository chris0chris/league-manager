from django.db import migrations, models


def populate_maintenance_scope(apps, schema_editor):
    SiteConfiguration = apps.get_model("league_manager", "SiteConfiguration")
    for config in SiteConfiguration.objects.all():
        if config.maintenance_mode:
            config.maintenance_scope = "writes_only"
        else:
            config.maintenance_scope = "off"
        config.save(update_fields=["maintenance_scope"])


class Migration(migrations.Migration):

    dependencies = [
        ("league_manager", "0002_add_default_SiteConfiguration"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfiguration",
            name="maintenance_scope",
            field=models.CharField(
                choices=[
                    ("off", "Off"),
                    ("full", "Full App (replace with maintenance screen)"),
                    ("writes_only", "Writes Only (block POST/PUT/PATCH/DELETE)"),
                    ("custom", "Custom (use page patterns below)"),
                ],
                default="off",
                max_length=20,
            ),
        ),
        migrations.RunPython(populate_maintenance_scope, migrations.RunPython.noop),
    ]
