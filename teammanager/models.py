from django.contrib.auth.models import User
from django.db import models
from gamedays.models import Gameinfo

# Create your models here.


class Division(models.Model):
    region = models.CharField(max_length=20)
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=20)
    division = models.ForeignKey(Division, on_delete=models.CASCADE)
    description = models.CharField(max_length=1000)
    place = models.CharField(max_length=20)
    logo = models.ImageField('Logo', upload_to="teammanager/logos", blank=True, null=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True,blank=True)
    avatar = models.ImageField('Avatar', upload_to="media/teammanager/avatars", blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True)
    firstname = models.CharField(max_length=20, null=True)
    lastname = models.CharField(max_length=20, null=True)
    playernumber = models.IntegerField(null=True)
    position = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)

    def get_Permisions(self):
        permissions = list(UserPermissions.objects.filter(user=self))
        return permissions

    def check_Teammanager(self):
        permisssions = self.get_Permisions()
        is_teammanager = False
        for permission in permisssions:
            if (permission.permission.name == 'Teammanager'):
                is_teammanager = True
        return is_teammanager

    def __str__(self):
        return self.firstname + ' ' + self.lastname


class Permissions(models.Model):
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name


class UserPermissions(models.Model):
    permission = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.firstname + ' ' + self.user.lastname + ' ' + self.permission.name


class Achievement(models.Model):
    name = models.CharField(max_length=20, blank=False, null=False)

    def __str__(self):
        return self.name


class PlayerAchievement(models.Model):
    achievement = models.ForeignKey(Achievement, blank=False, null=False, on_delete=models.CASCADE)
    player = models.ForeignKey(UserProfile, blank=False, null=False, on_delete=models.CASCADE)
    value = models.IntegerField(blank=False, null=False)
    game = models.ForeignKey(Gameinfo,null=False, blank=False, on_delete=models.CASCADE)
    def __str__(self):
        return self.achievement.name + ' ' + self.player.lastname + ' ' + self.player.firstname + ' ' + str(self.value)
