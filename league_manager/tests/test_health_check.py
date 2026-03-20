import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_check_endpoint(client):
    url = "/health/?format=json"
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert "Cache(alias='default')" in data
    assert "Database(alias='default')" in data
    assert "DNS(hostname=" in str(data.keys())
    assert "Storage(alias='default')" in data
    # Ensure Mail is NOT present
    assert not any("Mail" in key for key in data.keys())
