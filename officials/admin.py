from django.contrib import admin

from officials.models import Official, OfficialLicense, OfficialLicenseHistory

admin.site.register(Official)
admin.site.register(OfficialLicense)
admin.site.register(OfficialLicenseHistory)
