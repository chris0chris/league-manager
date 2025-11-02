# Generated manually for manager system implementation

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('gamedays', '0023_gameinfo_league_group'),
    ]

    operations = [
        migrations.CreateModel(
            name='LeagueManager',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='league_managers_created', to=settings.AUTH_USER_MODEL)),
                ('league', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='managers', to='gamedays.league')),
                ('season', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='league_managers', to='gamedays.season')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='league_manager_roles', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='GamedayManager',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('can_edit_details', models.BooleanField(default=True)),
                ('can_assign_officials', models.BooleanField(default=True)),
                ('can_manage_scores', models.BooleanField(default=True)),
                ('assigned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='gameday_assignments', to=settings.AUTH_USER_MODEL)),
                ('gameday', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='managers', to='gamedays.gameday')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gameday_manager_roles', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='TeamManager',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('can_edit_roster', models.BooleanField(default=True)),
                ('can_submit_passcheck', models.BooleanField(default=True)),
                ('assigned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='team_managers_assigned', to=settings.AUTH_USER_MODEL)),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='managers', to='gamedays.team')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_manager_roles', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name='leaguemanager',
            index=models.Index(fields=['user', 'league'], name='gamedays_le_user_id_70fa60_idx'),
        ),
        migrations.AddIndex(
            model_name='leaguemanager',
            index=models.Index(fields=['league', 'season'], name='gamedays_le_league__2c7b25_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='leaguemanager',
            unique_together={('user', 'league', 'season')},
        ),
        migrations.AddIndex(
            model_name='gamedaymanager',
            index=models.Index(fields=['user'], name='gamedays_ga_user_id_1a2b3c_idx'),
        ),
        migrations.AddIndex(
            model_name='gamedaymanager',
            index=models.Index(fields=['gameday'], name='gamedays_ga_gameday_4d5e6f_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='gamedaymanager',
            unique_together={('user', 'gameday')},
        ),
        migrations.AddIndex(
            model_name='teammanager',
            index=models.Index(fields=['user', 'team'], name='gamedays_te_user_id_7g8h9i_idx'),
        ),
        migrations.AddIndex(
            model_name='teammanager',
            index=models.Index(fields=['team'], name='gamedays_te_team_id_0j1k2l_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='teammanager',
            unique_together={('user', 'team')},
        ),
    ]
