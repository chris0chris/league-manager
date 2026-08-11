import pytest
from django.core.cache import cache

from league_manager.constants import (
    MAINTENANCE_CONFIG_CACHE_KEY,
    MAINTENANCE_SCOPE_OFF,
    MAINTENANCE_SCOPE_FULL,
    MAINTENANCE_SCOPE_WRITES_ONLY,
)
from league_manager.models import SiteConfiguration


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear caches before each test."""
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
    SiteConfiguration.objects.all().delete()
    yield
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
    SiteConfiguration.objects.all().delete()


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
    config.maintenance_scope = MAINTENANCE_SCOPE_OFF
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json()["maintenance_mode"] is False


@pytest.mark.django_db
def test_health_check_reports_maintenance_mode_on(client):
    config, _ = SiteConfiguration.objects.get_or_create(id=1)
    config.maintenance_scope = MAINTENANCE_SCOPE_FULL
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json()["maintenance_mode"] is True

    # writes_only also counts as maintenance mode being active
    config.maintenance_scope = MAINTENANCE_SCOPE_WRITES_ONLY
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")
    assert response.json()["maintenance_mode"] is True

    config.maintenance_scope = MAINTENANCE_SCOPE_OFF
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)


@pytest.mark.django_db
def test_health_check_reports_maintenance_mode_off_when_scope_off(client):
    """Explicit off scope reports maintenance_mode=False."""
    config, _ = SiteConfiguration.objects.get_or_create(id=1)
    config.maintenance_scope = MAINTENANCE_SCOPE_OFF
    config.save()
    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    response = client.get("/health/")
    assert response.json()["maintenance_mode"] is False


@pytest.mark.django_db
def test_health_check_from_middleware_cache(client):
    """When middleware cache is populated, health check uses scope key."""
    cache.set(MAINTENANCE_CONFIG_CACHE_KEY, {"scope": "full", "patterns": []})

    response = client.get("/health/")
    assert response.json()["maintenance_mode"] is True

    cache.set(MAINTENANCE_CONFIG_CACHE_KEY, {"scope": "off", "patterns": []})

    response = client.get("/health/")
    assert response.json()["maintenance_mode"] is False

    cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
