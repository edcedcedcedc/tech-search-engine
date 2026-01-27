import random
from collections import deque


def interleave_tasks(tasks_by_shop: dict, shuffle_within_shop: bool = True):
    """
    Round-robin interleave tasks from different shops (or categories).

    Args:
        tasks_by_shop (dict): {shop_name: list of tasks} where task = (shop_name, category_name, fetch_fn, url)
        shuffle_within_shop (bool): Whether to shuffle tasks within each shop before interleaving.

    Returns:
        list: Interleaved list of tasks
    """
    # Optionally shuffle tasks within each shop
    if shuffle_within_shop:
        for tsk_list in tasks_by_shop.values():
            random.shuffle(tsk_list)

    # Convert lists to deque for efficient popping
    tasks_deque = {shop: deque(tsk_list) for shop, tsk_list in tasks_by_shop.items()}
    interleaved = []

    # Round-robin until all deques are empty
    while any(tasks_deque.values()):
        for shop, dq in list(tasks_deque.items()):
            if dq:
                interleaved.append(dq.popleft())

    return interleaved
