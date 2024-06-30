from django.contrib import admin

from scorecard2.models import ScorecardCategory, ScorecardConfig, ScorecardOfficial, ScorecardCategoryValue


class ScorecardConfigAdmin(admin.ModelAdmin):
    filter_horizontal = ('leagues',)


admin.site.register(ScorecardConfig, ScorecardConfigAdmin)
admin.site.register(ScorecardOfficial)
admin.site.register(ScorecardCategory)
admin.site.register(ScorecardCategoryValue)

