from .fetch import Fetch

shop_crawler = Fetch()

ALLOWED_FIELDS_TO_TRACK = [
    "price",
    "in_stock",
    "name",
    "variant",
    "url",
    "category",
    "brand",
]

ALLOWED_FIELDS_TO_WRITE = [
    "price",
    "in_stock",
    "name",
    "variant",
    "embedding",
    "url",
    "category",
    "brand",
    "t_name",
    "t_variant",
    "t_category",
]

REQUIRED_FIELDS_TO_VALIDATE = [
    "name",
    "price",
    "in_stock",
    "category",
    "brand",
    "url",
    "external_id",
    "shop",
]

MAX_VALIDATION_ERRORS = 20

PAGES_TO_CRAWL = 999

# If TRUE resets the CRAWLER_DBS and STAGE_DB and doesn't merge STAGE_DB to PROD_DB
DRY_RUN = False

BROKEN = False

BROKEN_DB = "broken"

if BROKEN:
    CRAWLER_DBS = BROKEN_DB
else:
    CRAWLER_DBS = ["enter", "darwin", "xstore"]

SHOPS_TO_CRAWL = ["darwin", "enter", "xstore"]

STAGE_DB = "stage"

PROD_DB = "default"

UPDATE_DB = "update"

MAX_DB_WORKERS_AT_NORMALIZE = 3


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
        "smartwatch": "https://enter.online/gadgeturi/smartwatch",
        "bratarifitness": "https://enter.online/gadgeturi/bratari-fitness",
        "smartwatchkids": "https://enter.online/gadgeturi/smartwatch-pentru-copii",
        "smartwatchaccess": "https://enter.online/accesorii/pentru-ceasuri-si-bratari",
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
        "smartwatch": "https://darwin.md/gadgets/ceasuri-inteligente",
        "smartwatch2": "https://darwin.md/gadgets/bratari-inteligente",
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
