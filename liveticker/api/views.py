from rest_framework.response import Response
from rest_framework.views import APIView

from liveticker.service.liveticker_service import LivetickerService


class LivetickerAPIView(APIView):
    def get(self, request):
        league = request.query_params.get('league')
        league = [] if league is None or league == '' else league.split(',')
        games_with_all_ticks = self._parse_input(request.query_params.get('getAllTicksFor'))
        gameday_ids = self._parse_input(request.query_params.get('gameday'))
        liveticker_service = LivetickerService(league, games_with_all_ticks, gameday_ids)

        return Response(liveticker_service.get_liveticker_as_json())

    # noinspection PyMethodMayBeStatic
    def _parse_input(self, input_value):
        if input_value is None:
            return []
        numbers_as_array = input_value.split(',')
        all_numbers_as_int = []
        for current_number in numbers_as_array:
            try:
                all_numbers_as_int += [int(current_number)]
            except ValueError:
                continue
        return all_numbers_as_int
