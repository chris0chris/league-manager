from django.db import models


class SiteConfiguration(models.Model):
    maintenance_mode = models.BooleanField(default=False)
    maintenance_pages = models.JSONField(
        default=list,
        help_text='List of regex strings, e.g., ["^/api/.*", "^/dashboard/.*"]',
    )

    def save(self, *args, **kwargs):
        if self.__class__.objects.count():
            self.pk = self.__class__.objects.first().pk
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Maintenance Mode: {'ON' if self.maintenance_mode else 'OFF'}"
