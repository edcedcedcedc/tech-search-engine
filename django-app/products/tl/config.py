from celery import chain, shared_task

# --- Configurable switches ---
PIPELINE_STEPS_ENABLED = {
    "log": True,
    "crawler": False,
    "normalize": False,
    "translation": False,
    "embeddings": False,
    "merge_to_stage": False,
    "similar_ids_stage": False,
    "merge_to_prod": False,
    "price_history_prod": False,
    "load_embeddings_cache": False,
    "es_autocomplete_index": False,
    "bump_search_version": False,
}


@shared_task(name="run_full_pipeline")
def run_full_pipeline():
    """
    Full shop crawler + processing pipeline with configurable steps.

    Steps (configurable via PIPELINE_STEPS_ENABLED):
        reset_logs,
        run_crawler,
        run_normalize,
        run_translation,
        run_embeddings,
        run_merge_pipeline_to_stage,
        run_similar_ids_stage,
        run_merge_pipeline_to_default,
        run_price_history_default,
        run_load_embeddings_cache,
        run_build_autocomplete_index,
        run_bump_search_version,
    """
    from products.tasks import (
        reset_logs,
        run_crawler,
        run_normalize,
        run_translation,
        run_embeddings,
        run_merge_pipeline_to_stage,
        run_similar_ids_stage,
        run_merge_pipeline_to_default,
        run_price_history_default,
        run_load_embeddings_cache,
        run_build_autocomplete_index,
        run_bump_search_version,
    )

    workflow_steps = []

    if PIPELINE_STEPS_ENABLED.get("log"):
        workflow_steps.append(reset_logs.si())

    if PIPELINE_STEPS_ENABLED.get("crawler"):
        workflow_steps.append(run_crawler.si())

    if PIPELINE_STEPS_ENABLED.get("normalize"):
        workflow_steps.append(run_normalize.si())

    if PIPELINE_STEPS_ENABLED.get("translation"):
        workflow_steps.append(run_translation.si())

    if PIPELINE_STEPS_ENABLED.get("embeddings"):
        workflow_steps.append(run_embeddings.si())

    if PIPELINE_STEPS_ENABLED.get("merge_to_stage"):
        workflow_steps.append(run_merge_pipeline_to_stage.si())

    if PIPELINE_STEPS_ENABLED.get("similar_ids_stage"):
        workflow_steps.append(run_similar_ids_stage.si())

    if PIPELINE_STEPS_ENABLED.get("merge_to_prod"):
        workflow_steps.append(run_merge_pipeline_to_default.si())

    if PIPELINE_STEPS_ENABLED.get("price_history_prod"):
        workflow_steps.append(run_price_history_default.si())

    if PIPELINE_STEPS_ENABLED.get("load_embeddings_cache"):
        workflow_steps.append(run_load_embeddings_cache.si())

    if PIPELINE_STEPS_ENABLED.get("es_autocomplete_index"):
        workflow_steps.append(run_build_autocomplete_index.si())

    if PIPELINE_STEPS_ENABLED.get("bump_search_version"):
        workflow_steps.append(run_bump_search_version.si())

    if not workflow_steps:
        return "No pipeline steps enabled. Nothing queued."

    workflow = chain(*workflow_steps)
    result = workflow.apply()
    return f"Full pipeline queued with ID: {result.id}"
