from django.urls import path
from teammanager.views import createteam,showteams



urlpatterns = [
   path('addTeam/', createteam),
   path('', showteams),
]
