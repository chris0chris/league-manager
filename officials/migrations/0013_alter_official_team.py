# Generated by Django 5.1.6 on 2025-03-21 09:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gamedays', '0022_person'),
        ('officials', '0012_rename_officialgamessignup_officialgamedaysignup'),
    ]

    operations = [
        migrations.AlterField(
            model_name='official',
            name='team',
            field=models.ForeignKey(default=213, on_delete=models.SET(213), to='gamedays.team'),
            preserve_default=False,
        ),
    ]
