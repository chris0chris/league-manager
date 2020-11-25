from django.contrib.auth.models import User
from django.db import models


# Create your models here.


class Division(models.Model):
    region = models.CharField(max_length=20)
    name = models.CharField(max_length=20)


class Team(models.Model):
    name = models.CharField(max_length=20)
    division = models.ForeignKey(Division, on_delete=models.CASCADE)
    description = models.CharField(max_length=20)
    place = models.CharField(max_length=20)
    logo = models.ImageField('Logo', upload_to="teammanager/logos", blank=True, null=True)


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField('Avatar', upload_to="media/teammanager/avatars", blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    firstname = models.CharField(max_length=20,null=True)
    lastname = models.CharField(max_length=20,null=True)

class Permissions(models.Model):
    name = models.CharField(max_length=20)


class UserPermissions(models.Model):
    permission = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
