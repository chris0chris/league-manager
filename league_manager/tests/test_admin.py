from unittest.mock import MagicMock, patch

from django.contrib.admin.sites import AdminSite
from django.contrib.messages import get_messages
from django.contrib.messages.middleware import MessageMiddleware
from django.core.cache import cache
from django.test import RequestFactory, TestCase, override_settings

from league_manager.admin import SiteConfigurationAdmin, SiteConfigurationForm
from league_manager.constants import MAINTENANCE_CONFIG_CACHE_KEY
from league_manager.models import SiteConfiguration


def _mk_admin_request():
    request = RequestFactory().get("/admin/")
    request.user = MagicMock(is_staff=True)
    request._messages = MagicMock()
    return request


class TestSiteConfigurationModel(TestCase):
    def test_str_off(self):
        config = SiteConfiguration(maintenance_scope="off")
        self.assertEqual(str(config), "Maintenance: OFF")

    def test_str_full(self):
        config = SiteConfiguration(maintenance_scope="full")
        self.assertEqual(str(config), "Maintenance: FULL")

    def test_str_writes_only(self):
        config = SiteConfiguration(maintenance_scope="writes_only")
        self.assertEqual(str(config), "Maintenance: WRITES")

    def test_str_custom(self):
        config = SiteConfiguration(maintenance_scope="custom")
        self.assertEqual(str(config), "Maintenance: CUSTOM")

    def test_save_enforces_singleton(self):
        config, _ = SiteConfiguration.objects.get_or_create(id=1)
        self.assertEqual(config.pk, 1)

        # Calling save again must not create a second row
        config2 = SiteConfiguration()
        config2.save()
        self.assertEqual(config2.pk, 1)
        self.assertEqual(SiteConfiguration.objects.count(), 1)


class TestSiteConfigurationForm(TestCase):
    def _config(self):
        cfg, _ = SiteConfiguration.objects.get_or_create(id=1)
        return cfg

    def test_form_instantiates_with_config(self):
        config = self._config()
        form = SiteConfigurationForm(instance=config)
        self.assertIn("maintenance_scope", form.fields)
        self.assertIn("maintenance_pages", form.fields)

    def test_form_excludes_maintenance_mode(self):
        config = self._config()
        form = SiteConfigurationForm(instance=config)
        self.assertNotIn("maintenance_mode", form.fields)

    def test_form_sets_maintenance_pages_attrs(self):
        config = self._config()
        form = SiteConfigurationForm(instance=config)
        widget = form.fields["maintenance_pages"].widget
        self.assertEqual(widget.attrs["rows"], 6)
        self.assertEqual(
            widget.attrs["placeholder"], 'e.g. ["^/api/.*", "^/dashboard/.*"]'
        )


class TestSiteConfigurationAdmin(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = SiteConfigurationAdmin(SiteConfiguration, self.site)
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    def test_has_add_permission_reflects_count(self):
        """has_add_permission returns True only when no SiteConfiguration exists."""
        request = _mk_admin_request()

        # Delete any existing config so we can test the "empty" case
        SiteConfiguration.objects.all().delete()
        self.assertTrue(self.admin.has_add_permission(request))

        # After creating one, add must be False
        SiteConfiguration.objects.get_or_create(id=1)
        self.assertFalse(self.admin.has_add_permission(request))

    def test_has_delete_permission_always_false(self):
        request = _mk_admin_request()
        self.assertFalse(self.admin.has_delete_permission(request, None))
        self.assertFalse(self.admin.has_delete_permission(request))

    def test_scope_display_all_values(self):
        config = SiteConfiguration(maintenance_scope="off")
        self.assertEqual(self.admin.scope_display(config), "[LIVE]")

        config.maintenance_scope = "full"
        self.assertEqual(self.admin.scope_display(config), "[FULL MAINTENANCE]")

        config.maintenance_scope = "writes_only"
        self.assertEqual(self.admin.scope_display(config), "[WRITES BLOCKED]")

        config.maintenance_scope = "custom"
        self.assertEqual(self.admin.scope_display(config), "[CUSTOM PATTERNS]")

    def test_cycle_scope_rotates(self):
        config, _ = SiteConfiguration.objects.get_or_create(id=1)
        request = _mk_admin_request()

        expected = ["writes_only", "full", "custom", "off"]
        for target in expected:
            response = self.admin.cycle_scope(request)
            config.refresh_from_db()
            self.assertEqual(config.maintenance_scope, target)
            self.assertEqual(response.status_code, 302)
            self.assertEqual(response.url, "..")

    def test_cycle_scope_clears_cache(self):
        cache.set(MAINTENANCE_CONFIG_CACHE_KEY, {"scope": "test"})
        config, _ = SiteConfiguration.objects.get_or_create(id=1)
        request = _mk_admin_request()

        self.admin.cycle_scope(request)
        self.assertIsNone(cache.get(MAINTENANCE_CONFIG_CACHE_KEY))
