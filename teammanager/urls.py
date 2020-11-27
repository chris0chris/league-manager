from django.urls import path
from teammanager.views import createteam,showteams,teamdetail,deleteteam,editteam,createuser



urlpatterns = [
   path('addteam/', createteam),
   path('', showteams,name='teammanager'),
   path('team/<int:team_id>',teamdetail),
   path('deleteteam/<int:team_id>',deleteteam,name='deleteteam'),
   path('editteam/<int:team_id>',editteam,name='editteam'),
   path('createuser/<int:team_id>',createuser,name='createuser')
]
