from django.contrib.auth.models import User
from django.db import models

# Create your models here.


class Division(models.Model):
    Region = models.CharField(max_length=20)
    Name = models.CharField(max_length=20)


class Team(models.Model):
    Name = models.CharField(max_length=20)
    Division = models.ForeignKey(Division,on_delete=models.CASCADE)
    Beschreibung = models.CharField(max_length=20)
    Ort = models.CharField(max_length=20)
    Punkte = models.IntegerField

