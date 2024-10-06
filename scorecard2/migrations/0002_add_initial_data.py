from django.db import migrations, connection


def add_initial_data(apps, schema_editor):
    if connection.settings_dict['NAME'].startswith('test'):
        return

    OfficialPosition = apps.get_model('officials', 'OfficialPosition')
    ScorecardConfig = apps.get_model('scorecard2', 'ScorecardConfig')
    ScorecardCategory = apps.get_model('scorecard2', 'ScorecardCategory')
    ScorecardCategoryValue = apps.get_model('scorecard2', 'ScorecardCategoryValue')
    ScorecardOfficial = apps.get_model('scorecard2', 'ScorecardOfficial')
    League = apps.get_model('gamedays', 'League')

    OfficialPosition.objects.bulk_create([
        OfficialPosition(id=1, name='Scorecard Judge', is_position_counted_as_entry=0),
        OfficialPosition(id=2, name='Referee', is_position_counted_as_entry=1),
        OfficialPosition(id=3, name='Down Judge', is_position_counted_as_entry=1),
        OfficialPosition(id=4, name='Field Judge', is_position_counted_as_entry=1),
        OfficialPosition(id=5, name='Side Judge', is_position_counted_as_entry=1),
    ])

    scorecard_config = ScorecardConfig.objects.create(name='Default 5er Config')

    categories = [
        ScorecardCategory(id=1, name='Münzwurf hat:', team_option='away',
                          scorecard_config=scorecard_config, is_required=True),
        ScorecardCategory(id=2, name='Team mit Ballbesitz in der 1. Halbzeit', team_option='none',
                          scorecard_config=scorecard_config, is_required=True),
        ScorecardCategory(id=3, name='Spielrichtung 1. Halbzeit (aus Blick Scorecard Judge)', team_option='none',
                          scorecard_config=scorecard_config, is_required=True),
    ]
    ScorecardCategory.objects.bulk_create(categories)

    category_values = [
        ScorecardCategoryValue(id=1, value='Gewonnen', category=categories[0]),
        ScorecardCategoryValue(id=2, value='Verloren', category=categories[0]),
        ScorecardCategoryValue(id=3, value='<i class="bi bi-arrow-left"></i>', category=categories[2]),
        ScorecardCategoryValue(id=4, value='<i class="bi bi-arrow-right"></i>', category=categories[2]),
        ScorecardCategoryValue(id=5, value='Heim', category=categories[1]),
        ScorecardCategoryValue(id=6, value='Gast', category=categories[1]),
    ]
    ScorecardCategoryValue.objects.bulk_create(category_values)

    scorecard_officials = [
        ScorecardOfficial(id=1, is_optional=False, official_position_id=1, scorecard_config=scorecard_config),
        ScorecardOfficial(id=2, is_optional=False, official_position_id=2, scorecard_config=scorecard_config),
        ScorecardOfficial(id=3, is_optional=False, official_position_id=3, scorecard_config=scorecard_config),
        ScorecardOfficial(id=4, is_optional=False, official_position_id=4, scorecard_config=scorecard_config),
        ScorecardOfficial(id=5, is_optional=False, official_position_id=5, scorecard_config=scorecard_config),
    ]
    ScorecardOfficial.objects.bulk_create(scorecard_officials)

    scorecard_config.leagues.add(League.objects.get(id=7))
    scorecard_config.leagues.add(League.objects.get(id=8))
    scorecard_config.leagues.add(League.objects.get(id=9))
    scorecard_config.leagues.add(League.objects.get(id=10))
    scorecard_config.leagues.add(League.objects.get(id=11))
    scorecard_config.leagues.add(League.objects.get(id=12))
    scorecard_config.leagues.add(League.objects.get(id=13))
    scorecard_config.leagues.add(League.objects.get(id=14))


class Migration(migrations.Migration):
    dependencies = [
        ('scorecard2', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_initial_data),
    ]
