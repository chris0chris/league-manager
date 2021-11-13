from rest_framework.serializers import ModelSerializer

from officials.models import Official


class OfficialSerializer(ModelSerializer):
    class Meta:
        model = Official
        fields = '__all__'
