from locust import HttpUser, task, between


class QuickstartUser(HttpUser):
    wait_time = between(2, 3)

    @task(1)
    def scorecard(self):
        headers = {
            "Authorization": "Token 9b39dde76ce54045c4aea49ba4de807be9967c06bf491dbd82f6066197989957"
        }
        self.client.get("/scorecard/", headers=headers)

    @task(100)
    def liveticker(self):
        self.client.get("/liveticker/")
