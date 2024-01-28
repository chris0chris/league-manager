# Generated by Django 4.1.7 on 2024-01-27 13:54

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('gamedays', '0019_gameofficial_gamedays_ga_gameinf_d5ecbf_idx'),
        ('passcheck', '0010_eligibilityrule_min_gamedays_for_final_and_more'),
    ]

    state_operations = [
        migrations.CreateModel(
            name='PlayerlistGameday',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gameday', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameday')),
                ('playerlist',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='passcheck.playerlist')),
            ],
            options={
                'db_table': 'passcheck_playerlist_gamedays',
            },
        ),
        migrations.AlterField(
            model_name='playerlist',
            name='gamedays',
            field=models.ManyToManyField(through='passcheck.PlayerlistGameday', to='gamedays.gameday'),
        ),
    ]
    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_operations),
    ]
