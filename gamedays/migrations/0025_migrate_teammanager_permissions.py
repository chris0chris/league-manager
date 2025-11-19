# Generated manually for manager system implementation
# Migrates existing Teammanager permissions to TeamManager model

from django.db import migrations


def migrate_teammanager_permissions(apps, schema_editor):
    """Convert existing 'Teammanager' permissions to TeamManager model"""
    UserProfile = apps.get_model('gamedays', 'UserProfile')
    UserPermissions = apps.get_model('gamedays', 'UserPermissions')
    Permissions = apps.get_model('gamedays', 'Permissions')
    TeamManager = apps.get_model('gamedays', 'TeamManager')

    try:
        teammanager_perm = Permissions.objects.get(name='Teammanager')

        for user_perm in UserPermissions.objects.filter(permission=teammanager_perm).select_related('user'):
            if user_perm.user.user and user_perm.user.team:
                TeamManager.objects.get_or_create(
                    user=user_perm.user.user,
                    team=user_perm.user.team,
                    defaults={
                        'can_edit_roster': True,
                        'can_submit_passcheck': True,
                        'assigned_by': None,  # Historical data, no assigned_by
                    }
                )
    except Permissions.DoesNotExist:
        # No Teammanager permission exists, nothing to migrate
        pass


def reverse_migration(apps, schema_editor):
    """Reverse migration - recreate UserPermissions from TeamManager"""
    UserProfile = apps.get_model('gamedays', 'UserProfile')
    UserPermissions = apps.get_model('gamedays', 'UserPermissions')
    Permissions = apps.get_model('gamedays', 'Permissions')
    TeamManager = apps.get_model('gamedays', 'TeamManager')

    try:
        teammanager_perm = Permissions.objects.get(name='Teammanager')

        for team_manager in TeamManager.objects.all().select_related('user', 'team'):
            # Find or create UserProfile for this user/team combo
            user_profile = UserProfile.objects.filter(
                user=team_manager.user,
                team=team_manager.team
            ).first()

            if user_profile:
                UserPermissions.objects.get_or_create(
                    user=user_profile,
                    permission=teammanager_perm
                )
    except Permissions.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('gamedays', '0024_add_manager_models'),
    ]

    operations = [
        migrations.RunPython(migrate_teammanager_permissions, reverse_migration),
    ]
