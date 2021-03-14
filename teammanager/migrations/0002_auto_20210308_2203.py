# Generated by Django 3.1.5 on 2021-03-08 21:03

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('teammanager', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='League',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name='Season',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name='SeasonLeagueTeam',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('league', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='teammanager.league')),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='teammanager.season')),
            ],
        ),
        migrations.RenameField(
            model_name='team',
            old_name='place',
            new_name='location',
        ),
        migrations.RemoveField(
            model_name='gameinfo',
            name='pin',
        ),
        migrations.RemoveField(
            model_name='team',
            name='division',
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='team',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='teammanager.team'),
        ),
        migrations.DeleteModel(
            name='Division',
        ),
        migrations.AddField(
            model_name='seasonleagueteam',
            name='team',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='teammanager.team'),
        ),
    ]