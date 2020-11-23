from django.shortcuts import render
from django.http import HttpResponseRedirect
from django import forms
from teammanager import models


# Create your views here.

class Teamform(forms.ModelForm):
    class Meta:
        model = models.Team
        exclude = []


def createteam(request):
    if request.method == "POST":
        form = Teamform(request.POST, request.FILES)
        if form.is_valid():
            new_Team = form.save()
            return HttpResponseRedirect('/')
        else:
            form = Teamform()
    else:
        form = Teamform()
    return render(request, 'createTeam.html', {'form': form})


def showteams(request):
    all_teams = models.Team.objects.all()
    return render(request, 'showTeams.html', {'teams': all_teams})
