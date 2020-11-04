from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.urls import reverse

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.webdriver import WebDriver


class TestScorecardView(StaticLiveServerTestCase):

    def test_javascript(self):
        opts = Options()
        opts.headless = True
        selenium = WebDriver(options=opts)
        selenium.implicitly_wait(10)
        selenium.get(f'{self.live_server_url}{reverse("scorecard-test")}')
        assert selenium.find_element_by_class_name('failed').text == '0'
