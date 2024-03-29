# Generated by Django 3.1.5 on 2021-03-04 21:48

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Achievement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name='Division',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('region', models.CharField(max_length=20)),
                ('name', models.CharField(max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name='Gameday',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('date', models.DateField()),
                ('start', models.TimeField()),
                ('format', models.CharField(blank=True, default='6_2', max_length=100)),
                ('author', models.ForeignKey(default=1, on_delete=django.db.models.deletion.SET_DEFAULT,
                                             to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Gameinfo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scheduled', models.TimeField()),
                ('field', models.PositiveSmallIntegerField()),
                ('status', models.CharField(blank=True, default='', max_length=100)),
                ('pin', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('gameStarted', models.TimeField(blank=True, null=True)),
                ('gameHalftime', models.TimeField(blank=True, null=True)),
                ('gameFinished', models.TimeField(blank=True, null=True)),
                ('stage', models.CharField(max_length=100)),
                ('standing', models.CharField(max_length=100)),
                ('gameday', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameday')),
            ],
        ),
        migrations.CreateModel(
            name='Permissions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20)),
                ('description', models.CharField(max_length=1000)),
                ('place', models.CharField(max_length=20)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='gamedays/logos', verbose_name='Logo')),
                ('division', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.division')),
            ],
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='media/gamedays/avatars',
                                             verbose_name='Avatar')),
                ('firstname', models.CharField(max_length=20, null=True)),
                ('lastname', models.CharField(max_length=20, null=True)),
                ('playernumber', models.IntegerField(null=True)),
                ('position', models.CharField(blank=True, max_length=20, null=True)),
                ('location', models.CharField(blank=True, max_length=20, null=True)),
                ('birth_date', models.DateField(blank=True, null=True)),
                ('team',
                 models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='gamedays.team')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                           to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='UserPermissions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('permission',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.permissions')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.userprofile')),
            ],
        ),
        migrations.CreateModel(
            name='TeamLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence', models.PositiveSmallIntegerField()),
                ('player', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('event', models.CharField(max_length=100)),
                ('value', models.PositiveSmallIntegerField(blank=True, default=0)),
                ('cop', models.BooleanField(default=False)),
                ('half', models.PositiveSmallIntegerField()),
                ('isDeleted', models.BooleanField(default=False)),
                ('gameinfo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
                ('team',
                 models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, to='gamedays.team')),
            ],
        ),
        migrations.CreateModel(
            name='PlayerAchievement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.IntegerField()),
                ('achievement',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.achievement')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
                (
                    'player',
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.userprofile')),
            ],
        ),
        migrations.CreateModel(
            name='GameSetup',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ctResult', models.CharField(max_length=100)),
                ('direction', models.CharField(max_length=100)),
                ('fhPossession', models.CharField(max_length=100)),
                ('homeCaptain', models.CharField(blank=True, max_length=100)),
                ('awayCaptain', models.CharField(blank=True, max_length=100)),
                ('hasFinalScoreChanged', models.BooleanField(default=False)),
                ('gameinfo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
            ],
        ),
        migrations.CreateModel(
            name='Gameresult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fh', models.SmallIntegerField(null=True)),
                ('sh', models.SmallIntegerField(null=True)),
                ('pa', models.PositiveSmallIntegerField(null=True)),
                ('isHome', models.BooleanField(default=False)),
                ('gameinfo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
                ('team',
                 models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, to='gamedays.team')),
            ],
        ),
        migrations.CreateModel(
            name='GameOfficial',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('position', models.CharField(max_length=100)),
                ('gameinfo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
            ],
        ),
        migrations.AddField(
            model_name='gameinfo',
            name='officials',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, to='gamedays.team'),
        ),
    ]
