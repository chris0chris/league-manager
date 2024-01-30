# Generated by Django 4.1.7 on 2024-01-19 08:36

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('gamedays', '0017_team_association'),
        ('passcheck', '0007_playerlist_jersey_number_btw_0_and_99'),
    ]

    operations = [
        migrations.CreateModel(
            name='EligibilityRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('max_gamedays', models.IntegerField()),
                ('max_players', models.IntegerField(blank=True, default=None, null=True)),
                ('is_relegation_allowed', models.BooleanField(default=False)),
                ('ignore_player_age_unitl', models.IntegerField(blank=True, default=19, null=True)),
                ('except_for_women', models.BooleanField(default=True)),
                ('eligible_in', models.ManyToManyField(related_name='eligible_in', to='gamedays.league')),
                ('league',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eligibility_for',
                                   to='gamedays.league')),
            ],
        ),
    ]