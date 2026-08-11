import pytest
from django.core.cache import cache

from league_manager.constants import MAINTENANCE_CONFIG_CACHE_KEY
from league_manager.models import SiteConfiguration


@pytest.mark.django_db
def test_health_check_endpoint(client):
    """Test that health check endpoint returns 200 and healthy status."""
    url = "/health/"
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.django_db
def test_health_check_reports_maintenance_mode_off_by_default(client):
    config, _ = SiteConfiguration.objects.get_or_create(id=1)
    config.maintenance_mode = False
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json()["maintenance_mode"] is False


@pytest.mark.django_db
def test_health_check_reports_maintenance_mode_on(client):
    config, _ = SiteConfiguration.objects.get_or_create(id=1)
    config.maintenance_mode = True
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json()["maintenance_mode"] is True

    config.maintenance_mode = False
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
