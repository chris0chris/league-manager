from django.db import models
from django.urls import reverse
# Create your models here.


class Division(models.Model):
    """Model representing a Division"""
    name = models.CharField(max_length=200,help_text="Enter name of team" )

    def __str__(self):
        return self.name

class Team(models.Model):
    name = models.CharField(max_length=200)
