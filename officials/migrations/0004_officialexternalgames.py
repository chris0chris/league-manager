# Generated by Django 4.1 on 2022-10-10 16:07

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('officials', '0003_official_external_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='OfficialExternalGames',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('position', models.CharField(max_length=100)),
                ('association', models.CharField(max_length=100)),
                ('number_games', models.PositiveSmallIntegerField()),
                ('is_international', models.BooleanField(default=False)),
                ('comment', models.CharField(max_length=100)),
                ('official', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='officials.official')),
            ],
        ),
    ]
