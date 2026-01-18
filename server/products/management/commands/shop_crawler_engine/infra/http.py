from urllib.parse import urljoin
import requests
import time
import random
from products.utils.log.shop_crawler_engine_log import shop_crawler_log
from ..settings import CrawlSettings


class RateLimiter:
    def __init__(self, shop, robotics_url):
        self.shop = shop
        self.robotics_url = robotics_url
        self.settings = CrawlSettings()
        self.min_delay = self.settings.min_delay
        self.max_delay = self.settings.max_delay
        self.last_request_ts = 0
        self.times_429 = 0

        self.crawl_delay = self.fetch_crawl_delay()

    def fetch_crawl_delay(self):
        """Read robots.txt and extract Crawl-delay (for all user agents *)"""
        robots_url = urljoin(self.robotics_url, "/robots.txt")
        try:
            resp = requests.get(robots_url, timeout=10)
            if resp.status_code == 200:
                lines = resp.text.splitlines()
                user_agent = None
                for line in lines:
                    line = line.strip()
                    if line.lower().startswith("user-agent:"):
                        user_agent = line.split(":", 1)[1].strip()
                    elif line.lower().startswith("crawl-delay:") and (
                        user_agent == "*" or user_agent.lower() == "*"
                    ):
                        delay = float(line.split(":", 1)[1].strip())
                        shop_crawler_log(
                            f"[ROBOTS] shop={self.shop} crawl-delay={delay}s"
                        )
                        return delay
        except Exception as e:
            shop_crawler_log(
                f"[ROBOTS] shop={self.shop} failed to fetch robots.txt: {e}"
            )
        return self.min_delay

    def wait_if_needed(self):
        """Ensure minimum delay between requests"""
        now = time.time()
        elapsed = now - self.last_request_ts

        effective_delay = max(self.min_delay, self.crawl_delay)

        if elapsed < effective_delay:
            sleep_time = effective_delay - elapsed
            shop_crawler_log(f"[RATE-LIMIT] shop={self.shop} waiting {sleep_time:.1f}s")
            time.sleep(sleep_time)

    def handle_429(self):
        """Exponential backoff on 429"""
        self.times_429 += 1
        sleep_time = min(2**self.times_429 * 30, 3600)
        shop_crawler_log(
            f"[RATE-LIMIT] shop={self.shop} hit 429 | fail_count={self.times_429} | sleeping {sleep_time:.1f}s"
        )
        time.sleep(sleep_time)

    def make_request(self, url, timeout=15, max_retries=3):
        for attempt in range(max_retries):
            self.wait_if_needed()
            try:
                resp = requests.get(url, timeout=timeout)
                self.last_request_ts = time.time()

                if resp.status_code == 429:
                    self.handle_429()
                    continue

                resp.raise_for_status()
                self.times_429 = 0
                return resp

            except requests.exceptions.RequestException as e:
                shop_crawler_log(f"[REQUEST-FAIL] shop={self.shop} url={url} error={e}")
                time.sleep(5 + random.uniform(0, 15))

        final_sleep = min(60 * max_retries, 300)  # 1–5 min depending on max_retries
        shop_crawler_log(
            f"[RATE-LIMIT] shop={self.shop} cooling down {final_sleep}s after repeated failures"
        )
        time.sleep(final_sleep)

        shop_crawler_log(
            f"[REQUEST-FAIL] shop={self.shop} url={url} FAILED after {max_retries} attempts"
        )
        return None
