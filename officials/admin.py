from django.contrib import admin

from officials.models import Official, OfficialLicense, OfficialLicenseHistory, OfficialPosition

admin.site.register(Official)
admin.site.register(OfficialPosition)
admin.site.register(OfficialLicense)
admin.site.register(OfficialLicenseHistory)
