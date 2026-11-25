from django.db import migrations, models
import django.db.models.deletion


def _resolve_rows(rows, resolve_association):
    for row in rows.iterator():
        # Resolve through the *current* Association model (one shared
        # mapping) and store its id: the FK here points at the historical
        # model class, which cannot be assigned a current-model instance.
        row.association_new_id = resolve_association(row.association).pk
        row.save(update_fields=["association_new"])


def forwards(apps, schema_editor):
    """Map every stored free-text value onto the existing association rows.

    All 21 values that occur in production are mapped (see
    ``officials.service.association_resolution``), so an unmapped value means
    the data is not what this migration was written for - it raises and aborts
    the migration instead of silently writing NULL or inventing a row.
    """
    from officials.service.association_resolution import resolve_association

    OfficialExternalGames = apps.get_model("officials", "OfficialExternalGames")
    _resolve_rows(OfficialExternalGames.objects.all(), resolve_association)


def backwards(apps, schema_editor):
    """Write the abbreviation back into the varchar column the reverse of
    RemoveField re-creates just before this runs."""
    OfficialExternalGames = apps.get_model("officials", "OfficialExternalGames")
    for row in OfficialExternalGames.objects.select_related(
        "association_new"
    ).iterator():
        row.association = row.association_new.abbr
        row.save(update_fields=["association"])


class Migration(migrations.Migration):

    dependencies = [
        ("officials", "0016_crewposition"),
        ("gamedays", "0048_gamesetup_quarterbacks"),
    ]

    operations = [
        migrations.AddField(
            model_name="officialexternalgames",
            name="association_new",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="gamedays.association",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="officialexternalgames",
            name="association",
        ),
        migrations.RenameField(
            model_name="officialexternalgames",
            old_name="association_new",
            new_name="association",
        ),
        migrations.AlterField(
            model_name="officialexternalgames",
            name="association",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="gamedays.association",
            ),
        ),
    ]
