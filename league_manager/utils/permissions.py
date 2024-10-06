import datetime

from django.conf import settings
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from gamedays.models import Gameday, Gameinfo


class IsStaffOrTeamParticipatingInGameday(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True

        date = datetime.datetime.today()
        if settings.DEBUG:
            date = settings.DEBUG_DATE

        gamedays = Gameday.objects.filter(date=date)
        today_games_for_user = Gameinfo.objects.filter(gameday__in=gamedays, officials__name=request.user.username)
        if today_games_for_user.exists():
            return True
        raise PermissionDenied("Zugriff auf Spieltag nicht erlaubt, da ihr als Team nicht am Spieltag teilnehmt.")