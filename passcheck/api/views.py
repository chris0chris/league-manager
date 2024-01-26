# importing framework views
from http import HTTPStatus

from django.contrib.auth.models import User
# importing knox for authentication
from knox.models import AuthToken
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.models import Gameinfo, Team, Gameday
from league_manager.utils.decorators import is_staff
# importing serializers
from passcheck.api.serializers import (PasscheckSerializer,
                                       PasscheckGamesListSerializer,
                                       PasscheckOfficialsAuthSerializer,
                                       PasscheckGamedayTeamsSerializer,
                                       PasscheckGamedaysListSerializer,
                                       PasscheckUsernamesSerializer)
# importing models
from passcheck.models import Playerlist
# importing services
from passcheck.service.passcheck_service import PasscheckService, PasscheckServicePlayers


# importing timezone for dates
# from django.utils import timezone


# declaring Views as APIViews from rest framework
class PasscheckListAPIView(ListAPIView):
    serializer_class = PasscheckSerializer

    # defining what objects will be returned by API from which model
    def get_queryset(self):
        return Playerlist.objects.all()


class PasscheckGamesListAPIView(ListAPIView):
    serializer_class = PasscheckGamesListSerializer

    def get_queryset(self, *args, **kwargs):
        return Gameinfo.objects.all()


class PasscheckOfficialsAuthAPIView(ListAPIView):
    serializer_class = PasscheckOfficialsAuthSerializer

    def get_queryset(self, *args, **kwargs):
        return AuthToken.objects.all()


class PasscheckGamedayTeamsAPIView(ListAPIView):
    serializer_class = PasscheckGamedayTeamsSerializer

    def get_queryset(self, *args, **kwargs):
        return Team.objects.all()


class PasscheckGamesAPIView(APIView):

    @is_staff
    def get(self, request, *args, **kwargs):
        is_staff = kwargs.get('is_staff')
        team_id = kwargs.get('team', request.user.username)
        passcheck = PasscheckService(is_staff=is_staff)
        return Response(passcheck.get_passcheck_data(team_id=team_id), status=HTTPStatus.OK)


class PasscheckRosterAPIView(APIView):
    @is_staff
    def get(self, request, *args, **kwargs):
        team = kwargs.get('team')
        is_staff = kwargs.get('is_staff')
        if team:
            passcheck = PasscheckService(is_staff)

            return Response(passcheck.get_roster_with_validation(team, None), status=HTTPStatus.OK)

    def put(self, request, *args, **kwargs):
        data = request.data
        team = kwargs.get('team')
        passcheckservice = PasscheckServicePlayers()
        passcheckservice.create_roster(team, data)
        return Response(status=HTTPStatus.OK)

class PasscheckGamedaysListAPIView(ListAPIView):
    serializer_class = PasscheckGamedaysListSerializer

    def get_queryset(self):
        # today = timezone.now().date()
        # return Gameday.objects.filter(date=today)
        return Gameday.objects.all()


class PasscheckUsernamesListAPIView(ListAPIView):
    serializer_class = PasscheckUsernamesSerializer

    def get_queryset(self):
        return User.objects.all()
