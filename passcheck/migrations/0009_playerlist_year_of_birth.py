# Generated by Django 4.1.7 on 2024-01-19 14:19

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('passcheck', '0008_eligibilityrule'),
    ]

    operations = [
        migrations.AddField(
            model_name='playerlist',
            name='year_of_birth',
            field=models.PositiveIntegerField(default=1982),
            preserve_default=False,
        ),
    ]