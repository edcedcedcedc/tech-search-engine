import requests
from products.utils.log.shop_crawler_engine_log import random_sleep, shop_crawler_log


class RateLimiter:
    def __init__(self):
        self.times_429 = 0

    def handle_429(self):
        self.times_429 += 1
        shop_crawler_log(f"Received 429 response (times: {self.times_429})")

        if self.times_429 == 2:
            random_sleep(60, 120)
        elif self.times_429 == 3:
            random_sleep(900, 1000)
        else:
            random_sleep(30, 60)

    def make_request(self, url, timeout=15):
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 429:
                self.handle_429()
                random_sleep(5, 10)
                resp = requests.get(url, timeout=timeout)

            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            shop_crawler_log(f"Request failed for {url}: {e}")
            return None
