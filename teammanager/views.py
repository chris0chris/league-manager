import csv
import io
import json
from datetime import datetime

import pandas as pd
from django import forms
from django.contrib import messages
from django.shortcuts import render, redirect

import gamedays.models


# Create your views here.

class Teamform(forms.ModelForm):
    class Meta:
        model = gamedays.models.Team
        exclude = []


class Userform(forms.ModelForm):
    class Meta:
        model = gamedays.models.UserProfile
        exclude = ['team', 'user']




def createteam(request):
    if request.user.is_superuser:
        if request.method == "POST":
            form = Teamform(request.POST, request.FILES)
            if form.is_valid():
                new_Team = form.save()
                return redirect(showteams)
            else:
                form = Teamform()
        else:
            form = Teamform()
        return render(request, 'createTeam.html', {'form': form})
    else:
        return redirect('login')


def showteams(request):
    all_teams = gamedays.models.Team.objects.all()
    return render(request, 'showTeams.html', {'teams': all_teams})


def teamdetail(request, team_id):
    members = []

    team = gamedays.models.Team.objects.get(pk=team_id)
    members = list(gamedays.models.UserProfile.objects.filter(team=team))
    if request.user.is_authenticated:
        if request.user.is_superuser:
            allow_button_view = True
        else:
            user = gamedays.models.UserProfile.objects.get(user=request.user)
            if team == user.team and user.check_teammanager:
                allow_button_view = True
            else:
                allow_button_view = False
    else:
        allow_button_view = False
    for member in members:
        member.permissions = member.get_permisions();
    return render(request, 'Teamdetail.html',
                  {'team': team, 'members': members, 'allow_button_view': allow_button_view})


def deleteteam(request, team_id):
    if request.user.is_superuser:
        team = gamedays.models.Team.objects.get(pk=team_id)
        team.delete()
        return redirect(showteams)
    else:
        return redirect('login')


def createuser(request, team_id):
    authored = False
    if request.user.is_authenticated is False:
        return redirect('login')

    if request.user.is_superuser:
        authored = True
    else:
        user = gamedays.models.UserProfile.objects.get(user=request.user)
        if ((user.team.id == team_id) & user.check_teammanager()):
            authored = True
    if authored:
        if request.method == 'POST':
            form = Userform(request.POST, request.FILES)
            if form.is_valid():
                obj = form.save(commit=False)
                team = gamedays.models.Team.objects.get(pk=team_id)
                obj.team = team
                obj.save()
                return redirect(teamdetail,team_id=team_id)
            else:
                form = Userform()
        else:
            form = Userform()
        return render(request, 'createUser.html', {'form': form})
    else:
        return redirect('login')


def editteam(request, team_id):
    authored = False
    if request.user.is_authenticated is False:
        return redirect('login')

    team = gamedays.models.Team.objects.get(pk=team_id)

    if request.user.is_superuser:
        authored = True
    else:
        user = gamedays.models.UserProfile.objects.get(user=request.user)
        if ((user.team == team) & user.check_teammanager()):
            authored = True
    if authored:
        if request.method == 'POST':
            form = Teamform(request.POST, instance=team)
            if form.is_valid():
                form.save()
                return redirect(showteams)
            else:
                form = Teamform(instance=team)
        else:
            form = Teamform(instance=team)
        return render(request, 'editTeam.html', {'form': form, 'team': team})
    else:
        return redirect('login')


def edituser(request, user_id):
    if request.user.is_authenticated is False:
        return redirect('login')

    user_editing = gamedays.models.UserProfile.objects.get(user=request.user)
    user_is_being_edited = gamedays.models.UserProfile.objects.get(pk=user_id)

    if request.user.is_superuser | (
            (user_editing.team == user_is_being_edited.team) & user_editing.check_teammanager()):
        if request.method == 'POST':
            form = Userform(request.POST, instance=user_is_being_edited)
            if form.is_valid():
                form.save()
                return redirect(teamdetail, team_id=user_is_being_edited.team_id)
            else:
                form = Userform(instance=user_is_being_edited)
        else:
            form = Userform(instance=user_is_being_edited)
        return render(request, 'editUser.html', {'form': form, 'user': user_is_being_edited})
    else:
        return redirect('login')


def deleteuser(request, user_id):
    if request.user.is_authenticated is False:
        return redirect('login')

    user_deleting = gamedays.models.UserProfile.objects.get(user=request.user)
    user_is_being_deleted = gamedays.models.UserProfile.objects.get(pk=user_id)

    if request.user.is_superuser | (
            (user_deleting.team == user_is_being_deleted.team) & user_deleting.check_teammanager()):
        user_is_being_deleted.delete()
    return redirect(teamdetail, team_id=user_is_being_deleted.team_id)


def playerdetail(request, player_id):
    achievements = {}
    gamedays = {'items': {}}
    player = gamedays.models.UserProfile.objects.get(pk=player_id)
    playerAchievements = pd.DataFrame(gamedays.models.PlayerAchievement.objects.filter(player=player).values())
    Achievements = pd.DataFrame(gamedays.models.Achievement.objects.all().values())
    if not playerAchievements.empty:
        merge = pd.merge(Achievements, playerAchievements, left_on='id', right_on='achievement_id')
        merge.drop(['id_x', 'id_y', 'player_id', 'achievement_id'], axis=1, inplace=True)
        game_dict = dict()

        tmp = []

        for index, item in Achievements.iterrows():
            tmp.append(item['name'])

        for a in merge.iterrows():
            if a[1].game_id not in game_dict.keys():
                game_dict[a[1].game_id] = {key: 0 for key in tmp}
                game_dict[a[1].game_id]['game']=a[1].game_id
            game_dict[a[1].game_id][a[1]['name']] += a[1].value

        result = []
        for x in game_dict.keys():
            result.append(game_dict[x])
    else:
        result={}
    return render(request, 'playerDetail.html',
                  {'player': player, 'achievements': result})

def uploadplayerscsv(request,team_id):
    if request.user.is_authenticated is False or request.user.is_superuser is False:
        return redirect('login')
    if request.method == "GET":
        return render(request,'uploadplayerscsv.html')

    team = list(gamedays.models.Team.objects.filter(pk=team_id))
    csv_file = request.FILES['file']

    if not csv_file.name.endswith('.csv') and not csv_file.name.endswith('.CSV'):
        messages.error(request, 'THIS IS NOT A CSV FILE')
        return render(request, 'uploadplayerscsv.html')
    elif not team:
        messages.error(request, 'TEAM not Found')
        return render(request, 'uploadplayerscsv.html')

    team = gamedays.models.Team.objects.get(pk=team_id)


    data_set = csv_file.read().decode('ANSI')

    io_string = io.StringIO(data_set)
    next(io_string)
    for column in csv.reader(io_string, delimiter=';', quotechar="|"):
        created = gamedays.models.UserProfile.objects.update_or_create(
            team=team,
            firstname=column[0],
            lastname=column[1],
            playernumber=column[2],
            position=column[3],
            birth_date=datetime.strptime(column[4], '%d.%m.%Y')
        )
    return redirect(teamdetail,team_id=team_id)


def showachievements(request):
    if request.user.is_authenticated is False or request.user.is_superuser is False:
        return redirect('login')
    achievements = pd.DataFrame(gamedays.models.Achievement.objects.all().values()).to_json(orient="split")
    achievements = json.loads(achievements)
    return render(request, 'showAchievements.html',{'achievements':achievements})
