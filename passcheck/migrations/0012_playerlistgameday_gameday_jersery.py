# Generated by Django 4.1.7 on 2024-01-27 14:18

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('passcheck', '0011_playerlistgameday_alter_playerlist_gamedays'),
    ]

    operations = [
        migrations.AddField(
            model_name='playerlistgameday',
            name='gameday_jersery',
            field=models.IntegerField(default=7),
            preserve_default=False,
        ),
    ]