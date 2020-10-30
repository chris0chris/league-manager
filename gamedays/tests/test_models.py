from django.test import TestCase


class TestGameOfficials(TestCase):

    def test_officials_are_created(self):
        assert len(GameOfficial.objects.all()) == 0
        official = GameOfficial(name='Horst', position='Scorecard')
        official.save()
        assert len(GameOfficial.objects.all()) == 1
