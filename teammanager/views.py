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
    if request.user.is_superuser:
        if request.method == "POST":
            form = Teamform(request.POST, request.FILES)
            if form.is_valid():
                new_Team = form.save()
                return HttpResponseRedirect('/teammanager/')
            else:
                form = Teamform()
        else:
            form = Teamform()
        return render(request, 'createTeam.html', {'form': form})
    else:
        return HttpResponseRedirect('/login/')


def showteams(request):
    all_teams = models.Team.objects.all()
    return render(request, 'showTeams.html', {'teams': all_teams})

def teamdetail(request,team_id):
    members = []
    team = models.Team.objects.get(pk=team_id)
    members = list(models.UserProfile.objects.filter(team=team))
    return render(request, 'Teamdetail.html', {'team':team,'members':members})

def deleteteam(request,team_id):
    if request.user.is_superuser:
        team = models.Team.objects.get(pk=team_id)
        team.delete()
        return HttpResponseRedirect('/teammanager/')
    else:
        return HttpResponseRedirect('/login/')

def editteam(request,team_id):

    if request.user.is_authenticated is False:
        return HttpResponseRedirect('/login/')

    team = models.Team.objects.get(pk=team_id)
    user = models.UserProfile.objects.get(user=request.user)
    permissions = list(models.UserPermissions.objects.filter(user=user))
    isTeammanager = False

    for i in permissions:
        if i.permission.name == 'Teammanager':
            isTeammanager=True

    if request.user.is_superuser|((user.team == team) & isTeammanager):
        if request.method =='POST':
            form = Teamform(request.POST,instance=team)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect('/teammanager/')
            else:
                form = Teamform(instance=team)
        else:
            form = Teamform(instance=team)
        return render(request,'editTeam.html',{'form':form,'team':team})
    else:
        return HttpResponseRedirect('/login/')

