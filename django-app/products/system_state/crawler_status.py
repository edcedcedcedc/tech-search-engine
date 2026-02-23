# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from products.models import SystemState
from django.utils import timezone
import json
import traceback
from products.utils.log.search_engine_log import search_engine_log


class CrawlerStatusAPIView(APIView):
    """
    Returns the last crawler status.
    """

    def get(self, request):
        try:
            system_state = SystemState.objects.get(key="crawler_last_run")
            data = json.loads(system_state.value)  # <-- parse string

            response = {**data}
            return Response(response, status=status.HTTP_200_OK)

        except SystemState.DoesNotExist:
            fallback = {
                "status": "pending",
                "created": 0,
                "updated": 0,
                "total": 0,
                "finished_at": None,
                "system_version": 1,
            }
            return Response(fallback, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback

            trace = traceback.format_exc()
            search_engine_log(f"Error in CrawlerStatusAPIView: {e}\n{trace}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
