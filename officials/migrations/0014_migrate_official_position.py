from django.db import migrations

def update_gameofficial_positions(apps, schema_editor):
    GameOfficial = apps.get_model('gamedays', 'GameOfficial')

    position_map = {
        'Scorecard Judge': 1,
        'Referee': 2,
        'Down Judge': 3,
        'Field Judge': 4,
        'Side Judge': 5,
    }

    for position, official_position_id in position_map.items():
        GameOfficial.objects.filter(position=position).update(official_position_id=official_position_id)

class Migration(migrations.Migration):

    dependencies = [
        ('officials', '0013_officialposition'),
    ]

    operations = [
        migrations.RunPython(update_gameofficial_positions),
    ]