# noinspection PyUnresolvedReferences
import chromedriver_binary
import pytest
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.urls import reverse
# from selenium.webdriver.chrome.webdriver import WebDriver
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


class TestScorecardView(StaticLiveServerTestCase):

    @pytest.mark.skip
    def test_javascript(self):
        opts = Options()
        opts.headless = True
        selenium = webdriver.Chrome(options=opts)
        selenium.implicitly_wait(10)
        selenium.get(f'{self.live_server_url}{reverse("scorecard-test")}')
        assert selenium.find_element_by_class_name('failed').text == '0'
