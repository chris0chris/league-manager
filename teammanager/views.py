from django.shortcuts import render
from django.http import HttpResponseRedirect
from django import forms
from teammanager import models
import pandas as pd
from pandas import DataFrame
import json





# Create your views here.

class Teamform(forms.ModelForm):
    class Meta:
        model = models.Team
        exclude = []


class Userform(forms.ModelForm):
    class Meta:
        model = models.UserProfile
        exclude = ['team', 'user']

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


def teamdetail(request, team_id):
    members = []

    team = models.Team.objects.get(pk=team_id)
    members = list(models.UserProfile.objects.filter(team=team))
    if request.user.is_authenticated:
        user = models.UserProfile.objects.get(user=request.user)
        if request.user.is_superuser or (team == user.team and user.check_Teammanager):
            allow_button_view = True
        else:
            allow_button_view = False
    else:
        allow_button_view = False
    for member in members:
        member.permissions = member.get_Permisions();
    return render(request, 'Teamdetail.html',
                  {'team': team, 'members': members, 'allow_button_view': allow_button_view})


def deleteteam(request, team_id):
    if request.user.is_superuser:
        team = models.Team.objects.get(pk=team_id)
        team.delete()
        return HttpResponseRedirect('/teammanager/')
    else:
        return HttpResponseRedirect('/login/')


def createuser(request, team_id):
    if request.user.is_authenticated is False:
        return HttpResponseRedirect('/login/')
    user = models.UserProfile.objects.get(user=request.user)

    if request.user.is_superuser | ((user.team.id == team_id) & user.check_Teammanager()):
        if request.method == 'POST':
            form = Userform(request.POST, request.FILES)
            if form.is_valid():
                obj = form.save(commit=False)
                team = models.Team.objects.get(pk=team_id)
                obj.team = team
                obj.save()
                return HttpResponseRedirect('/teammanager/team/' + str(team_id))
            else:
                form = Userform()
        else:
            form = Userform()
        return render(request, 'createUser.html', {'form': form})
    else:
        return HttpResponseRedirect('/login/')


def editteam(request, team_id):
    if request.user.is_authenticated is False:
        return HttpResponseRedirect('/login/')

    team = models.Team.objects.get(pk=team_id)
    user = models.UserProfile.objects.get(user=request.user)

    if request.user.is_superuser | ((user.team == team) & user.check_Teammanager()):
        if request.method == 'POST':
            form = Teamform(request.POST, instance=team)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect('/teammanager/')
            else:
                form = Teamform(instance=team)
        else:
            form = Teamform(instance=team)
        return render(request, 'editTeam.html', {'form': form, 'team': team})
    else:
        return HttpResponseRedirect('/login/')


def edituser(request, user_id):
    if request.user.is_authenticated is False:
        return HttpResponseRedirect('/login/')

    user_editing = models.UserProfile.objects.get(user=request.user)
    user_is_being_edited = models.UserProfile.objects.get(pk=user_id)

    if request.user.is_superuser | (
            (user_editing.team == user_is_being_edited.team) & user_editing.check_Teammanager()):
        if request.method == 'POST':
            form = Userform(request.POST, instance=user_is_being_edited)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect('/teammanager/team/' + str(user_is_being_edited.team_id))
            else:
                form = Userform(instance=user_is_being_edited)
        else:
            form = Userform(instance=user_is_being_edited)
        return render(request, 'editUser.html', {'form': form, 'user': user_is_being_edited})
    else:
        return HttpResponseRedirect('/login/')


def deleteuser(request, user_id):
    if request.user.is_authenticated is False:
        return HttpResponseRedirect('/login/')

    user_deleting = models.UserProfile.objects.get(user=request.user)
    user_is_being_deleted = models.UserProfile.objects.get(pk=user_id)

    if request.user.is_superuser | (
            (user_deleting.team == user_is_being_deleted.team) & user_deleting.check_Teammanager()):
        user_is_being_deleted.delete()
    return HttpResponseRedirect('/teammanager/team/' + str(user_is_being_deleted.team_id))


def playerdetail(request, player_id):
    achievements={}
    gamedays={'items':{}}
    player = models.UserProfile.objects.get(pk=player_id)
    playerAchievements = pd.DataFrame(models.PlayerAchievement.objects.filter(player=player).values())
    Achievements=pd.DataFrame(models.Achievement.objects.all().values())
    merge=pd.merge( Achievements,playerAchievements, left_on='id', right_on='achievement_id')
    merge.drop(['id_x','id_y','player_id','achievement_id'],axis=1,inplace=True)
    tmp=merge.groupby(['name','game_id']).sum()
    return render(request, 'playerDetail.html',
                  {'player': player,'gamedays':gamedays,'achievments':achievements})

def showachievements(request):
    if request.user.is_authenticated is False or request.user.is_superuser is False:
        return HttpResponseRedirect('/login/')
    achievements=pd.DataFrame(models.Achievement.objects.all().values()).to_json(orient="split")
    achievements=json.loads(achievements)
    return render(request, 'showAchievements.html',{'achievements':achievements})

