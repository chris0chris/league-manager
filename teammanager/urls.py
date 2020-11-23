from django.urls import path
from teammanager.views import createteam,showteams,teamdetail,deleteteam



urlpatterns = [
   path('addteam/', createteam),
   path('', showteams),
   path('team/<int:team_id>',teamdetail),
   path('deleteteam/<int:team_id>',deleteteam,name='deleteteam')
]
