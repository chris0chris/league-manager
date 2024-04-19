from rest_framework.fields import SerializerMethodField
from rest_framework.serializers import Serializer


class Obfuscator:

    @staticmethod
    def obfuscate(*args: str):
        obfuscated_text = ''
        for current_arg in args:
            if current_arg is not None and current_arg != '':
                obfuscated_text += current_arg[0] + 4 * '*'
        return obfuscated_text


class ObfuscatorSerializer(Serializer):
    def __init__(self, is_staff=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = is_staff

    def obfuscate_field_if_necessary(self, field_name, obj: dict):
        value = obj[field_name]
        if self.is_staff:
            return value
        return Obfuscator.obfuscate(value)


class ObfuscateField(SerializerMethodField):
    def __init__(self, field_name, **kwargs):
        super().__init__(method_name='obfuscate_field_if_necessary', **kwargs)
        self.db_field_name = field_name

    def to_representation(self, value):
        method = getattr(self.parent, self.method_name)
        return method(self.db_field_name, value)
