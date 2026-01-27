from .crawler import Crawler
from celery import chain, shared_task

shop_crawler = Crawler()

ALLOWED_FIELDS_TO_WRITE_AND_TRACK = ["price", "in_stock"]

PAGES_TO_CRAWL = 999

# If TRUE resets the CRAWLER_DBS and STAGE_DB and doesn't merge STAGE_DB to PROD_DB
DRY_RUN = False

CRAWLER_DBS = []

BROKEN = False
BROKEN_DB = "broken"

if BROKEN:
    CRAWLER_DBS = BROKEN_DB
else:
    CRAWLER_DBS = ["enter", "darwin", "xstore"]

SHOPS_TO_CRAWL = ["darwin", "enter", "xstore"]

STAGE_DB = "stage"

PROD_DB = "default"
# uses broken db if something goes wrong with translation or normalization and then you can manually adjust

MAX_DB_WORKERS_AT_NORMALIZE = 3

# --- Configurable switches ---
PIPELINE_STEPS_ENABLED = {
    "crawler": True,
    "normalize": True,
    "translation": True,
    "embeddings": False,
    "merge_to_stage": False,
    "similar_ids_stage": False,
    "identical_ids_stage": False,
    "merge_to_prod": False,
    "price_history_prod": False,
    "load_embeddings_cache": False,
}


@shared_task(name="run_full_pipeline")
def run_full_pipeline():
    """
    Full shop crawler + processing pipeline with configurable steps.

    Steps (configurable via PIPELINE_STEPS_ENABLED):
        1. Run crawler
        2. Normalize recent products
        3. Run translation
        4. Generate embeddings
        5. Merge all crawler DBs into Stage
        6. Generate similar IDs in Stage
        7. Merge Stage into Prod (finalize)
    """
    from products.tasks import (
        run_crawler,
        run_normalize,
        run_translation,
        run_embeddings,
        run_merge_pipeline_to_stage,
        run_similar_ids_stage,
        run_identical_ids_stage,
        run_merge_pipeline_to_default,
        run_price_history_default,
        run_load_embeddings_cache,
    )

    workflow_steps = []

    if PIPELINE_STEPS_ENABLED.get("crawler"):
        workflow_steps.append(run_crawler.s())

    if PIPELINE_STEPS_ENABLED.get("normalize"):
        workflow_steps.append(run_normalize.si(interval_minutes=9999999))

    if PIPELINE_STEPS_ENABLED.get("translation"):
        workflow_steps.append(run_translation.si())

    if PIPELINE_STEPS_ENABLED.get("embeddings"):
        workflow_steps.append(run_embeddings.si())

    if PIPELINE_STEPS_ENABLED.get("merge_to_stage"):
        workflow_steps.append(run_merge_pipeline_to_stage.si())

    if PIPELINE_STEPS_ENABLED.get("similar_ids_stage"):
        workflow_steps.append(run_similar_ids_stage.si(batch_size=1000))

    if PIPELINE_STEPS_ENABLED.get("identical_ids_stage"):
        workflow_steps.append(run_identical_ids_stage.si(batch_size=1000))

    if PIPELINE_STEPS_ENABLED.get("merge_to_prod"):
        workflow_steps.append(run_merge_pipeline_to_default.si(dry_run=DRY_RUN))

    if PIPELINE_STEPS_ENABLED.get("price_history_prod"):
        workflow_steps.append(run_price_history_default.si())

    if PIPELINE_STEPS_ENABLED.get("load_embeddings_cache"):
        workflow_steps.append(run_load_embeddings_cache.si())

    if not workflow_steps:
        return "No pipeline steps enabled. Nothing queued."

    workflow = chain(*workflow_steps)
    result = workflow.apply()
    return f"Full pipeline queued with ID: {result.id}"


SHOPS = {
    "enter": {
        "function": shop_crawler.fetch_enter,
        "laptop": "https://enter.online/laptopuri",
        "mobilephone": "https://enter.online/telefoane",
        "perifericepc": "https://enter.online/periferice-pc",
        "pc": "https://enter.online/calculatoare",
        "gaming": "https://enter.online/for-gamers",
        "televizoare": "https://enter.online/televizoare",
        "fotovideo": "https://enter.online/foto-video",
        "proiectoaresiecrane": "https://enter.online/echipamente-de-proiectie",
        # "opticasiastronomie": "https://enter.online/optica-si-astronomie",
        "tehnicaaudio": "https://enter.online/tehnica-audio",
        "software": "https://enter.online/programe-soft",
        "tehnicabirou": "https://enter.online/tehnica-de-birou",
        "cartielectronice": "https://enter.online/tablete/carti-electronice",
        # "climatizare": "https://enter.online/climatizare",
    },
    "darwin": {
        "function": shop_crawler.fetch_darwin,
        "monitor": "https://darwin.md/monitoare",
        "laptop": "https://darwin.md/laptopuri",
        "mobilephone": "https://darwin.md/telefoane",
        "pc": "https://darwin.md/calculatoare",
        "gpu": "https://darwin.md/componente-pc/placi-video",
        "ssd": "https://darwin.md/componente-pc/dispozitive-de-stocare/ssd",
        "hdd": "https://darwin.md/componente-pc/dispozitive-de-stocare/hdd",
        "ram": "https://darwin.md/componente-pc/ram",
        "mb": "https://darwin.md/componente-pc/motherboard",
        "cpu": "https://darwin.md/componente-pc/cpu",
        "keyboard": "https://darwin.md/periferice-pc/tastaturi",
        "mouse": "https://darwin.md/periferice-pc/mouse-uri",
        "mousepad": "https://darwin.md/periferice-pc/mouse-pad-uri",
        "externhdd": "https://darwin.md/dispozitive-de-stocare-externe/hdd",
        "powersupply": "https://darwin.md/componente-pc/power-supply",
        "fan": "https://darwin.md/componente-pc/coolere",
        "fanbase": "https://darwin.md/accesorii/accesorii-coolere",
        "gaming1": "https://darwin.md/gaming/periferice",
        "gaming2": "https://darwin.md/gaming/pc-si-laptopuri",
        "gaming3": "https://darwin.md/gaming/console",
        "gaming4": "https://darwin.md/gaming/jocuri",
        "gaming5": "https://darwin.md/gaming/scaune",
        "gaming6": "https://darwin.md/gadgets/ochelari-vr",
        "router": "https://darwin.md/retelistica/routere",
        "switch": "https://darwin.md/retelistica/switch",
    },
    "xstore": {
        "function": shop_crawler.fetch_xstore,
        "laptop": "https://xstore.md/laptopuri",
        "laptopaccessories": "https://xstore.md/accesorii-laptopuri",
        "software": "https://xstore.md/software",
        "headphones": "https://xstore.md/casti",
        "accessories": "https://xstore.md/accesorii",  # cabluri, adaptoare, statii de andocare, powerbank, incarcatoare  hub-uri usb, filtre de retea, suport pentru monitor
        "pc": "https://xstore.md/calculatoare-pc",
        "setuppc": "https://xstore.md/setup-pc-gaming",
        "consolegaming": "https://xstore.md/console-gaming",
        "componentspc": "https://xstore.md/componente-pc",
        "apple": "https://xstore.md/apple",
        "allinonepc": "https://xstore.md/all-in-one-pc",
        "brandpc": "https://xstore.md/brand-pc",
        "minipc": "https://xstore.md/mini-pc",
        "phones": "https://xstore.md/telefoane",
        "tablete": "https://xstore.md/tablete",
        "perifericp": "https://xstore.md/periferice-pc",
        "monitoare": "https://xstore.md/monitoare",
        "scaune": "https://xstore.md/periferice-pc/scaune",  # scaune gaming
        "televizoare": "https://xstore.md/televizoare",
        "accesoriitv": "https://xstore.md/accesorii-tv",
        "imprimante": "https://xstore.md/imprimante",
        "tehnicadebirou": "https://xstore.md/tehnica-de-birou",  # cartuse, tonere, cerneala pentru imprimante, shreddere, proiectoare si ecrane, scanere, imprimante & MFD
        "proiectoaresiecrane": "https://xstore.md/proiectoare-si-ecrane",
        "aspiratoarerobot": "https://xstore.md/aspiratoare-robot",
        "ceasuri": "https://xstore.md/ceasuri-si-bratari-inteligente",
        "cameraaction": "https://xstore.md/gadgeturi/camere-action",
        "boxe": "https://xstore.md/boxe",
    },
}
