from django.db import migrations


def remove_designer_data_if_exists(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        db_columns = {
            col.name
            for col in schema_editor.connection.introspection.get_table_description(
                cursor, "gamedays_gameday"
            )
        }
    if "designer_data" in db_columns:
        Gameday = apps.get_model("gamedays", "Gameday")
        schema_editor.remove_field(Gameday, Gameday._meta.get_field("designer_data"))


class Migration(migrations.Migration):

    dependencies = [
        ("gamedays", "0028_remove_gameinfo_redundant_fields"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    remove_designer_data_if_exists, migrations.RunPython.noop
                ),
            ],
            state_operations=[
                migrations.RemoveField(model_name="gameday", name="designer_data"),
            ],
        ),
    ]
