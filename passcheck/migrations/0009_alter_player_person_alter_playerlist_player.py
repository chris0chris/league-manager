# Generated by Django 5.0.4 on 2025-02-26 17:58

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamedays', '0022_person'),
        ('passcheck', '0008_alter_player_pass_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='person',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.person'),
        ),
        migrations.AlterField(
            model_name='playerlist',
            name='player',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='passcheck.player'),
        ),
    ]
