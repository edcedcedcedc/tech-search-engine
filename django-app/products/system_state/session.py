from rest_framework.views import APIView
from rest_framework.response import Response


class FlushSessionAPIView(APIView):
    def post(self, request):
        request.session.flush()
        return Response({"status": "ok"})
