from unittest.mock import MagicMock

from league_manager.utils.serializer_utils import Obfuscator, ObfuscatorSerializer, ObfuscateField


class TestObfuscator:
    def test_obfuscator_obfuscate(self):
        assert Obfuscator.obfuscate(*'Some Name'.split(' ')[:2]) == 'S****N****'
        assert Obfuscator.obfuscate('Some', 'Name') == 'S****N****'

    def test_obfuscator_only_one_argument(self):
        assert Obfuscator.obfuscate('Some') == 'S****'

    def test_obfuscator_works_with_empty_values(self):
        assert Obfuscator.obfuscate(None) == ''
        assert Obfuscator.obfuscate('') == ''
        assert Obfuscator.obfuscate(None, '') == ''
        assert Obfuscator.obfuscate(None, '', 'Nmae') == 'N****'


class TestObfuscatorSerializer:
    def test_obfuscate_field_if_necessary_staff_true(self):
        serializer = ObfuscatorSerializer(is_staff=True)
        obj = {'first_name': 'Firstname'}
        result = serializer.obfuscate_field_if_necessary('first_name', obj)
        assert result == 'Firstname', "When is_staff is True, the value should not be obfuscated"

    def test_obfuscate_field_if_necessary_staff_false(self):
        serializer = ObfuscatorSerializer()
        obj = {'last_name': 'Lastname'}
        result = serializer.obfuscate_field_if_necessary('last_name', obj)
        assert result == 'L****', "When is_staff is False, the value should be obfuscated"


class TestObfuscateField:

    def test_to_representation_staff_true(self):
        field = ObfuscateField(field_name='example_field')
        parent_serializer = MagicMock()
        parent_serializer.obfuscate_field_if_necessary = MagicMock(return_value='SensitiveData')
        field.bind('example_field', parent_serializer)

        result = field.to_representation('SomeValue')

        parent_serializer.obfuscate_field_if_necessary.assert_called_once_with('example_field', 'SomeValue')
        assert result == 'SensitiveData', "When is_staff is True, the value should not be obfuscated"

    def test_to_representation_staff_false(self):
        field = ObfuscateField(field_name='example_field')
        parent_serializer = MagicMock()
        parent_serializer.obfuscate_field_if_necessary = MagicMock(return_value='S****')
        field.bind('example_field', parent_serializer)

        result = field.to_representation('SensitiveData')

        parent_serializer.obfuscate_field_if_necessary.assert_called_once_with('example_field', 'SensitiveData')
        assert result == 'S****', "When is_staff is False, the value should be obfuscated"
