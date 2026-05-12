from rest_framework import serializers
from .models import Journey, JourneyEvent

class JourneyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyEvent
        fields = ['id', 'event_name', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']

class JourneySerializer(serializers.ModelSerializer):
    events = JourneyEventSerializer(many=True, read_only=True)

    class Meta:
        model = Journey
        fields = ['id', 'user', 'started_at', 'ended_at', 'events']
        read_only_fields = ['id', 'started_at', 'ended_at']
