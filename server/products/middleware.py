# products/middleware.py
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone


class IPBlockMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = self.get_client_ip(request)
        data = cache.get(f"ip_block:{ip}")

        if data:
            block_until = data.get("block_until")
            if block_until and timezone.now() < block_until:
                return JsonResponse(
                    {"detail": "Too many requests. IP temporarily blocked."}, status=429
                )

        response = self.get_response(request)
        return response

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
