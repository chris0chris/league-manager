import pytest
from django.urls import reverse


def test_health_check_endpoint(client):
    """Test that health check endpoint returns 200 and healthy status."""
    url = "/health/"
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
