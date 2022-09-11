from http import HTTPStatus

from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from officials.api.serializers import OfficialSerializer
from officials.models import Official


class OfficialsTeamListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        team_id = kwargs.get('pk')
        officials = Official.objects.filter(team_id=team_id).order_by('first_name', 'last_name')
        serializer = OfficialSerializer(officials, many=True)
        return Response(serializer.data, status=HTTPStatus.OK)


class OfficialsSearchName(APIView):
    def get(self, request: Request, *args, **kwargs):
        name_param = request.query_params.get('name')
        team_id = kwargs.get('pk')
        if name_param is None:
            raise NotFound(detail=f'You need to specify a \'name\' param to search for official')
        name = name_param.split()
        if len(name) < 2:
            raise NotFound(
                detail=f'Bitte Vor- und Nachname getrennt durch Leerzeichen eingeben und Suche erneut starten')
        if len(name[0]) < 3 or len(name[1]) < 3:
            raise ValidationError('Vor- UND Nachname muss mindestens 3 Zeichen haben', HTTPStatus.BAD_REQUEST)
        officials = Official.objects.filter(first_name__icontains=name[0], last_name__icontains=name[-1]).exclude(
            team=team_id).order_by('first_name', 'last_name')
        serializer = OfficialSerializer(officials, many=True)
        return Response(serializer.data, status=HTTPStatus.OK)
