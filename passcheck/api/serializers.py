from rest_framework.serializers import ModelSerializer

# importing models
from passcheck.models import Playerlist


# Serialize table data into json object
class PasscheckSerializer(ModelSerializer):
    class Meta:
        model = Playerlist
        fields = '__all__'
