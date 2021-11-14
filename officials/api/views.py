from http import HTTPStatus

from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from officials.api.serializers import OfficialSerializer
from officials.models import Official


class OfficialsTeamListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        team_id = kwargs.get('pk')
        try:
            officials = Official.objects.filter(team_id=team_id)
            serializer = OfficialSerializer(officials, many=True)
            return Response(serializer.data, status=HTTPStatus.OK)
        except Official.DoesNotExist:
            raise NotFound(detail=f'No officials found for gameId {team_id}')
