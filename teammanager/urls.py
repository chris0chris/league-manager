from django.urls import path
from teammanager.views import createteam, showteams, teamdetail, deleteteam, editteam, createuser, edituser, deleteuser, playerdetail,showachievements,uploadplayerscsv

urlpatterns = [
    path('addteam/', createteam, name='addteam'),
    path('', showteams, name='teammanager'),
    path('team/<int:team_id>', teamdetail, name='teamdetail'),
    path('deleteteam/<int:team_id>', deleteteam, name='deleteteam'),
    path('editteam/<int:team_id>', editteam, name='editteam'),
    path('createuser/<int:team_id>', createuser, name='createuser'),
    path('edituser/<int:user_id>', edituser, name='edituser'),
    path('deleteuser/<int:user_id>', deleteuser, name='deleteuser'),
    path('playerdetail/<int:player_id>', playerdetail, name='playerdetail'),
    path('achievements/',showachievements, name='showachievements'),
    path('uploadplayers/<int:team_id>',uploadplayerscsv, name='uploadplayerscsv')
]
