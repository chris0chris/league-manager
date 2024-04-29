import requests
from django.conf import settings


class RequestApiService:

    @staticmethod
    def get_equipment_approval_url(team_id: int):
        url = settings.EQUIPMENT_APPROVAL_ENDPOINT
        headers = {'Content-Type': 'application/json'}

        try:
            response = requests.get(url, headers=headers,
                                    params={'teamId': team_id, 'token': settings.EQUIPMENT_APPROVAL_TOKEN})
            response.raise_for_status()
            data = response.json()
            if data.get('status') != 200:
                if data.get('status') == 403:
                    raise PermissionError(data['error'])
                if data.get('status') == 404:
                    raise ValueError(data['error'])
            return data['url']
        except requests.exceptions.RequestException as e:
            print(f"Error accessing JSON endpoint: {e}")
            return None
