from django.db import models


class SiteConfiguration(models.Model):
    maintenance_mode = models.BooleanField(default=False)
    maintenance_scope = models.CharField(
        max_length=20,
        choices=[
            ("off", "Off"),
            ("full", "Full App (replace with maintenance screen)"),
            ("writes_only", "Writes Only (block POST/PUT/PATCH/DELETE)"),
            ("custom", "Custom (use page patterns below)"),
        ],
        default="off",
    )
    maintenance_pages = models.JSONField(
        default=list,
        help_text='List of regex strings (only used when scope is "Custom"), e.g., ["^/api/.*", "^/dashboard/.*"]',
    )

    def save(self, *args, **kwargs):
        if self.__class__.objects.count():
            self.pk = self.__class__.objects.first().pk
        super().save(*args, **kwargs)

    def __str__(self):
        scope_labels = {
            "off": "OFF",
            "full": "FULL",
            "writes_only": "WRITES",
            "custom": "CUSTOM",
        }
        scope = scope_labels.get(self.maintenance_scope, self.maintenance_scope)
        return f"Maintenance: {scope}"
