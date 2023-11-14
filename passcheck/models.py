from django.db import models
from django.db.models import QuerySet

# import other models
from gamedays.models import Gameday, Team


class Playerlist(models.Model):
    # content of model / columns of table
    team = models.ForeignKey(Team, on_delete=models.DO_NOTHING)
    firstname = models.CharField(max_length=50)
    lastname = models.CharField(max_length=50)
    trikotnumber = models.IntegerField()
    passnumber = models.IntegerField()
    sex = models.CharField(max_length=1)
    gamedays = models.ManyToManyField(Gameday)

    objects: QuerySet = models.Manager()

    def __str__(self):
        def fullname():
            return f"{self.firstname} {self.lastname}"
        return fullname()
