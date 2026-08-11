from django.contrib import admin
from django import forms
from django.core.cache import cache
from django.shortcuts import redirect
from django.urls import path

from league_manager.constants import MAINTENANCE_CONFIG_CACHE_KEY
from league_manager.models import SiteConfiguration


class SiteConfigurationForm(forms.ModelForm):
    class Meta:
        model = SiteConfiguration
        exclude = ("maintenance_mode",)
        widgets = {
            "maintenance_scope": forms.RadioSelect,
        }

    class Media:
        js = ("admin/js/vendor/jquery/jquery.min.js",)

        css = {"all": []}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["maintenance_pages"].widget.attrs.update(
            {
                "rows": 6,
                "placeholder": 'e.g. ["^/api/.*", "^/dashboard/.*"]',
            }
        )


@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    form = SiteConfigurationForm
    list_display = ("scope_display",)
    fieldsets = (
        (
            None,
            {
                "fields": ("maintenance_scope",),
                "description": "Choose how the site handles maintenance. <strong>Off</strong> disables maintenance entirely. <strong>Full App</strong> replaces every page with a maintenance screen. <strong>Writes Only</strong> blocks POST/PUT/PATCH/DELETE requests while allowing read access. <strong>Custom</strong> lets you define specific URL patterns to redirect.",
            },
        ),
        (
            "Custom Page Patterns",
            {
                "classes": ("collapse",),
                "fields": ("maintenance_pages",),
                "description": "Only used when scope is set to &quot;Custom&quot;. List of regex patterns for URL paths that should redirect to the maintenance screen.",
            },
        ),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "cycle-scope/",
                self.admin_site.admin_view(self.cycle_scope),
                name="cycle-scope",
            ),
        ]
        return custom_urls + urls

    def scope_display(self, obj):
        labels = {
            "off": "LIVE",
            "full": "FULL MAINTENANCE",
            "writes_only": "WRITES BLOCKED",
            "custom": "CUSTOM PATTERNS",
        }
        label = labels.get(obj.maintenance_scope, obj.maintenance_scope)
        return f"[{label}]"

    scope_display.short_description = "Status"

    def cycle_scope(self, request):
        config, _ = SiteConfiguration.objects.get_or_create(id=1)
        order = ["off", "writes_only", "full", "custom"]
        current = (
            order.index(config.maintenance_scope)
            if config.maintenance_scope in order
            else 0
        )
        config.maintenance_scope = order[(current + 1) % len(order)]
        config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
        self.message_user(
            request,
            f"Maintenance scope changed to: {config.maintenance_scope}",
        )
        return redirect("..")

    def has_add_permission(self, request):
        return SiteConfiguration.objects.count() == 0

    def has_delete_permission(self, request, obj=None):
        return False
