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
            # Fetch the last crawler run from the DB
            system_state = SystemState.objects.get(key="crawler_last_run")
            data = system_state.value  # already a JSON object

            # Optionally, add a "status" key
            response = {
                "status": "completed",
                **data,
                "system_version": 1,  # optional versioning
            }
            return Response(response, status=status.HTTP_200_OK)

        except SystemState.DoesNotExist:
            # No crawl has been run yet
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
            trace = traceback.format_exc()
            search_engine_log(f"Error in CrawlerStatusAPIView: {e}\n{trace}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
