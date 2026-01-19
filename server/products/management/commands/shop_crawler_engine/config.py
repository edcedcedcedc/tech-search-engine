from .crawler import Crawler

shop_crawler = Crawler()

ALLOWED_FIELDS_TO_WRITE_AND_TRACK = ["price", "in_stock"]

PAGES_TO_CRAWL = 999

# If TRUE resets the CRAWLER_DBS and STAGE_DB and doesn't merge STAGE_DB to PROD_DB
DRY_RUN = False

CRAWLER_DBS = ["enter", "darwin", "xstore"]

SHOPS_TO_CRAWL = ["enter", "xstore", "darwin"]

STAGE_DB = "stage"

PROD_DB = "default"


SHOPS = {
    "enter": {
        "function": shop_crawler.fetch_enter,
        "laptop": "https://enter.online/laptopuri",
        "apple": "https://xstore.md/apple",
        "mobilephone": "https://enter.online/telefoane",
        "perifericepc": "https://enter.online/periferice-pc",
        "pc": "https://enter.online/calculatoare",
        "unitatepc": "https://enter.online/calculatoare/unitate-pc",
        "gaming": "https://enter.online/for-gamers",
        "televizoare": "https://enter.online/televizoare",
        "fotovideo": "https://enter.online/foto-video",
        "proiectoaresiecrane": "https://enter.online/echipamente-de-proiectie",
        "opticasiastronomie": "https://enter.online/optica-si-astronomie",
        "tehnicaaudio": "https://enter.online/tehnica-audio",
        "accesorii": "https://enter.online/accesorii",
        "iluminare": "https://enter.online/iluminare",
        "gadgeturi": "https://enter.online/gadgeturi",
        "software": "https://enter.online/programe-soft",
        "tehnicabirou": "https://enter.online/tehnica-de-birou",
        "cartielectronice": "https://enter.online/tablete/carti-electronice",
        "climatizare": "https://enter.online/climatizare",
        "coafat": "https://enter.online/aparate-de-coafat",
        "aparatefitnes": "https://enter.online/sport-si-agrement/aparate-fitness",
        "instrumentemuzicale": "https://enter.online/instrumente-muzicale",
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
        "gaming": "https://darwin.md/gaming",
        "router": "https://darwin.md/retelistica/routere",
        "switch": "https://darwin.md/retelistica/switch",
        "cargadgets": "https://darwin.md/car-gadgets",
        "sportsanatate": "https://darwin.md/sport-si-sanatate",
        "electrocasnice": "https://darwin.md/electrocasnice",
    },
    "xstore": {
        "function": shop_crawler.fetch_xstore,
        "laptop": "https://xstore.md/laptopuri",
        "laptopaccessories": "https://xstore.md/accesorii-laptopuri",
        "software": "https://xstore.md/software",
        "headphones": "https://xstore.md/casti",
        "accessories": "https://xstore.md/accesorii",
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
        "scaune": "https://xstore.md/periferice-pc/scaune",
        "televizoare": "https://xstore.md/televizoare",
        "accesoriitv": "https://xstore.md/accesorii-tv",
        "imprimante": "https://xstore.md/imprimante",
        "tehnicadebirou": "https://xstore.md/tehnica-de-birou",
        "proiectoaresiecrane": "https://xstore.md/proiectoare-si-ecrane",
        "aspiratoarerobot": "https://xstore.md/aspiratoare-robot",
        "ceasuri": "https://xstore.md/ceasuri-si-bratari-inteligente",
        "cameraaction": "https://xstore.md/gadgeturi/camere-action",
        "boxe": "https://xstore.md/boxe",
    },
}
