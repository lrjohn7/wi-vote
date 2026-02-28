from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "wi_vote",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="US/Central",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # MRP fitting tasks can run for up to 30 minutes
    task_soft_time_limit=1800,
    task_time_limit=2100,
)

# Auto-discover tasks in app.tasks package
celery_app.autodiscover_tasks(["app.tasks"])
