from products.models import Product
from products.utils.log.db_merge_pipeline_to_default import db_merge_to_default_log
from products.crawler.config import PROD_DB


def archive_missing_products(stage_ids_map: dict, batch_size: int = 5000):
    """
    Archive products in PROD_DB that are missing from Stage snapshot.

    Args:
        stage_ids_map (dict): Mapping of shop_name -> set of external_ids in Stage
        batch_size (int): How many products to process per DB query batch
    """
    for shop_name, stage_ids in stage_ids_map.items():
        prod_qs = (
            Product.objects.using(PROD_DB)
            .filter(shop=shop_name)
            .exclude(external_id__in=stage_ids)
        )

        total_to_archive = prod_qs.count()
        db_merge_to_default_log(
            f"[COMPARE/ARCHIVE] Shop '{shop_name}' - {total_to_archive} products to archive"
        )

        archived_count = 0

        for p in prod_qs.iterator(chunk_size=batch_size):
            if p.archive_missing(PROD_DB):
                archived_count += 1

        db_merge_to_default_log(
            f"[COMPARE/ARCHIVE] Shop '{shop_name}' - archived/deleted {archived_count} products"
        )
