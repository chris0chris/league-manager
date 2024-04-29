from unittest.mock import Mock, patch

import pytest

from passcheck.service.request_api_service import RequestApiService


class TestRequestApiService:

    @patch('requests.get')
    def test_get_equipment_approval_url(self, mock_get):
        expected_data = {'url': 'https://example.com', 'status': 200}
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = expected_data
        mock_get.return_value = mock_response

        url = RequestApiService.get_equipment_approval_url(23)

        assert url == expected_data['url']

    @patch('requests.get')
    def test_get_equipment_approval_url_team_not_found(self, mock_get):
        team_id = 23
        expected_error_message = f'No Team found for ID: ${team_id}'
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'error': expected_error_message, 'status': 404}
        mock_get.return_value = mock_response

        with pytest.raises(ValueError) as excinfo:
            RequestApiService.get_equipment_approval_url(team_id)

        assert str(excinfo.value) == expected_error_message

    @patch('requests.get')
    def test_get_equipment_approval_url_permission_failed(self, mock_get):
        team_id = 23
        expected_error_message = f'Not allowed: ${team_id}'
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'error': expected_error_message, 'status': 403}
        mock_get.return_value = mock_response

        with pytest.raises(PermissionError) as excinfo:
            RequestApiService.get_equipment_approval_url(team_id)

        assert str(excinfo.value) == expected_error_message
