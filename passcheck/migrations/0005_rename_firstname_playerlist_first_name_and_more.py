# Generated by Django 4.1.7 on 2024-01-14 10:56

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('passcheck', '0004_alter_playerlist_sex'),
    ]

    operations = [
        migrations.RenameField(
            model_name='playerlist',
            old_name='firstname',
            new_name='first_name',
        ),
        migrations.RenameField(
            model_name='playerlist',
            old_name='trikotnumber',
            new_name='jersey_number',
        ),
        migrations.RenameField(
            model_name='playerlist',
            old_name='lastname',
            new_name='last_name',
        ),
        migrations.RenameField(
            model_name='playerlist',
            old_name='passnumber',
            new_name='pass_number',
        ),
    ]