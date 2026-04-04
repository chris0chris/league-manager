from django.db import migrations

def set_templates_global(apps, schema_editor):
    ScheduleTemplate = apps.get_model('gameday_designer', 'ScheduleTemplate')
    ScheduleTemplate.objects.all().update(sharing='GLOBAL')

class Migration(migrations.Migration):

    dependencies = [
        ('gameday_designer', '0003_scheduletemplate_sharing'),
    ]

    operations = [
        migrations.RunPython(set_templates_global),
    ]
