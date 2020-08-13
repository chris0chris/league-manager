from django.test import TestCase


class TestGamedayDetailView(TestCase):
    fixtures = ['testdata.json']

    def test_detail_view_with_finished_gameday(self):
        resp = self.client.get('/gameday/1')
        self.assertEqual(resp.status_code, 200)
        context = resp.context_data
        self.assertEqual(context['object'].pk, 1)
        self.assertIsNotNone(context['info']['schedule'])
        self.assertIsNotNone(context['info']['final_table'])
        self.assertNotContains(resp, 'Spielplan wurde noch nicht erstellt.')
        self.assertNotContains(resp, 'Abschlusstabelle wird berechnet, sobald alle Spiele fertig sind.')

    def test_detail_view_with_empty_gameday(self):
        resp = self.client.get('/gameday/2')
        self.assertEqual(resp.status_code, 200)
        context = resp.context_data
        self.assertEqual(context['object'].pk, 2)
        self.assertIsNone(context['info']['schedule'])
        self.assertIsNone(context['info']['final_table'])
        self.assertContains(resp, 'Spielplan wurde noch nicht erstellt.')
        self.assertContains(resp, 'Abschlusstabelle wird berechnet, sobald alle Spiele fertig sind.')

    def test_detail_view_gameday_not_available(self):
        resp = self.client.get('/gameday/999')
        self.assertEqual(resp.status_code, 404)
