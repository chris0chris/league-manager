from http import HTTPStatus

from rest_framework import permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from officials.api.serializers import OfficialTeamListScorecardSerializer
from officials.models import Official
from officials.service.official_service import OfficialService


class OfficialsTeamListAPIView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    # noinspection PyMethodMayBeStatic
    def get(self, request, **kwargs):
        team_id = kwargs.get('pk')
        official_service = OfficialService()
        return Response(official_service.get_team_officials_by_team_id(team_id), status=HTTPStatus.OK)


class OfficialsSearchName(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    # noinspection PyMethodMayBeStatic
    def get(self, request: Request, **kwargs):
        name_param = request.query_params.get('name')
        team_id = kwargs.get('pk')
        if name_param is None:
            raise ValidationError(detail='You need to specify a \'name\' param to search for official')
        name = name_param.split()
        if len(name) < 2:
            raise ValidationError(
                detail='Bitte Vor- und Nachname getrennt durch Leerzeichen eingeben und Suche erneut starten')
        if len(name[0]) < 3:
            raise ValidationError('Vorname muss mindestens 3 Zeichen haben')
        officials = Official.objects.filter(first_name__istartswith=name[0], last_name__istartswith=name[-1]).exclude(
            team=team_id).order_by('first_name', 'last_name').values(
            *OfficialTeamListScorecardSerializer.ALL_FIELD_VALUES
        )
        if not officials.exists():
            raise NotFound(f'Es wurden keine Offiziellen gefunden für: {" ".join(name)}')
        serializer = OfficialTeamListScorecardSerializer(instance=officials, many=True)
        return Response(serializer.data, status=HTTPStatus.OK)
