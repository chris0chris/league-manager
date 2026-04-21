from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import SiteConfiguration


@receiver(post_save, sender=SiteConfiguration)
def clear_maintenance_cache(sender, instance, **kwargs):
    cache.delete("site_maintenance_config")
