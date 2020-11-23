from django.contrib.auth.models import User
from django.db import models

# Create your models here.


class Division(models.Model):
    region = models.CharField(max_length=20)
    name = models.CharField(max_length=20)


class Team(models.Model):
    name = models.CharField(max_length=20)
    division = models.ForeignKey(Division,on_delete=models.CASCADE)
    description = models.CharField(max_length=20)
    place = models.CharField(max_length=20)
    logo = models.ImageField('Logo', upload_to="teammanager/logos", blank=True, null=True)

