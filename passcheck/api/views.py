# importing framework views
from http import HTTPStatus

from rest_framework.generics import ListAPIView
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView

# importing serializers
from passcheck.api.serializers import (PasscheckSerializer,
PasscheckGamesListSerializer,
PasscheckOfficialsAuthSerializer,
PasscheckGamedayTeamsSerializer,
PasscheckGamedaysListSerializer,
PasscheckUsernamesSerializer)

# importing models
from passcheck.models import Playerlist
from gamedays.models import Gameinfo, Team, Gameday

# importing services
from passcheck.service.passcheck_service import PasscheckService, PasscheckServicePlayers

# importing knox for authentication
from knox.models import AuthToken

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

    def get(self, *args, **kwargs):
        token = kwargs.get('token')
        if token:
            passcheck = PasscheckService()
            return Response(passcheck.get_passcheck_data(token=token), status=HTTPStatus.OK)


class PasscheckRosterAPIView(APIView):
    def get(self, *args, **kwargs):
        team = kwargs.get('team')
        if team:
            playerlist = PasscheckServicePlayers()
            return Response(playerlist.get_playerlist_data(team=team), status=HTTPStatus.OK)

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
