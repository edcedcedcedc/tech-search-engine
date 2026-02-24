import traceback

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from products.models import SystemState
from django.utils import timezone
import json
from products.utils.log.search_engine_log import search_engine_log


class PipelineStatusAPIView(APIView):
    """
    Returns the last pipeline run status and finished timestamp.
    Ensures there is always a value in the DB.
    """

    def get(self, request):
        try:
            # Try to get existing record
            system_state, created = SystemState.objects.get_or_create(
                key="pipeline_last_run",
                defaults={
                    "value": json.dumps({"finished_at": timezone.now().isoformat()})
                },
            )

            # Parse the JSON value safely
            data = json.loads(system_state.value or "{}")
            finished_at = data.get("finished_at")

            # If somehow missing, set to today and update DB
            if not finished_at:
                finished_at = timezone.now().isoformat()
                data["finished_at"] = finished_at
                system_state.value = json.dumps(data)
                system_state.save()

            response = {"finished_at": finished_at}
            return Response(response, status=status.HTTP_200_OK)

        except Exception as e:
            # Fallback: just return today’s date if anything goes wrong
            trace = traceback.format_exc()
            search_engine_log(f"Error in PipelineStatusAPIView: {e}\n{trace}")
            fallback_date = timezone.now().isoformat()
            return Response({"finished_at": fallback_date}, status=status.HTTP_200_OK)
