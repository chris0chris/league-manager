from django.contrib import admin
from .models import Journey, JourneyEvent

@admin.register(Journey)
class JourneyAdmin(admin.ModelAdmin):
    list_display = ['user', 'started_at', 'ended_at', 'event_count']
    list_filter = ['started_at', 'user']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['started_at', 'ended_at']

    def event_count(self, obj):
        return obj.events.count()
    event_count.short_description = 'Events'

@admin.register(JourneyEvent)
class JourneyEventAdmin(admin.ModelAdmin):
    list_display = ['event_name', 'journey', 'created_at']
    list_filter = ['event_name', 'created_at']
    search_fields = ['journey__user__username', 'event_name']
    readonly_fields = ['created_at', 'metadata']
