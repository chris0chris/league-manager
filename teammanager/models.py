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
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True)
    avatar = models.ImageField('Avatar', upload_to="media/teammanager/avatars", blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE,null=True)
    firstname = models.CharField(max_length=20,null=True)
    lastname = models.CharField(max_length=20,null=True)

    def get_Permisions(self):
        permissions = list(UserPermissions.objects.filter(user=self))
        return permissions

    def check_Teammanager(self):
        permisssions=self.get_Permisions()
        is_teammanager=False
        for permission in permisssions:
            if(permission.permission.name=='Teammanager'):
                is_teammanager=True
        return is_teammanager


class Permissions(models.Model):
    name = models.CharField(max_length=20)


class UserPermissions(models.Model):
    permission = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
