from rest_framework.throttling import SimpleRateThrottle
from products.utils.utils import handle_ip_offense

MAX_OFFENSES = 3
BLOCK_BASE_TIME = 15 * 60


class Layer1Throttle(SimpleRateThrottle):
    scope = "layer1"

    def get_cache_key(self, request, view):
        return self.get_ident(request)

    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)
        if not allowed:
            handle_ip_offense(self.get_ident(request))
        return allowed


class Layer2PreviewThrottle(SimpleRateThrottle):
    scope = "layer2_preview"

    def get_cache_key(self, request, view):
        return self.get_ident(request)

    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)
        if not allowed:
            handle_ip_offense(self.get_ident(request))
        return allowed


class Layer2FullThrottle(SimpleRateThrottle):
    scope = "layer2_full"

    def get_cache_key(self, request, view):
        return self.get_ident(request)

    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)
        if not allowed:
            handle_ip_offense(self.get_ident(request))
        return allowed


class Layer2FullThrottle(SimpleRateThrottle):
    scope = "layer2_full"

    def get_cache_key(self, request, view):
        return self.get_ident(request)

    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)
        if not allowed:
            handle_ip_offense(self.get_ident(request))
        return allowed


class AutocompleteThrottle(SimpleRateThrottle):
    scope = "autocomplete"

    def get_cache_key(self, request, view):
        # IP-based throttling (same as others)
        return self.get_ident(request)

    def allow_request(self, request, view):
        allowed = super().allow_request(request, view)
        if not allowed:
            handle_ip_offense(self.get_ident(request))
        return allowed
