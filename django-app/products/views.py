# email/views.py
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from products.serializers import EmailSerializer


class CollectEmailAPIView(APIView):
    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Email saved!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RootAPIView(APIView):
    """
    Demo guide for API usage
    """

    def get(self, request):
        # dynamically get the current host
        host = request.build_absolute_uri("/")[:-1]  # remove trailing slash

        return JsonResponse(
            {
                "message": "Testare API Strugure prin ngrok. Dacă îți place, ia în considerare să te abonezi!:)",
                "endpoints": {
                    "search": {
                        "url": f"{host}/api/search/",
                        "method": "GET",
                        "example": f"{host}/api/search/?q=monitor%20gaming",
                        "description": "Search products by query string",
                    },
                    "offers": {
                        "url": f"{host}/api/product/<product_id>/offers/?full=true",
                        "method": "GET",
                        "example": f"{host}/api/product/ff08c8123047bf53f8734e682f85df0b/offers/?full=true",
                        "description": "Get offers for a specific product",
                    },
                    "email": {
                        "url": f"{host}/api/email/",
                        "method": "POST",
                        "example": f"{host}/api/email/ {{ 'email': 'you@example.com' }}",
                        "description": "Collect emails for demo notifications and future support!",
                    },
                },
            },
            safe=True,
        )
