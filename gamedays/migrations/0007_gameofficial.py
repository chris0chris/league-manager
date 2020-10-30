# Generated by Django 3.1.2 on 2020-10-30 22:49

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('gamedays', '0006_auto_20201009_0904'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameOfficial',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('position', models.CharField(max_length=100)),
                ('gameinfo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gamedays.gameinfo')),
            ],
        ),
    ]
