# products/views/version.py

from rest_framework.views import APIView
from rest_framework.response import Response
from products.system_state.versioning import get_global_system_version


class SystemVersionAPIView(APIView):
    def get(self, request):
        return Response({"version": get_global_system_version()})
