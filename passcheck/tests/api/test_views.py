from unittest.mock import patch

from django.urls import reverse
from rest_framework import permissions
from rest_framework.test import APIRequestFactory
from rest_framework.views import status

from passcheck.api.urls import API_PASSCHECK_EQUIPMENT_APPROVAL_URL
from passcheck.api.views import PasscheckApprovalUrlAPIView


class TestPasscheckApprovalUrl:
    def setup_method(self, method):
        self.factory = APIRequestFactory()

    def test_approval_url_needs_authentication(self):
        team_id = 5
        url = reverse(API_PASSCHECK_EQUIPMENT_APPROVAL_URL, kwargs={"team_id": team_id})
        request = self.factory.get(url)

        response = PasscheckApprovalUrlAPIView.as_view()(request)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch(
        "passcheck.service.request_api_service.RequestApiService.get_equipment_approval_url"
    )
    def test_get_success_url(self, mock_get_equipment_approval_url):
        expected_data = {"url": "https://approval.endpoint"}
        mock_get_equipment_approval_url.return_value = expected_data
        team_id = 5
        url = reverse(API_PASSCHECK_EQUIPMENT_APPROVAL_URL, kwargs={"team_id": team_id})
        request = self.factory.get(url)
        PasscheckApprovalUrlAPIView.permission_classes = [permissions.AllowAny]
        response = PasscheckApprovalUrlAPIView.as_view()(request)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected_data

    @patch(
        "passcheck.service.request_api_service.RequestApiService.get_equipment_approval_url"
    )
    def test_team_has_no_approval_url(self, mock_get_equipment_approval_url):
        error_message = "Keine Equipment-Genehmigung gefunden für das Team: None"
        mock_get_equipment_approval_url.side_effect = ValueError(error_message)
        url = reverse(API_PASSCHECK_EQUIPMENT_APPROVAL_URL, kwargs={"team_id": 7})
        request = self.factory.get(url)
        PasscheckApprovalUrlAPIView.permission_classes = [permissions.AllowAny]
        response = PasscheckApprovalUrlAPIView.as_view()(request)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert str(response.data.get("detail")) == error_message
