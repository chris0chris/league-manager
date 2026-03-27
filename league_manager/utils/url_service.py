from django.conf import settings
from django.urls import reverse


class UrlService:
    @classmethod
    def build_absolute_url(cls, viewname: str, kwargs: dict = None) -> str:
        domain = settings.SITEMAP_DOMAIN
        protocol = 'https'
        if 'localhost' in domain:
            protocol = 'http'
        path = reverse(viewname, kwargs=kwargs or {})
        return f"{protocol}://{domain}{path}"
