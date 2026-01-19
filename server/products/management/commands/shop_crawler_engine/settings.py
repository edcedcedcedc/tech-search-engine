from dataclasses import dataclass
from typing import Tuple


@dataclass
class CrawlSettings:
    # threading
    max_threads: int = 5
    spawn_delay: Tuple[float, float] = (0.3, 1.0)

    # batching
    batch_size: int = 100
    pause_between_batches: Tuple[int, int] = (1, 3)

    # request pacing (used by RateLimiter)
    min_delay: float = 3.0
    max_delay: float = 12.0
    timeout: float = 10.0  # <= NEW: request timeout in seconds

    # soft human-like pauses
    items_before_pause: int = 50
    item_pause_range: Tuple[float, float] = (0.1, 0.5)

    pages_pause_range: Tuple[int, int] = (2, 6)
