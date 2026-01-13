# products/utils/canonical.py
import re
import hashlib
import unicodedata

# Optional: stopwords you don’t want affecting IDs
STOPWORDS = {"new", "original", "orig", "model", "version", "gb", "tb", "ram", "rom"}


def normalize_canonical(s: str) -> str:
    """Normalize product text for canonical ID."""
    if not s:
        return ""

    # lowercase and remove accents
    s = s.lower()
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")

    # keep letters and numbers only
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()

    # remove stopwords
    tokens = [t for t in s.split() if t not in STOPWORDS]
    return " ".join(tokens)


def generate_canonical_id(base) -> str:
    """Generate a stable SHA-1 hash as canonical ID."""
    normalized = normalize_canonical(base)
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()
